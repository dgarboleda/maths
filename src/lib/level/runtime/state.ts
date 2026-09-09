import { getEntityType, resolveActiveState } from "@/lib/level/entities";
import type { LevelDefinition, LevelEntity, LevelMission, LevelMissionObjective, EntityStateDef, ObjectiveSource } from "@/lib/level/schema";
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
  /** Zonas ya pisadas en esta sesión — ver `RuntimeStatePatch.visitedZones`. */
  visitedZones: Record<string, boolean>;
}

export function createEmptyRuntimeState(level: LevelDefinition): LevelRuntimeState {
  return {
    flags: {},
    entityStates: Object.fromEntries(level.entities.map((e) => [e.id, e.state.initial])),
    enabledPolygons: {},
    spawned: {},
    visitedZones: {},
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
    visitedZones: { ...state.visitedZones, ...patch.visitedZones },
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

/**
 * Misiones y HUD — docs/level-editor-plan.md §9.5/§17 Fase 12. Un objetivo
 * NUNCA guarda un booleano propio de "hecho": se deriva en cada render de la
 * fuente que declara su `ObjectiveSource` (mismo principio que ya aplica
 * `world/quests.ts:hasCorrectAttempt` para las misiones de Ciudad Central).
 *
 * - `"challenge"`: el módulo del `ChallengePlacement` referenciado tiene un
 *   acierto real (`hasCorrectAttempt` sobre `skillsProgress`) — sobrevive a
 *   un recargo de página sin que el nivel guarde nada (criterio 21/A7).
 * - `"zone"`: el jugador ya pisó esa zona en esta sesión (`state.
 *   visitedZones`, fijado directo por `useLevelRuntime` al cruzarla — nunca
 *   por una acción de evento, es automático).
 * - `"collectible"`: el estado vivo de la entidad ya no es su estado
 *   inicial de autor — así funciona para cualquier tipo de entidad, sin
 *   asumir que el id de un estado en particular se llama "collected"; el
 *   autor del nivel es quien decide, con una regla de evento propia
 *   (`ON_INTERACT` → `ACTIVATE_OBJECT`/`CHANGE_OBJECT_STATE`), cuándo pasa.
 * - `"flag"`: el valor vivo de esa bandera coincide con el declarado.
 *
 * Ninguno de los 4 persiste como progreso de nivel — "zone"/"collectible"/
 * "flag" son estado de sesión puro (como `entityStates`/`enabledPolygons`) y
 * se reinician con la partida, igual que ya pasa con una puerta abierta que
 * no vino de un desafío resuelto de verdad.
 */
export function deriveObjectiveDone(
  source: ObjectiveSource,
  level: LevelDefinition,
  progressBySkill: Record<string, SkillProgress>,
  state: LevelRuntimeState,
): boolean {
  switch (source.kind) {
    case "challenge": {
      const challenge = level.challenges.find((c) => c.id === source.challengeId);
      return challenge ? hasCorrectAttempt(progressBySkill, challenge.moduleId) : false;
    }
    case "zone":
      return state.visitedZones[source.zoneId] === true;
    case "collectible": {
      const entity = level.entities.find((e) => e.id === source.entityId);
      return entity ? state.entityStates[entity.id] !== entity.state.initial : false;
    }
    case "flag":
      return state.flags[source.flag] === source.value;
  }
}

export interface ObjectiveProgress extends LevelMissionObjective {
  done: boolean;
}

export interface MissionProgress {
  mission: LevelMission;
  objectives: ObjectiveProgress[];
  doneCount: number;
  total: number;
  complete: boolean;
}

export function missionProgress(
  mission: LevelMission,
  level: LevelDefinition,
  progressBySkill: Record<string, SkillProgress>,
  state: LevelRuntimeState,
): MissionProgress {
  const objectives = mission.objectives.map((o) => ({ ...o, done: deriveObjectiveDone(o.source, level, progressBySkill, state) }));
  const doneCount = objectives.filter((o) => o.done).length;
  return { mission, objectives, doneCount, total: objectives.length, complete: doneCount === objectives.length };
}

/** La primera misión del nivel que todavía no está completa; `null` si no
 *  hay ninguna misión o ya se hicieron todas — mismo criterio que
 *  `world/quests.ts:activeQuest`. Es lo que muestra la barra de objetivo
 *  actual del HUD (`LevelHud`) y lo que abre `LevelMissionOverlay`. */
export function activeMission(
  level: LevelDefinition,
  progressBySkill: Record<string, SkillProgress>,
  state: LevelRuntimeState,
): MissionProgress | null {
  for (const mission of level.missions) {
    const progress = missionProgress(mission, level, progressBySkill, state);
    if (!progress.complete) return progress;
  }
  return null;
}
