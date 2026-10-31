import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { crearHijo, entrarAlEspacio, registrarPadre, sembrarClasesTerminadas } from "./utilidades";
import { LESSONS } from "../src/lib/learning/domain";

test("plan, mapa e informe usan las clases actuales sin cargar el sistema anterior", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const oldReads = new Set<string>();
  page.on("request", (request) => {
    if (!/firestore/.test(request.url())) return;
    let body = request.postData() ?? "";
    try { body = decodeURIComponent(body); } catch { /* El transporte puede enviar datos sin codificar. */ }
    body = body.replaceAll("\\", "");
    for (const collection of ["curriculumModules", "skillsProgress", "attempts", "world", "levels"])
      if (body.includes(`"collectionId":"${collection}"`) || body.includes(`/${collection}/`)) oldReads.add(collection);
  });
  const email = await registrarPadre(page);
  const profile = await crearHijo(page, { nombre: "Alex", nacimiento: "2012-06-12" });
  const childId = await entrarAlEspacio(page, profile.nombre, profile.pin);
  const base = `/jugar/${childId}`;
  await sembrarClasesTerminadas(email, childId, LESSONS.filter((lesson) => lesson.unitId === "numeros").map((lesson) => lesson.id));
  await page.goto("/panel/plan");
  await page.getByRole("checkbox", { name: /^Ángulos y polígonos/ }).check();
  await page.getByRole("button", { name: "Guardar plan", exact: true }).click();
  await expect(page.getByText(/Plan guardado\./)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: /^Ángulos y polígonos/ })).toBeChecked();
  await page.screenshot({ path: testInfo.outputPath("plan-estudio.png") });
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  await page.goto(base);
  await expect(page.getByRole("link", { name: "Comenzar mi siguiente clase", exact: true })).toHaveAttribute("href", `${base}/aprende/angulos`);
  await page.getByRole("link", { name: "Mapa de mi aprendizaje", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mapa de mi aprendizaje", exact: true })).toBeVisible();
  await expect(page.getByText("6 de 6 clases terminadas", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Geometría y medida", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Ángulos y polígonos/ })).toHaveAttribute("href", `${base}/aprende/angulos`);
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: /estrellas · Mis premios/ }).click();
  await expect(page.getByRole("heading", { name: "Mis estrellas y premios", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Salir", exact: true }).click();
  await expect(page.getByRole("button", { name: /estrellas · Mis premios/ })).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("mapa-educativo-inicio.png") });
  await page.screenshot({ path: testInfo.outputPath("mapa-educativo.png"), fullPage: true });
  await page.goto("/panel");
  const card = page.getByRole("region", { name: "Progreso de Alex", exact: true });
  await expect(card.getByText(`6 de ${LESSONS.length} clases terminadas`, { exact: true })).toBeVisible();
  await expect(card.getByText("0 comprobaciones autónomas", { exact: true })).toBeVisible();
  for (const label of ["Editor", "Mundo", "Currícula"])
    await expect(page.getByRole("link", { name: label, exact: true })).toHaveCount(0);
  await page.goto("/panel/progreso");
  await expect(page.getByRole("heading", { name: "Qué está aprendiendo Alex", exact: true })).toBeVisible();
  await expect(page.getByText("Dominio global", { exact: true })).toHaveCount(0);
  await page.goto(`/panel/${childId}`);
  await expect(page.getByRole("heading", { name: "Qué está aprendiendo Alex", exact: true })).toBeVisible();
  await expect(page.getByText("Currícula completa", { exact: true })).toHaveCount(0);
  expect([...oldReads]).toEqual([]);
  await page.goto("/panel/ajustes");
  await page.getByRole("link", { name: "Abrir archivo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Archivo de actividades anteriores", exact: true })).toBeVisible();
  await expect.poll(() => oldReads.has("curriculumModules")).toBe(true);
});
