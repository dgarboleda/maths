import { expect, test } from "@playwright/test";
import { idDeHijo, otorgarDominio, sembrarNivelConTerminal, sesionDeHijo } from "./utilidades";

/**
 * Fase 38 (docs/plan-minijuegos-retro.md) — confirma en un navegador real
 * que un `ChallengePlacement` con `activityId: "runner"` llega hasta
 * `RunnerGeneric` a través de `nivel/[levelId]/page.tsx` → `LevelRuntime` →
 * `LevelActivityOverlay`, y que jugar de verdad no revienta nada. La
 * mecánica de juego en sí ya está probada a fondo en
 * `RunnerGeneric.test.tsx` con timers y candidatos determinísticos — acá,
 * contra el generador real, no se apunta a ganar, solo a que el cableado
 * end-to-end funcione.
 */
test.describe("Actividades del nivel — Autopista de resultados", () => {
  test('un desafío con activityId "runner" abre el minijuego de la autopista, no otra actividad', async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);
    await otorgarDominio(correo, childId, ["aritmetica-d2"]);
    const { levelId } = await sembrarNivelConTerminal(correo, "aritmetica-valor-posicional", {}, "runner");

    await page.goto(`/jugar/${childId}/nivel/${levelId}`);
    await page.getByRole("button", { name: /^Terminal —/ }).click();

    await expect(page.getByText("¡Empezar!")).toBeVisible();
    await page.getByRole("button", { name: "¡Empezar!" }).click();

    // Juego real, sin apuntar a ganar: el avance es automático, solo se
    // prueba el cambio de carril contra el generador real de preguntas.
    await expect(page.getByText(/Vidas:/)).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(3000); // deja pasar una puerta completa
    await expect(page.getByText(/Vidas:/)).toBeVisible();

    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page.getByText("¡Empezar!")).not.toBeVisible();
  });
});
