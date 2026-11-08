import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { crearHijo, entrarAlEspacio, registrarPadre } from "./utilidades";
import { escribirColumnas } from "./operaciones";

test("calculadora global en una aventura: la cuenta se hace en columnas y el resultado pasa al plan", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  if (testInfo.project.name === "móvil") await page.setViewportSize({ width: 320, height: 740 });
  await registrarPadre(page);
  const { nombre, pin } = await crearHijo(page, { nombre: "Alex", nacimiento: "2012-06-12" });
  const childId = await entrarAlEspacio(page, nombre, pin);
  await page.goto(`/jugar/${childId}/aventura`);
  await page.getByRole("link", { name: /El jardín de baldosas/ }).click();
  await page.getByRole("button", { name: "Investigar la situación" }).click();
  await page.getByLabel("Lado del jardín (m)").fill("11");

  // 4 lados de 11 baldosas y 4 esquinas: 44 + 4 en la calculadora (botón flotante).
  await page.getByRole("button", { name: "Calculadora", exact: true }).click();
  await page.getByLabel("Primer número").fill("44");
  await page.getByLabel("Segundo número").fill("4");
  await page.getByRole("button", { name: "Escribir la cuenta" }).click();
  await escribirColumnas(page, "48");
  await page.getByLabel("Copiar en").selectOption({ label: "Baldosas" });
  expect((await new AxeBuilder({ page }).include("aside").analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("calculadora-panel.png"), fullPage: false });
  await page.getByRole("button", { name: "Usar 48", exact: true }).click();
  // Al usar el resultado, el panel se cierra y el valor queda en el plan.
  await expect(page.getByRole("complementary", { name: "Calculadora" })).toBeHidden();
  await expect(page.getByLabel("Baldosas", { exact: true })).toHaveValue("48");
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("borrador-aventura.png"), fullPage: true });
  await page.getByRole("button", { name: "Probar el plan" }).click();
  await expect(page.getByRole("heading", { name: "Misión completada" })).toBeVisible();
});

test("teclado numérico propio en móvil: escribe en la hoja sin abrir el del sistema", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "móvil", "solo en pantalla táctil");
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 320, height: 740 });
  await registrarPadre(page);
  const { nombre, pin } = await crearHijo(page, { nombre: "Alex", nacimiento: "2012-06-12" });
  const childId = await entrarAlEspacio(page, nombre, pin);
  await page.goto(`/jugar/${childId}/aventura`);
  await page.getByRole("link", { name: /El jardín de baldosas/ }).click();
  await page.getByRole("button", { name: "Investigar la situación" }).click();
  await page.getByRole("button", { name: "Hacer cuentas en la calculadora" }).click();
  await page.getByLabel("Primer número").fill("32");
  await page.getByLabel("Segundo número").fill("4");
  await page.getByRole("button", { name: "Escribir la cuenta" }).click();
  const keypad = page.getByRole("group", { name: "Teclado numérico" });
  await expect(keypad).toBeVisible();
  const units = page.getByLabel("Resultado: unidades", { exact: true });
  await expect(units).toHaveAttribute("inputmode", "none");
  await units.tap();
  await keypad.getByRole("button", { name: "Escribir 6" }).tap();
  await keypad.getByRole("button", { name: "Escribir 3" }).tap();
  await expect(page.getByRole("button", { name: "Usar 36", exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).include("aside").analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("teclado-movil.png"), fullPage: false });
});
