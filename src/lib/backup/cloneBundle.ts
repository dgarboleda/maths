import type { Firestore } from "firebase/firestore";
import type { AvatarDef, GameWorld, WorldChapter, WorldIssue, WorldLink, WorldNode, WorldUnlockRule } from "@/lib/gameworld/schema";
import { getWorld, saveWorld } from "@/lib/gameworld/persistence/worldRepository";
import { newAvatarId, newChapterId, newLinkId } from "@/lib/gameworld/ids";
import { validateWorld } from "@/lib/gameworld/validate";
import { insertLevel } from "@/lib/level/persistence/levelRepository";
import { listAssets } from "@/lib/level/assets/assetRepository";
import { newLevelId } from "@/lib/level/ids";
import type { LevelDefinition, LevelIssue } from "@/lib/level/schema";
import { validateLevel } from "@/lib/level/validate";
import type { CustomModuleDoc } from "@/lib/curriculum/customSchema";
import { saveCustomModuleDoc } from "@/lib/curriculum/persistence/curriculumRepository";
import { computeMissingAssets, type MissingAsset } from "./backupRepository";
import type { WorldBundle } from "./bundle";

type FirestoreFns = typeof import("firebase/firestore");

export interface CloneResult {
  world: GameWorld;
  levelsCreated: number;
  customModulesCreated: number;
  missingAssets: MissingAsset[];
  /** `validateWorld`/`validateLevel` sobre el resultado ya remapeado (§2.1:
   *  "con validateWorld corriendo sobre el resultado como red") — nunca
   *  bloquea el clonado, igual que `missingAssets`: el padre lo resuelve
   *  desde el editor si hace falta. */
  issues: { world: WorldIssue[]; levels: Record<string, LevelIssue[]> };
}

function remapUnlock(
  unlock: WorldUnlockRule,
  levelIdMap: Map<string, string>,
  moduleIdMap: Map<string, string>,
): WorldUnlockRule {
  if (unlock.kind === "afterLevels") {
    return { ...unlock, levelIds: unlock.levelIds.map((id) => levelIdMap.get(id) ?? id) };
  }
  if (unlock.kind === "afterModules") {
    return { ...unlock, moduleIds: unlock.moduleIds.map((id) => moduleIdMap.get(id) ?? id) };
  }
  return unlock;
}

/**
 * Clona un `WorldBundle` DENTRO de `parentId` — a diferencia de
 * `importBundle` (§2.1: restaura con los ids originales, sobrescribiendo),
 * esto genera ids nuevos para todo lo que trae el paquete y lo FUSIONA con
 * lo que ya exista en esa cuenta, sin sobrescribir nunca un nivel o un nodo
 * propio. Sirve tanto para recibir el mundo de otra familia como para, en
 * la misma cuenta, sumar un paquete exportado antes sin pisar el mundo
 * actual — los dos casos que §2.1 dejó fuera de la Fase 24.
 *
 * Reescribe TODAS las referencias cruzadas que el plan señaló como el
 * riesgo real de clonar: `WorldNode.levelId`, `WorldLink.from/toLevelId`,
 * `LevelExit.target.levelId`, `ChallengePlacement.moduleId` (solo si es un
 * módulo personalizado del propio paquete — un id de MODULES de código,
 * p. ej. "aritmetica-d1", es el mismo catálogo compartido en cualquier
 * cuenta y nunca se remapea) y las reglas `unlock.levelIds`/`moduleIds` de
 * nodos y avatares.
 */
