import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { dailyQuestions, initialDaily, planDaily } from "../src/lib/learning/domain";
import { crearHijo, entrarAlEspacio, registrarPadre, sembrarClasesTerminadas } from "./utilidades";

test("repaso diario: entra desde el inicio, cruza unidades y agenda la próxima vuelta", async ({ page }) => {
  test.setTimeout(180_000);
  const correo = await registrarPadre(page);
  const profile = await crearHijo(page, { nombre: "Alex", nacimiento: "2011-03-02" });
  const childId = await entrarAlEspacio(page, profile.nombre, profile.pin);
  const base = `/jugar/${childId}`;

  const done = ["enteros-recta", "razones", "perimetro-area"];
  await sembrarClasesTerminadas(correo, childId, done);
  await page.goto(base);
  await page.getByRole("link", { name: /Repasar hoy · 3 ideas/ }).click();
  await expect(page.getByText(/Hoy tocan 3 ideas de tus clases/)).toBeVisible();
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: /Empezar el repaso de hoy/ }).click();

  const items = planDaily(initialDaily(), done, new Set(), Date.now());
  const session = dailyQuestions({ ...initialDaily(), items });
  expect(session).toHaveLength(6);
  // Falla a propósito la primera pregunta numérica: esa clase vuelve mañana.
  const wrong = session.findIndex(({ question }) => !question.choices);
  for (const [i, { question }] of session.entries()) {
    await expect(page.getByText(question.prompt, { exact: true })).toBeVisible();
    const choice = question.choices?.find((c) => c.id === question.answer);
    if (choice) await page.getByRole("radio", { name: choice.label, exact: true }).check();
    else await page.getByRole("textbox", { name: /Tu respuesta/ }).fill(i === wrong ? "987654" : String(question.answer));
    await page.getByRole("button", { name: "Registrar mi respuesta" }).click();
    await expect(page.getByText(/Respuesta registrada/)).toBeVisible();
    await page.getByRole("button", { name: /^(Siguiente actividad|Continuar)$/ }).click();
  }
  await expect(page.getByRole("heading", { name: "Resultado del repaso" })).toBeVisible();
  await expect(page.getByText("5 de 6 recordadas sin ayuda.", { exact: false })).toBeVisible();
  await expect(page.getByText(`${session[wrong].lesson.title} · vuelve en 1 día`).first()).toBeVisible();
  await expect(page.getByText(/vuelve en 3 días/).first()).toBeVisible();
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  await page.goto(base);
  await expect(page.getByRole("link", { name: /Repaso de hoy hecho/ })).toBeVisible();
  await page.goto("/panel");
  await expect(page.getByRole("region", { name: "Progreso de Alex", exact: true }).getByText(/^1 día de repaso/)).toBeVisible();

});
