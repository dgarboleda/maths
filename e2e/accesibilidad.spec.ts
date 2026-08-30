import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { crearHijo, registrarPadre, sesionDeHijo } from "./utilidades";

const NORMAS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function revisar(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(NORMAS).analyze();
  return violations.map((v) => ({
    id: v.id,
    impacto: v.impact,
    nodos: v.nodes.map((n) => n.target.join(" ")),
  }));
}

test.describe("Análisis automático con axe (WCAG 2.1 A y AA)", () => {
  test("pantalla de entrada", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Numerario" })).toBeVisible();
    expect(await revisar(page)).toEqual([]);
  });

  test("lista de perfiles, con y sin formulario abierto", async ({ page }) => {
    await registrarPadre(page);
    expect(await revisar(page)).toEqual([]);

    await page.getByRole("button", { name: "Agregar hijo" }).click();
    await expect(page.getByRole("heading", { name: "Nuevo perfil" })).toBeVisible();
    expect(await revisar(page)).toEqual([]);
  });

  test("panel del padre con un hijo dado de alta", async ({ page }) => {
    await registrarPadre(page);
    await crearHijo(page, { nombre: "Eva", pin: "1122" });
    await page.getByRole("link", { name: "Panel de padre" }).click();
    await expect(page.getByRole("region", { name: "Progreso de Eva" })).toBeVisible();
    expect(await revisar(page)).toEqual([]);
  });

  test("pantalla del hijo y lista de temas de un hilo", async ({ page }) => {
    await sesionDeHijo(page);
    expect(await revisar(page)).toEqual([]);

    await page.getByRole("link", { name: "Álgebra" }).click();
    await expect(page.getByText(/temas dominados/)).toBeVisible();
    expect(await revisar(page)).toEqual([]);
  });

  test("las cuatro pestañas de un tema", async ({ page }) => {
    await sesionDeHijo(page);
    await page.goto(page.url().replace(/\/jugar\/([^/]+).*/, "/jugar/$1/geometria/4"));
    await expect(page.getByRole("tab", { name: /Concepto/ })).toBeVisible();

    for (const pestaña of [/Concepto/, /Práctica/, /Cohete/, /Ejemplos/]) {
      await page.getByRole("tab", { name: pestaña }).click();
      await expect(page.getByRole("tabpanel")).toBeVisible();
      expect(await revisar(page), `pestaña ${pestaña}`).toEqual([]);
    }
  });

  test("juego de multiplicación, incluida la tabla 10x10", async ({ page }) => {
    await sesionDeHijo(page);
    await page.goto(page.url().replace(/\/jugar\/([^/]+).*/, "/jugar/$1/aritmetica/multiplicacion"));
    await expect(page.getByRole("tab", { name: /Concepto/ })).toBeVisible();

    for (const pestaña of [/Concepto/, /Práctica/, /Cohete/, /Tabla/]) {
      await page.getByRole("tab", { name: pestaña }).click();
      await expect(page.getByRole("tabpanel")).toBeVisible();
      expect(await revisar(page), `pestaña ${pestaña}`).toEqual([]);
    }
  });

  // Cada tema dibuja un concepto distinto (rectas, barras de fracción,
  // balanza, patrones, tablas de datos, figuras): se recorren todos porque
  // los fallos de etiquetado viven justo ahí, en sus deslizadores.
  test("todas las pantallas de concepto de los cinco hilos", async ({ page }) => {
    await sesionDeHijo(page);
    const raiz = page.url().replace(/\/jugar\/([^/]+).*/, "/jugar/$1");

    const temas = [
      "aritmetica/1", "aritmetica/2", "aritmetica/6", "aritmetica/7", "aritmetica/9",
      "algebra/1", "algebra/2",
      "geometria/1", "geometria/6", "geometria/8",
      "medicion/2", "medicion/3", "medicion/5", "medicion/9",
      "logica/4",
    ];

    for (const tema of temas) {
      await page.goto(`${raiz}/${tema}`);
      await expect(page.getByRole("tabpanel")).toBeVisible();
      expect(await revisar(page), tema).toEqual([]);
    }
  });

  test("pirámide numérica", async ({ page }) => {
    await sesionDeHijo(page);
    await page.goto(page.url().replace(/\/jugar\/([^/]+).*/, "/jugar/$1/piramide"));
    // La cabecera repite el título como h1 y el juego lo vuelve a poner como h2.
    await expect(page.getByRole("heading", { name: "Pirámide numérica", level: 1 })).toBeVisible();
    expect(await revisar(page)).toEqual([]);
  });
});
