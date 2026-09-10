import { expect, test } from "@playwright/test";
import { resolverEnunciado, sesionDeHijo } from "./utilidades";

/**
 * Jugar — uno de los recorridos núcleo de la app (ver README §Pruebas):
 * entrar al mundo, resolver un desafío académico real y ver el saldo de
 * AXIA subir de verdad. Prueba la Ciudad Central *original* (`QuestScene`)
 * en su ruta de regresión `/jugar/{childId}/ciudad-central-legacy` — sigue
 * siendo el motor por defecto que ejercitan `sesionDeHijo`/`entrarAlPerfil`.
 * El resto de la narrativa (Boss Challenge, eventos especiales, celebración
 * de mastery, objetos bloqueados, diario de misiones) ya no tiene su propio
 * test — eran variaciones sobre el mismo mecanismo que esta suite ya prueba
 * de punta a punta.
 */
test.describe("Mundo: Ciudad Central (misión «El apagón»)", () => {
  test("hablar con la Dra. Nia desbloquea la terminal, y resolverla guarda el intento real", async ({ page }) => {
    await sesionDeHijo(page);
    const estrellas = page.locator("header").getByText(/^AXIA:\s*-?\d+$/);
    await expect(estrellas).toHaveText("AXIA: 0");

    // El briefing de misión abre la partida.
    await page.getByRole("button", { name: "Comenzar a explorar ▸" }).click();

    // La Dra. Nia es el primer paso: la primera vez incluye la presentación
    // de Khaos (NIA_ORIGIN_INTRO, 3 líneas — el origen de AXIA ya se contó
    // al terminar la evaluación) antes de las 3 del apagón — siempre se
    // puede volver a saludar (no es un objetivo con moduleId real).
    await page.getByRole("button", { name: /^Dra\. Nia —/ }).click();
    const dialogoNia = page.getByRole("dialog", { name: "Dra. Nia" });
    await expect(dialogoNia).toBeVisible();
    await expect(dialogoNia.getByText(/no pasó desapercibido/)).toBeVisible();
    for (let i = 0; i < 5; i++) {
      await dialogoNia.getByRole("button", { name: "Continuar ▸" }).click();
    }
    await dialogoNia.getByRole("button", { name: "¡Voy a por el código!" }).click();
    await expect(dialogoNia).not.toBeVisible();

    // La terminal (aritmetica-d1) queda disponible: resolverla es un intento real.
    await page.getByRole("button", { name: /^Terminal de acceso —/ }).click();
    const ficha = page.getByRole("dialog", { name: "Terminal de acceso" });
    await expect(ficha).toBeVisible();

    const enunciado = await ficha.getByText(/¿Cuánto es \d+ \+ \d+\?/).innerText();
    const objetivo = resolverEnunciado(enunciado)!;
    const recta = ficha.getByRole("slider");
    await recta.focus();
    let actual = Number(await recta.getAttribute("aria-valuenow"));
    while (actual !== objetivo) {
      await page.keyboard.press(actual < objetivo ? "ArrowRight" : "ArrowLeft");
      actual = Number(await recta.getAttribute("aria-valuenow"));
    }
    await ficha.getByRole("button", { name: "Responder" }).click();

    // Dos textos coinciden con "CÓDIGO ACEPTADO": el propio de la ficha de
    // terminal (con el código) y el de consecuencia narrativa del hotspot.
    await expect(ficha.getByText(/CÓDIGO ACEPTADO: \d/)).toBeVisible();
    await ficha.getByRole("button", { name: "Seguir explorando" }).click();

    // El intento se guardó de verdad: el saldo sale de starLedger, no del mundo.
    await expect(estrellas).not.toHaveText("AXIA: 0");
  });

  test("Tu próximo desafío enlaza al módulo real recomendado, no a un id inventado", async ({ page }) => {
    await sesionDeHijo(page);
    await page.getByRole("button", { name: "Comenzar a explorar ▸" }).click();

    const desafio = page.getByRole("link", { name: /Tu próximo desafío/ });
    await expect(desafio).toBeVisible();
    await expect(desafio).toContainText("Sumas hasta 5");
    await desafio.click();
    // El destino es el moduleId real de la currícula, no un "missionId" aparte.
    await expect(page).toHaveURL(/\/aritmetica\/aritmetica-d1$/);
    await expect(page.getByRole("heading", { name: "Sumas hasta 5" })).toBeVisible();
  });
});
