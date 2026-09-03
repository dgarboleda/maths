import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { crearHijo, idDeHijo, otorgarDominio, registrarPadre, sesionDeHijo } from "./utilidades";

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
    await expect(page.getByRole("heading", { name: "Math Quest" })).toBeVisible();
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
    // "Lados de figuras" (geometria-d1) no tiene prerrequisitos.
    await page.goto(page.url().replace(/\/jugar\/([^/]+).*/, "/jugar/$1/geometria/geometria-d1"));
    await expect(page.getByRole("tab", { name: /Concepto/ })).toBeVisible();

    for (const pestaña of [/Concepto/, /Práctica/, /Cohete/, /Ejemplos/]) {
      await page.getByRole("tab", { name: pestaña }).click();
      await expect(page.getByRole("tabpanel")).toBeVisible();
      expect(await revisar(page), `pestaña ${pestaña}`).toEqual([]);
    }
  });

  test("juego de multiplicación, incluida la tabla 10x10", async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    // "Multiplicación" (aritmetica-d5) exige dominar antes aritmetica-d3.
    await otorgarDominio(correo, idDeHijo(page), ["aritmetica-d3"]);
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
    const { correo } = await sesionDeHijo(page);
    const raiz = page.url().replace(/\/jugar\/([^/]+).*/, "/jugar/$1");

    // Candados reales: para poder abrir cada tema de la lista hay que
    // otorgarle "dominado" a sus prerrequisitos directos (no hace falta la
    // cadena completa: isUnlocked solo mira un nivel de prerrequisitos).
    await otorgarDominio(correo, idDeHijo(page), [
      "aritmetica-d1",
      "aritmetica-d2",
      "aritmetica-d3",
      "aritmetica-d5",
      "aritmetica-d6",
      "aritmetica-d7",
      "aritmetica-d10",
      "geometria-d3",
      "logica-d2",
      "aritmetica-mcd-mcm",
    ]);

    const temas = [
      "aritmetica/aritmetica-d1", "aritmetica/aritmetica-d2", "aritmetica/aritmetica-d6",
      "aritmetica/aritmetica-d7", "aritmetica/aritmetica-d9",
      "aritmetica/aritmetica-mcd-mcm", "aritmetica/aritmetica-fracciones-2",
      "algebra/algebra-d1", "algebra/algebra-d2",
      "geometria/geometria-d1", "geometria/geometria-d6", "geometria/geometria-d8",
      "medicion/medicion-d2", "medicion/medicion-d3", "medicion/medicion-d5", "medicion/medicion-d9",
      "logica/logica-d4",
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

  // El mundo mete botones y enlaces encima de un dibujo: el riesgo está en
  // los nombres accesibles, el contraste sobre la escena y los diálogos.
  test("mundo del niño: ciudad, evento y diario de misiones", async ({ page }) => {
    await sesionDeHijo(page);
    await expect(page.getByRole("link", { name: /Tu próximo desafío/ })).toBeVisible();
    expect(await revisar(page)).toEqual([]);

    const raiz = page.url().replace(/\/jugar\/([^/]+).*/, "/jugar/$1");

    await page.goto(`${raiz}/misiones`);
    await expect(page.getByRole("heading", { name: "Diario de misiones" })).toBeVisible();
    expect(await revisar(page)).toEqual([]);

    // Geometría: "Lados de figuras" y "Vértices" están desbloqueados sin sembrar nada.
    await page.goto(`${raiz}/geometria/evento`);
    await expect(page.getByRole("heading", { name: "Código secreto" })).toBeVisible();
    expect(await revisar(page)).toEqual([]);
  });

  test("diálogos del mundo: tienda, personaje y ficha de un objeto", async ({ page }) => {
    await sesionDeHijo(page);

    await page.getByRole("button", { name: "Tienda" }).click();
    await expect(page.getByRole("dialog", { name: "Tienda de la ciudad" })).toBeVisible();
    expect(await revisar(page), "tienda").toEqual([]);
    await page.getByRole("button", { name: "Salir" }).click();

    await page.getByRole("button", { name: /Personalizar el personaje/ }).click();
    await expect(page.getByRole("dialog", { name: "Tu personaje" })).toBeVisible();
    expect(await revisar(page), "personaje").toEqual([]);
    await page.getByRole("button", { name: "Salir" }).click();

    await page.getByRole("link", { name: "Geometría" }).click();
    await page.getByRole("button", { name: /^Lados de figuras —/ }).click();
    await expect(page.getByRole("dialog", { name: /Lados de figuras/ })).toBeVisible();
    expect(await revisar(page), "objeto del mundo").toEqual([]);
  });

  test("Boss Challenge", async ({ page }) => {
    await sesionDeHijo(page);
    await page.goto(page.url().replace(/\/jugar\/([^/]+).*/, "/jugar/$1/boss"));
    await expect(page.getByRole("heading", { name: "Boss Challenge" })).toBeVisible();
    expect(await revisar(page)).toEqual([]);
  });
});
