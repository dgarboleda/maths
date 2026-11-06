import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { getLesson } from "../src/lib/learning/domain";
import { crearHijo, entrarAlEspacio, entrarComoFamilia, registrarPadre, sembrarClasesTerminadas } from "./utilidades";

test("adivinar no compensa: tras un fallo en opción múltiple hay que pedir una pista, y la familia lo ve", async ({ page }) => {
  test.setTimeout(180_000);
  const correo = await registrarPadre(page);
  const { nombre, pin } = await crearHijo(page, { nombre: "Alex", nacimiento: "2012-06-12" });
  const childId = await entrarAlEspacio(page, nombre, pin);
  const lesson = getLesson("fraccion-cantidad")!;
  const q = lesson.practice[0];
  expect(q.format).toBe("choice");

  await page.goto(`/jugar/${childId}/aprende/${lesson.id}?modo=practice`);
  await expect(page.getByText(/Estrellas de esta clase: 0 de 7/)).toBeVisible();
  await page.getByRole("button", { name: "Comenzar práctica" }).click();
  const wrong = q.choices!.filter((c) => c.id !== q.answer);
  await page.getByRole("radio", { name: wrong[0].label, exact: true }).check();
  await page.getByRole("button", { name: "Comprobar mi respuesta" }).click();
  // Sin pista no se puede reintentar.
  await page.getByRole("radio", { name: wrong[1].label, exact: true }).check();
  await expect(page.getByText("Pide una pista antes de volver a intentarlo.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Comprobar mi respuesta" })).toBeDisabled();
  await page.getByRole("button", { name: "Pedir una pista" }).click();
  await page.getByRole("button", { name: "Comprobar mi respuesta" }).click();
  // Tras dos fallos, a revisar el desarrollo.
  await expect(page.getByText("Ya lo intentaste dos veces: revisa el desarrollo para continuar.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Comprobar mi respuesta" })).toHaveCount(0);
  await page.getByRole("button", { name: "Ver el desarrollo" }).click();
  await expect(page.getByRole("button", { name: "Siguiente actividad" })).toBeEnabled();
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);

  // La familia ve las clases terminadas sin demostrar.
  await sembrarClasesTerminadas(correo, childId, ["enteros-recta"]);
  await entrarComoFamilia(page, correo);
  await page.goto(`/panel/${childId}`);
  await expect(page.getByRole("heading", { name: "Cómo responde" })).toBeVisible();
  await expect(page.getByText(/sin superar la\s+comprobación/)).toBeVisible();
  await expect(page.getByRole("link", { name: getLesson("enteros-recta")!.title })).toBeVisible();
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
});
