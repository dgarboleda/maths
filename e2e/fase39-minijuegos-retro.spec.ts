import { expect, test } from "@playwright/test";
import { idDeHijo, otorgarDominio, sembrarNivelConTerminal, sesionDeHijo } from "./utilidades";

/**
 * Fase 39 (docs/plan-minijuegos-retro.md) — confirma en un navegador real
 * que un `ChallengePlacement` con `activityId: "pacman"` llega hasta
 * `NumberPacGeneric` a través de `nivel/[levelId]/page.tsx` → `LevelRuntime`
 * → `LevelActivityOverlay`, y que jugar de verdad no revienta nada. La
 * mecánica de juego en sí ya está probada a fondo en
 * `NumberPacGeneric.test.tsx` con timers y candidatos determinísticos — acá,
 * contra el generador real, no se apunta a ganar, solo a que el cableado
 * end-to-end funcione.
 */
test.describe("Actividades del nivel — Laberinto de números", () => {
  test('un desafío con activityId "pacman" abre el minijuego del laberinto, no otra actividad', async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);
    await otorgarDominio(correo, childId, ["aritmetica-d2"]);
    const { levelId } = await sembrarNivelConTerminal(correo, "aritmetica-valor-posicional", {}, "pacman");

    await page.goto(`/jugar/${childId}/nivel/${levelId}`);
    await page.getByRole("button", { name: /^Terminal —/ }).click();

    await expect(page.getByText("¡Empezar!")).toBeVisible();
    await page.getByRole("button", { name: "¡Empezar!" }).click();

    await expect(page.getByText(/Vidas:/)).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(600);
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(600);
    await expect(page.getByText(/Vidas:/)).toBeVisible();

    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page.getByText("¡Empezar!")).not.toBeVisible();
  });
});
