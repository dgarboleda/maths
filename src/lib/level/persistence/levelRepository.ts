import type { Firestore } from "firebase/firestore";
import { createEmptyLevel } from "../defaults";
import { newLevelId } from "../ids";
import { migrateLevel } from "../migrate";
import { assertSize, prepareForFirestore } from "../serialize";
import type { LevelBackground, LevelDefinition } from "../schema";

/**
 * Acceso a Firestore para el Level Editor — docs/level-editor-plan.md §10.
 * Mismo estilo que `src/lib/attemptRecorder.ts`: funciones puras que reciben
 * `firestoreFns`/`db` como parámetros (nunca llaman a `getFirebase()` por su
 * cuenta), para que el llamador (un componente, o una prueba con el
 * emulador) decida la conexión — y para que ningún archivo de este módulo
 * importe `firebase/firestore` de forma estática (criterio A5 del plan).
 *
 * Esquema: `/parents/{parentId}/levels/{levelId}` (documento vivo) +
 * `/parents/{parentId}/levels/{levelId}/versions/{versionId}` (snapshot
 * inmutable de cada guardado, `versionId` = número de versión con padding a
 * 6 dígitos). Colgado de `/parents/{parentId}`, no de `/children/{childId}`:
 * un nivel no es de un hijo en particular, es del padre-autor — cualquier
 * hijo de la familia puede jugarlo.
 */

type FirestoreFns = typeof import("firebase/firestore");

export interface LevelSummary {
  id: string;
  name: string;
  version: number;
  updatedAt: number;
}

export class StaleLevelError extends Error {
  remoteVersion: number;
  localVersion: number;
  constructor(remoteVersion: number, localVersion: number) {
    super(
      `El nivel se guardó desde otra sesión (versión remota ${remoteVersion}, la que tenías cargada era ${localVersion}). Recargá el nivel antes de seguir editando.`,
    );
    this.name = "StaleLevelError";
    this.remoteVersion = remoteVersion;
    this.localVersion = localVersion;
  }
}

export class LevelNotFoundError extends Error {
  levelId: string;
  constructor(levelId: string) {
    super(`El nivel "${levelId}" no existe.`);
    this.name = "LevelNotFoundError";
    this.levelId = levelId;
  }
}

function zeroPad(version: number): string {
  return String(version).padStart(6, "0");
}

function levelDocRef(firestoreFns: FirestoreFns, db: Firestore, parentId: string, levelId: string) {
  return firestoreFns.doc(db, "parents", parentId, "levels", levelId);
}

function versionDocRef(firestoreFns: FirestoreFns, db: Firestore, parentId: string, levelId: string, version: number) {
  return firestoreFns.doc(db, "parents", parentId, "levels", levelId, "versions", zeroPad(version));
}

/** Niveles del padre, más recientes primero — para la lista de `/panel/editor`. */
export async function listLevels(firestoreFns: FirestoreFns, db: Firestore, parentId: string): Promise<LevelSummary[]> {
  const { collection, getDocs, orderBy, query } = firestoreFns;
  const snap = await getDocs(query(collection(db, "parents", parentId, "levels"), orderBy("metadata.updatedAt", "desc")));
  return snap.docs.map((d) => {
    const data = d.data() as LevelDefinition;
    return { id: d.id, name: data.name, version: data.version, updatedAt: data.metadata.updatedAt };
  });
}

/** Crea un nivel nuevo (jugable desde el minuto cero, ver `createEmptyLevel`)
 *  y dos escrituras atómicas: el documento vivo y su `versions/000001`. */
export async function createLevel(
  firestoreFns: FirestoreFns,
  db: Firestore,
  parentId: string,
  name: string,
  background: LevelBackground,
): Promise<LevelDefinition> {
  const level = createEmptyLevel(parentId, name, background);
  const clean = prepareForFirestore(level);
  const batch = firestoreFns.writeBatch(db);
  batch.set(levelDocRef(firestoreFns, db, parentId, level.id), clean);
  batch.set(versionDocRef(firestoreFns, db, parentId, level.id, level.version), clean);
  await batch.commit();
  return level;
}

/** `null` si no existe. Migra la forma del documento a `LEVEL_SCHEMA_VERSION` al leer. */
export async function getLevel(
  firestoreFns: FirestoreFns,
  db: Firestore,
  parentId: string,
  levelId: string,
): Promise<LevelDefinition | null> {
  const snap = await firestoreFns.getDoc(levelDocRef(firestoreFns, db, parentId, levelId));
  if (!snap.exists()) return null;
  return migrateLevel(snap.data() as Record<string, unknown>);
}

/**
 * Guarda `level` con versionado optimista: si la versión remota ya avanzó
 * respecto a la que traía `level.version`, lanza `StaleLevelError` en vez de
 * pisarla a ciegas. Éxito ⇒ `version` se incrementa, `metadata.updatedAt` se
 * actualiza, y queda un `versions/{nueva versión}` inmutable — ambas
 * escrituras (documento vivo + snapshot) dentro de la misma transacción.
 */
