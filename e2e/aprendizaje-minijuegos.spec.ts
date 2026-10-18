import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { getLesson } from "../src/lib/learning/domain";
import { crearHijo, entrarAlEspacio, registrarPadre } from "./utilidades";

async function practice(page: Page, lessonId: string, game: "frogger" | "cohete") {
  // La app sortea el juego de cada ejercicio; aquí se fija para que la
  // prueba sea determinista.
  await page.addInitScript((forced) => {
    (window as { __MATHS_TEST_PRACTICE_GAME__?: string }).__MATHS_TEST_PRACTICE_GAME__ = forced;
  }, game);
  await registrarPadre(page);
  const profile = await crearHijo(page, { nombre: "Alex", nacimiento: "2012-06-12" });
  const childId = await entrarAlEspacio(page, profile.nombre, profile.pin);
  await page.goto(`/jugar/${childId}/aprende/${lessonId}`);
  await page.getByRole("button", { name: "Práctica", exact: true }).click();
  return getLesson(lessonId)!;
}

async function conceptThenNumeric(page: Page, lessonId: string, game: "frogger" | "cohete") {
  const lesson = await practice(page, lessonId, game);
  const question = lesson.practice[0];
  await page.getByRole("radio", { name: question.choices!.find((c) => c.id === question.answer)!.label, exact: true }).check();
  await page.getByRole("button", { name: "Comprobar mi respuesta", exact: true }).click();
  await page.getByRole("button", { name: "Siguiente actividad", exact: true }).click();
  return lesson.practice[1];
}

function savedAnswer(page: Page) {
  return page.waitForResponse((response) =>
    response.url().endsWith("/recordLearningAction") &&
    response.request().postDataJSON()?.data?.action?.kind === "answer",
  );
}

test("Estanque: pausa, error, pista, recarga y acierto guardados sin acreditar dominio", async ({ page }) => {
  const lesson = await practice(page, "fraccion-cantidad", "frogger");
  // Sin selector: la app decide el juego y la pregunta conceptual se responde
  // en su formato habitual.
  await expect(page.getByText("Elige cómo practicar")).toHaveCount(0);
  const conceptual = lesson.practice[0];
  await page.getByRole("radio", { name: conceptual.choices!.find((c) => c.id === conceptual.answer)!.label, exact: true }).check();
  await page.getByRole("button", { name: "Comprobar mi respuesta", exact: true }).click();
  await page.getByRole("button", { name: "Siguiente actividad", exact: true }).click();
  await page.getByRole("button", { name: "¡Empezar!", exact: true }).click();
  const q = lesson.practice[1];
  const right = page.getByRole("button", { name: `Saltar al nenúfar ${q.answer}`, exact: true });
  await page.getByRole("button", { name: "Pausar partida" }).click();
  await expect(right).toBeDisabled();
  await page.getByRole("button", { name: "Reanudar partida" }).click();
  const alternatives = page.getByRole("button", { name: /^Saltar al nenúfar / });
  const wrongName = (await alternatives.allTextContents()).find((label) => Number(label.replace("🌿", "").trim()) !== q.answer)!;
  const wrong = Number(wrongName.replace("🌿", "").trim());
  const answer = savedAnswer(page);
  await page.getByRole("button", { name: `Saltar al nenúfar ${wrong}`, exact: true }).click();
  const incorrect = (await (await answer).json()).result.progress;
  expect(incorrect.responses[`practice:${q.id}`]).toMatchObject({ response: String(wrong), correct: false, attempts: 1 });
  expect(incorrect.checkPassedAt).toBeNull();
  await expect(page.getByText(/La partida está en pausa/)).toBeVisible();
  await expect(right).toBeDisabled();
  await page.getByRole("button", { name: "Pedir una pista", exact: true }).click();
  await expect(page.getByText(q.hints[0], { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(q.hints[0], { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reanudar partida" }).click();
  await page.getByRole("button", { name: "¡Empezar!", exact: true }).click();
  await page.screenshot({ path: test.info().outputPath("estanque.png"), fullPage: true });
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  const corrected = savedAnswer(page);
  await right.click();
  const progress = (await (await corrected).json()).result.progress;
  expect(progress.responses[`practice:${q.id}`]).toMatchObject({ response: String(q.answer), correct: true, attempts: 2, hintsUsed: 1 });
  expect(progress.checkPassedAt).toBeNull();
  expect(progress.completedAt).toBeNull();
  await expect(page.getByRole("heading", { name: "¡Cruzaste el estanque!" })).toBeVisible();
  // La vía escrita sigue disponible y conserva la respuesta del juego.
  await page.getByRole("button", { name: "Prefiero escribir la respuesta", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /Tu respuesta/ })).toHaveValue(String(q.answer));
  await page.getByRole("button", { name: "Siguiente actividad", exact: true }).click();
  // El siguiente ejercicio numérico vuelve a ser un juego sorteado.
  await page.getByRole("button", { name: "Prefiero escribir la respuesta", exact: true }).click();
  await expect(page.getByText(lesson.practice[2].prompt, { exact: true })).toBeVisible();
});

test("Cohete: fracción exacta, sin reloj por defecto y recuperación de respuesta perdida sin duplicar evidencia", async ({ page }) => {
  const q = await conceptThenNumeric(page, "fracciones-unidad", "cohete");
  expect(q.answer).toBe(1 / 3);
  await page.getByRole("button", { name: "¡Iniciar misión!", exact: true }).click();
  await expect(page.getByText("Sin límite", { exact: true })).toBeVisible();
  const input = page.getByRole("textbox", { name: /Tu respuesta/ });
  await page.getByRole("button", { name: "Pausar partida" }).click();
  await expect(input).toBeDisabled();
  await page.getByRole("button", { name: "Reanudar partida" }).click();
  await input.fill("1/0");
  await page.getByRole("button", { name: "Comprobar mi respuesta", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("fracción válida");
  await input.fill("2/6");
  await page.screenshot({ path: test.info().outputPath("cohete.png"), fullPage: true });
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  let discardedId: string | undefined;
  await page.route("**/recordLearningAction", async (route) => {
    const request = route.request().postDataJSON().data;
    if (!discardedId && request.action.kind === "answer") {
      discardedId = request.operationId;
      // El servidor sí guarda; solo se pierde la respuesta de red.
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Comprobar mi respuesta", exact: true }).click();
  const retried = savedAnswer(page);
  await page.getByRole("button", { name: "Reintentar guardado", exact: true }).click();
  const result = await retried;
  expect(result.request().postDataJSON().data.operationId).toBe(discardedId);
  const saved = (await result.json()).result;
  expect(saved.progress.responses[`practice:${q.id}`]).toMatchObject({ response: "2/6", attempts: 1, correct: true });
  expect(saved.progress.checkPassedAt).toBeNull();
  expect(saved.stars).toBe(0);
  await expect(page.getByRole("button", { name: "Reintentar guardado", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "¡Misión cumplida!" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Prefiero escribir la respuesta", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /Tu respuesta/ })).toHaveValue("2/6");
  await expect(page.getByText("Tu respuesta es correcta. Revisa por qué funciona.", { exact: true })).toBeVisible();
  // La respuesta persistida sigue en el ejercicio de práctica, sin salto a evaluación.
  await expect(page.getByRole("heading", { name: "Práctica", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
