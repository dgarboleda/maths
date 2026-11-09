import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { divisionFields, divisionTrace, getLesson, type DivisionSpec } from "../src/lib/learning/domain";
import { escribirGalera, escribirRuffini, escribirTabla } from "./operaciones";
import { crearHijo, entrarAlEspacio, registrarPadre } from "./utilidades";

async function sinDesbordeNiViolaciones(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getComputedTiming().iterations === Infinity),
  );
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
}

test("sumar y restar en columnas: ejemplo animado con dos estrategias y hoja guiada", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  if (testInfo.project.name === "móvil") await page.setViewportSize({ width: 320, height: 740 });
  await registrarPadre(page);
  const { nombre, pin } = await crearHijo(page, { nombre: "Alex", nacimiento: "2014-03-02" });
  const childId = await entrarAlEspacio(page, nombre, pin);
  const lesson = getLesson("suma-resta-columnas")!;

  await page.goto(`/jugar/${childId}/aprende/${lesson.id}`);
  await page.getByRole("button", { name: "Ir a la clase", exact: true }).click();
  await expect(page.getByRole("heading", { name: lesson.sections[0].title })).toBeVisible();
  // La exploración de la clase opera en columnas con los números elegidos.
  await expect(page.getByLabel("Primer número")).toBeVisible();
  await page.getByRole("button", { name: "Continuar la explicación" }).click();
  await page.getByRole("button", { name: "Continuar la explicación" }).click();
  await page.getByRole("button", { name: "Ver cómo se resuelve" }).click();

  // Ejemplo 1: 347 + 285, columna a columna.
  await page.getByRole("button", { name: /Empezar/ }).click();
  await expect(page.getByText(/7 \+ 5 = 12\. Escribes 2 y llevas 1 a las decenas/)).toBeVisible();
  await page.getByRole("button", { name: /Siguiente columna/ }).click();
  await expect(page.getByText("Marca en centenas:", { exact: false })).toBeAttached();
  await page.getByRole("button", { name: "Otro ejemplo razonado" }).click();

  // Ejemplo 2: 302 − 158, con préstamo y con compensación.
  await expect(page.getByText(/hay un cero arriba/)).toBeVisible();
  await page.getByRole("button", { name: /Empezar/ }).click();
  await page.getByRole("button", { name: /Siguiente columna/ }).click();
  await expect(page.getByText(/el 0 no puede prestar/)).toBeVisible();
  await page.getByRole("radio", { name: "Compensar" }).click();
  await page.getByRole("button", { name: /Empezar/ }).click();
  await page.getByRole("button", { name: /Siguiente columna/ }).click();
  await expect(page.getByText(/compensas la columna anterior: abajo 5 \+ 1 = 6/)).toBeVisible();
  await sinDesbordeNiViolaciones(page);
  await page.screenshot({ path: testInfo.outputPath("ejemplo-compensacion.png"), fullPage: true });

  // Ejemplo 3: decimales con la coma alineada (125,5 − 48,75).
  await page.getByRole("button", { name: "Otro ejemplo razonado" }).click();
  await expect(page.getByText(/alinea la coma y completa con ceros/)).toBeVisible();
  await page.getByRole("radio", { name: "Pedir prestado" }).click();
  await page.getByRole("button", { name: /Empezar/ }).click();
  await expect(page.getByText(/En las centésimas: 0 es menor que 5/)).toBeVisible();
  await expect(page.getByText("cero añadido", { exact: false }).first()).toBeAttached();
  await sinDesbordeNiViolaciones(page);
  await page.screenshot({ path: testInfo.outputPath("ejemplo-decimales.png"), fullPage: true });
  await page.getByRole("button", { name: "Ahora, hazlo con ayuda" }).click();

  // Guiada 1: conceptual.
  const concept = lesson.guided[0];
  await page.getByRole("radio", { name: concept.choices!.find((c) => c.id === concept.answer)!.label, exact: true }).check();
  await page.getByRole("button", { name: "Comprobar mi respuesta" }).click();
  await page.getByRole("button", { name: "Siguiente actividad" }).click();

  // Guiada 2: la hoja corrige cada cifra y entrega el resultado sola.
  const sum = lesson.guided[1];
  expect(sum.column?.op).toBe("add");
  const digits = String(sum.answer).split("").reverse();
  const places = ["unidades", "decenas", "centenas", "unidades de millar"];
  await page.getByLabel("Resultado: unidades").fill(String((Number(digits[0]) + 1) % 10));
  await expect(page.getByText(/Revisa esa cifra/)).toBeVisible();
  for (const [i, d] of digits.entries()) await page.getByLabel(`Resultado: ${places[i]}`).fill(d);
  await expect(page.getByText("Tu respuesta es correcta. Revisa por qué funciona.")).toBeVisible();
  await sinDesbordeNiViolaciones(page);
  await page.screenshot({ path: testInfo.outputPath("guiada-columnas.png"), fullPage: true });
});

