import type { LevelActionType, PropertyValue } from "@/lib/level/schema";

/**
 * Descriptor de un parámetro de acción — docs/level-editor-plan.md §8.4.
 * Dirige `ActionField` (`fields/ActionFields.tsx`) sin que `EventChainEditor`
 * necesite saber nada de la acción en particular, mismo principio que
 * `PropertyFieldDef` para las entidades (§5.3) — pero es un catálogo propio
 * (no el mismo tipo): los parámetros de una acción no son propiedades de una
 * entidad, y `"select"` (p. ej. la capa de `UNLOCK_AREA`) no tiene sentido
 * ahí.
 */
export type ActionParamDef =
  | { kind: "text"; key: string; label: string; default: string }
  | { kind: "number"; key: string; label: string; default: number }
  | { kind: "boolean"; key: string; label: string; default: boolean }
  | { kind: "select"; key: string; label: string; default: string; options: { value: string; label: string }[] }
  | { kind: "entityRef"; key: string; label: string; default: string; ofType?: string[] }
  | { kind: "polygonRef"; key: string; label: string; default: string }
  | { kind: "zoneRef"; key: string; label: string; default: string }
  | { kind: "dialogRef"; key: string; label: string; default: string }
  | { kind: "challengeRef"; key: string; label: string; default: string }
  | { kind: "missionRef"; key: string; label: string; default: string };

export interface ActionTypeDef {
  label: string;
  params: ActionParamDef[];
}

const ROLE_OPTIONS = [
  { value: "walkable", label: "Transitable" },
  { value: "blocked", label: "Bloqueado" },
];

export const ACTION_TYPES: Record<LevelActionType, ActionTypeDef> = {
  SET_FLAG: {
    label: "Fijar bandera",
    params: [
      { kind: "text", key: "flag", label: "Bandera", default: "" },
      { kind: "boolean", key: "value", label: "Valor", default: true },
    ],
  },
  CHANGE_OBJECT_STATE: {
    label: "Cambiar estado de objeto",
    params: [
      { kind: "entityRef", key: "entityId", label: "Entidad", default: "" },
      { kind: "text", key: "state", label: "Estado (id)", default: "" },
    ],
  },
  ACTIVATE_OBJECT: {
    label: "Activar objeto",
    params: [{ kind: "entityRef", key: "entityId", label: "Entidad", default: "" }],
  },
  OPEN_DOOR: {
    label: "Abrir puerta",
    params: [{ kind: "entityRef", key: "entityId", label: "Puerta", default: "", ofType: ["door"] }],
  },
  CLOSE_DOOR: {
    label: "Cerrar puerta",
    params: [{ kind: "entityRef", key: "entityId", label: "Puerta", default: "", ofType: ["door"] }],
  },
  UNLOCK_AREA: {
    label: "Desbloquear área",
    params: [
      { kind: "polygonRef", key: "polygonId", label: "Polígono", default: "" },
      { kind: "select", key: "role", label: "Capa", default: "walkable", options: ROLE_OPTIONS },
    ],
  },
  REVEAL_AREA: {
    label: "Revelar área",
    params: [{ kind: "polygonRef", key: "polygonId", label: "Polígono", default: "" }],
  },
  SHOW_DIALOG: {
    label: "Mostrar diálogo",
    params: [{ kind: "dialogRef", key: "dialogId", label: "Diálogo", default: "" }],
  },
  SHOW_CLUE: {
    label: "Mostrar pista",
    params: [
      { kind: "text", key: "text", label: "Texto", default: "" },
      { kind: "number", key: "ms", label: "Duración (ms)", default: 3000 },
    ],
  },
  SPAWN_OBJECT: {
    label: "Aparecer objeto",
    params: [{ kind: "entityRef", key: "entityId", label: "Entidad", default: "" }],
  },
  UPDATE_MISSION: {
    label: "Actualizar misión",
    params: [
      { kind: "missionRef", key: "missionId", label: "Misión", default: "" },
      { kind: "text", key: "objectiveId", label: "Objetivo (id)", default: "" },
    ],
  },
  GENERATE_AXIA: {
    label: "Generar AXIA",
    params: [{ kind: "text", key: "source", label: "Origen", default: "challenge" }],
  },
  START_CHALLENGE: {
    label: "Iniciar desafío",
    params: [{ kind: "challengeRef", key: "challengeId", label: "Desafío", default: "" }],
  },
  MOVE_PLAYER: {
    label: "Mover a Alex",
    params: [
      { kind: "number", key: "x", label: "X (%)", default: 50 },
      { kind: "number", key: "y", label: "Y (%)", default: 50 },
      { kind: "boolean", key: "instant", label: "Instantáneo", default: false },
    ],
  },
  PLAY_SOUND: {
    label: "Reproducir sonido",
    params: [{ kind: "text", key: "sound", label: "Sonido", default: "" }],
  },
};

/** `PropertyValue` por defecto de cada parámetro — para inicializar una
 *  acción nueva en `EventChainEditor`. */
export function defaultActionParams(type: LevelActionType): Record<string, PropertyValue> {
  return Object.fromEntries(ACTION_TYPES[type].params.map((p) => [p.key, p.default]));
}
