import { expect, type Page } from "@playwright/test";

export const CLAVE_PADRE = "secreto123";

/** Cada prueba usa su propia cuenta: así pueden correr en paralelo. */
export function correoDePrueba(): string {
  return `padre-${crypto.randomUUID()}@ejemplo.test`;
}

/** Crea una cuenta de padre nueva y deja la sesión abierta en /perfiles. */
export async function registrarPadre(page: Page): Promise<string> {
  const correo = correoDePrueba();
  await page.goto("/login");
  await page.getByRole("button", { name: /Créala/i }).click();
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill(CLAVE_PADRE);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "¿Quién va a jugar?" })).toBeVisible();
  return correo;
}

/** Da de alta un perfil de hijo desde /perfiles. */
export async function crearHijo(
  page: Page,
  { nombre = "Ana", pin = "1234", nacimiento = "2018-05-10" } = {},
): Promise<{ nombre: string; pin: string }> {
  await page.getByRole("button", { name: "Agregar hijo" }).click();
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByLabel("Fecha de nacimiento").fill(nacimiento);
  await page.getByLabel("PIN (4 dígitos)").fill(pin);
  await page.getByLabel("Confirmar PIN").fill(pin);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: `Entrar al perfil de ${nombre}` })).toBeVisible();
  return { nombre, pin };
}

/** Entra al perfil del hijo con su PIN y espera la pantalla de juego. */
export async function entrarAlPerfil(page: Page, nombre: string, pin: string): Promise<void> {
  await page.getByRole("button", { name: `Entrar al perfil de ${nombre}` }).click();
  await page.getByLabel(`PIN de ${nombre}`).fill(pin);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: `¡Hola, ${nombre}!` })).toBeVisible();
}

/** Atajo: cuenta nueva + hijo nuevo + sesión del hijo abierta. */
export async function sesionDeHijo(
  page: Page,
  opciones?: { nombre?: string; pin?: string; nacimiento?: string },
): Promise<{ nombre: string; pin: string }> {
  await registrarPadre(page);
  const hijo = await crearHijo(page, opciones);
  await entrarAlPerfil(page, hijo.nombre, hijo.pin);
  return hijo;
}

/**
 * Resuelve el enunciado cuando es una operación simple ("¿Cuánto es 3 + 4?").
 * Devuelve null si el enunciado no tiene esa forma, para que la prueba pueda
 * saltarse la parte que exige acertar.
 */
export function resolverEnunciado(prompt: string): number | null {
  const operacion = prompt.match(/(-?\d+(?:[.,]\d+)?)\s*([+\-−×÷*/])\s*(-?\d+(?:[.,]\d+)?)/);
  if (!operacion) return null;
  const a = Number(operacion[1].replace(",", "."));
  const b = Number(operacion[3].replace(",", "."));
  switch (operacion[2]) {
    case "+":
      return a + b;
    case "-":
    case "−":
      return a - b;
    case "×":
    case "*":
      return a * b;
    default:
      return b === 0 ? null : a / b;
  }
}
