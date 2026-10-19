import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { initialMixedReview, mixedQuestions, planMixedReview } from "../src/lib/learning/domain";
import { crearHijo, entrarAlEspacio, registrarPadre, sembrarClasesTerminadas } from "./utilidades";

test("repaso mixto: alterna problemas de las clases terminadas, registra la primera respuesta y se guarda", async ({ page }) => {
  test.setTimeout(180_000);
  const correo = await registrarPadre(page);
  const profile = await crearHijo(page, { nombre: "Alex", nacimiento: "2011-03-02" });
  const childId = await entrarAlEspacio(page, profile.nombre, profile.pin);
  const base = `/jugar/${childId}`;

  // Sin dos clases terminadas, el repaso aparece pero no se puede abrir.
  await page.goto(`${base}/aprende`);
  await expect(page.getByText("Se habilita al terminar 2 clases de esta unidad (llevas 0).").first()).toBeVisible();

  const done = ["enteros-recta", "enteros-suma-resta"];
  await sembrarClasesTerminadas(correo, childId, done);
  await page.reload();
  await page.locator(`a[href="${base}/aprende/repaso-numeros"]`).click();
  await expect(page.getByText(/Clases que entran en la mezcla: Números enteros en la recta · Sumar y restar enteros/)).toBeVisible();
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Empezar el repaso mixto" }).click();

  const session = mixedQuestions({ ...initialMixedReview("numeros"), items: planMixedReview(done, 1) });
  expect(new Set(session.map((item) => item.lesson.id))).toEqual(new Set(done));
  for (const [i, { question }] of session.entries()) {
    await expect(page.getByText(question.prompt, { exact: true })).toBeVisible();
    // La primera falla a propósito: queda registrada y no se puede corregir.
    await page.getByRole("textbox", { name: /Tu respuesta/ }).fill(i === 0 ? "999" : String(question.answer));
    await page.getByRole("button", { name: "Registrar mi respuesta" }).click();
    await expect(page.getByText(/Respuesta registrada/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Registrar mi respuesta" })).toHaveCount(0);
    await page.getByRole("button", { name: /^(Siguiente actividad|Continuar)$/ }).click();
  }
  await expect(page.getByText(/5 de 6 respuestas autónomas\. Sesión superada/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/^5 de 6 respuestas autónomas\./)).toBeVisible();
  await expect(page.getByRole("button", { name: "Empezar otra sesión" })).toBeVisible();
  await page.goto(`${base}/aprende`);
  await expect(page.getByText("Mejor sesión: 5 de 6 de forma autónoma · superado")).toBeVisible();
});
