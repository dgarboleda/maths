import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { crearHijo, entrarAlEspacio, registrarPadre } from "./utilidades";
import { escribirColumnas } from "./operaciones";

test("borrador de cálculo en una aventura: la cuenta se hace en columnas y el resultado pasa al plan", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  if (testInfo.project.name === "móvil") await page.setViewportSize({ width: 320, height: 740 });
  await registrarPadre(page);
  const { nombre, pin } = await crearHijo(page, { nombre: "Alex", nacimiento: "2012-06-12" });
  const childId = await entrarAlEspacio(page, nombre, pin);
  await page.goto(`/jugar/${childId}/aventura`);
  await page.getByRole("link", { name: /El jardín de baldosas/ }).click();
  await page.getByRole("button", { name: "Investigar la situación" }).click();
  await page.getByLabel("Lado del jardín (m)").fill("8");

  // 4 lados de 8 baldosas y 4 esquinas: 32 + 4 en el borrador.
  await page.getByRole("button", { name: /Borrador de cálculo/ }).click();
  await page.getByLabel("Primer número").fill("32");
  await page.getByLabel("Segundo número").fill("4");
  await page.getByRole("button", { name: "Escribir la cuenta" }).click();
  await escribirColumnas(page, "36");
  await page.getByLabel("Copiar en").selectOption({ label: "Baldosas" });
  await page.getByRole("button", { name: "Usar 36" }).click();
  await expect(page.getByLabel("Baldosas", { exact: true })).toHaveValue("36");
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("borrador-aventura.png"), fullPage: true });
  await page.getByRole("button", { name: "Probar el plan" }).click();
  await expect(page.getByRole("heading", { name: "Misión completada" })).toBeVisible();
});