test("división larga: galera paso a paso, cero del cociente y hoja guiada", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  if (testInfo.project.name === "móvil") await page.setViewportSize({ width: 320, height: 740 });
  await registrarPadre(page);
  const { nombre, pin } = await crearHijo(page, { nombre: "Alex", nacimiento: "2014-03-02" });
  const childId = await entrarAlEspacio(page, nombre, pin);
  const lesson = getLesson("division-larga")!;

  await page.goto(`/jugar/${childId}/aprende/${lesson.id}`);
  await page.getByRole("button", { name: "Ir a la clase", exact: true }).click();
  await expect(page.getByRole("heading", { name: lesson.sections[0].title })).toBeVisible();
  await expect(page.getByLabel("Divisor")).toBeVisible();
  await page.getByRole("button", { name: "Continuar la explicación" }).click();
  await page.getByRole("button", { name: "Continuar la explicación" }).click();
  await page.getByRole("button", { name: "Ver cómo se resuelve" }).click();

  // Ejemplo 1 (756 ÷ 3) y ejemplo 2 (612 ÷ 6), con el cero del cociente.
  await page.getByRole("button", { name: /Empezar/ }).click();
  await expect(page.getByText(/3 cabe 2 veces en 7/)).toBeVisible();
  await page.getByRole("button", { name: "Otro ejemplo razonado" }).click();
  await expect(page.getByText(/atención al cero del cociente/)).toBeVisible();
  await page.getByRole("radio", { name: "Restar de memoria" }).click();
  await page.getByRole("button", { name: /Empezar/ }).click();
  await page.getByRole("button", { name: /Siguiente paso/ }).click();
  await expect(page.getByText(/Escribes 0 en el cociente/)).toBeVisible();
  await page.getByRole("button", { name: /Siguiente paso/ }).click();
  await expect(page.getByText("Cociente 102 · resto 0")).toBeVisible();
  await sinDesbordeNiViolaciones(page);
  await page.screenshot({ path: testInfo.outputPath("ejemplo-division.png"), fullPage: true });
  await page.getByRole("button", { name: "Otro ejemplo razonado" }).click();
  await page.getByRole("button", { name: "Ahora, hazlo con ayuda" }).click();

  const concept = lesson.guided[0];
  await page.getByRole("radio", { name: concept.choices!.find((c) => c.id === concept.answer)!.label, exact: true }).check();
  await page.getByRole("button", { name: "Comprobar mi respuesta" }).click();
  await page.getByRole("button", { name: "Siguiente actividad" }).click();

  // La galera guiada pide todo el procedimiento: cociente, productos, restas y resto.
  // Como el ejemplo se vio con «Restar de memoria», esa disposición se conserva.
  const division = lesson.guided[1];
  expect(division.column?.op).toBe("divide");
  await page.getByRole("radio", { name: "Escribir cada resta" }).click();
  const firstDigit = divisionTrace(division.column as DivisionSpec).steps[0].digit;
  await page.getByLabel("Cociente: cifra 1", { exact: true }).fill(String((firstDigit + 1) % 10));
  await expect(page.getByText(/Revisa esa cifra/)).toBeVisible();
  await escribirGalera(page, division);
  await expect(page.getByText("Tu respuesta es correcta. Revisa por qué funciona.")).toBeVisible();
  await sinDesbordeNiViolaciones(page);
  await page.screenshot({ path: testInfo.outputPath("guiada-division.png"), fullPage: true });
});

test("MCD y MCM: tabla de factores primos en la clase y guiada", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  if (testInfo.project.name === "móvil") await page.setViewportSize({ width: 320, height: 740 });
  await registrarPadre(page);
  const { nombre, pin } = await crearHijo(page, { nombre: "Alex", nacimiento: "2013-03-02" });
  const childId = await entrarAlEspacio(page, nombre, pin);
  const lesson = getLesson("mcd-mcm")!;
  await page.goto(`/jugar/${childId}/aprende/${lesson.id}`);
  await page.getByRole("button", { name: "Ir a la clase", exact: true }).click();
  await expect(page.getByText(/MCM = 2 × 2 × 3 × 3 = 36 · MCD = 2 × 3 = 6/)).toBeVisible();
  await page.getByRole("button", { name: "Continuar la explicación" }).click();
  await page.getByRole("button", { name: "Continuar la explicación" }).click();
  await page.getByRole("button", { name: "Ver cómo se resuelve" }).click();
  await page.getByRole("button", { name: /Empezar/ }).click();
  await expect(page.getByText(/2 divide a 12 y 18: debajo escribes 6 y 9/)).toBeVisible();
  await page.getByRole("button", { name: "Otro ejemplo razonado" }).click();
  await page.getByRole("button", { name: "Ahora, hazlo con ayuda" }).click();
  const concept = lesson.guided[0];
  await page.getByRole("radio", { name: concept.choices!.find((c) => c.id === concept.answer)!.label, exact: true }).check();
  await page.getByRole("button", { name: "Comprobar mi respuesta" }).click();
  await page.getByRole("button", { name: "Siguiente actividad" }).click();
  await escribirTabla(page, lesson.guided[1]);
  await expect(page.getByText("Tu respuesta es correcta. Revisa por qué funciona.")).toBeVisible();
  await sinDesbordeNiViolaciones(page);
  await page.screenshot({ path: testInfo.outputPath("guiada-tabla.png"), fullPage: true });
});

