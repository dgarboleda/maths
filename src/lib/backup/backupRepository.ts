import type { Firestore } from "firebase/firestore";
import type { GameWorld } from "@/lib/gameworld/schema";
import { getWorld, saveWorld } from "@/lib/gameworld/persistence/worldRepository";
import { getLevel, listLevels, listVersions } from "@/lib/level/persistence/levelRepository";
import type { LevelDefinition } from "@/lib/level/schema";
import { assertSize, prepareForFirestore } from "@/lib/level/serialize";
import { listAssets, type LevelAsset } from "@/lib/level/assets/assetRepository";
import { listCustomModuleDocs, saveCustomModuleDoc } from "@/lib/curriculum/persistence/curriculumRepository";
import { buildBundle, type WorldBundle } from "./bundle";

/**
 * Acceso a Firestore del respaldo — Fase 24 (docs/plan-salto-producto.md
 * §2). Mismo estilo A5 que el resto: funciones puras que reciben
 * `firestoreFns`/`db` como parámetros, nunca llaman a `getFirebase()` por su
 * cuenta.
 */
type FirestoreFns = typeof import("firebase/firestore");

export class NothingToExportError extends Error {
  constructor() {
    super("Todavía no hay ningún mundo para exportar.");
    this.name = "NothingToExportError";
  }
}

/** Recorre el mundo, los niveles, los módulos personalizados y las fichas de
 *  assets del padre y los arma en un `WorldBundle` — ninguna escritura. */
export async function exportBundle(firestoreFns: FirestoreFns, db: Firestore, parentId: string): Promise<WorldBundle> {
  const world = await getWorld(firestoreFns, db, parentId);
  if (!world) throw new NothingToExportError();

  const summaries = await listLevels(firestoreFns, db, parentId);
  const loadedLevels = await Promise.all(summaries.map((s) => getLevel(firestoreFns, db, parentId, s.id)));
  const levels = loadedLevels.filter((l): l is LevelDefinition => l !== null);

  const customModules = await listCustomModuleDocs(firestoreFns, db, parentId);
  const assets = await listAssets(firestoreFns, db, parentId);

  return buildBundle({ sourceParentId: parentId, world, levels, customModules, assets });
}

export interface MissingAsset {
  asset: LevelAsset;
  /** Nombres de los niveles del paquete que referencian esta imagen. */
  usedByLevels: string[];
}

export interface ImportResult {
  world: GameWorld;
  levelsRestored: number;
  customModulesRestored: number;
  /** Assets que el paquete referenciaba y ya no existen en esta cuenta — los
   *  bytes nunca viajan en el paquete (§2.3), así que esto es informativo,
   *  no un error: el padre decide si vuelve a subirlas. */
  missingAssets: MissingAsset[];
}

/**
 * Restaura un `WorldBundle` en `parentId` — v1 "solo restaurar" (§2.1): usa
 * los ids originales y sobrescribe lo que ya exista; nunca borra lo que hay
 * en la cuenta y no viene en el paquete (es una fusión, no un reemplazo). El
 * llamador es responsable de confirmar con el padre antes de invocar esto —
 * ver §2.5 punto 4.
 */
