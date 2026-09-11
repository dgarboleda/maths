import { expect, test } from "@playwright/test";
import { idDeHijo, sembrarMundoDeEjemplo, sesionDeHijo } from "./utilidades";

/**
 * Fase 30 (docs/plan-jugabilidad.md §4) — la intro del mundo (`world.story.
 * intro`) se muestra la primera vez que el hijo entra al hub, y no vuelve a
 * aparecer al recargar: `seenStoryIds` se escribe de verdad en el perfil.
 */
test.describe("La historia se ve", () => {
  test("la intro del mundo aparece una vez y no se repite al recargar", async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);
    await sembrarMundoDeEjemplo(correo, {
      intro: [{ id: "intro-1", speaker: "Dra. Nia", portrait: "/illustrations/ada-portrait.webp", text: "Bienvenido a Math Quest." }],
    });

    await page.goto(`/jugar/${childId}/mapa`);
    const dialogo = page.getByRole("dialog", { name: "Dra. Nia" });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByText("Bienvenido a Math Quest.")).toBeVisible();
    await dialogo.getByRole("button", { name: "Entendido" }).click();
    await expect(dialogo).not.toBeVisible();

    // Recargar: ya se marcó como vista, no debería volver a aparecer.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Math Quest" })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Dra. Nia" })).not.toBeVisible();
  });
});
