import { expect, test } from "@playwright/test";
import { CLAVE_PADRE, correoDePrueba, crearHijo, registrarPadre } from "./utilidades";

test.describe("Acceso de la familia", () => {
  test("la raíz manda a /login cuando no hay sesión", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page).toHaveTitle("Entrar · Math Quest");
  });

  test("un padre se registra y llega a la lista de perfiles", async ({ page }) => {
    await registrarPadre(page);
    await expect(page).toHaveURL(/\/perfiles$/);
    await expect(page).toHaveTitle("¿Quién va a jugar? · Math Quest");
  });

  test("las credenciales incorrectas se anuncian como alerta", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Correo").fill(correoDePrueba());
    await page.getByLabel("Contraseña").fill("noExisteEstaClave");
    await page.getByRole("button", { name: "Entrar" }).click();

    // Se busca dentro del contenido: fuera vive el anunciador de rutas de
    // Next, que también es role="alert".
    const alerta = page.locator("main").getByRole("alert");
    await expect(alerta).toBeVisible();
    await expect(alerta).toHaveText("Correo o contraseña incorrectos.");
  });

  test("el PIN equivocado no deja entrar al perfil y avisa", async ({ page }) => {
    await registrarPadre(page);
    const { nombre } = await crearHijo(page, { nombre: "Bruno", pin: "4321" });

    await page.getByRole("button", { name: `Entrar al perfil de ${nombre}` }).click();
    await page.getByLabel(`PIN de ${nombre}`).fill("1111");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.locator("main").getByRole("alert")).toHaveText("PIN incorrecto");
    await expect(page).toHaveURL(/\/perfiles$/);
  });

  test("cerrar sesión devuelve al login", async ({ page }) => {
    await registrarPadre(page);
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("el panel de padre lista al hijo recién creado", async ({ page }) => {
    await registrarPadre(page);
    await crearHijo(page, { nombre: "Carla", pin: "2468" });

    await page.getByRole("link", { name: "Panel de padre" }).click();
    await expect(page).toHaveTitle("Panel de padre · Math Quest");
    await expect(page.getByRole("region", { name: "Progreso de Carla" })).toBeVisible();
    await expect(page.getByText("Todavía no hay actividad.")).toBeVisible();
  });

  test("el enlace de saltar al contenido es lo primero que recibe el foco", async ({ page }) => {
    await page.goto("/login");
    await page.keyboard.press("Tab");

    const enlace = page.getByRole("link", { name: "Saltar al contenido" });
    await expect(enlace).toBeFocused();
    await enlace.press("Enter");
    await expect(page.locator("#contenido")).toBeFocused();
  });

  test("la contraseña usa el autocompletado correcto en cada modo", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Contraseña")).toHaveAttribute("autocomplete", "current-password");
    await page.getByRole("button", { name: /Créala/i }).click();
    await expect(page.getByLabel("Contraseña")).toHaveAttribute("autocomplete", "new-password");
    await expect(page.getByLabel("Contraseña")).toHaveValue("");
    await page.getByLabel("Contraseña").fill(CLAVE_PADRE);
  });
});
