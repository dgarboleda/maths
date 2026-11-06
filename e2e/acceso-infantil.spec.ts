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
    // Sin sesión familiar no hay perfiles que elegir: el enlace no se ofrece.
    await expect(child.getByRole("link", { name: "Perfiles" })).toHaveCount(0);
    await child.getByRole("link", { name: "Comenzar mi primera clase" }).click();
    await child.getByRole("button", { name: "Ir a la clase", exact: true }).click();
    await expect(child.getByRole("heading", { name: "El cero separa dos sentidos" })).toBeVisible();
    await child.reload();
    await expect(child.getByRole("heading", { name: "El cero separa dos sentidos" })).toBeVisible();
    // La PWA abre en start_url "/": con sesión infantil va directo a su juego.
    await child.goto("/");
    await expect(child).toHaveURL(/\/jugar\/[^/]+$/);
  } finally { await context.close(); }
});

test("en el dispositivo familiar, entrar como hijo reemplaza la sesión de la familia", async ({ page }) => {
  await registrarPadre(page);
  const { nombre, pin } = await crearHijo(page, { nombre: "Teo" });
  const campo = page.getByRole("textbox", { name: `PIN de ${nombre}` });
  await page.getByRole("button", { name: `Entrar al perfil de ${nombre}` }).click();
  await campo.pressSequentially(pin);
  await campo.press("Enter");
  await expect(page).toHaveURL(/\/jugar\/[^/]+$/);
  const juego = new URL(page.url()).pathname;
  // Ni el panel ni la elección de perfiles quedan abiertos para el hijo.
  for (const ruta of ["/panel", "/perfiles", "/"]) {
    await page.goto(ruta);
    await expect(page).toHaveURL(new RegExp(`${juego}$`));
  }
});
