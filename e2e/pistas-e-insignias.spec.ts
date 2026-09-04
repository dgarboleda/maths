import { expect, test } from "@playwright/test";
import { idDeHijo, otorgarInsignia, resolverEnunciado, sesionDeHijo } from "./utilidades";

test.describe("Pistas y penalización de estrellas", () => {
  test("pedir las 3 pistas reduce las estrellas ganadas, sin impedir responder", async ({ page }) => {
    await sesionDeHijo(page);

    await page.goto(page.url().replace(/\/jugar\/([^/]+).*/, "/jugar/$1/aritmetica/aritmetica-d1"));
    await page.getByRole("tab", { name: /Práctica/ }).click();

    const pedirPista = page.getByRole("button", { name: /Pedir pista/ });
    await expect(pedirPista).toBeVisible();

    await pedirPista.click();
    await expect(page.getByText(/Piensa en juntar/)).toBeVisible();

    await page.getByRole("button", { name: /Pista 2/ }).click();
    await expect(page.getByText(/avanza/)).toBeVisible();

    await page.getByRole("button", { name: /Pista 3/ }).click();
    await expect(page.getByText(/\d+ \+ \d+ = \d+\./)).toBeVisible();

    const sinMasPistas = page.getByRole("button", { name: "Sin más pistas" });
    await expect(sinMasPistas).toBeDisabled();

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

    // difficulty 1 sin pistas daría 2 estrellas; con las 3 pistas usadas
    // (piso de penalización 25%) da 1 — nunca 0, nunca bloquea la respuesta.
    await expect(page.locator("header").getByText(/^Estrellas:\s*1$/)).toBeVisible();
  });
});

test.describe("Insignias", () => {
  test("una insignia otorgada aparece en el hub del niño y en el panel del padre", async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);

    await otorgarInsignia(correo, childId, "resolutor");

    await page.goto(`/jugar/${childId}`);
    const insigniaHub = page.getByRole("listitem").filter({ hasText: "Resolutor" });
    await expect(insigniaHub).toBeVisible();
    await expect(insigniaHub).toContainText("🧠");

    await page.goto(`/panel/${childId}`);
    const filaResolutor = page.locator("li", { hasText: "Resolutor" });
    await expect(filaResolutor).toBeVisible();
    await expect(filaResolutor).toHaveClass(/border-amber-400\/30/);

    const filaRapido = page.locator("li", { hasText: "Rápido" });
    await expect(filaRapido).not.toHaveClass(/border-amber-400\/30/);
  });
});
