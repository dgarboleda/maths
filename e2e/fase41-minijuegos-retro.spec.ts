import { expect, test } from "@playwright/test";
import { idDeHijo, otorgarDominio, sembrarNivelConTerminal, sesionDeHijo } from "./utilidades";

/**
 * Fase 41 (docs/plan-minijuegos-retro.md) — confirma en un navegador real
 * que un `ChallengePlacement` con `activityId: "breakout"` llega hasta
 * `BreakoutGeneric` a través de `nivel/[levelId]/page.tsx` → `LevelRuntime`
 * → `LevelActivityOverlay`, y que la física (pelota + paleta) no revienta
 * nada jugando de verdad. La colisión en sí ya está probada sin timers en
 * `breakoutPhysics.test.ts`, y el cableado del juego en
 * `BreakoutGeneric.test.tsx` — acá, contra el generador real, no se apunta
 * a ganar, solo a que el cableado end-to-end funcione.
 */
test.describe("Actividades del nivel — Bloques numéricos", () => {
  test('un desafío con activityId "breakout" abre el minijuego de bloques, no otra actividad', async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);
    await otorgarDominio(correo, childId, ["aritmetica-d2"]);
    const { levelId } = await sembrarNivelConTerminal(correo, "aritmetica-valor-posicional", {}, "breakout");

    await page.goto(`/jugar/${childId}/nivel/${levelId}`);
    await page.getByRole("button", { name: /^Terminal —/ }).click();

    await expect(page.getByText("¡Empezar!")).toBeVisible();
    await page.getByRole("button", { name: "¡Empezar!" }).click();

    // Juego real, sin apuntar a ganar: deja correr la física unos segundos
    // y mueve la paleta, para confirmar que el bucle no revienta.
    await expect(page.getByText(/Vidas:/)).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(3000);
    await expect(page.getByText(/Vidas:/)).toBeVisible();

    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page.getByText("¡Empezar!")).not.toBeVisible();
  });
});
