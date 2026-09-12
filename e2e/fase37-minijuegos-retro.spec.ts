import { expect, test } from "@playwright/test";
import { idDeHijo, otorgarDominio, sembrarNivelConTerminal, sesionDeHijo } from "./utilidades";

/**
 * Fase 37 (docs/plan-minijuegos-retro.md) — confirma en un navegador real
 * que un `ChallengePlacement` con `activityId: "frogger"` llega hasta
 * `FroggerGeneric` a través de `nivel/[levelId]/page.tsx` → `LevelRuntime`
 * → `LevelActivityOverlay`, y que jugar de verdad (moverse con el teclado)
 * no revienta nada. La mecánica de juego en sí (cruzar, chocar, agotar
 * vidas) ya está probada a fondo en `FroggerGeneric.test.tsx` con timers y
 * candidatos determinísticos — acá, contra el generador real, no se apunta
 * a ganar, solo a que el cableado end-to-end funcione.
 */
test.describe("Actividades del nivel — Estanque de operaciones", () => {
  test('un desafío con activityId "frogger" abre el minijuego del estanque, no otra actividad', async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);
    await otorgarDominio(correo, childId, ["aritmetica-d2"]);
    const { levelId } = await sembrarNivelConTerminal(correo, "aritmetica-valor-posicional", {}, "frogger");

    await page.goto(`/jugar/${childId}/nivel/${levelId}`);
    await page.getByRole("button", { name: /^Terminal —/ }).click();

    await expect(page.getByText("¡Empezar!")).toBeVisible();
    await page.getByRole("button", { name: "¡Empezar!" }).click();

    // Juego real, sin apuntar a ganar: unas cuantas teclas contra el
    // generador real de preguntas, para confirmar que el bucle de juego
    // (movimiento + obstáculo) no revienta contra Firestore de verdad.
    await expect(page.getByText(/Vidas:/)).toBeVisible();
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(600);
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(600);
    await expect(page.getByText(/Vidas:/)).toBeVisible();

    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page.getByText("¡Empezar!")).not.toBeVisible();
  });
});
