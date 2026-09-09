import type { LevelEventRule, LevelEventTrigger, LevelEventType, PropertyValue } from "@/lib/level/schema";
import { evaluateCondition, type ConditionContext } from "./conditions";
import { ACTION_HANDLERS } from "./actions";

/**
 * Bus de eventos — docs/level-editor-plan.md §8. TypeScript puro, sin React
 * y sin Firebase: recibe un evento, decide qué reglas disparan, y devuelve
 * una lista de `RuntimeEffect` — no toca el DOM ni el estado de React. Quien
 * los aplica es el `runtimeReducer` (los `patch`) y los `RuntimeServices`
 * (los `side`), ambos Fase 9. Esta separación es lo que permite probar el
 * bus sin montar nada, y que el Play Test use el mismo bus con servicios
 * distintos.
 */

export type ListenerKey = `${LevelEventType}:${string}`;

export interface EventBus {
  index: Map<ListenerKey, LevelEventRule[]>;
  /** Ids de reglas `once` ya disparadas en esta sesión. */
  fired: Set<string>;
}

function triggerTarget(trigger: LevelEventTrigger): string | null {
  return trigger.entityId ?? trigger.challengeId ?? trigger.zoneId ?? trigger.missionId ?? null;
}

function keyOf(type: LevelEventType, targetId: string | null): ListenerKey {
  return `${type}:${targetId ?? "*"}`;
}

export function createEventBus(rules: LevelEventRule[]): EventBus {
  const index = new Map<ListenerKey, LevelEventRule[]>();
  for (const rule of rules) {
    const key = keyOf(rule.trigger.type, triggerTarget(rule.trigger));
    const list = index.get(key);
    if (list) list.push(rule);
    else index.set(key, [rule]);
  }
  return { index, fired: new Set() };
}

/** Patch de estado del runtime (Fase 9) que produce una acción. Union de
 *  campos, cada uno un merge parcial — el reducer real decide cómo
 *  combinarlos con el estado previo (nunca lo hace este módulo). */
export interface RuntimeStatePatch {
  flags?: Record<string, boolean>;
  /** `"__NEXT_STATE__"` (de `ACTIVATE_OBJECT`) es un valor centinela: el
   *  bus no conoce `EntityTypeDef.defaultStates` (Fase 6) — Fase 9, que sí
   *  tiene el nivel completo, lo resuelve al segundo estado declarado del
   *  tipo antes de aplicar el patch (§8.4). */
  entityStates?: Record<string, string>;
  enabledPolygons?: Record<string, boolean>;
  spawned?: Record<string, boolean>;
  /** Zonas (`LevelZone`, nunca `LevelExit`) que el jugador ya pisó en esta
   *  sesión — de dónde sale `ObjectiveSource: "zone"` (§9.5, Fase 12). Nunca
   *  la fija una acción de evento: `useLevelRuntime` la marca directo al
   *  cruzar la zona, aparte de emitir `ON_ENTER_ZONE`. */
  visitedZones?: Record<string, boolean>;
}

export type SideEffect =
  | { kind: "openDialog"; dialogId: string }
  | { kind: "banner"; text: string; ms: number }
  | { kind: "axiaPulse"; stars: number }
  | { kind: "openChallenge"; challengeId: string }
  | { kind: "movePlayer"; to: { x: number; y: number }; instant: boolean }
  | { kind: "playSound"; sound: string };

export interface RuntimeEffect {
  patch?: RuntimeStatePatch;
  side?: SideEffect;
  /** Retardo acumulado desde que se emitió el evento (suma de los `delayMs`
   *  de esta acción y las anteriores de la misma regla, §8.5). */
  atMs: number;
}

export interface EmitPayload {
  type: LevelEventType;
  targetId: string | null;
  data: Record<string, PropertyValue>;
}

/** Guardia anti-ciclo (T4, §13): un `emit` producido como reacción a otro
 *  `emit` (p. ej. Fase 9 re-emitiendo `ON_CHALLENGE_STARTED` tras un
 *  `START_CHALLENGE`) debe pasar `depth + 1`. Pasado este límite, se aborta
 *  la cadena en vez de colgarse — nunca lanza. */
export const MAX_CHAIN_DEPTH = 32;

export function emit(bus: EventBus, payload: EmitPayload, ctx: ConditionContext, depth = 0): RuntimeEffect[] {
  if (depth >= MAX_CHAIN_DEPTH) {
    console.warn(`[level/events] Cadena de eventos abortada: se superó MAX_CHAIN_DEPTH=${MAX_CHAIN_DEPTH} (posible ciclo).`);
    return [];
  }

  const targeted = bus.index.get(keyOf(payload.type, payload.targetId)) ?? [];
  const wildcard = payload.targetId !== null ? (bus.index.get(keyOf(payload.type, null)) ?? []) : [];
  const candidates = [...targeted, ...wildcard];

  const effects: RuntimeEffect[] = [];
  for (const rule of candidates) {
    if (rule.once && bus.fired.has(rule.id)) continue;
    if (!evaluateCondition(rule.when, ctx)) continue;

    let atMs = 0;
    for (const action of rule.actions) {
      atMs += action.delayMs;
      const handler = ACTION_HANDLERS[action.type];
      if (!handler) continue;
      effects.push({ ...handler(action.params, ctx, payload.data), atMs });
    }
    if (rule.once) bus.fired.add(rule.id);
  }
  return effects;
}
