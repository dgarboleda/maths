import { expect, test } from "@playwright/test";
import { idDeHijo, otorgarDominio, sembrarMundoDeEjemplo, sembrarNivelConTerminal, sesionDeHijo } from "./utilidades";

/**
 * Hub del jugador (`/mapa`) — Fase 28 (docs/plan-jugabilidad.md §2). Antes
 * de esta fase, boss, diario, tienda y zonas solo eran alcanzables desde
 * `ciudad-central-legacy`, una ruta sin ningún enlace de producción: un
 * niño jugando normal nunca llegaba ahí. Esta prueba entra directo a
 * `/mapa` (un mundo real, sembrado en Firestore, sin pasar por la ruta
 * legacy) y confirma que esas superficies están reconectadas y navegan.
 */
test.describe("Hub del jugador", () => {
  test("desde /mapa se llega a zonas, boss, tienda y diario", async ({ page }) => {
    const { nombre, correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);
    await sembrarMundoDeEjemplo(correo);

    await page.goto(`/jugar/${childId}/mapa`);
    // Barra superior reconectada: título del mundo (antes solo lo mostraba
    // ciudad-central-legacy) y nombre del hijo.
    await expect(page.getByRole("heading", { name: "Math Quest" })).toBeVisible();
    await expect(page.getByText(nombre)).toBeVisible();

    // Zonas: mismo bloque que ya probaba `juego.spec.ts` dentro de la ruta
    // legacy — acá vive por primera vez en una ruta que sí es alcanzable.
    await page.getByRole("link", { name: "Geometría" }).click();
    await expect(page).toHaveURL(/\/geometria$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/mapa$/);

    // Boss Challenge: el único enlace de producción antes de esta fase
    // vivía en ciudad-central-legacy.
    await expect(page.getByRole("link", { name: "Central eléctrica · Boss Challenge" })).toHaveAttribute(
      "href",
      `/jugar/${childId}/boss`,
    );

    // Tienda: se abre como overlay sobre el hub, sin navegar afuera.
    await page.getByRole("button", { name: "Tienda" }).click();
    await expect(page.getByRole("heading", { name: "Tienda de la ciudad" })).toBeVisible();
    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page.getByRole("heading", { name: "Tienda de la ciudad" })).not.toBeVisible();

    // Diario de misiones.
    await page.getByRole("link", { name: "Ver diario completo ▸" }).click();
    await expect(page).toHaveURL(/\/misiones$/);
  });

  test("el nodo del nivel sembrado navega, y el HUD deja espacio para no taparlo", async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);
    const { levelId } = await sembrarMundoDeEjemplo(correo);

    // El nombre accesible del nodo ("Ciudad Central") coincide con el de la
    // zona narrativa de Aritmética (mismo nombre por guion): se busca por
    // `href` en vez de por nombre para no ambigüar entre ambos enlaces.
    await page.goto(`/jugar/${childId}/mapa`);
    await page.locator(`a[href="/jugar/${childId}/nivel/${levelId}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/nivel/${levelId}$`));

    // Volver desde dentro del nivel: el botón de salida de `LevelHud` ya
    // manda a /mapa (docs/plan-jugabilidad.md §2, decisión deliberada de no
    // agregar un segundo botón "Base" redundante — este ya cumple el "un
    // toque desde dentro de un nivel" que pedía la fase).
    await page.getByRole("link", { name: "Ciudad Central" }).click();
    await expect(page).toHaveURL(new RegExp(`/mapa$`));
  });

  test("allowReplay: false deja de mostrar como enlace un nodo ya completado (Fase 29)", async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);
    // Dominar el módulo directo en Firestore basta para que `levelCompleted`
    // (allChallengesCorrect, la regla por defecto) dé el nodo por completado
    // sin tener que jugarlo de verdad.
    await otorgarDominio(correo, childId, ["aritmetica-d1"]);
    const { levelId } = await sembrarNivelConTerminal(correo, "aritmetica-d1", { allowReplay: false });

    await page.goto(`/jugar/${childId}/mapa`);
    await expect(page.getByText("Completado")).toBeVisible();
    await expect(page.locator(`a[href="/jugar/${childId}/nivel/${levelId}"]`)).toHaveCount(0);
  });
});