export async function cloneBundle(
  firestoreFns: FirestoreFns,
  db: Firestore,
  parentId: string,
  bundle: WorldBundle,
): Promise<CloneResult> {
  const levelIdMap = new Map(bundle.levels.map((l) => [l.id, newLevelId()]));
  const chapterIdMap = new Map(bundle.world.chapters.map((c) => [c.id, newChapterId()]));
  const moduleIdMap = new Map(bundle.customModules.map((m) => [m.id, `cst-${crypto.randomUUID()}`]));

  const remappedLevels: LevelDefinition[] = bundle.levels.map((level) => ({
    ...level,
    id: levelIdMap.get(level.id)!,
    version: 1,
    navigation: {
      ...level.navigation,
      exits: level.navigation.exits.map((exit) =>
        exit.target.kind === "level"
          ? { ...exit, target: { kind: "level" as const, levelId: levelIdMap.get(exit.target.levelId) ?? exit.target.levelId } }
          : exit,
      ),
    },
    challenges: level.challenges.map((c) => ({ ...c, moduleId: moduleIdMap.get(c.moduleId) ?? c.moduleId })),
    metadata: { ...level.metadata, authorUid: parentId, createdAt: Date.now(), updatedAt: Date.now() },
  }));

  const remappedModules: CustomModuleDoc[] = bundle.customModules.map((mod) => ({
    ...mod,
    id: moduleIdMap.get(mod.id)!,
    prerequisites: mod.prerequisites.map((id) => moduleIdMap.get(id) ?? id),
    metadata: { ...mod.metadata, authorUid: parentId, createdAt: Date.now(), updatedAt: Date.now() },
  }));

  const remappedChapters: WorldChapter[] = bundle.world.chapters.map((c) => ({ ...c, id: chapterIdMap.get(c.id)! }));

  const remappedNodes: WorldNode[] = bundle.world.nodes.map((n) => ({
    ...n,
    levelId: levelIdMap.get(n.levelId) ?? n.levelId,
    chapterId: n.chapterId ? (chapterIdMap.get(n.chapterId) ?? n.chapterId) : null,
    unlock: remapUnlock(n.unlock, levelIdMap, moduleIdMap),
    // Un mundo fusionado nunca puede tener dos puntos de arranque: si el
    // destino ya tiene mundo, el suyo sigue siendo el único `isStart` — ver
    // más abajo el caso "sin mundo todavía", el único donde un nodo clonado
    // puede llegar a serlo.
    isStart: false,
  }));

  const remappedLinks: WorldLink[] = bundle.world.links.map((l) => ({
    ...l,
    id: newLinkId(),
    fromLevelId: levelIdMap.get(l.fromLevelId) ?? l.fromLevelId,
    toLevelId: levelIdMap.get(l.toLevelId) ?? l.toLevelId,
  }));

  const remappedAvatars: AvatarDef[] = bundle.world.avatars.avatars.map((a) => ({
    ...a,
    id: newAvatarId(),
    unlock: remapUnlock(a.unlock, levelIdMap, moduleIdMap),
  }));

  const currentWorld = await getWorld(firestoreFns, db, parentId);
  const mergedWorld: GameWorld = currentWorld
    ? {
        ...currentWorld,
        chapters: [...currentWorld.chapters, ...remappedChapters],
        nodes: [...currentWorld.nodes, ...remappedNodes],
        links: [...currentWorld.links, ...remappedLinks],
        avatars: { ...currentWorld.avatars, avatars: [...currentWorld.avatars.avatars, ...remappedAvatars] },
      }
    : {
        ...bundle.world,
        chapters: remappedChapters,
        // Sin mundo propio todavía: el primer nodo clonado arranca el mundo
        // (si el paquete no traía ningún nodo, `validateWorld` lo va a
        // señalar como "falta el punto de inicio" — se reporta, no bloquea).
        nodes: remappedNodes.map((n, i) => (i === 0 ? { ...n, isStart: true } : n)),
        links: remappedLinks,
        avatars: { ...bundle.world.avatars, avatars: remappedAvatars },
        metadata: { authorUid: parentId, createdAt: Date.now(), updatedAt: Date.now() },
      };

  const savedWorld = await saveWorld(firestoreFns, db, parentId, mergedWorld);

  for (const level of remappedLevels) {
    await insertLevel(firestoreFns, db, parentId, level);
  }
  for (const mod of remappedModules) {
    await saveCustomModuleDoc(firestoreFns, db, parentId, mod);
  }

  const currentAssets = await listAssets(firestoreFns, db, parentId);
  const missingAssets = computeMissingAssets(bundle.assets, currentAssets, remappedLevels);

  return {
    world: savedWorld,
    levelsCreated: remappedLevels.length,
    customModulesCreated: remappedModules.length,
    missingAssets,
    issues: {
      world: validateWorld(savedWorld, remappedLevels),
      levels: Object.fromEntries(remappedLevels.map((l) => [l.id, validateLevel(l)])),
    },
  };
}
