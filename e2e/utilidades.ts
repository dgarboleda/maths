import { expect, type Page } from "@playwright/test";
import { deleteApp, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { collection, connectFirestoreEmulator, doc, getDocs, getFirestore, setDoc, writeBatch } from "firebase/firestore";
import * as firestoreFns from "firebase/firestore";
import { STRANDS } from "../src/lib/strands";
import { ciudadCentralAsLevel } from "../src/lib/level/legacy/ciudadCentral";
import { buildSalaConTerminal } from "../src/lib/level/templates/salaConTerminal";
import { insertLevel } from "../src/lib/level/persistence/levelRepository";
import { ensureWorld, saveWorld } from "../src/lib/gameworld/persistence/worldRepository";
import { DEFAULT_WORLD_RULES } from "../src/lib/gameworld/defaults";
import type { AvatarCatalog, WorldNode, WorldRules, WorldStory } from "../src/lib/gameworld/schema";

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

/** Hace clic en el perfil, mete el PIN y confirma — sin esperar a ningún
 * destino, porque a dónde lleva depende de si ya hay una evaluación
 * completa (ver `entrarAlPerfil` vs. `entrarAPerfilSinEvaluar`). */
async function confirmarPin(page: Page, nombre: string, pin: string): Promise<void> {
  await page.getByRole("button", { name: `Entrar al perfil de ${nombre}` }).click();
  const campoPin = page.getByLabel(`PIN de ${nombre}`);
  await campoPin.fill(pin);
  // Enter en vez de clic en "Entrar": en emulación táctil móvil, enfocar el
  // campo de PIN dispara a veces un ajuste de zoom del navegador que
  // desplaza el layout viewport (ver useDialogFocus) — un clic por
  // coordenadas puede quedar sin blanco durante esa ventana, mientras que
  // enviar el formulario con Enter (lo que hace cualquier teclado numérico
  // real al pulsar "Ir"/"Hecho") no depende de dónde cayó el botón en
  // pantalla.
  await campoPin.press("Enter");
}

/**
 * Entra al perfil del hijo y espera a estar dentro del mundo. Sin evaluación
 * inicial completa el mundo redirige a /evaluacion —el plan de temas sale
 * del resultado real, no se puede jugar a ciegas—, así que aquí se siembra
 * directo en Firestore un resultado "en blanco" (nada acreditado, ningún
 * módulo otorgado) antes de seguir: el resto de las pruebas no evalúan la
 * evaluación en sí misma y no pueden pagar sus ~45 preguntas adaptativas en
 * cada setup.
 *
 * Va directo a `/jugar/{childId}/ciudad-central-legacy` (no a
 * `/jugar/{childId}`): desde la Fase 18 esa es solo un despachador que manda
 * al Mundo real del padre (o a "Crear el primer nivel" si no tiene
 * ninguno) — Ciudad Central ya no es lo que ve un hijo por defecto, sigue
 * viva nada más en esta ruta de regresión (ver su comentario de cabecera).
 */
export async function entrarAlPerfil(page: Page, nombre: string, pin: string, correo: string): Promise<void> {
  await confirmarPin(page, nombre, pin);
  await page.waitForURL(/\/jugar\//);
  const childId = idDeHijo(page);

  await sembrarEvaluacion(correo, childId, {
    perStrand: Object.fromEntries(
      STRANDS.map((s) => [
        s.slug,
        { itemsAsked: 0, itemsCorrect: 0, highestTierPassed: -1, gradeBand: "por reforzar las bases" },
      ]),
    ),
    overallScore: 0,
    overallGradeBand: "por reforzar las bases",
    grantedModuleIds: [],
  });

  await page.goto(`/jugar/${childId}/ciudad-central-legacy`);
  // La Ciudad Central es la ruta más pesada de la app y `next dev` la compila
  // la primera vez que un worker la visita, así que aquí el margen es mayor
  // que el `expect.timeout` global (ver el comentario de playwright.config.ts).
  await expect(page.getByRole("heading", { name: "Ciudad Central" })).toBeVisible({ timeout: 45_000 });
  // El briefing de la misión "El apagón" se abre solo al entrar: confirma que
  // la escena (y el progreso real que necesita para pintar sus objetivos) ya
  // cargó. Se deja abierto a propósito — cada prueba decide si lo cierra.
  await expect(page.getByRole("dialog", { name: "El apagón" })).toBeVisible();
}

/** Entra al perfil sin sembrar ninguna evaluación: como la evaluación queda
 * pendiente, el mundo redirige directo a /evaluacion. Para probar la
 * evaluación en sí misma (el resto de las pruebas usa `entrarAlPerfil`). */
export async function entrarAPerfilSinEvaluar(page: Page, nombre: string, pin: string): Promise<void> {
  await confirmarPin(page, nombre, pin);
  await expect(page).toHaveURL(/\/evaluacion$/);
}

/** Atajo: cuenta nueva + hijo nuevo + sesión del hijo abierta. */
export async function sesionDeHijo(
  page: Page,
  opciones?: { nombre?: string; pin?: string; nacimiento?: string },
): Promise<{ nombre: string; pin: string; correo: string }> {
  const correo = await registrarPadre(page);
  const hijo = await crearHijo(page, opciones);
  await entrarAlPerfil(page, hijo.nombre, hijo.pin, correo);
  return { ...hijo, correo };
}

/** El id del hijo va en la URL de juego: /jugar/{childId}/... */
export function idDeHijo(page: Page): string {
  return page.url().match(/\/jugar\/([^/]+)/)![1];
}

/**
 * Marca como dominados, directo en Firestore, los módulos indicados —sin
 * jugar rondas de verdad. Dominar de verdad exige aciertos repartidos en al
 * menos 2 días distintos (MIN_DAY_SPAN en mastery.ts), algo que una prueba de
 * un solo proceso no puede cumplir jugando. Con la currícula real (candados
 * por prerrequisito), para poder abrir un módulo bloqueado en una prueba hay
 * que otorgarle "dominado" a sus prerrequisitos directos por esta vía; se
 * autentica como el mismo padre de la prueba, así que las reglas de
 * Firestore (isParent) lo permiten igual que al niño jugando de verdad.
 */
export async function otorgarDominio(correo: string, childId: string, moduleIds: string[]): Promise<void> {
  const app = initializeApp(
    { apiKey: "demo-api-key", projectId: "demo-numerario" },
    `otorgar-${crypto.randomUUID()}`,
  );
  try {
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    const { user } = await signInWithEmailAndPassword(auth, correo, CLAVE_PADRE);

    const db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", 8080);

    await Promise.all(
      moduleIds.map((moduleId) =>
        setDoc(doc(db, "parents", user.uid, "children", childId, "skillsProgress", moduleId), {
          recentResults: [],
          recentAccuracy: 1,
          masteredAt: Date.now(),
        }),
      ),
    );
  } finally {
    await deleteApp(app);
  }
}

/**
 * Siembra un mundo real en Firestore, directo (sin pasar por el Level
 * Editor): mismo contenido que `seedExampleWorld` (src/lib/level/
 * seedExampleWorld.ts) — un nivel real ("Ciudad Central" como nivel) más un
 * `GameWorld` con ese nivel como nodo `isStart`. Sirve para probar el hub
 * del jugador (`/mapa`, Fase 28) navegando directo a la ruta, sin depender
 * de a dónde manda el despachador `/jugar/{childId}`. El Mundo es del
 * padre (`parents/{parentId}/world`), no del hijo: no recibe `childId`.
 */
export async function sembrarMundoDeEjemplo(
  correo: string,
  storyOverride: Partial<WorldStory> = {},
  avatarsOverride?: AvatarCatalog,
): Promise<{ levelId: string }> {
  const app = initializeApp(
    { apiKey: "demo-api-key", projectId: "demo-numerario" },
    `mundo-${crypto.randomUUID()}`,
  );
  try {
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    const { user } = await signInWithEmailAndPassword(auth, correo, CLAVE_PADRE);

    const db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", 8080);

    const level = ciudadCentralAsLevel(user.uid);
    await insertLevel(firestoreFns, db, user.uid, level);

    const node: WorldNode = {
      levelId: level.id,
      chapterId: null,
      position: { x: 50, y: 50 },
      label: level.name,
      icon: "🏙️",
      unlock: { kind: "always" },
      isStart: true,
    };
    const base = await ensureWorld(firestoreFns, db, user.uid, user.uid);
    await saveWorld(firestoreFns, db, user.uid, {
      ...base,
      story: { ...base.story, ...storyOverride },
      avatars: avatarsOverride ?? base.avatars,
      nodes: [...base.nodes.filter((n) => n.levelId !== node.levelId), node],
    });

    return { levelId: level.id };
  } finally {
    await deleteApp(app);
  }
}

/**
 * Siembra "Sala con terminal" (la plantilla más simple del Level Editor —
 * un desafío, una misión de un objetivo) con un `moduleId` real asignado, y
 * un `GameWorld` cuyas `WorldRules` se pueden sobreescribir — para probar
 * en un navegador real (no solo en el componente aislado) que la Fase 29
 * (docs/plan-jugabilidad.md §3) llega desde Firestore hasta `PuzzleOverlay`
 * a través de `nivel/[levelId]/page.tsx` → `LevelRuntime` →
 * `LevelChallengeOverlay`.
 */
export async function sembrarNivelConTerminal(
  correo: string,
  moduleId: string,
  rulesOverride: Partial<WorldRules> = {},
): Promise<{ levelId: string }> {
  const app = initializeApp(
    { apiKey: "demo-api-key", projectId: "demo-numerario" },
    `terminal-${crypto.randomUUID()}`,
  );
  try {
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    const { user } = await signInWithEmailAndPassword(auth, correo, CLAVE_PADRE);

    const db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", 8080);

    const level = buildSalaConTerminal(user.uid, "Sala de prueba", {
      src: "/illustrations/academia-infinita.webp",
      width: 1024,
      height: 768,
      alt: "Sala de prueba",
      projection: "flat",
    });
    level.challenges = [{ ...level.challenges[0], moduleId }];
    await insertLevel(firestoreFns, db, user.uid, level);

    const node: WorldNode = {
      levelId: level.id,
      chapterId: null,
      position: { x: 50, y: 50 },
      label: level.name,
      icon: "🧪",
      unlock: { kind: "always" },
      isStart: true,
    };
    const base = await ensureWorld(firestoreFns, db, user.uid, user.uid);
    await saveWorld(firestoreFns, db, user.uid, {
      ...base,
      rules: { ...DEFAULT_WORLD_RULES, ...rulesOverride },
      nodes: [...base.nodes.filter((n) => n.levelId !== level.id), node],
    });

    return { levelId: level.id };
  } finally {
    await deleteApp(app);
  }
}

/** Cuenta los documentos de una subcolección del hijo — para confirmar que
 * borrar un perfil no deja huérfanos (Firestore no borra subcolecciones en
 * cascada al borrar el documento padre). */
export async function contarDocumentos(correo: string, childId: string, subcoleccion: string): Promise<number> {
  const app = initializeApp(
    { apiKey: "demo-api-key", projectId: "demo-numerario" },
    `contar-${crypto.randomUUID()}`,
  );
  try {
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    const { user } = await signInWithEmailAndPassword(auth, correo, CLAVE_PADRE);

    const db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", 8080);

    const snap = await getDocs(collection(db, "parents", user.uid, "children", childId, subcoleccion));
    return snap.size;
  } finally {
    await deleteApp(app);
  }
}

/**
 * Guarda directo en Firestore el resultado de una evaluación de ubicación ya
 * "hecha" — sin recorrer las ~40 preguntas adaptativas del flujo real — para
 * poder probar la lectura (historial en el panel, insignias de "dominado
 * por evaluación") sin depender de qué tipo de control le toque a cada
 * pregunta al azar.
 */
export async function sembrarEvaluacion(
  correo: string,
  childId: string,
  opts: {
    perStrand: Record<
      string,
      {
        itemsAsked: number;
        itemsCorrect: number;
        highestTierPassed: number;
        gradeBand: string;
        weakTiers?: number[];
      }
    >;
    overallScore: number;
    overallGradeBand: string;
    grantedModuleIds: string[];
  },
): Promise<void> {
  const app = initializeApp(
    { apiKey: "demo-api-key", projectId: "demo-numerario" },
    `sembrar-${crypto.randomUUID()}`,
  );
  try {
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    const { user } = await signInWithEmailAndPassword(auth, correo, CLAVE_PADRE);

    const db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", 8080);

    const batch = writeBatch(db);
    const placementRef = doc(
      collection(db, "parents", user.uid, "children", childId, "placements"),
    );
    batch.set(placementRef, {
      startedAt: Date.now() - 10 * 60 * 1000,
      completedAt: Date.now(),
      perStrand: opts.perStrand,
      overallScore: opts.overallScore,
      overallGradeBand: opts.overallGradeBand,
      grantedModuleIds: opts.grantedModuleIds,
    });
    for (const moduleId of opts.grantedModuleIds) {
      batch.set(doc(db, "parents", user.uid, "children", childId, "skillsProgress", moduleId), {
        recentResults: [],
        recentAccuracy: 1,
        masteredAt: Date.now(),
        masteredVia: "placement",
      });
    }
    batch.update(doc(db, "parents", user.uid, "children", childId), { placementStatus: "completo" });
    await batch.commit();
  } finally {
    await deleteApp(app);
  }
}

/**
 * Deja un módulo a un solo acierto real de distancia de dominarlo: siembra
 * 11 intentos correctos repartidos en 2 días distintos (uno menos que
 * MASTERY_WINDOW, ya con MIN_DAY_SPAN cumplido), sin tocar `masteredAt`. Sirve
 * para probar la transición real a mastery (y su celebración) contestando
 * una sola pregunta real de UI en vez de jugar 12 rondas completas.
 */
export async function sembrarProgresoCercaDeDominio(
  correo: string,
  childId: string,
  moduleId: string,
): Promise<void> {
  const app = initializeApp(
    { apiKey: "demo-api-key", projectId: "demo-numerario" },
    `progreso-${crypto.randomUUID()}`,
  );
  try {
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    const { user } = await signInWithEmailAndPassword(auth, correo, CLAVE_PADRE);

    const db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", 8080);

    const recentResults = Array.from({ length: 11 }, (_, i) => ({
      correct: true,
      day: i < 6 ? "2020-01-01" : "2020-01-02",
    }));

    await setDoc(doc(db, "parents", user.uid, "children", childId, "skillsProgress", moduleId), {
      recentResults,
      recentAccuracy: 1,
      masteredAt: null,
    });
  } finally {
    await deleteApp(app);
  }
}

/** Otorga directo en Firestore una insignia ya ganada, sin recorrer el evento real que la dispara. */
export async function otorgarInsignia(correo: string, childId: string, badgeId: string): Promise<void> {
  const app = initializeApp(
    { apiKey: "demo-api-key", projectId: "demo-numerario" },
    `insignia-${crypto.randomUUID()}`,
  );
  try {
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    const { user } = await signInWithEmailAndPassword(auth, correo, CLAVE_PADRE);

    const db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", 8080);

    await setDoc(doc(db, "parents", user.uid, "children", childId, "badges", badgeId), {
      earnedAt: Date.now(),
    });
  } finally {
    await deleteApp(app);
  }
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
