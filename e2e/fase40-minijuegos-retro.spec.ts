import { expect, test } from "@playwright/test";
import { idDeHijo, otorgarDominio, sembrarNivelConTerminal, sesionDeHijo } from "./utilidades";

/**
 * Fase 40 (docs/plan-minijuegos-retro.md) — confirma en un navegador real
 * que un `ChallengePlacement` con `activityId: "invaders"` llega hasta
 * `InvadersGeneric` a través de `nivel/[levelId]/page.tsx` → `LevelRuntime`
 * → `LevelActivityOverlay`, y que jugar de verdad no revienta nada. La
 * mecánica de juego en sí ya está probada a fondo en
 * `InvadersGeneric.test.tsx` con candidatos determinísticos — acá, contra
 * el generador real, no se apunta a ganar, solo a que el cableado
 * end-to-end funcione.
 */
test.describe("Actividades del nivel — Invasión numérica", () => {
  test('un desafío con activityId "invaders" abre el minijuego de la invasión, no otra actividad', async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);
    await otorgarDominio(correo, childId, ["aritmetica-d2"]);
    const { levelId } = await sembrarNivelConTerminal(correo, "aritmetica-valor-posicional", {}, "invaders");

    await page.goto(`/jugar/${childId}/nivel/${levelId}`);
    await page.getByRole("button", { name: /^Terminal —/ }).click();

    await expect(page.getByText("¡Empezar!")).toBeVisible();
    await page.getByRole("button", { name: "¡Empezar!" }).click();

    // Juego real, sin apuntar a ganar: dispara una vez contra el generador
    // real de preguntas, para confirmar que el cableado no revienta.
    await expect(page.getByText(/Vidas:/)).toBeVisible();
    await page.getByRole("button", { name: "Disparar (espacio)" }).click();
    await expect(page.getByText(/Vidas:/)).toBeVisible();

    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page.getByText("¡Empezar!")).not.toBeVisible();
  });
});
