import { getEntityType, resolveActiveState } from "@/lib/level/entities";
import type { EntityStateDef, LevelDefinition, LevelEntity } from "@/lib/level/schema";
import type { SkillProgress } from "@/lib/types";
import { hasCorrectAttempt } from "@/lib/world/state";
import { emit, MAX_CHAIN_DEPTH, type EventBus, type RuntimeStatePatch } from "@/lib/level/events/bus";
import type { ConditionContext } from "@/lib/level/events/conditions";

/**
 * Estado "vivo" del mundo durante una partida — docs/level-editor-plan.md
 * §9.6/§1.9 (R2/C4). Mismo shape que `RuntimeStatePatch` (`events/bus.ts`)
 * para que aplicar un patch sea un merge campo a campo, nunca reemplazo.
 * NUNCA se persiste aparte: se deriva de cero en cada carga a partir de
 * `skillsProgress` (progreso académico real, ya persistido por el sistema
 * existente) — ver `deriveInitialState`.
 */
export interface LevelRuntimeState {
  flags: Record<string, boolean>;
  /** entityId -> id de `EntityStateDef`. Puede ser el centinela
   *  `"__NEXT_STATE__"` (de `ACTIVATE_OBJECT`, ver events/actions.ts) —
   *  `currentStateOf` es quien lo resuelve, nunca se guarda resuelto. */
  entityStates: Record<string, string>;
  enabledPolygons: Record<string, boolean>;
  /** Entidades con `visible: false` de autor que ya aparecieron
   *  (`SPAWN_OBJECT`). Una entidad `visible: true` de autor no necesita
   *  aparecer acá para ser visible — ver `isEntityVisible`. */
  spawned: Record<string, boolean>;
}

export function createEmptyRuntimeState(level: LevelDefinition): LevelRuntimeState {
  return {
    flags: {},
    entityStates: Object.fromEntries(level.entities.map((e) => [e.id, e.state.initial])),
    enabledPolygons: {},
    spawned: {},
  };
}

/** Aplica un patch (merge por campo, nunca reemplazo) — el mismo criterio
 *  que ya usa `editorReducer` para el resto del nivel, acá para el estado
 *  de juego en vez del contenido autoral. */
export function applyRuntimePatch(state: LevelRuntimeState, patch: RuntimeStatePatch): LevelRuntimeState {
  return {
    flags: { ...state.flags, ...patch.flags },
    entityStates: { ...state.entityStates, ...patch.entityStates },
    enabledPolygons: { ...state.enabledPolygons, ...patch.enabledPolygons },
    spawned: { ...state.spawned, ...patch.spawned },
  };
}

/**
 * El `EntityStateDef` activo de `entity` ahora mismo — nunca `undefined`
 * (cae al primer estado del tipo, mismo criterio que `resolveActiveState`
 * del editor). Resuelve el centinela `"__NEXT_STATE__"` de `ACTIVATE_OBJECT`
 * al **segundo** estado declarado del tipo (§8.4) — es el único lugar del
 * runtime que lo hace, porque es el único que tiene tanto el `EntityTypeDef`
 * (Fase 6) como el estado vivo a mano.
 */
export function currentStateOf(entity: LevelEntity, state: LevelRuntimeState): EntityStateDef {
  const typeDef = getEntityType(entity.type);
  const stateId = state.entityStates[entity.id] ?? entity.state.initial;
  if (stateId === "__NEXT_STATE__") {
    return typeDef.defaultStates.states[1] ?? typeDef.defaultStates.states[0];
  }
  return typeDef.defaultStates.states.find((s) => s.id === stateId) ?? resolveActiveState(entity, typeDef);
}

/** Si `entity` debe pintarse ahora — combina la visibilidad de autor, la del
 *  estado activo, y (para las que arrancan invisibles) si ya `SPAWN_OBJECT`
 *  las hizo aparecer. */
export function isEntityVisible(entity: LevelEntity, state: LevelRuntimeState): boolean {
  const activeState = currentStateOf(entity, state);
  if (!activeState.visible) return false;
  if (!entity.visible) return state.spawned[entity.id] === true;
  return true;
}

function toConditionContext(state: LevelRuntimeState): ConditionContext {
  return { flags: state.flags, entityStates: state.entityStates };
}

/**
 * Reconstruye el estado del mundo puramente a partir de progreso académico
 * ya real (`progressBySkill`) — nunca escribe nada. Para cada desafío del
 * nivel ya resuelto de verdad (`hasCorrectAttempt`), "re-emite" en silencio
 * el `ON_CHALLENGE_SUCCESS` correspondiente contra el bus real del nivel y
 * acumula solo sus `patch` (nunca sus `side`: no hay que volver a sonar el
 * "código aceptado" ni el `+★` de una partida anterior). Así una puerta que
 * ya se abrió la sesión pasada sigue abierta al recargar, sin que el nivel
 * guarde ("puerta abierta") en ningún lado — es una lectura de
 * `skillsProgress`, no una copia (§1.9 R2/C4, criterio A7).
 *
 * Varias reglas pueden depender en cadena unas de otras (la condición de una
 * usa una bandera que otra recién fija) sin que el orden de
 * `level.challenges` lo refleje — por eso se repite el reemplazo completo
 * hasta que un paso no cambie nada (punto fijo), con el mismo tope
 * `MAX_CHAIN_DEPTH` que ya usa `emit` como cinturón de seguridad anti-ciclo.
 */
export function deriveInitialState(
  bus: EventBus,
  level: LevelDefinition,
  progressBySkill: Record<string, SkillProgress>,
): LevelRuntimeState {
  const solvedChallengeIds = level.challenges.filter((c) => hasCorrectAttempt(progressBySkill, c.moduleId)).map((c) => c.id);
  if (solvedChallengeIds.length === 0) return createEmptyRuntimeState(level);

  let state = createEmptyRuntimeState(level);
  for (let pass = 0; pass < MAX_CHAIN_DEPTH; pass++) {
    const before = JSON.stringify(state);
    for (const challengeId of solvedChallengeIds) {
      const effects = emit(bus, { type: "ON_CHALLENGE_SUCCESS", targetId: challengeId, data: {} }, toConditionContext(state));
      for (const effect of effects) {
        if (effect.patch) state = applyRuntimePatch(state, effect.patch);
      }
    }
    if (JSON.stringify(state) === before) break;
  }
  return state;
}
