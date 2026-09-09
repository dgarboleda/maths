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
} from "./utilidades";

/**
 * Ciudad Central sobre el motor nuevo (Fase 14, docs/level-editor-plan.md
 * §12.4) — `NEXT_PUBLIC_LEVELS_V2` activo, servido por el segundo `next dev`
 * de `playwright.config.ts` (project "ciudad-central-v2"). Adapta las
 * pruebas de `e2e/aventura.spec.ts` ("Mundo: Ciudad Central") a la UI real
 * de `LevelRuntime`/`ciudadCentralAsLevel()` en vez de `QuestScene.tsx`.
 *
 * `aventura.spec.ts` queda intacto: sigue probando `QuestScene.tsx` con el
 * flag apagado, que es lo que corre hoy en producción por defecto (§12.1,
 * "coexistencia, no reemplazo") — no hay ninguna razón para dejar de
 * probarlo mientras siga siendo real para cualquiera que no active el flag.
 *
 * No usa `entrarAlPerfil`/`sesionDeHijo` de utilidades.ts: esos esperan el
 * diálogo de misión "El apagón" que `QuestScene` abre solo al entrar —
 * `LevelRuntime` no tiene ese auto-abrir (el registro de misión genérico se
 * abre a pedido, vía el botón del HUD), así que el helper de acá es propio.
 */

/** Mismo criterio que `entrarAlPerfil` (evaluación "en blanco" sembrada
 *  directo en Firestore, sin pagar ~45 preguntas adaptativas) pero sin
 *  esperar el briefing de `QuestScene` — entra y espera a que la escena
 *  nueva esté lista (la Dra. Nia visible en el lienzo). */
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

  await page.goto(`/jugar/${childId}`);
  await expect(page.getByRole("heading", { name: "Ciudad Central" })).toBeVisible({ timeout: 45_000 });
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

    await expect(page.getByRole("heading", { name: "Ciudad Central" })).toBeVisible({ timeout: 45_000 });
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
