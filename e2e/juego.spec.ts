import { expect, test, type Page } from "@playwright/test";
import { idDeHijo, otorgarDominio, resolverEnunciado, sesionDeHijo } from "./utilidades";

/** Saldo de estrellas que muestra la cabecera. */
function estrellas(page: Page) {
  return page.locator("header").getByText(/^Estrellas:\s*-?\d+$/);
}

async function irATema(page: Page, hilo: string, url: RegExp) {
  await page.getByRole("link", { name: hilo }).click();
  await expect(page).toHaveURL(url);
}

test.describe("Recorrido de juego", () => {
  test("del perfil al tema, y de vuelta con los enlaces de la cabecera", async ({ page }) => {
    const { nombre } = await sesionDeHijo(page);

    await irATema(page, "Geometría", /\/geometria$/);
    await expect(page).toHaveTitle("Geometría · Numerario");
    await expect(page.getByText(/\d+\/\d+ temas dominados/)).toBeVisible();

    // "Lados de figuras" no tiene prerrequisitos: se puede entrar sin dominar
    // nada antes.
    await page.getByRole("link", { name: "Lados de figuras" }).click();
    await expect(page).toHaveURL(/\/geometria\/geometria-d1$/);
    await expect(page).toHaveTitle("Lados de figuras · Geometría · Numerario");

    await page.getByRole("link", { name: `← Geometría de ${nombre}` }).click();
    await expect(page).toHaveURL(/\/geometria$/);
  });

  test("las pestañas se manejan con flechas y cada panel queda anunciado", async ({ page }) => {
    await sesionDeHijo(page);
    await irATema(page, "Aritmética", /\/aritmetica$/);
    await page.getByRole("link", { name: "Sumas hasta 5" }).click();

    const concepto = page.getByRole("tab", { name: /Concepto/ });
    const practica = page.getByRole("tab", { name: /Práctica/ });

    await expect(concepto).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toBeVisible();

    await concepto.focus();
    await page.keyboard.press("ArrowRight");
    await expect(practica).toBeFocused();
    await expect(practica).toHaveAttribute("aria-selected", "true");
    await expect(concepto).toHaveAttribute("aria-selected", "false");

    // El panel visible es el de la pestaña activa y lo dice su etiqueta.
    const panel = page.getByRole("tabpanel");
    await expect(panel).toHaveAttribute("aria-labelledby", await practica.getAttribute("id") ?? "");

    await page.keyboard.press("End");
    await expect(page.getByRole("tab", { name: /Ejemplos/ })).toBeFocused();
    await page.keyboard.press("Home");
    await expect(concepto).toBeFocused();
  });

  test("se puede contestar la recta numérica solo con el teclado y suma estrellas", async ({
    page,
  }) => {
    const hijo = await sesionDeHijo(page);
    await expect(estrellas(page)).toHaveText("Estrellas: 0");

    await page.goto(page.url().replace(/\/jugar\/([^/]+).*/, "/jugar/$1/aritmetica/aritmetica-d1"));
    await expect(page.getByRole("heading", { name: `Sumas hasta 5` })).toBeVisible();
    await page.getByRole("tab", { name: /Práctica/ }).click();

    const enunciado = await page.getByText(/¿Cuánto es \d+ \+ \d+\?/).innerText();
    const objetivo = resolverEnunciado(enunciado);
    expect(objetivo).not.toBeNull();

    const recta = page.getByRole("slider");
    await recta.focus();
    await expect(recta).toBeFocused();
    // El punto arranca en el primer sumando: se mueve con flechas hasta el resultado.
    let actual = Number(await recta.getAttribute("aria-valuenow"));
    while (actual !== objetivo) {
      await page.keyboard.press(actual < objetivo! ? "ArrowRight" : "ArrowLeft");
      actual = Number(await recta.getAttribute("aria-valuenow"));
    }

    await page.getByRole("button", { name: "Responder" }).click();
    await expect(page.getByRole("status")).toContainText("¡Correcto!");
    // El foco no se pierde al desaparecer el control de respuesta.
    await expect(page.getByRole("button", { name: "Siguiente" })).toBeFocused();
    await expect(estrellas(page)).not.toHaveText("Estrellas: 0");
    expect(hijo.nombre).toBeTruthy();
  });

  test("la balanza se resuelve con el teclado, sin arrastrar", async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    // "Balanza" (algebra-d2) exige dominar antes aritmetica-d2.
    await otorgarDominio(correo, idDeHijo(page), ["aritmetica-d2"]);
    await page.goto(page.url().replace(/\/jugar\/([^/]+).*/, "/jugar/$1/algebra/algebra-d2"));
    await page.getByRole("tab", { name: /Práctica/ }).click();

    const enunciado = await page.getByText(/\d+ \+ x = \d+/).innerText();
    const [, izquierda, total] = enunciado.match(/(\d+) \+ x = (\d+)/)!;
    const peso = Number(total) - Number(izquierda);

    await page.getByRole("button", { name: `Peso ${peso}` }).press("Enter");
    await expect(page.getByRole("status")).toContainText("¡Correcto!");
  });

  test("el reparto en decenas se completa con los botones", async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    // "Sumas y restas hasta 10" (aritmetica-d2) exige dominar antes aritmetica-d1.
    await otorgarDominio(correo, idDeHijo(page), ["aritmetica-d1"]);
    await page.goto(page.url().replace(/\/jugar\/([^/]+).*/, "/jugar/$1/aritmetica/aritmetica-d2"));
    await page.getByRole("tab", { name: /Práctica/ }).click();

    // El nivel 2 alterna entre recta numérica y reparto en decenas: se
    // recarga hasta que toque el reparto en vez de saltarse la prueba.
    const aDecena = page.getByRole("button", { name: "A la decena" });
    for (let intento = 0; intento < 15 && !(await aDecena.isVisible()); intento++) {
      await page.reload();
      await page.getByRole("tab", { name: /Práctica/ }).click();
    }
    await expect(aDecena).toBeVisible();

    const total = Number(
      (await page.getByText(/¿Cuántas decenas y sueltas hay en \d+\?/).innerText()).match(/\d+/)![0],
    );
    // Con la decena llena el botón se deshabilita: no se puede pasar de 10.
    for (let i = 0; i < 10; i++) await aDecena.click();
    await expect(aDecena).toBeDisabled();
    await expect(page.getByRole("button", { name: "A sueltas" })).toBeEnabled();
    for (let i = 0; i < total - 10; i++) {
      await page.getByRole("button", { name: "A sueltas" }).click();
    }
    // Al colocar la última ficha se contesta sola: la decena está bien hecha.
    await expect(page.getByRole("status")).toContainText("¡Correcto!");
  });

  test("la tabla de multiplicar se navega y activa con el teclado", async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    // "Multiplicación" (aritmetica-d5) exige dominar antes aritmetica-d3.
    await otorgarDominio(correo, idDeHijo(page), ["aritmetica-d3"]);
    await page.goto(page.url().replace(/\/jugar\/([^/]+).*/, "/jugar/$1/aritmetica/multiplicacion"));
    await expect(page).toHaveTitle("Multiplicación · Numerario");

    await page.getByRole("tab", { name: /Tabla/ }).click();
    await page.getByRole("button", { name: "7 por 8 igual a 56" }).press("Enter");

    await expect(page.getByRole("status")).toContainText("7 × 8 = 56");
    await expect(page.getByRole("button", { name: "7 por 8 igual a 56" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("la preferencia de sonido se recuerda al cambiar de pantalla", async ({ page }) => {
    await sesionDeHijo(page);
    const boton = page.getByRole("button", { name: "Efectos de sonido" });
    await expect(boton).toHaveAttribute("aria-pressed", "true");

    await boton.click();
    await expect(boton).toHaveAttribute("aria-pressed", "false");

    await irATema(page, "Medición y datos", /\/medicion$/);
    await expect(page.getByRole("button", { name: "Efectos de sonido" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await page.reload();
    await expect(page.getByRole("button", { name: "Efectos de sonido" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("pedir un canje deja la solicitud pendiente para el padre", async ({ page }) => {
    await sesionDeHijo(page, { nombre: "Dani", pin: "1357" });

    await page.goto(page.url().replace(/\/jugar\/([^/]+).*/, "/jugar/$1/aritmetica/aritmetica-d1"));
    await page.getByRole("tab", { name: /Práctica/ }).click();
    const enunciado = await page.getByText(/¿Cuánto es \d+ \+ \d+\?/).innerText();
    const objetivo = resolverEnunciado(enunciado)!;
    const recta = page.getByRole("slider");
    await recta.focus();
    let actual = Number(await recta.getAttribute("aria-valuenow"));
    while (actual !== objetivo) {
      await page.keyboard.press(actual < objetivo ? "ArrowRight" : "ArrowLeft");
      actual = Number(await recta.getAttribute("aria-valuenow"));
    }
    await page.getByRole("button", { name: "Responder" }).click();
    await expect(page.getByRole("button", { name: "Siguiente" })).toBeFocused();

    await page.getByRole("link", { name: /← Aritmética de Dani/ }).click();
    await page.getByRole("link", { name: "← Dani" }).click();

    await page.getByRole("button", { name: "Pedir canje" }).click();
    await page.getByLabel("¿Qué quieres canjear?").fill("Media hora de consola");
    await page.getByLabel(/¿Cuántas estrellas\?/).fill("1");
    await page.getByRole("button", { name: "Enviar" }).click();

    await expect(page.getByText("Media hora de consola · 1")).toBeVisible();
    await expect(page.getByText("Esperando aprobación")).toBeVisible();
  });
});

test.describe("Movimiento reducido", () => {
  // En esta versión de Playwright la preferencia va en las opciones de
  // contexto, no como opción suelta de test.use().
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("no se dibuja confeti si el sistema pide reducir movimiento", async ({ page }) => {
    await sesionDeHijo(page);
    await page.goto(page.url().replace(/\/jugar\/([^/]+).*/, "/jugar/$1/aritmetica/aritmetica-d1"));
    await page.getByRole("tab", { name: /Práctica/ }).click();

    const enunciado = await page.getByText(/¿Cuánto es \d+ \+ \d+\?/).innerText();
    const objetivo = resolverEnunciado(enunciado)!;
    const recta = page.getByRole("slider");
    await recta.focus();
    let actual = Number(await recta.getAttribute("aria-valuenow"));
    while (actual !== objetivo) {
      await page.keyboard.press(actual < objetivo ? "ArrowRight" : "ArrowLeft");
      actual = Number(await recta.getAttribute("aria-valuenow"));
    }
    await page.getByRole("button", { name: "Responder" }).click();

    await expect(page.getByRole("status")).toContainText("¡Correcto!");
    await expect(page.locator("canvas")).toHaveCount(0);
  });
});
