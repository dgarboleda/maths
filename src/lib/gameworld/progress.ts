import { getModule, isMastered } from "@/lib/curriculum";
import { hasCorrectAttempt } from "@/lib/world/state";
import type { LevelDefinition } from "@/lib/level/schema";
import type { SkillProgress } from "@/lib/types";
import type { GameWorld, WorldNode, WorldRules, WorldUnlockRule } from "./schema";

/**
 * Derivaciones puras del progreso de mundo — Fase 16 (docs/level-editor-plan-v2.md
 * §3.3). Ningún estado de mundo se persiste: "nivel completado" y "nodo
 * desbloqueado" se recalculan en cada render a partir de `skillsProgress`
 * real, exactamente el mismo principio que `world/state.ts:interactableState`
 * — nunca una copia que pueda desincronizarse del currículo.
 */

export type WorldNodeState = "bloqueado" | "disponible" | "completado";

/** "Nivel completado" según la regla elegida por el padre en `WorldRules` —
 *  siempre una lectura de `skillsProgress`, nunca un dato propio del mundo. */
export function levelCompleted(
  level: LevelDefinition,
  progressBySkill: Record<string, SkillProgress>,
  rule: WorldRules["levelCompletion"],
): boolean {
  if (level.challenges.length === 0) return false;
  const check = rule === "allChallengesMastered" ? (moduleId: string) => isMastered(progressBySkill, moduleId) : (moduleId: string) => hasCorrectAttempt(progressBySkill, moduleId);
  return rule === "anyChallengeCorrect" ? level.challenges.some((c) => check(c.moduleId)) : level.challenges.every((c) => check(c.moduleId));
}

/** Evalúa un `WorldUnlockRule` desnudo contra progreso real — el mismo
 *  vocabulario ("siempre" / "tras niveles" / "tras módulos" / "tras
 *  estrellas") sirve tanto para nodos del mapa (`nodeUnlocked`) como para
 *  avatares del catálogo (`avatarUnlocked`, Fase 19): ninguno de los dos
 *  inventa su propio booleano de desbloqueo. */
export function evaluateUnlockRule(
  rule: WorldUnlockRule,
  levelsById: Record<string, LevelDefinition>,
  progressBySkill: Record<string, SkillProgress>,
  totalStars: number,
  worldRules: WorldRules,
): boolean {
  switch (rule.kind) {
    case "always":
      return true;
    case "afterStars":
      return totalStars >= rule.stars;
    case "afterModules": {
      const check = (id: string) => isMastered(progressBySkill, id);
      return rule.mode === "any" ? rule.moduleIds.some(check) : rule.moduleIds.every(check);
    }
    case "afterLevels": {
      const check = (id: string) => {
        const level = levelsById[id];
        return level ? levelCompleted(level, progressBySkill, worldRules.levelCompletion) : false;
      };
      return rule.mode === "any" ? rule.levelIds.some(check) : rule.levelIds.every(check);
    }
  }
}

export function nodeUnlocked(
  node: WorldNode,
  world: GameWorld,
  levelsById: Record<string, LevelDefinition>,
  progressBySkill: Record<string, SkillProgress>,
  totalStars: number,
): boolean {
  if (node.isStart) return true;
  return evaluateUnlockRule(node.unlock, levelsById, progressBySkill, totalStars, world.rules);
}

/** Un avatar del catálogo está desbloqueado para este hijo — mismas reglas
 *  que un nodo del mapa, sin el caso especial `isStart` (un avatar no tiene
 *  "punto de entrada"). */
export function avatarUnlocked(
  avatar: { unlock: WorldUnlockRule },
  world: GameWorld,
  levelsById: Record<string, LevelDefinition>,
  progressBySkill: Record<string, SkillProgress>,
  totalStars: number,
): boolean {
  return evaluateUnlockRule(avatar.unlock, levelsById, progressBySkill, totalStars, world.rules);
}

/** Estado de cada nodo del mapa, en un solo pase — lo que pinta `/jugar/
 *  {childId}/mapa` y lo que usa el Editor de Mundo para colorear el grafo. */
export function worldGraphState(
  world: GameWorld,
  levelsById: Record<string, LevelDefinition>,
  progressBySkill: Record<string, SkillProgress>,
  totalStars: number,
): Record<string, WorldNodeState> {
  const result: Record<string, WorldNodeState> = {};
  for (const node of world.nodes) {
    const level = levelsById[node.levelId];
    if (level && levelCompleted(level, progressBySkill, world.rules.levelCompletion)) {
      result[node.levelId] = "completado";
    } else if (nodeUnlocked(node, world, levelsById, progressBySkill, totalStars)) {
      result[node.levelId] = "disponible";
    } else {
      result[node.levelId] = "bloqueado";
    }
  }
  return result;
}

/** Resuelve `moduleIds`/`levelIds` inexistentes — usado por `validateWorld`. */
export function unresolvedModuleIds(moduleIds: string[]): string[] {
  return moduleIds.filter((id) => !getModule(id));
}
