import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { CLAVE_PADRE, crearHijo, registrarPadre } from "./utilidades";

test("privacidad y términos son públicos, legibles y accesibles", async ({ page }) => {
  for (const [ruta, titulo] of [["/privacidad", "Política de privacidad"], ["/terminos", "Términos de uso"]]) {
    await page.goto(ruta);
    await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
    expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  }
});

test("crear cuenta exige el consentimiento; olvidar la contraseña no revela si el correo existe", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Créala/i }).click();
  const crear = page.getByRole("button", { name: "Crear cuenta" });
  await expect(crear).toBeDisabled();
  await page.getByRole("checkbox", { name: /tutor legal/ }).check();
  await expect(crear).toBeEnabled();
  await page.getByRole("button", { name: /Ya tienes cuenta/ }).click();
  await page.getByRole("button", { name: "¿Olvidaste tu contraseña?" }).click();
  await expect(page.getByLabel("Contraseña")).toHaveCount(0);
  await page.getByLabel("Correo").fill(`nadie-${crypto.randomUUID()}@example.test`);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByRole("status")).toContainText("Si hay una cuenta con ese correo");
});

test("borrar la cuenta pide la contraseña y elimina el acceso", async ({ page }) => {
  test.setTimeout(120_000);
  const correo = await registrarPadre(page);
  await crearHijo(page, { nombre: "Leo" });
  await page.goto("/panel/ajustes");
  await page.getByRole("button", { name: "Borrar cuenta" }).click();
  const dialogo = page.getByRole("dialog", { name: "Borrar la cuenta" });
  const borrar = dialogo.getByRole("button", { name: "Borrar cuenta" });
  await dialogo.getByLabel("Tu contraseña").fill("incorrecta");
  await dialogo.getByLabel(/para confirmar/).fill("BORRAR");
  await borrar.click();
  await expect(dialogo.getByRole("alert")).toHaveText("La contraseña no es correcta.");
  await dialogo.getByLabel("Tu contraseña").fill(CLAVE_PADRE);
  await borrar.click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 60_000 });
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill(CLAVE_PADRE);
  await page.getByRole("button", { name: "Entrar al panel" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Correo o contraseña incorrectos." })).toBeVisible();
});

test("las respuestas llevan cabeceras de seguridad y la CSP no bloquea nada de la app", async ({ page }) => {
  const violaciones: string[] = [];
  page.on("console", (msg) => { if (/Content Security Policy|Refused to/i.test(msg.text())) violaciones.push(msg.text()); });
  const respuesta = await page.goto("/login");
  const cabeceras = respuesta!.headers();
  expect(cabeceras["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(cabeceras["x-content-type-options"]).toBe("nosniff");
  expect(cabeceras["x-frame-options"]).toBe("DENY");
  expect(cabeceras["x-powered-by"]).toBeUndefined();
  // Recorrido con Auth, Firestore y Functions: cualquier origen no permitido aparecería aquí.
  await registrarPadre(page);
  await crearHijo(page, { nombre: "Ada" });
  expect(violaciones).toEqual([]);
});
