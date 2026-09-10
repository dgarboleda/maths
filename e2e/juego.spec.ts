import { expect, test } from "@playwright/test";
import { sesionDeHijo } from "./utilidades";

/**
 * Jugar — navegación real entre el mundo y un tema, y de vuelta. Junto con
 * `aventura.spec.ts` (resolver un desafío real, ver el AXIA subir), cubre el
 * recorrido núcleo de "jugar" (ver README §Pruebas). El resto de detalles de
 * interacción por teclado de cada tipo de control (recta numérica, balanza,
 * reparto en decenas, tabla de multiplicar), la preferencia de sonido y el
 * canje de recompensas ya no tienen su propio test e2e — son variaciones de
 * UI sobre el mismo mecanismo de "responder un desafío" que el recorrido
 * núcleo ya ejercita de punta a punta.
 */
test.describe("Recorrido de juego", () => {
  test("del perfil al tema, y de vuelta con los enlaces de la cabecera", async ({ page }) => {
    const { nombre } = await sesionDeHijo(page);
    // El briefing de la misión se abre solo al entrar: hay que cerrarlo antes
    // de poder tocar cualquier otra cosa de la escena.
    await page.getByRole("button", { name: "Comenzar a explorar ▸" }).click();

    await page.getByRole("button", { name: "Abrir registro de misión" }).click();
    await page.getByRole("link", { name: "Geometría" }).click();
    await expect(page).toHaveURL(/\/geometria$/);
    await expect(page).toHaveTitle("Geometría · Math Quest");
    await expect(page.getByText(/\d+\/\d+ temas dominados/)).toBeVisible();

    // "Lados de figuras" no tiene prerrequisitos: se puede entrar sin dominar
    // nada antes.
    await page.getByRole("link", { name: "Lados de figuras" }).click();
    await expect(page).toHaveURL(/\/geometria\/geometria-d1$/);
    await expect(page).toHaveTitle("Lados de figuras · Geometría · Math Quest");

    await page.getByRole("link", { name: `← Geometría de ${nombre}` }).click();
    await expect(page).toHaveURL(/\/geometria$/);
  });
});