export async function importBundle(
  firestoreFns: FirestoreFns,
  db: Firestore,
  parentId: string,
  bundle: WorldBundle,
): Promise<ImportResult> {
  // Mundo: versionado optimista (§2.5 punto 1) — si ya hay un mundo, se
  // escribe con SU versión para que `saveWorld` lo acepte como un guardado
  // más, en vez de chocar con `StaleWorldError`. `metadata.authorUid` se
  // pisa con la cuenta que restaura, no con la que exportó.
  const currentWorld = await getWorld(firestoreFns, db, parentId);
  const worldToSave: GameWorld = {
    ...bundle.world,
    version: currentWorld ? currentWorld.version : bundle.world.version,
    metadata: { ...bundle.world.metadata, authorUid: parentId },
  };
  const savedWorld = await saveWorld(firestoreFns, db, parentId, worldToSave);

  // Niveles: NUNCA se reutiliza el número de versión del paquete tal cual
  // (§2.5 punto 2, ampliado). `deleteLevel` borra el documento vivo pero no
  // su subcolección `versions/**` (Firestore no la borra en cascada) — así
  // que un nivel restaurado con el mismo id puede colisionar con una
  // `versions/{n}` que sobrevivió a un borrado anterior, aunque el
  // documento vivo ya no exista (`insertLevel` no protege contra esto: es
  // el mismo riesgo, no ejercitado, que ya corre `seedExampleWorld` al
  // reinsertar con un id fijo). La única fuente de verdad confiable es el
  // propio historial de versiones — de ahí `listVersions` en vez de mirar
  // solo si el documento vivo existe.
  for (const level of bundle.levels) {
    const stamped: LevelDefinition = { ...level, metadata: { ...level.metadata, authorUid: parentId } };
    await restoreLevel(firestoreFns, db, parentId, stamped);
  }

  // Módulos personalizados: sin versionado (curriculumRepository.ts no lo
  // usa), última escritura gana.
  for (const mod of bundle.customModules) {
    await saveCustomModuleDoc(firestoreFns, db, parentId, { ...mod, metadata: { ...mod.metadata, authorUid: parentId } });
  }

  // Assets (§2.3): los bytes no viajan, solo se verifica qué referencias
  // quedaron rotas contra la biblioteca real de esta cuenta.
  const currentAssets = await listAssets(firestoreFns, db, parentId);
  const missingAssets = computeMissingAssets(bundle.assets, currentAssets, bundle.levels);

  return {
    world: savedWorld,
    levelsRestored: bundle.levels.length,
    customModulesRestored: bundle.customModules.length,
    missingAssets,
  };
}

/**
 * Qué assets referenciados por el paquete no existen en `parentId` — los
 * bytes nunca viajan (§2.3), así que esto es informativo, no un error.
 * Compartida entre `importBundle` (misma cuenta, `parentId` == de origen la
 * mayoría de las veces) y `cloneBundle.ts` (otra cuenta o un segundo import
 * dentro de la misma: prácticamente SIEMPRE "faltantes" en ese caso, y es lo
 * esperado — el padre decide si vuelve a subirlas).
 */
export function computeMissingAssets(
  bundleAssets: LevelAsset[],
  currentAssets: LevelAsset[],
  levels: LevelDefinition[],
): MissingAsset[] {
  const currentUrls = new Set(currentAssets.map((a) => a.url));
  return bundleAssets
    .filter((asset) => !currentUrls.has(asset.url))
    .map((asset) => ({
      asset,
      usedByLevels: levels
        .filter((l) => l.background.src === asset.url || (l.background.layers ?? []).some((layer) => layer.src === asset.url))
        .map((l) => l.name),
    }));
}

function zeroPad(version: number): string {
  return String(version).padStart(6, "0");
}

/** Escribe `level` en `parentId` con un número de versión estrictamente
 *  mayor que cualquiera ya usado por ese id — el propio historial de
 *  `versions/**`, no `level.version` del paquete ni la existencia del
 *  documento vivo, decide el próximo número. */
async function restoreLevel(firestoreFns: FirestoreFns, db: Firestore, parentId: string, level: LevelDefinition): Promise<void> {
  const versions = await listVersions(firestoreFns, db, parentId, level.id);
  const nextVersion = versions.length > 0 ? versions[0].version + 1 : 1;
  const updated: LevelDefinition = { ...level, version: nextVersion, metadata: { ...level.metadata, updatedAt: Date.now() } };
  const clean = prepareForFirestore(updated);
  assertSize(clean);
  const batch = firestoreFns.writeBatch(db);
  batch.set(firestoreFns.doc(db, "parents", parentId, "levels", level.id), clean);
  batch.set(firestoreFns.doc(db, "parents", parentId, "levels", level.id, "versions", zeroPad(nextVersion)), clean);
  await batch.commit();
}
