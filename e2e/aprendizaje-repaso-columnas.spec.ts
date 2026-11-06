import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  getLesson,
  initialMixedReview,
  mixedQuestions,
  planMixedReview,
  type Question,
} from "../src/lib/learning/domain";
import { crearHijo, entrarAlEspacio, registrarPadre, sembrarClasesTerminadas } from "./utilidades";
import { escribirColumnas, escribirGaleraAbierta } from "./operaciones";

const DONE = ["suma-resta-columnas", "division-larga"];
/** Responde en la hoja de columnas o en la galera, o por escrito si no tiene hoja.
 *  `fallar`: en columnas, su error típico; en la galera, un producto mal escrito. */
async function responder(page: Page, question: Question, fallar = false) {
  const choice = question.choices?.find((c) => c.id === question.answer);
  if (choice) await page.getByRole("radio", { name: choice.label, exact: true }).check();
  else if (question.column?.op === "divide")
    // En los repasos la galera está en blanco.
    await escribirGaleraAbierta(page, question, (i, text) => (fallar && i === 0 ? String(Number(text) + 1) : text));
  else if (question.column) await escribirColumnas(page, fallar ? String(question.errors![0].value) : String(question.answer));
  else await page.getByRole("textbox", { name: /Tu respuesta/ }).fill(String(question.answer));
  await page.getByRole("button", { name: "Registrar mi respuesta" }).click();
  await expect(page.getByText(/Respuesta registrada/)).toBeVisible();
}

/** Lo que el resumen debe decir del error. */
const diagnostico = (question: Question) =>
  question.column?.op === "divide"
    ? { feedback: /Revisa el producto del paso 1/, mistake: /Revisa el producto del paso 1/ }
    : { feedback: question.errors![0].feedback, mistake: /la primera cifra distinta/ };

/** La primera pregunta en hoja se falla; el resto, bien. */
function plan(session: { question: Question }[]) {
  const wrong = session.findIndex(({ question }) => question.column && (question.column.op === "divide" || question.errors?.length));
  expect(wrong).toBeGreaterThanOrEqual(0);
  return { wrong };
}

async function revisarResumen(page: Page, question: Question) {
  const item = page.getByRole("listitem").filter({ hasText: question.prompt });
  const { feedback, mistake } = diagnostico(question);
  await expect(item.getByText(feedback).first()).toBeVisible();
  await item.getByText("Ver el razonamiento").click();
  // La operación completa, dónde se separó la respuesta y el desarrollo.
  await expect(item.getByText(mistake).last()).toBeVisible();
  await expect(item.getByRole("group", { name: question.column!.op === "divide" ? /^División/ : /en columnas$/ })).toBeVisible();
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test("repaso diario con operaciones escritas: hoja durante el repaso y diagnóstico en el resumen", async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  if (testInfo.project.name === "móvil") await page.setViewportSize({ width: 320, height: 740 });
  const correo = await registrarPadre(page);
  const { nombre, pin } = await crearHijo(page, { nombre: "Alex", nacimiento: "2014-03-02" });
  const childId = await entrarAlEspacio(page, nombre, pin);
  await sembrarClasesTerminadas(correo, childId, DONE);
  await page.goto(`/jugar/${childId}`);
  await page.getByRole("link", { name: /Repasar hoy/ }).click();

  // El repaso rota las tareas entre sesiones: cada pregunta se reconoce por su
  // enunciado y se repite hasta fallar una en hoja con su error típico.
  const pool = DONE.flatMap((id) => {
    const l = getLesson(id)!;
    return [...l.review, ...l.mixed, ...l.checks[1]];
  });
  const plain = (t: string) => t.replace(/\s+/g, " ").trim();
  let failed: Question | null = null;
  for (let s = 0; s < 4 && !failed; s++) {
    await page.getByRole("button", { name: /^(Empezar el repaso de hoy|Hacer otro repaso)/ }).click();
    const title = page.getByRole("heading", { name: /^Problema \d+ de \d+/ });
    const total = Number((await title.innerText()).match(/de (\d+)/)![1]);
    for (let i = 0; i < total; i++) {
      await expect(title).toHaveText(new RegExp(`^Problema ${i + 1} de`));
      const prompt = plain(await page.locator("legend").first().innerText());
      const question = pool.find((q) => plain(q.prompt) === prompt)!;
      expect(question, prompt).toBeDefined();
      const fail = Boolean(!failed && question.column && (question.column.op === "divide" || question.errors?.length));
      await responder(page, question, fail);
      if (fail) failed = question;
      await page.getByRole("button", { name: /^(Siguiente actividad|Continuar)$/ }).click();
    }
    await expect(page.getByRole("heading", { name: "Resultado del repaso" })).toBeVisible();
  }
  expect(failed).not.toBeNull();
  await revisarResumen(page, failed!);
  await page.screenshot({ path: testInfo.outputPath("resumen-diario.png"), fullPage: true });
});

test("repaso mixto con operaciones escritas: hoja durante el repaso y diagnóstico en el resumen", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  if (testInfo.project.name === "móvil") await page.setViewportSize({ width: 320, height: 740 });
  const correo = await registrarPadre(page);
  const { nombre, pin } = await crearHijo(page, { nombre: "Alex", nacimiento: "2014-03-02" });
  const childId = await entrarAlEspacio(page, nombre, pin);
  await sembrarClasesTerminadas(correo, childId, DONE);
  await page.goto(`/jugar/${childId}/aprende/repaso-numeros`);
  await page.getByRole("button", { name: "Empezar el repaso mixto" }).click();

  const session = mixedQuestions({ ...initialMixedReview("numeros"), items: planMixedReview(DONE, 1) });
  const { wrong } = plan(session);
  for (const [i, { question }] of session.entries()) {
    await expect(page.getByText(question.prompt, { exact: true })).toBeVisible();
    await responder(page, question, i === wrong);
    await page.getByRole("button", { name: /^(Siguiente actividad|Continuar|Ver el resultado)$/ }).click();
  }
  await expect(page.getByRole("heading", { name: "Resultado de la sesión" })).toBeVisible();
  await revisarResumen(page, session[wrong].question);
  await page.screenshot({ path: testInfo.outputPath("resumen-mixto.png"), fullPage: true });
});
