import { expect, test } from "@playwright/test";
import { idDeHijo, sembrarMundoDeEjemplo, sesionDeHijo } from "./utilidades";

/**
 * Fase 32 (docs/plan-jugabilidad.md §6) — el niño elige su avatar desde el
 * hub, no el padre desde Ajustes: el retrato del HUD es ahora un botón que
 * abre `AvatarPickerDialog`, y elegir uno nuevo lo refleja sin recargar
 * (`useResolvedAvatar` releía el `avatarId` una sola vez al montar).
 */
test.describe("El niño elige su avatar", () => {
  test("cambiar de avatar desde el hub actualiza el retrato del HUD sin recargar", async ({ page }) => {
    const { nombre, correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);
    await sembrarMundoDeEjemplo(correo, {}, {
      defaultAvatarId: "explorador",
      avatars: [
        { id: "explorador", label: "Explorador", bodySrc: "/illustrations/explorer.webp", headshotSrc: "/illustrations/avatar.webp", scale: 1, unlock: { kind: "always" } },
        { id: "guia", label: "Guía", bodySrc: "/illustrations/nia-standing.webp", headshotSrc: "/illustrations/nia-portrait.webp", scale: 1, unlock: { kind: "always" } },
      ],
    });

    await page.goto(`/jugar/${childId}/mapa`);
    const retrato = page.getByRole("button", { name: `Cambiar el avatar de ${nombre}` });
    await expect(retrato).toBeVisible();
    await expect(retrato.locator("img")).toHaveAttribute("src", /avatar\.webp/);

    await retrato.click();
    const dialogo = page.getByRole("dialog", { name: `Avatar de ${nombre}` });
    await expect(dialogo).toBeVisible();
    await dialogo.getByRole("button", { name: "Guía" }).click();
    await expect(dialogo).not.toBeVisible();

    // Sin recargar: el retrato del HUD ya muestra el elegido.
    await expect(retrato.locator("img")).toHaveAttribute("src", /nia-portrait\.webp/);
  });
});
