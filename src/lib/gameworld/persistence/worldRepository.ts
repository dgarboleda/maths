import type { Firestore } from "firebase/firestore";
import { prepareForFirestore, assertSize } from "@/lib/level/serialize";
import { createEmptyWorld } from "../defaults";
import { migrateWorld } from "../migrate";
import { MAIN_WORLD_ID } from "../schema";
import type { GameWorld } from "../schema";

/**
 * Acceso a Firestore del Mundo — Fase 16 (docs/level-editor-plan-v2.md §3.5).
 * Mismo estilo exacto que `src/lib/level/persistence/levelRepository.ts`:
 * funciones puras que reciben `firestoreFns`/`db` como parámetros (nunca
 * importan `firebase/firestore` de forma estática, criterio A5) y el mismo
 * versionado optimista con snapshot inmutable por guardado.
 *
 * Esquema: `/parents/{parentId}/world/{worldId}` (documento vivo, hoy
 * siempre `"main"`) + `/parents/{parentId}/world/{worldId}/versions/{n}`.
 */

type FirestoreFns = typeof import("firebase/firestore");

export class StaleWorldError extends Error {
  remoteVersion: number;
  localVersion: number;
  constructor(remoteVersion: number, localVersion: number) {
    super(`El mundo se guardó desde otra sesión (versión remota ${remoteVersion}, la que tenías cargada era ${localVersion}). Recargá antes de seguir editando.`);
    this.name = "StaleWorldError";
    this.remoteVersion = remoteVersion;
    this.localVersion = localVersion;
  }
}

function zeroPad(version: number): string {
  return String(version).padStart(6, "0");
}

function worldDocRef(firestoreFns: FirestoreFns, db: Firestore, parentId: string, worldId: string) {
  return firestoreFns.doc(db, "parents", parentId, "world", worldId);
}

function versionDocRef(firestoreFns: FirestoreFns, db: Firestore, parentId: string, worldId: string, version: number) {
  return firestoreFns.doc(db, "parents", parentId, "world", worldId, "versions", zeroPad(version));
}

/** `null` si el padre todavía no tiene mundo — usar `ensureWorld` para
 *  crearlo antes de mostrar el Editor de Mundo. Migra la forma del documento
 *  al leer. */
export async function getWorld(firestoreFns: FirestoreFns, db: Firestore, parentId: string, worldId: string = MAIN_WORLD_ID): Promise<GameWorld | null> {
  const snap = await firestoreFns.getDoc(worldDocRef(firestoreFns, db, parentId, worldId));
  if (!snap.exists()) return null;
  return migrateWorld(snap.data() as Record<string, unknown>);
}

/** Crea el mundo "main" vacío si no existe todavía, y devuelve el existente
 *  sin tocarlo si ya estaba ahí — idempotente, seguro de llamar en cada
 *  `createLevel` (Fase 17, sincronización nodo↔nivel). */
export async function ensureWorld(firestoreFns: FirestoreFns, db: Firestore, parentId: string, authorUid: string): Promise<GameWorld> {
  const existing = await getWorld(firestoreFns, db, parentId);
  if (existing) return existing;
  const world = createEmptyWorld(authorUid);
  const clean = prepareForFirestore(world);
  const batch = firestoreFns.writeBatch(db);
  batch.set(worldDocRef(firestoreFns, db, parentId, world.id), clean);
  batch.set(versionDocRef(firestoreFns, db, parentId, world.id, world.version), clean);
  await batch.commit();
  return world;
}

/** Guarda `world` con versionado optimista — mismo criterio que `saveLevel`:
 *  si la versión remota ya avanzó, lanza `StaleWorldError` en vez de pisarla
 *  a ciegas. */
export async function saveWorld(firestoreFns: FirestoreFns, db: Firestore, parentId: string, world: GameWorld): Promise<GameWorld> {
  const { runTransaction } = firestoreFns;
  const worldRef = worldDocRef(firestoreFns, db, parentId, world.id);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(worldRef);
    if (!snap.exists()) {
      // Primer guardado real de un mundo que `ensureWorld` no llegó a crear
      // (p. ej. una sesión vieja): lo crea acá, en vez de fallar.
      const clean = prepareForFirestore(world);
      assertSize(clean);
      tx.set(worldRef, clean);
      tx.set(versionDocRef(firestoreFns, db, parentId, world.id, world.version), clean);
      return world;
    }
    const remote = snap.data() as GameWorld;
    if (remote.version !== world.version) throw new StaleWorldError(remote.version, world.version);

    const nextVersion = world.version + 1;
    const updated: GameWorld = { ...world, version: nextVersion, metadata: { ...world.metadata, updatedAt: Date.now() } };
    const clean = prepareForFirestore(updated);
    assertSize(clean);
    tx.set(worldRef, clean);
    tx.set(versionDocRef(firestoreFns, db, parentId, world.id, nextVersion), clean);
    return updated;
  });
}