test("Ruffini: tabla en la clase y guiada con la esquina y los coeficientes", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  if (testInfo.project.name === "móvil") await page.setViewportSize({ width: 320, height: 740 });
  await registrarPadre(page);
  const { nombre, pin } = await crearHijo(page, { nombre: "Alex", nacimiento: "2010-03-02" });
  const childId = await entrarAlEspacio(page, nombre, pin);
  const lesson = getLesson("ruffini")!;
  await page.goto(`/jugar/${childId}/aprende/${lesson.id}`);
  await page.getByRole("button", { name: "Ir a la clase", exact: true }).click();
  await expect(page.getByLabel("Valor de la esquina (r)")).toBeVisible();
  await page.getByRole("button", { name: "Continuar la explicación" }).click();
  await page.getByRole("button", { name: "Continuar la explicación" }).click();
  await page.getByRole("button", { name: "Ver cómo se resuelve" }).click();
  await page.getByRole("button", { name: "Otro ejemplo razonado" }).click();
  await expect(page.getByText(/falta un término y la esquina es negativa/)).toBeVisible();
  await page.getByRole("button", { name: /Empezar/ }).click();
  await page.getByRole("button", { name: /Siguiente columna/ }).click();
  await expect(page.getByText("−3 × 1 = −3; 0 + (−3) = −3.")).toBeVisible();
  await page.getByRole("button", { name: "Ahora, hazlo con ayuda" }).click();
  const concept = lesson.guided[0];
  await page.getByRole("radio", { name: concept.choices!.find((c) => c.id === concept.answer)!.label, exact: true }).check();
  await page.getByRole("button", { name: "Comprobar mi respuesta" }).click();
  await page.getByRole("button", { name: "Siguiente actividad" }).click();
  await escribirRuffini(page, lesson.guided[1]);
  await expect(page.getByText("Tu respuesta es correcta. Revisa por qué funciona.")).toBeVisible();
  await sinDesbordeNiViolaciones(page);
  await page.screenshot({ path: testInfo.outputPath("guiada-ruffini.png"), fullPage: true });
});


test("ejercicio guiado: puede desmarcar una coma incorrecta sin perder la división", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  if (testInfo.project.name === "móvil") await page.setViewportSize({ width: 320, height: 740 });
  await registrarPadre(page);
  const { nombre, pin } = await crearHijo(page, { nombre: "Alex", nacimiento: "2014-03-02" });
  const childId = await entrarAlEspacio(page, nombre, pin);
  const lesson = getLesson("division-decimales")!;
  await page.goto(`/jugar/${childId}/aprende/${lesson.id}`);
  await page.getByRole("button", { name: "Ir a la clase", exact: true }).click();
  await page.getByRole("button", { name: "Continuar la explicación" }).click();
  await page.getByRole("button", { name: "Continuar la explicación" }).click();
  await page.getByRole("button", { name: "Ver cómo se resuelve" }).click();
  await page.getByRole("button", { name: "Otro ejemplo razonado" }).click();
  await page.getByRole("button", { name: "Otro ejemplo razonado" }).click();
  await page.getByRole("button", { name: "Ahora, hazlo con ayuda" }).click();
  const concept = lesson.guided[0];
  await page.getByRole("radio", { name: concept.choices!.find((choice) => choice.id === concept.answer)!.label, exact: true }).check();
  await page.getByRole("button", { name: "Comprobar mi respuesta" }).click();
  await page.getByRole("button", { name: "Siguiente actividad" }).click();
  await page.getByRole("radio", { name: "Restar de memoria" }).click();
  const spec = lesson.guided[1].column as DivisionSpec;
  const trace = divisionTrace(spec, "abreviada");
  if (trace.commaAfter === null || trace.steps.length < 3) throw new Error("El ejercicio necesita al menos dos posiciones de coma");
  for (const field of divisionFields(trace).filter((field) => field.step <= trace.commaAfter!)) {
    if (field.kind === "q") await page.getByLabel(`Cociente: cifra ${field.step + 1}`, { exact: true }).fill(field.text);
    else for (const [i, digit] of field.text.split("").entries()) {
      await page.getByLabel(`Resta del paso ${field.step + 1}: casilla ${field.width - field.text.length + i + 1} de ${field.width}`, { exact: true }).fill(digit);
    }
  }
  const wrongIndex = trace.commaAfter === 0 ? 2 : 1;
  const wrong = page.getByRole("button", { name: `Poner la coma después de la cifra ${wrongIndex} del cociente` });
  await wrong.click();
  await expect(page.getByText(/Ahí no/)).toBeVisible();
  await wrong.click();
  await expect(page.getByText(/Ahí no/)).toHaveCount(0);
  await expect(page.getByText(/Acabas de bajar/)).toBeVisible();
  await page.getByRole("button", { name: `Poner la coma después de la cifra ${trace.commaAfter + 1} del cociente` }).click();
  await expect(page.getByLabel(`Cociente: cifra ${trace.commaAfter + 2}`, { exact: true })).toBeVisible();
});
