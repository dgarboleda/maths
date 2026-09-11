import { expect, test } from "@playwright/test";
import { idDeHijo, otorgarDominio, sembrarNivelConTerminal, sesionDeHijo } from "./utilidades";

/**
 * Fase 29 (docs/plan-jugabilidad.md §3) — confirma en un navegador real, no
 * solo en el componente aislado (`PuzzleOverlay.test.tsx`), que las
 * `WorldRules` guardadas en Firestore llegan de verdad hasta `PuzzleOverlay`
 * a través de `nivel/[levelId]/page.tsx` → `LevelRuntime` →
 * `LevelChallengeOverlay`. La respuesta correcta real no hace falta
 * calcularla: alcanza con un número siempre incorrecto para ejercitar el
 * camino de reintento hasta agotarlo.
 */
test.describe("Reglas del Mundo — reintentos", () => {
  test("maxAttemptsPerChallenge: 2 permite un reintento antes de revelar el resultado", async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);
    // "aritmetica-valor-posicional" pide aritmetica-d2 como prerrequisito.
    await otorgarDominio(correo, childId, ["aritmetica-d2"]);
    const { levelId } = await sembrarNivelConTerminal(correo, "aritmetica-valor-posicional", {
      maxAttemptsPerChallenge: 2,
      hintsAfterAttempts: 0,
    });

    await page.goto(`/jugar/${childId}/nivel/${levelId}`);
    await page.getByRole("button", { name: /^Terminal —/ }).click();
    const ficha = page.getByRole("dialog", { name: "Terminal" });
    await expect(ficha).toBeVisible();

    // El input real se etiqueta con `aria-labelledby` al enunciado (pisa el
    // `aria-label="Tu respuesta"` por precedencia ARIA) — un solo textbox
    // en la ficha, así que `getByRole` alcanza sin ambigüedad.
    const respuesta = ficha.getByRole("textbox");

    // Primer fallo: con un intento restante, no revela el resultado —
    // ofrece reintentar.
    await respuesta.fill("999999");
    await ficha.getByRole("button", { name: "Comprobar" }).click();
    await expect(ficha.getByText(/inténtalo de nuevo/i)).toBeVisible();
    await expect(ficha.getByText(/CÓDIGO RECHAZADO/)).not.toBeVisible();

    // Segundo fallo: se agotaron los intentos — ahora sí revela. `respuesta`
    // se re-resuelve sola: el control se remontó (nuevo `key`) entre intentos.
    await respuesta.fill("999999");
    await ficha.getByRole("button", { name: "Comprobar" }).click();
    await expect(ficha.getByText(/CÓDIGO RECHAZADO/)).toBeVisible();
  });
});
