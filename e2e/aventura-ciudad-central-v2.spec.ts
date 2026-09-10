import { expect, test, type Page } from "@playwright/test";
import { STRANDS } from "../src/lib/strands";
import {
  contarDocumentos,
  crearHijo,
  idDeHijo,
  otorgarDominio,
  registrarPadre,
  resolverEnunciado,
  sembrarEvaluacion,
  sembrarMundoDeEjemplo,
} from "./utilidades";

/**
 * Ciudad Central sobre el motor nuevo (`LevelRuntime`/`ciudadCentralAsLevel()`),
 * alcanzada por el camino real de producción: el "mundo de ejemplo"
 * sembrado (`seedExampleWorld`, igual que ofrece `NoLevelsYet`/`/panel/
 * editor`) + el despachador de `/jugar/{childId}` (Fase 18), que redirige al
 * nivel marcado como punto de entrada. Ya no depende de
 * `NEXT_PUBLIC_LEVELS_V2`: ese flag dejó de decidir qué se ve en
 * `/jugar/{childId}` en la Fase 18, así que la única forma real de llegar a
 * esta escena hoy es igual que cualquier otro nivel del Level Editor.
 * Sigue corriendo contra el project "ciudad-central-v2" de
 * `playwright.config.ts` (no hace falta el segundo `next dev` para esto en
 * particular, pero tampoco molesta compartirlo).
 *
 * `aventura.spec.ts` prueba la Ciudad Central *original* (`QuestScene.tsx`)
 * en su ruta de regresión `/jugar/{childId}/ciudad-central-legacy` — esta
 * suite es la del motor nuevo, no un duplicado.
 *
 * No usa `entrarAlPerfil`/`sesionDeHijo` de utilidades.ts: esos van a
 * `ciudad-central-legacy` y esperan el briefing de `QuestScene` — acá se
 * entra por el camino del nivel real, y `LevelRuntime` no tiene ningún
 * auto-abrir (el registro de misión genérico se abre a pedido, vía el botón
 * del HUD), así que el helper de acá es propio.
 */

/** Mismo criterio que `entrarAlPerfil` (evaluación "en blanco" sembrada
 *  directo en Firestore, sin pagar ~45 preguntas adaptativas), más el
 *  "mundo de ejemplo" sembrado para que el despachador tenga a dónde
 *  mandar — entra y espera a que la escena nueva esté lista (la Dra. Nia
 *  visible en el lienzo). */
