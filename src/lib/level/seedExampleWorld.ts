import type { Firestore } from "firebase/firestore";
import { QUESTS } from "@/lib/world/quests";
import { ensureWorld, saveWorld } from "@/lib/gameworld/persistence/worldRepository";
import type { GameWorld, WorldNode } from "@/lib/gameworld/schema";
import { ciudadCentralAsLevel } from "./legacy/ciudadCentral";
import { insertLevel } from "./persistence/levelRepository";
import type { LevelDefinition } from "./schema";

type FirestoreFns = typeof import("firebase/firestore");

/**
 * Siembra un "mundo de ejemplo" — Fase 18 (docs/level-editor-plan-v2.md §5.2).
 * `ciudadCentralAsLevel()` deja de ser el camino por defecto de `/jugar/
 * {childId}` (eso lo decide ahora el despachador según el Mundo real del
 * padre); acá se persiste ese mismo contenido como un nivel REAL, editable y
 * borrable, más un `GameWorld` con ese único nivel como punto de entrada.
 *
 * Ventaja sobre mantenerlo como contenido "mágico" en memoria: el padre
 * arranca modificando algo de verdad en vez de un lienzo en blanco — es el
 * mejor tutorial posible para el Level Editor.
 */
export async function seedExampleWorld(
  firestoreFns: FirestoreFns,
  db: Firestore,
  parentId: string,
  authorUid: string,
): Promise<{ level: LevelDefinition; world: GameWorld }> {
  const level = ciudadCentralAsLevel(authorUid);
  await insertLevel(firestoreFns, db, parentId, level);

  const node: WorldNode = {
    levelId: level.id,
    chapterId: null,
    position: { x: 50, y: 50 },
    label: level.name,
    icon: "🏙️",
    unlock: { kind: "always" },
    isStart: true,
  };

  // `ensureWorld` es idempotente: si el padre ya tenía un mundo (por haber
  // creado y borrado niveles antes), se parte de ese — nunca se pisa su
  // versión ni su historia ya escrita.
  const base = await ensureWorld(firestoreFns, db, parentId, authorUid);
  const world: GameWorld = {
    ...base,
    story: base.story.logline ? base.story : { ...base.story, logline: QUESTS[0].premise.slice(0, 240) },
    nodes: [...base.nodes.filter((n) => n.levelId !== node.levelId), node],
  };
  const saved = await saveWorld(firestoreFns, db, parentId, world);
  return { level, world: saved };
}