export async function saveLevel(
  firestoreFns: FirestoreFns,
  db: Firestore,
  parentId: string,
  levelId: string,
  level: LevelDefinition,
): Promise<LevelDefinition> {
  const { runTransaction } = firestoreFns;
  const levelRef = levelDocRef(firestoreFns, db, parentId, levelId);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(levelRef);
    if (!snap.exists()) throw new LevelNotFoundError(levelId);
    const remote = snap.data() as LevelDefinition;
    if (remote.version !== level.version) throw new StaleLevelError(remote.version, level.version);

    const nextVersion = level.version + 1;
    const updated: LevelDefinition = { ...level, version: nextVersion, metadata: { ...level.metadata, updatedAt: Date.now() } };
    const clean = prepareForFirestore(updated);
    // Cinturón de seguridad duro (T5/§14 P2, Fase 13): `validateLevel` ya
    // avisa con margen mucho antes de esto (`validateBudgets`); acá se corta
    // de verdad si igual se llega — mejor un error claro (`LevelTooLargeError`)
    // que el rechazo críptico de Firestore al tocar el límite real de 1MiB.
    assertSize(clean);
    tx.set(levelRef, clean);
    tx.set(versionDocRef(firestoreFns, db, parentId, levelId, nextVersion), clean);
    return updated;
  });
}

/** No borra `versions/**` (Firestore no borra subcolecciones en cascada) —
 *  mismo comportamiento ya conocido para `children/**`, ver e2e/utilidades.ts. */
export async function deleteLevel(firestoreFns: FirestoreFns, db: Firestore, parentId: string, levelId: string): Promise<void> {
  await firestoreFns.deleteDoc(levelDocRef(firestoreFns, db, parentId, levelId));
}

/** Inserta un `LevelDefinition` ya armado tal cual (mismo id, misma versión)
 *  — a diferencia de `createLevel`, que arma uno vacío. Usado por
 *  `seedExampleWorld` (Fase 18) para persistir `ciudadCentralAsLevel()` como
 *  un nivel real y editable, no como contenido mágico en memoria. */
export async function insertLevel(firestoreFns: FirestoreFns, db: Firestore, parentId: string, level: LevelDefinition): Promise<LevelDefinition> {
  const clean = prepareForFirestore(level);
  assertSize(clean);
  const batch = firestoreFns.writeBatch(db);
  batch.set(levelDocRef(firestoreFns, db, parentId, level.id), clean);
  batch.set(versionDocRef(firestoreFns, db, parentId, level.id, level.version), clean);
  await batch.commit();
  return level;
}

/** Copia completa (navegación, entidades, todo) bajo un id nuevo, versión 1. */
export async function duplicateLevel(
  firestoreFns: FirestoreFns,
  db: Firestore,
  parentId: string,
  levelId: string,
): Promise<LevelDefinition> {
  const existing = await getLevel(firestoreFns, db, parentId, levelId);
  if (!existing) throw new LevelNotFoundError(levelId);

  const now = Date.now();
  const copy: LevelDefinition = {
    ...existing,
    id: newLevelId(),
    name: `${existing.name} (copia)`,
    version: 1,
    metadata: { ...existing.metadata, createdAt: now, updatedAt: now },
  };
  const clean = prepareForFirestore(copy);
  assertSize(clean);
  const batch = firestoreFns.writeBatch(db);
  batch.set(levelDocRef(firestoreFns, db, parentId, copy.id), clean);
  batch.set(versionDocRef(firestoreFns, db, parentId, copy.id, copy.version), clean);
  await batch.commit();
  return copy;
}

/** Historial de versiones, más reciente primero. */
export async function listVersions(
  firestoreFns: FirestoreFns,
  db: Firestore,
  parentId: string,
  levelId: string,
): Promise<{ version: number; savedAt: number }[]> {
  const { collection, getDocs, orderBy, query } = firestoreFns;
  const snap = await getDocs(
    query(collection(db, "parents", parentId, "levels", levelId, "versions"), orderBy("version", "desc")),
  );
  return snap.docs.map((d) => {
    const data = d.data() as LevelDefinition;
    return { version: data.version, savedAt: data.metadata.updatedAt };
  });
}

export async function getVersion(
  firestoreFns: FirestoreFns,
  db: Firestore,
  parentId: string,
  levelId: string,
  version: number,
): Promise<LevelDefinition> {
  const snap = await firestoreFns.getDoc(versionDocRef(firestoreFns, db, parentId, levelId, version));
  if (!snap.exists()) throw new Error(`No existe la versión ${version} del nivel "${levelId}".`);
  return migrateLevel(snap.data() as Record<string, unknown>);
}

/** Restaura una versión antigua como el contenido actual — un `saveLevel`
 *  más, versionado igual que cualquier otro guardado (nunca sobrescribe la
 *  versión vieja: crea una versión NUEVA con ese contenido). */
export async function restoreVersion(
  firestoreFns: FirestoreFns,
  db: Firestore,
  parentId: string,
  levelId: string,
  version: number,
): Promise<LevelDefinition> {
  const [old, current] = await Promise.all([
    getVersion(firestoreFns, db, parentId, levelId, version),
    getLevel(firestoreFns, db, parentId, levelId),
  ]);
  if (!current) throw new LevelNotFoundError(levelId);
  return saveLevel(firestoreFns, db, parentId, levelId, { ...old, id: levelId, version: current.version });
}
