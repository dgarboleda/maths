import { test, expect } from "@playwright/test";
import { registrarPadre, crearHijo } from "./utilidades";

test("un navegador sin la sesión del padre entra con el callable real y su PIN", async ({ page, browser }, testInfo) => {
  await registrarPadre(page);
  await crearHijo(page, { nombre: "Sofía" });
  await page.goto("/panel/ajustes");
  const link = await page.getByRole("textbox", { name: "Enlace para entrar desde otro dispositivo" }).inputValue();
  const mobile = testInfo.project.name === "móvil";
  const context = await browser.newContext({ viewport: page.viewportSize(), isMobile: mobile, hasTouch: mobile });
  try {
    const child = await context.newPage();
    await child.goto(link);
    await child.getByRole("button", { name: "Entrar al perfil de Sofía" }).click();
    const pin = child.getByRole("textbox", { name: "PIN de Sofía" });
    const dialog = child.getByRole("dialog", { name: "PIN de Sofía" });
    await expect(dialog.locator("input, textarea, [contenteditable], form")).toHaveCount(0);
    for (let i = 0; i < 4; i++) await dialog.getByRole("button", { name: "0", exact: true }).click();
    await dialog.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(child.getByText("PIN incorrecto", { exact: true })).toBeVisible();
    await expect(pin).toBeFocused();
    await pin.pressSequentially("1234");
    await pin.press("Enter");
    await expect(child).toHaveURL(/\/jugar\/[^/]+$/);
    await expect(child.getByRole("heading", { name: "Hola, Sofía. ¿Qué vamos a descubrir?" })).toBeVisible();
    await child.getByRole("link", { name: "Comenzar mi primera clase" }).click();
    await child.getByRole("button", { name: "Ir a la clase", exact: true }).click();
    await expect(child.getByRole("heading", { name: "El cero separa dos sentidos" })).toBeVisible();
    await child.reload();
    await expect(child.getByRole("heading", { name: "El cero separa dos sentidos" })).toBeVisible();
  } finally { await context.close(); }
});
