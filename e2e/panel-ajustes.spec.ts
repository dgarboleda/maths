import { expect, test } from "@playwright/test";
import { contarDocumentos, crearHijo, otorgarDominio, registrarPadre } from "./utilidades";

test.describe("Ajustes: borrar perfil", () => {
  test("un padre puede borrar el perfil de un hijo, con confirmación por nombre", async ({ page }) => {
    const correo = await registrarPadre(page);
    const { nombre } = await crearHijo(page);

    await page.goto("/panel/hijos");
    await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
    const href = await page.getByRole("link", { name: "Ver detalle" }).getAttribute("href");
    const childId = href!.split("/").pop()!;

    // Progreso real sembrado antes de borrar: confirma que "borra todo su
    // progreso" no deja huérfanos en skillsProgress (Firestore no borra
    // subcolecciones en cascada).
    await otorgarDominio(correo, childId, ["aritmetica-d1"]);
    expect(await contarDocumentos(correo, childId, "skillsProgress")).toBe(1);

    await page.goto("/panel/ajustes");
    await page.getByRole("button", { name: "Borrar perfil" }).click();
    const dialogo = page.getByRole("dialog", { name: `Borrar perfil de ${nombre}` });
    await expect(dialogo).toBeVisible();

    // Deshabilitado hasta escribir el nombre exacto — sin candados de
    // confirmación falsos: el botón real solo se habilita con el texto real.
    const confirmar = dialogo.getByRole("button", { name: "Borrar perfil" });
    await expect(confirmar).toBeDisabled();
    await dialogo.getByLabel(/Escribe/).fill("nombre incorrecto");
    await expect(confirmar).toBeDisabled();
    await dialogo.getByLabel(/Escribe/).fill(nombre);
    await expect(confirmar).toBeEnabled();
    await confirmar.click();

    await expect(dialogo).not.toBeVisible();
    await expect(page.getByText("Todavía no hay perfiles de hijos creados.")).toBeVisible();

    // No es solo la lista en memoria: el perfil ya no existe en Firestore.
    await page.goto(`/jugar/${childId}`);
    await expect(page.getByText("No encontré ese perfil.")).toBeVisible();

    // Tampoco quedó huérfano el progreso que se sembró antes de borrar.
    expect(await contarDocumentos(correo, childId, "skillsProgress")).toBe(0);
  });

  test("cancelar el diálogo de borrado no toca el perfil", async ({ page }) => {
    await registrarPadre(page);
    const { nombre } = await crearHijo(page);

    await page.goto("/panel/ajustes");
    await page.getByRole("button", { name: "Borrar perfil" }).click();
    const dialogo = page.getByRole("dialog", { name: `Borrar perfil de ${nombre}` });
    await dialogo.getByLabel(/Escribe/).fill(nombre);
    await dialogo.getByRole("button", { name: "Cancelar" }).click();

    await expect(dialogo).not.toBeVisible();
    await expect(page.getByText(nombre)).toBeVisible();
  });
});
