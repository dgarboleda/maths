import { expect, test } from "@playwright/test";
import { idDeHijo, otorgarDominio, sembrarNivelConTerminal, sesionDeHijo } from "./utilidades";

/**
 * Fase 33 (docs/plan-jugabilidad.md §7) — confirma en un navegador real que
 * un `ChallengePlacement` con `activityId: "cohete"` (guardado en
 * Firestore, no un fixture aislado) llega hasta `CoheteGeneric` a través de
 * `nivel/[levelId]/page.tsx` → `LevelRuntime` → `LevelActivityOverlay`, y
 * que responder de verdad no revienta nada. El despacho puzzle/cohete y la
 * protección de Play Test ya están probados a fondo en
 * LevelActivityOverlay.test.tsx.
 */
test.describe("Actividades del nivel", () => {
  test('un desafío con activityId "cohete" abre el minijuego de contrarreloj, no la ficha de siempre', async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);
    await otorgarDominio(correo, childId, ["aritmetica-d2"]);
    const { levelId } = await sembrarNivelConTerminal(correo, "aritmetica-valor-posicional", {}, "cohete");

    await page.goto(`/jugar/${childId}/nivel/${levelId}`);
    await page.getByRole("button", { name: /^Terminal —/ }).click();

    // Es el Cohete, no la ficha de PuzzleOverlay (que no tiene este botón).
    await expect(page.getByText("¡Iniciar misión!")).toBeVisible();

    await page.getByRole("button", { name: "¡Iniciar misión!" }).click();
    const respuesta = page.getByRole("textbox");
    await expect(respuesta).toBeVisible();

    // Un fallo real: se escribe el intento (0 estrellas) y el juego sigue
    // sin romperse — no hace falta acertar para probar el cableado.
    await respuesta.fill("999999");
    await page.getByRole("button", { name: "Comprobar" }).click();
    await expect(page.getByText(/⏱️|Tiempo/)).toBeVisible();

    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page.getByText("¡Iniciar misión!")).not.toBeVisible();
  });
});
