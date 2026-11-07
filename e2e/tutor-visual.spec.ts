import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { getLesson } from "../src/lib/learning/domain";
import { crearHijo, entrarAlEspacio, registrarPadre } from "./utilidades";

async function sinDesbordeNiViolaciones(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
}

test("tutor visual de multiplicación: voz real, manipulación sin arrastre y sin tocar el avance", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  if (testInfo.project.name === "móvil") await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await registrarPadre(page);
  const { nombre, pin } = await crearHijo(page, { nombre: "Alex", nacimiento: "2014-03-02" });
  const childId = await entrarAlEspacio(page, nombre, pin);
  const lesson = getLesson("multiplicacion-grupos")!;

  await page.goto(`/jugar/${childId}/aprende/${lesson.id}`);
  await page.getByRole("button", { name: "Ir a la clase", exact: true }).click();
  await expect(page.getByRole("heading", { name: lesson.sections[0].title })).toBeVisible();
  const tutor = page.getByRole("region", { name: "Instala los paneles" });
  await expect(tutor).toBeVisible();
  await expect(tutor.getByText("Práctica guiada: no cuenta como comprobación ni suma estrellas.")).toBeVisible();

  // Desde aquí, ninguna acción del tutor llama al servidor del avance.
  const backend: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes(":5002/") || /firestore.*(Write|commit)/i.test(r.url())) backend.push(r.url());
  });

  // La voz real se descarga y suena.
  await tutor.getByRole("button", { name: "Escuchar" }).click();
  await expect(tutor.getByRole("button", { name: "Pausar voz" })).toBeVisible();
  await page.waitForFunction(() => (document.querySelector("audio")?.currentTime ?? 0) > 0.2);
  await tutor.getByRole("button", { name: "Pausar voz" }).click();
  await expect(tutor.getByRole("button", { name: "Continuar voz" })).toBeVisible();

  // Se arma el arreglo con toques y con teclado.
  await tutor.getByRole("button", { name: "Añadir: Filas" }).click();
  await tutor.getByRole("button", { name: "Añadir: Filas" }).click();
  await tutor.getByRole("button", { name: "Añadir: Paneles por fila" }).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(tutor.getByText("3 filas de 4: 4 + 4 + 4 = 3 × 4 = 12.")).toBeVisible();
  await expect(page.locator("audio")).toHaveAttribute("src", "/audio/tutor/grupos-1-logro.mp3");
  await sinDesbordeNiViolaciones(page);
  // Ningún control del tutor queda recortado, ni a 320 px.
  const width = page.viewportSize()!.width;
  for (const control of await tutor.getByRole("button").all()) {
    const box = (await control.boundingBox())!;
    expect(box.x + box.width, (await control.textContent()) ?? "").toBeLessThanOrEqual(width);
  }
  await tutor.screenshot({ path: testInfo.outputPath("tutor-grupos.png") });

  await tutor.getByRole("button", { name: "Continuar actividad" }).click();
  await tutor.getByRole("button", { name: "Girar instalación ↻" }).click();
  await expect(tutor.getByText("4 × 3 = 3 × 4 = 12.")).toBeVisible();

  // Silenciar: el texto queda y no vuelve a sonar.
  await tutor.getByRole("button", { name: "Silenciar voz" }).click();
  await tutor.getByRole("button", { name: "Continuar actividad" }).click();
  expect(await page.evaluate(() => document.querySelector("audio")!.paused)).toBe(true);
  await expect(tutor.getByText("Arma 5 filas de 6 paneles.")).toBeVisible();

  // Al volver a la clase se retoma la escena.
  // La clase recuerda su etapa; el tutor, su escena y la voz silenciada.
  await page.reload();
  await expect(page.getByText("Retomas donde lo dejaste.")).toBeVisible();
  await expect(page.getByText(/escena 3 de 3/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Activar voz" })).toHaveAttribute("aria-pressed", "true");

  expect(backend).toEqual([]);
});

const OTROS_TUTORES = [
  ["suma-resta-columnas", "Reagrupa las piezas"],
  ["fracciones-suma-resta", "Junta las reservas"],
  ["fracciones-equivalentes", "Mismas reservas, otras partes"],
  ["enteros-suma-resta", "Desplázate por la recta"],
  ["ecuaciones-un-paso", "Equilibra la balanza"],
  ["division-larga", "Reparte en grupos iguales"],
  ["enteros-producto-cociente", "Saltos con signo"],
  ["ecuaciones-dos-pasos", "Dos pasos en la balanza"],
  ["fraccion-cantidad", "Partes de una cantidad"],
  ["proporcionalidad", "Sensores y consumo"],
] as const;

for (const [lessonId, title] of OTROS_TUTORES)
  test(`tutor visual en ${lessonId}: cabe en pantalla y es accesible`, async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    if (testInfo.project.name === "móvil") await page.setViewportSize({ width: 320, height: 740 });
    await registrarPadre(page);
    const { nombre, pin } = await crearHijo(page, { nombre: "Alex", nacimiento: "2014-03-02" });
    const childId = await entrarAlEspacio(page, nombre, pin);
    await page.goto(`/jugar/${childId}/aprende/${lessonId}`);
    await page.getByRole("button", { name: "Ir a la clase", exact: true }).click();
    const tutor = page.getByRole("region", { name: title });
    await expect(tutor).toBeVisible();
    if (lessonId === "suma-resta-columnas")
      for (let i = 0; i < 10; i++) await tutor.getByRole("button", { name: /llevar a la bandeja/ }).first().click();
    else if (lessonId === "enteros-suma-resta") await tutor.getByRole("button", { name: "Avanzar 1 →" }).click();
    else if (lessonId === "ecuaciones-un-paso") await tutor.getByRole("button", { name: "Quitar 1 de cada lado" }).click();
    else if (lessonId === "ecuaciones-dos-pasos") await tutor.getByRole("button", { name: "Quitar 1 de cada lado" }).click();
    else if (lessonId === "division-larga") await tutor.getByRole("button", { name: "Dar 1 decena a cada grupo" }).click();
    else if (lessonId === "enteros-producto-cociente") await tutor.getByRole("button", { name: "← Saltar −4" }).click();
    else if (lessonId === "fraccion-cantidad") await tutor.getByRole("button", { name: "Más grupos" }).click();
    else if (lessonId === "proporcionalidad") await tutor.getByRole("button", { name: "Añadir: Sensores" }).click();
    else await tutor.getByRole("button", { name: /Partir en dos \(reserva de arriba\)/ }).click();
    const width = page.viewportSize()!.width;
    for (const control of await tutor.getByRole("button").all()) {
      const box = (await control.boundingBox())!;
      expect(box.x + box.width, (await control.getAttribute("aria-label")) ?? (await control.textContent()) ?? "").toBeLessThanOrEqual(width);
    }
    if (lessonId === "suma-resta-columnas") {
      // La bandeja no se monta ni se sale de su marco.
      const tray = tutor.getByRole("list", { name: "Bandeja de diez" });
      expect(await tray.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    }
    await sinDesbordeNiViolaciones(page);
    await tutor.screenshot({ path: testInfo.outputPath(`tutor-${lessonId}.png`) });
  });
