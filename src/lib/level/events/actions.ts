import type { LevelActionType, PropertyValue } from "@/lib/level/schema";
import type { ConditionContext } from "./conditions";
import type { RuntimeEffect } from "./bus";

/**
 * Handlers del catálogo de acciones — docs/level-editor-plan.md §8.4. Cada
 * uno traduce `action.params` a un `RuntimeEffect` parcial (sin `atMs`: eso
 * lo agrega `emit`, acumulando `delayMs`). Añadir una acción nueva son 2
 * archivos: acá + un descriptor en `catalog.ts` (§7.5, mismo contrato que
 * las entidades).
 */
export type ActionHandler = (
  params: Record<string, PropertyValue>,
  ctx: ConditionContext,
  eventData: Record<string, PropertyValue>,
) => Omit<RuntimeEffect, "atMs">;

function str(v: PropertyValue | undefined, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function num(v: PropertyValue | undefined, fallback = 0): number {
  return typeof v === "number" ? v : fallback;
}
function bool(v: PropertyValue | undefined, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

export const ACTION_HANDLERS: Record<LevelActionType, ActionHandler> = {
  SET_FLAG: (p) => ({ patch: { flags: { [str(p.flag)]: bool(p.value) } } }),
  CHANGE_OBJECT_STATE: (p) => ({ patch: { entityStates: { [str(p.entityId)]: str(p.state) } } }),
  // Azúcar de CHANGE_OBJECT_STATE — el bus no conoce EntityTypeDef.defaultStates
  // (Fase 6), así que deja un centinela que Fase 9 resuelve (ver bus.ts).
  ACTIVATE_OBJECT: (p) => ({ patch: { entityStates: { [str(p.entityId)]: "__NEXT_STATE__" } } }),
  OPEN_DOOR: (p) => ({ patch: { entityStates: { [str(p.entityId)]: "open" } } }),
  CLOSE_DOOR: (p) => ({ patch: { entityStates: { [str(p.entityId)]: "closed" } } }),
  UNLOCK_AREA: (p) => ({ patch: { enabledPolygons: { [str(p.polygonId)]: true } } }),
  REVEAL_AREA: (p) => ({ patch: { enabledPolygons: { [str(p.polygonId)]: true } } }),
  SHOW_DIALOG: (p) => ({ side: { kind: "openDialog", dialogId: str(p.dialogId) } }),
  SHOW_CLUE: (p) => ({ side: { kind: "banner", text: str(p.text), ms: num(p.ms, 3000) } }),
  SPAWN_OBJECT: (p) => ({ patch: { spawned: { [str(p.entityId)]: true } } }),
  // Solo refresca la vista (§8.4) — los objetivos de misión siguen
  // derivándose de skillsProgress/flags (§9.5), nunca de un booleano propio.
  UPDATE_MISSION: () => ({}),
  GENERATE_AXIA: (_p, _ctx, data) => ({ side: { kind: "axiaPulse", stars: num(data.stars, 0) } }),
  START_CHALLENGE: (p) => ({ side: { kind: "openChallenge", challengeId: str(p.challengeId) } }),
  MOVE_PLAYER: (p) => ({ side: { kind: "movePlayer", to: { x: num(p.x), y: num(p.y) }, instant: bool(p.instant) } }),
  PLAY_SOUND: (p) => ({ side: { kind: "playSound", sound: str(p.sound) } }),
};