async function entrarAlPerfilV2(page: Page, nombre: string, pin: string, correo: string): Promise<string> {
  await page.getByRole("button", { name: `Entrar al perfil de ${nombre}` }).click();
  const campoPin = page.getByLabel(`PIN de ${nombre}`);
  await campoPin.fill(pin);
  await campoPin.press("Enter");
  await page.waitForURL(/\/jugar\//);
  const childId = idDeHijo(page);

  await sembrarEvaluacion(correo, childId, {
    perStrand: Object.fromEntries(
      STRANDS.map((s: { slug: string }) => [s.slug, { itemsAsked: 0, itemsCorrect: 0, highestTierPassed: -1, gradeBand: "por reforzar las bases" }]),
    ),
    overallScore: 0,
    overallGradeBand: "por reforzar las bases",
    grantedModuleIds: [],
  });
  await sembrarMundoDeEjemplo(correo);

  await page.goto(`/jugar/${childId}`);
  // "Ciudad Central" es el badge de `LevelHud` (`<Link href="/jugar/{childId}">`,
  // sin `onExit`: acá no hay Play Test) — role "link", no "heading".
  await expect(page.getByRole("link", { name: "Ciudad Central" })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("button", { name: /^Dra\. Nia —/ })).toBeVisible();
  return childId;
}

async function resolverPuzzle(page: Page, dialogName: string | RegExp) {
  const ficha = page.getByRole("dialog", { name: dialogName });
  await expect(ficha).toBeVisible();
  const enunciado = await ficha.getByText(/¿Cuánto es \d+ \+ \d+\?/).innerText();
  const objetivo = resolverEnunciado(enunciado)!;
  const slider = ficha.getByRole("slider");
  await slider.focus();
  let actual = Number(await slider.getAttribute("aria-valuenow"));
  while (actual !== objetivo) {
    await slider.press(actual < objetivo ? "ArrowRight" : "ArrowLeft");
    actual = Number(await slider.getAttribute("aria-valuenow"));
  }
  await ficha.getByRole("button", { name: "Responder" }).click();
  await expect(ficha.getByText(/CÓDIGO ACEPTADO/)).toBeVisible();
  await ficha.getByRole("button", { name: "Seguir explorando" }).click();
  await expect(ficha).not.toBeVisible();
}

test.describe("Mundo: Ciudad Central v2 (NEXT_PUBLIC_LEVELS_V2)", () => {
  test("saludar a la Dra. Nia desbloquea la terminal; resolverla guarda el intento real y sube el AXIA", async ({ page }) => {
    const correo = await registrarPadre(page);
    const hijo = await crearHijo(page, { nombre: "Ana" });
    const childId = await entrarAlPerfilV2(page, hijo.nombre, hijo.pin, correo);

    const estrellas = page.locator("header").getByText(/^AXIA:\s*-?\d+$/);
    await expect(estrellas).toHaveText("AXIA: 0");

    await page.getByRole("button", { name: /^Dra\. Nia —/ }).click();
    const dialogoNia = page.getByRole("dialog", { name: "Dra. Nia" });
    await expect(dialogoNia).toBeVisible();
    // 3 líneas (sin la presentación especial de Khaos — simplificación
    // documentada de Fase 14, ver ciudadCentral.ts): 2 "Seguir ▸" y la
    // última cierra con "Entendido".
    await dialogoNia.getByRole("button", { name: "Seguir ▸" }).click();
    await dialogoNia.getByRole("button", { name: "Seguir ▸" }).click();
    await dialogoNia.getByRole("button", { name: "Entendido" }).click();
    await expect(dialogoNia).not.toBeVisible();

    await page.getByRole("button", { name: /^Terminal de acceso —/ }).click();
    await resolverPuzzle(page, "Terminal de acceso");

    // El intento se guardó de verdad — mismo camino que Ciudad Central hoy
    // (`recordModuleAttempt`), no algo propio del motor nuevo.
    expect(await contarDocumentos(correo, childId, "attempts")).toBeGreaterThanOrEqual(1);
    await expect(estrellas).not.toHaveText("AXIA: 0");
    // La terminal cambió de estado visual (CHANGE_OBJECT_STATE en la regla
    // de evento) — mismo criterio que el resto del motor, ver nivel-runtime.spec.ts.
    await expect(page.getByRole("button", { name: /^Terminal de acceso —/ })).toHaveAttribute("data-state", "on");
  });

  test("terminal, medidor y compuerta ya superados: la ciudad se ve restaurada al entrar, sin repetir nada", async ({ page }) => {
    const correo = await registrarPadre(page);
    const hijo = await crearHijo(page, { nombre: "Ana" });
    const childId = await entrarAlPerfilV2(page, hijo.nombre, hijo.pin, correo);

    // Los 3 objetivos de "El apagón" ya superados de verdad — al recargar,
    // `deriveInitialState` (runtime/state.ts) re-emite en silencio los
    // eventos ON_CHALLENGE_SUCCESS de cada uno: la terminal aparece "on" y
    // la compuerta "open" sin que el jugador tenga que resolver nada de
    // nuevo, y sin ninguna escritura extra a Firestore.
    await otorgarDominio(correo, childId, ["aritmetica-d1", "medicion-d1", "geometria-d1"]);
    const escrituras = await contarDocumentos(correo, childId, "attempts");
    await page.reload();

    await expect(page.getByRole("link", { name: "Ciudad Central" })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole("button", { name: /^Terminal de acceso —/ })).toHaveAttribute("data-state", "on");
    await expect(page.getByRole("button", { name: /^Compuerta del generador —/ })).toHaveAttribute("data-state", "open");
    expect(await contarDocumentos(correo, childId, "attempts")).toBe(escrituras);

    // El fondo se restaura (mismo filtro que QuestScene.tsx:413-415, ahora
    // vía background.filters) — ver la regla "Compuerta abierta..." en
    // ciudadCentral.ts.
    const fondo = page.getByAltText(/Ciudad Central de noche/);
    await expect(fondo).toHaveCSS("filter", /brightness/);
  });

  test("los objetivos del registro de misión reflejan el progreso académico real", async ({ page }) => {
    const correo = await registrarPadre(page);
    const hijo = await crearHijo(page, { nombre: "Ana" });
    const childId = await entrarAlPerfilV2(page, hijo.nombre, hijo.pin, correo);

    await page.getByRole("button", { name: "Abrir registro de misión" }).click();
    const registro = page.getByRole("dialog", { name: "El apagón" });
    await expect(registro).toBeVisible();
    await expect(registro.getByText("0/3 objetivos")).toBeVisible();
    // Primer objetivo, nada hecho todavía: es el "objetivo actual" (badge
    // "En curso"), no un "pendiente" cualquiera — ver LevelMissionOverlay.tsx.
    const objetivoTerminal = registro.getByRole("listitem").filter({ hasText: "Reactivar la terminal de la plaza" });
    await expect(objetivoTerminal).not.toContainText("completado");
    await expect(objetivoTerminal).toContainText("objetivo actual");
    await registro.getByRole("button", { name: "Salir" }).click();

    await otorgarDominio(correo, childId, ["aritmetica-d1"]);
    await page.reload();
    await page.getByRole("button", { name: "Abrir registro de misión" }).click();
    const registroTrasProgreso = page.getByRole("dialog", { name: "El apagón" });
    await expect(registroTrasProgreso).toBeVisible();
    await expect(registroTrasProgreso.getByText("1/3 objetivos")).toBeVisible();
    await expect(
      registroTrasProgreso.getByRole("listitem").filter({ hasText: "Reactivar la terminal de la plaza" }),
    ).toContainText("completado");
  });
});
