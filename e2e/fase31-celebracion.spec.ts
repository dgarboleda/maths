import { expect, test } from "@playwright/test";
import { idDeHijo, otorgarDominio, resolverEnunciado, sembrarNivelConTerminal, sesionDeHijo } from "./utilidades";

/**
 * Fase 31 (docs/plan-jugabilidad.md §5) — criterio de aceptación del plan:
 * "con una misión de 1 objetivo, resolverlo monta el overlay de
 * recompensa". `MissionRewardOverlay` estaba huérfana (rescatada de
 * `QuestOverlays.RewardOverlay`, Ciudad Central legacy) hasta esta fase:
 * `ON_MISSION_COMPLETE` ya se emitía desde la Fase 29, pero nada la montaba.
 */
test.describe("Celebración de misión", () => {
  test("resolver el único desafío de la misión monta MissionRewardOverlay", async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);
    await otorgarDominio(correo, childId, ["aritmetica-d3", "aritmetica-valor-posicional"]);
    const { levelId } = await sembrarNivelConTerminal(correo, "aritmetica-d4");

    await page.goto(`/jugar/${childId}/nivel/${levelId}`);
    await page.getByRole("button", { name: /^Terminal —/ }).click();
    const ficha = page.getByRole("dialog", { name: "Terminal" });
    await expect(ficha).toBeVisible();

    const enunciado = await ficha.getByText(/¿Cuánto es .+\?/).innerText();
    const respuesta = resolverEnunciado(enunciado)!;
    await ficha.getByRole("textbox").fill(String(respuesta));
    await ficha.getByRole("button", { name: "Comprobar" }).click();
    await expect(ficha.getByText(/CÓDIGO ACEPTADO/)).toBeVisible();
    await ficha.getByRole("button", { name: "Seguir explorando" }).click();

    // "Sala con terminal" tiene una sola misión con un solo objetivo (ese
    // desafío): resolverlo la completa — MissionRewardOverlay debe montarse
    // sola, sin más interacción.
    const recompensa = page.getByRole("dialog", { name: "Repara la terminal" });
    await expect(recompensa).toBeVisible();
    await expect(recompensa.getByText(/Lo lograste/)).toBeVisible();
    await recompensa.getByRole("button", { name: "¡Genial!" }).click();
    await expect(recompensa).not.toBeVisible();
  });
});
