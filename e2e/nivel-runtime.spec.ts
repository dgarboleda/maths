import { expect, test, type Page } from "@playwright/test";
import { deleteApp, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import * as firestoreFns from "firebase/firestore";
import { createLevel, saveLevel } from "@/lib/level/persistence/levelRepository";
import { createEmptyLevel } from "@/lib/level/defaults";
import { ciudadCentralAsLevel } from "@/lib/level/legacy/ciudadCentral";
import { newChallengeId, newEntityId, newEventId } from "@/lib/level/ids";
import { getEntityType, createEntityDefaults } from "@/lib/level/entities";
import { nearestWalkablePointInMesh, pointInPolygon, type NavigationMesh } from "@/lib/world/navmesh";
import type { ChallengePlacement, LevelBackground, LevelDefinition, LevelEntity, LevelEventRule } from "@/lib/level/schema";
import { CLAVE_PADRE, contarDocumentos, crearHijo, entrarAlPerfil, idDeHijo, registrarPadre, resolverEnunciado } from "./utilidades";

/**
 * Runtime del nivel fuera del editor, y Play Test dentro de él — Fase 13
 * (docs/level-editor-plan.md §16.4/§17). No repite `editor.spec.ts` (flujo
 * de autoría por UI) ni `unidad-nivel.spec.ts` (lógica pura): acá el nivel
 * se siembra directo en Firestore vía `levelRepository` (mismo patrón que
 * `editor-persistencia.spec.ts`) y lo que se prueba es cómo se JUEGA —
 * caminar respetando la malla real, resolver un desafío de verdad, una
 * cadena de eventos con retardos, y las garantías propias de Play Test
 * (cero escrituras, reset limpio).
 */

const BACKGROUND: LevelBackground = {
  src: "/illustrations/city-central.webp",
  width: 1600,
  height: 907,
  alt: "Fondo de prueba",
  projection: "flat",
};

async function firebaseComoPadre(correo: string) {
  const app = initializeApp({ apiKey: "demo-api-key", projectId: "demo-numerario" }, `nivel-runtime-${crypto.randomUUID()}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = firestoreFns.getFirestore(app);
  firestoreFns.connectFirestoreEmulator(db, "127.0.0.1", 8080);
  const { user } = await signInWithEmailAndPassword(auth, correo, CLAVE_PADRE);
  return { app, db, parentId: user.uid };
}

/** Crea el documento del nivel y lo sobrescribe con el contenido dado, sin
 *  pasar por la UI del editor — mismo patrón que `editor-persistencia.spec.ts`. */
async function sembrarNivel(correo: string, level: Omit<LevelDefinition, "id" | "version" | "metadata">): Promise<{ levelId: string; parentId: string }> {
  const { app, db, parentId } = await firebaseComoPadre(correo);
  try {
    const created = await createLevel(firestoreFns, db, parentId, "temp", BACKGROUND);
    const saved = await saveLevel(firestoreFns, db, parentId, created.id, {
      ...level,
      id: created.id,
      version: created.version,
      metadata: created.metadata,
    });
    return { levelId: saved.id, parentId };
  } finally {
    await deleteApp(app);
  }
}

/** Posición de Alex leída del propio DOM (`RuntimePlayer.tsx`, `left`/`top`
 *  en % — el mismo sistema de coordenadas que `LevelDefinition`), muestreada
 *  en el propio navegador vía `requestAnimationFrame` — no por el reloj de
 *  Playwright, que metería ruido de IPC en los tiempos. */
async function muestrearPose(page: Page, ms: number): Promise<{ x: number; y: number; t: number }[]> {
  return page.evaluate(async (duration) => {
    const el = document.querySelector('img[alt$=", jugando"]')?.closest('[aria-hidden="true"]') as HTMLElement | null;
    if (!el) return [];
    const start = performance.now();
    return await new Promise<{ x: number; y: number; t: number }[]>((resolve) => {
      const samples: { x: number; y: number; t: number }[] = [];
      function loop() {
        const t = performance.now() - start;
        samples.push({ x: parseFloat(el!.style.left), y: parseFloat(el!.style.top), t });
        if (t < duration) requestAnimationFrame(loop);
        else resolve(samples);
      }
      requestAnimationFrame(loop);
    });
  }, ms);
}

/** Igual que `muestrearPose`, pero registrando `data-state` de un conjunto
 *  de entidades — sirve para verificar una cadena de eventos con `delayMs`
 *  sin correr detrás del reloj real de Playwright. */
async function muestrearEstados(page: Page, entityIds: string[], ms: number): Promise<{ t: number; states: Record<string, string | null> }[]> {
  return page.evaluate(
    async ({ ids, duration }) => {
      const start = performance.now();
      return await new Promise<{ t: number; states: Record<string, string | null> }[]>((resolve) => {
        const samples: { t: number; states: Record<string, string | null> }[] = [];
        function loop() {
          const t = performance.now() - start;
          const states: Record<string, string | null> = {};
          for (const id of ids) states[id] = document.querySelector(`[data-entity-id="${id}"]`)?.getAttribute("data-state") ?? null;
          samples.push({ t, states });
          if (t < duration) requestAnimationFrame(loop);
          else resolve(samples);
        }
        requestAnimationFrame(loop);
      });
    },
    { ids: entityIds, duration: ms },
  );
}

test.describe("Runtime del nivel — fuera del editor", () => {
  test("camina en ciudadCentralAsLevel() respetando la malla real y rodea el hueco", async ({ page }) => {
    const correo = await registrarPadre(page);
    const hijo = await crearHijo(page, { nombre: "Ana" });
    await entrarAlPerfil(page, hijo.nombre, hijo.pin, correo);
    const childId = idDeHijo(page);

    const { app, db, parentId } = await firebaseComoPadre(correo);
    const level = ciudadCentralAsLevel(parentId);
    let levelId: string;
    try {
      const created = await createLevel(firestoreFns, db, parentId, level.name, level.background);
      const saved = await saveLevel(firestoreFns, db, parentId, created.id, {
        ...level,
        id: created.id,
        version: created.version,
        metadata: created.metadata,
      });
      levelId = saved.id;
    } finally {
      await deleteApp(app);
    }

    const mesh: NavigationMesh = {
      walkable: level.navigation.walkablePolygons.map((p) => p.points),
      blocked: level.navigation.blockedPolygons.map((p) => p.points),
    };
    // El grafo de visibilidad conecta vértices tangentes al hueco a propósito
    // (es la ruta más corta válida que lo rodea) — un punto interpolado justo
    // ahí puede caer, por precisión de punto flotante, un pelo fuera del
    // polígono transitable exacto. Un hueco encogido hacia su centro (85%)
    // es la comprobación que de verdad importa: que Alex nunca entra EN el
    // hueco, no que se mantenga a una distancia arbitraria del borde exacto.
    function centroidOf(poly: { x: number; y: number }[]) {
      const sum = poly.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
      return { x: sum.x / poly.length, y: sum.y / poly.length };
    }
    const shrunkHoles = mesh.blocked.map((hole) => {
      const c = centroidOf(hole);
      return hole.map((p) => ({ x: c.x + (p.x - c.x) * 0.85, y: c.y + (p.y - c.y) * 0.85 }));
    });

    await page.goto(`/jugar/${childId}/nivel/${levelId}`);
    await expect(page.getByRole("link", { name: level.name })).toBeVisible({ timeout: 45_000 });

    // START (57,71) -> (80,20): `findPathInMesh` (verificado por separado
    // contra `buildVisibilityGraph`) devuelve 3 nodos — un solo quiebre,
    // bordeando la esquina este del hueco en vez de una línea recta — con
    // desviación nula del contorno en cada tramo interpolado (confirmado
    // fuera de esta prueba, evaluando `nearestWalkablePointInMesh` a lo
    // largo de toda la ruta). Sirve de demostración limpia de que la
    // animación (interpolación lineal tramo a tramo, `useAlexMovement.ts`)
    // se mantiene fiel a los nodos reales del grafo, no solo el punto final.
    const bg = await page.getByAltText(level.background.alt).boundingBox();
    if (!bg) throw new Error("No encontré el fondo del nivel");
    const target = { xPct: 80, yPct: 20 };
    const samplesPromise = muestrearPose(page, 4_000);
    await page.mouse.click(bg.x + (target.xPct / 100) * bg.width, bg.y + (target.yPct / 100) * bg.height);
    const samples = await samplesPromise;

    expect(samples.length).toBeGreaterThan(10);
    for (const s of samples) {
      const corrected = nearestWalkablePointInMesh(s, mesh);
      const dist = Math.hypot(corrected.x - s.x, corrected.y - s.y);
      expect(dist, `pose (${s.x.toFixed(2)}, ${s.y.toFixed(2)}) en t=${s.t.toFixed(0)}ms se salió del contorno transitable`).toBeLessThan(1);
      for (const hole of shrunkHoles) {
        expect(pointInPolygon(s, hole), `pose (${s.x.toFixed(2)}, ${s.y.toFixed(2)}) en t=${s.t.toFixed(0)}ms entró en el hueco`).toBe(false);
      }
    }

    const last = samples[samples.length - 1];
    expect(Math.hypot(last.x - 76.1, last.y - 46)).toBeLessThan(2);
  });

  test("resolver un desafío real en el runtime escribe attempts/skillsProgress/starLedger", async ({ page }) => {
    const correo = await registrarPadre(page);
    const hijo = await crearHijo(page, { nombre: "Ana" });
    await entrarAlPerfil(page, hijo.nombre, hijo.pin, correo);
    const childId = idDeHijo(page);

    const terminalType = getEntityType("terminal");
    const terminalDefaults = createEntityDefaults(terminalType);
    const terminal: LevelEntity = {
      id: newEntityId(),
      type: "terminal",
      name: "Terminal",
      position: { x: 70, y: 70 },
      ...terminalDefaults,
      interaction: { ...terminalDefaults.interaction, standPoint: { x: 65, y: 75 } },
    };
    const challenge: ChallengePlacement = { id: newChallengeId(), moduleId: "aritmetica-d1", activityId: "puzzle", sourceEntityId: terminal.id };
    const base = createEmptyLevel("temp", "Nivel de runtime — desafío", BACKGROUND);
    const level: LevelDefinition = { ...base, entities: [terminal], challenges: [challenge] };

    const { levelId } = await sembrarNivel(correo, level);

    await page.goto(`/jugar/${childId}/nivel/${levelId}`);
    await expect(page.getByRole("link", { name: level.name })).toBeVisible({ timeout: 45_000 });

    await page.getByRole("button", { name: /^Terminal —/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 8_000 });
    const enunciado = await dialog.getByText(/¿Cuánto es \d+ \+ \d+\?/).innerText();
    const objetivo = resolverEnunciado(enunciado)!;
    const slider = dialog.getByRole("slider");
    await slider.focus();
    let actual = Number(await slider.getAttribute("aria-valuenow"));
    while (actual !== objetivo) {
      await slider.press(actual < objetivo ? "ArrowRight" : "ArrowLeft");
      actual = Number(await slider.getAttribute("aria-valuenow"));
    }
    await dialog.getByRole("button", { name: "Responder" }).click();
    await expect(dialog.getByText(/CÓDIGO ACEPTADO/i)).toBeVisible({ timeout: 5_000 });
    await dialog.getByRole("button", { name: "Seguir explorando" }).click();

    // Mismo camino de escritura que la pestaña Práctica / Ciudad Central
    // (`recordModuleAttempt`, `src/lib/attemptRecorder.ts`) — nada propio del
    // Level Editor.
    expect(await contarDocumentos(correo, childId, "attempts")).toBeGreaterThanOrEqual(1);
    expect(await contarDocumentos(correo, childId, "starLedger")).toBeGreaterThanOrEqual(1);
    expect(await contarDocumentos(correo, childId, "skillsProgress")).toBeGreaterThanOrEqual(1);
  });
});

/** El único hijo del padre recién creado — Play Test nunca navega a
 *  `/jugar/{childId}`, así que a diferencia de `idDeHijo(page)` (que lee la
 *  URL) acá hay que ir a buscarlo directo a Firestore. */
async function idDelUnicoHijo(correo: string): Promise<string> {
  const { app, db, parentId } = await firebaseComoPadre(correo);
  try {
    const snap = await firestoreFns.getDocs(firestoreFns.collection(db, "parents", parentId, "children"));
    return snap.docs[0].id;
  } finally {
    await deleteApp(app);
  }
}

test.describe("Play Test — cadena de eventos, aislamiento y reset", () => {
  test("cadena de eventos con retardos, cero escrituras a Firestore, y Reset limpio", async ({ page }) => {
    const correo = await registrarPadre(page);
    await crearHijo(page, { nombre: "Ana" });
    const childId = await idDelUnicoHijo(correo);

    const terminalType = getEntityType("terminal");
    const terminalDefaults = createEntityDefaults(terminalType);
    const terminal: LevelEntity = {
      id: newEntityId(),
      type: "terminal",
      name: "Terminal",
      position: { x: 70, y: 70 },
      ...terminalDefaults,
      interaction: { ...terminalDefaults.interaction, standPoint: { x: 65, y: 75 } },
    };
    const doorType = getEntityType("door");
    const doorDefaults = createEntityDefaults(doorType);
    const door: LevelEntity = {
      id: newEntityId(),
      type: "door",
      name: "Puerta",
      position: { x: 20, y: 20 },
      ...doorDefaults,
      interaction: { ...doorDefaults.interaction, mode: "none" },
    };
    const challenge: ChallengePlacement = { id: newChallengeId(), moduleId: "aritmetica-d1", activityId: "puzzle", sourceEntityId: terminal.id };
    // La cadena del ejemplo de §8.5: ON_CHALLENGE_SUCCESS -> terminal "on"
    // (200ms) -> bandera "luces" (400ms, sin `data-state` que verificar) ->
    // puerta "closed" (900ms, "se desbloquea") -> puerta "open" (1400ms).
    // `delayMs` es el retardo desde la acción ANTERIOR (bus.ts: `emit`
    // acumula), así que 200/200/500/500 produce los `atMs` 200/400/900/1400
    // del ejemplo.
    const rule: LevelEventRule = {
      id: newEventId(),
      name: "Terminal resuelta -> se abre el camino",
      trigger: { type: "ON_CHALLENGE_SUCCESS", challengeId: challenge.id },
      when: { kind: "always" },
      once: true,
      actions: [
        { type: "CHANGE_OBJECT_STATE", params: { entityId: terminal.id, state: "on" }, delayMs: 200 },
        { type: "SET_FLAG", params: { flag: "luces", value: true }, delayMs: 200 },
        { type: "CHANGE_OBJECT_STATE", params: { entityId: door.id, state: "closed" }, delayMs: 500 },
        { type: "OPEN_DOOR", params: { entityId: door.id }, delayMs: 500 },
      ],
    };
    const base = createEmptyLevel("temp", "Nivel de runtime — cadena de eventos", BACKGROUND);
    const level: LevelDefinition = { ...base, entities: [terminal, door], challenges: [challenge], events: [rule] };

    const { levelId } = await sembrarNivel(correo, level);

    await page.goto(`/panel/editor/${levelId}`);
    await expect(page.getByLabel("Nombre del nivel")).toHaveValue(level.name);
    await page.getByRole("button", { name: "Probar", exact: true }).click();
    await expect(page.getByText("Modo prueba")).toBeVisible();

    const terminalBtn = page.getByRole("button", { name: /^Terminal —/ });
    const doorLocator = page.locator(`[data-entity-id="${door.id}"]`);
    await terminalBtn.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 8_000 });
    const enunciado = await dialog.getByText(/¿Cuánto es \d+ \+ \d+\?/).innerText();
    const objetivo = resolverEnunciado(enunciado)!;
    const slider = dialog.getByRole("slider");
    await slider.focus();
    let actual = Number(await slider.getAttribute("aria-valuenow"));
    while (actual !== objetivo) {
      await slider.press(actual < objetivo ? "ArrowRight" : "ArrowLeft");
      actual = Number(await slider.getAttribute("aria-valuenow"));
    }

    // Se muestrea `data-state` en el propio navegador (rAF, igual que
    // `muestrearPose`) en vez de tratar de sincronizar con el reloj real de
    // Playwright — la grabación arranca ANTES de "Responder", así que capta
    // el "off"/"locked" inicial, y sigue corriendo sola (rAF en la página,
    // ajeno a los `await` del lado Node) durante todo el resto de la prueba.
    const timelinePromise = muestrearEstados(page, [terminal.id, door.id], 2_200);
    await dialog.getByRole("button", { name: "Responder" }).click();
    await expect(dialog.getByText(/CÓDIGO ACEPTADO/i)).toBeVisible({ timeout: 5_000 });
    await dialog.getByRole("button", { name: "Seguir explorando" }).click();
    const timeline = await timelinePromise;

    const first = timeline[0];
    expect(first.states[terminal.id], "la terminal ya estaba \"on\" antes de que pasara ningún retardo").toBe("off");
    expect(first.states[door.id], "la puerta ya estaba destrabada antes de que pasara ningún retardo").toBe("locked");

    function primerInstanteCon(entityId: string, state: string): number {
      const hit = timeline.find((s) => s.states[entityId] === state);
      expect(hit, `"${state}" nunca aparece en la línea de tiempo de ${entityId}`).toBeTruthy();
      return hit!.t;
    }

    // atMs del ejemplo de §8.5 (docs/level-editor-plan.md): 200, 400 (sin
    // `data-state`, es la bandera "luces"), 900, 1400 — acá se verifican los
    // retardos RELATIVOS entre transiciones consecutivas (independiente de
    // cuánto tardó Playwright en llegar a disparar "Responder").
    const tOn = primerInstanteCon(terminal.id, "on");
    const tClosed = primerInstanteCon(door.id, "closed");
    const tOpen = primerInstanteCon(door.id, "open");
    expect(tClosed - tOn, "puerta \"closed\" 700ms después de terminal \"on\" (900-200)").toBeGreaterThan(500);
    expect(tClosed - tOn).toBeLessThan(900);
    expect(tOpen - tClosed, "puerta \"open\" 500ms después de \"closed\" (1400-900)").toBeGreaterThan(300);
    expect(tOpen - tClosed).toBeLessThan(700);

    // La puerta nunca salta etapas: sigue "locked" en todo instante anterior
    // a `tClosed`, y "closed" (nunca ya "open") entre `tClosed` y `tOpen`.
    for (const s of timeline) {
      if (s.t < tClosed) expect(s.states[door.id]).toBe("locked");
      else if (s.t < tOpen) expect(s.states[door.id]).toBe("closed");
    }

    // Play Test: `sandboxServices.recordAttempt`/`awardBadges` interceptan —
    // cero escrituras reales, aunque el desafío se haya resuelto "de verdad"
    // en pantalla (criterio 21/A7), a pesar de ser el mismo `PuzzleOverlay`
    // que graba de verdad en el runtime real (prueba anterior de esta suite).
    expect(await contarDocumentos(correo, childId, "attempts")).toBe(0);
    expect(await contarDocumentos(correo, childId, "starLedger")).toBe(0);
    expect(await contarDocumentos(correo, childId, "skillsProgress")).toBe(0);

    // Reset: vuelve a spawn con estado de entidades limpio, sin salir de
    // Play Test ni tocar el nivel del editor (`key={sessionId}` en
    // `LevelEditorScreen.tsx` remonta `LevelRuntime` entero).
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByText("Modo prueba")).toBeVisible();
    await expect(terminalBtn).toHaveAttribute("data-state", "off");
    await expect(doorLocator).toHaveAttribute("data-state", "locked");
    const poseTrasReset = await page.evaluate(() => {
      const el = document.querySelector('img[alt$=", jugando"]')?.closest('[aria-hidden="true"]') as HTMLElement | null;
      return el ? { x: parseFloat(el.style.left), y: parseFloat(el.style.top) } : null;
    });
    expect(poseTrasReset).toEqual({ x: base.navigation.spawn.x, y: base.navigation.spawn.y });

    // El nivel del editor tampoco cambió: seguir en Play Test es la prueba
    // de que "Reset" no disparó ningún `dispatch` sobre `state.level`.
    expect(await contarDocumentos(correo, childId, "attempts")).toBe(0);
  });
});
