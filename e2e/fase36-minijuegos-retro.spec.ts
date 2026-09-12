import { expect, test } from "@playwright/test";
import { idDeHijo, otorgarDominio, sembrarNivelConTerminal, sesionDeHijo } from "./utilidades";

/**
 * Fase 36 (docs/plan-minijuegos-retro.md) — confirma en un navegador real
 * que un `ChallengePlacement` con `activityId: "snake"` (guardado en
 * Firestore, no un fixture aislado) llega hasta `SnakeGeneric` a través de
 * `nivel/[levelId]/page.tsx` → `LevelRuntime` → `LevelActivityOverlay`, y
 * que jugar de verdad (moverse con el teclado) no revienta nada. El
 * despacho puzzle/cohete/snake y la protección de Play Test ya están
 * probados a fondo en `LevelActivityOverlay.test.tsx`; la mecánica de juego
 * en sí (ganar, chocar, comer un número incorrecto) ya está probada a fondo
 * en `SnakeGeneric.test.tsx` con una grilla determinística — acá, contra el
 * generador real (sin mockear), no se apunta a ganar, solo a que el
 * cableado end-to-end funcione.
 */
test.describe("Actividades del nivel — Serpiente numérica", () => {
  test('un desafío con activityId "snake" abre el minijuego de la serpiente, no otra actividad', async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);
    await otorgarDominio(correo, childId, ["aritmetica-d2"]);
    const { levelId } = await sembrarNivelConTerminal(correo, "aritmetica-valor-posicional", {}, "snake");

    await page.goto(`/jugar/${childId}/nivel/${levelId}`);
    await page.getByRole("button", { name: /^Terminal —/ }).click();

    // Es la Serpiente, no el Cohete ni la ficha de PuzzleOverlay.
    await expect(page.getByText("¡Empezar!")).toBeVisible();
    await page.getByRole("button", { name: "¡Empezar!" }).click();

    // Juego real, sin apuntar a ganar: unas cuantas teclas de dirección
    // contra el generador real de preguntas, para confirmar que el bucle de
    // juego no revienta contra Firestore de verdad.
    await expect(page.getByText(/Aciertos:/)).toBeVisible();
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(600);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(600);
    await expect(page.getByText(/Aciertos:/)).toBeVisible();

    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page.getByText("¡Empezar!")).not.toBeVisible();
  });
});
