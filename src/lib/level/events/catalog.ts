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
interface BaseActionParamDef {
  key: string;
  label: string;
  /** Ayuda corta mostrada en tooltip — mismo mecanismo que `PropertyFieldDef.hint`
   *  (Fase 15, docs/level-editor-plan-v2.md §2.3). */
  hint?: string;
}

export type ActionParamDef = BaseActionParamDef &
  (
    | { kind: "text"; default: string }
    | { kind: "number"; default: number }
    | { kind: "boolean"; default: boolean }
    | { kind: "select"; default: string; options: { value: string; label: string }[] }
    | { kind: "entityRef"; default: string; ofType?: string[] }
    | { kind: "polygonRef"; default: string }
    | { kind: "zoneRef"; default: string }
    | { kind: "dialogRef"; default: string }
    | { kind: "challengeRef"; default: string }
    | { kind: "missionRef"; default: string }
  );

export interface ActionTypeDef {
  label: string;
  /** Ayuda corta de qué hace este tipo de acción — se muestra en el
   *  selector "Tipo de acción" de `EventChainEditor`. */
  hint?: string;
  params: ActionParamDef[];
}

const ROLE_OPTIONS = [
  { value: "walkable", label: "Transitable" },
  { value: "blocked", label: "Bloqueado" },
];

export const ACTION_TYPES: Record<LevelActionType, ActionTypeDef> = {
  SET_FLAG: {
    label: "Fijar bandera",
    hint: "Guarda un valor sí/no con un nombre que otras reglas pueden leer en su condición.",
    params: [
      { kind: "text", key: "flag", label: "Bandera", default: "", hint: "Nombre de la bandera — usá el mismo nombre en la condición que la lee." },
      { kind: "boolean", key: "value", label: "Valor", default: true },
    ],
  },
  CHANGE_OBJECT_STATE: {
    label: "Cambiar estado de objeto",
    hint: "Cambia en qué estado de su máquina de estados está una entidad (p. ej. una puerta de \"cerrada\" a \"abierta\").",
    params: [
      { kind: "entityRef", key: "entityId", label: "Entidad", default: "" },
      { kind: "text", key: "state", label: "Estado (id)", default: "", hint: "El id del estado — mirá los estados definidos en el panel de propiedades de esa entidad." },
    ],
  },
  ACTIVATE_OBJECT: {
    label: "Activar objeto",
    hint: "Marca una entidad como activada (por ejemplo, para que ya no muestre su mensaje de bloqueada).",
    params: [{ kind: "entityRef", key: "entityId", label: "Entidad", default: "" }],
  },
  OPEN_DOOR: {
    label: "Abrir puerta",
    hint: "Abre la puerta indicada — libera el bloqueador de navegación asociado.",
    params: [{ kind: "entityRef", key: "entityId", label: "Puerta", default: "", ofType: ["door"] }],
  },
  CLOSE_DOOR: {
    label: "Cerrar puerta",
    hint: "Cierra la puerta indicada — vuelve a activar el bloqueador de navegación asociado.",
    params: [{ kind: "entityRef", key: "entityId", label: "Puerta", default: "", ofType: ["door"] }],
  },
  UNLOCK_AREA: {
    label: "Desbloquear área",
    hint: "Activa un polígono transitable o desactiva uno bloqueado, cambiando por dónde puede caminar Alex.",
    params: [
      { kind: "polygonRef", key: "polygonId", label: "Polígono", default: "" },
      { kind: "select", key: "role", label: "Capa", default: "walkable", options: ROLE_OPTIONS, hint: "En qué lista vive el polígono elegido." },
    ],
  },
  REVEAL_AREA: {
    label: "Revelar área",
    hint: "Hace visible un área del mapa que estaba oculta.",
    params: [{ kind: "polygonRef", key: "polygonId", label: "Polígono", default: "" }],
  },
  SHOW_DIALOG: {
    label: "Mostrar diálogo",
    hint: "Abre un diálogo existente del nivel.",
    params: [{ kind: "dialogRef", key: "dialogId", label: "Diálogo", default: "" }],
  },
  SHOW_CLUE: {
    label: "Mostrar pista",
    hint: "Muestra un mensaje flotante breve en pantalla.",
    params: [
      { kind: "text", key: "text", label: "Texto", default: "" },
      { kind: "number", key: "ms", label: "Duración (ms)", default: 3000, hint: "Cuánto tiempo queda visible el mensaje, en milisegundos." },
    ],
  },
  SPAWN_OBJECT: {
    label: "Aparecer objeto",
    hint: "Hace visible una entidad que estaba oculta al empezar el nivel.",
    params: [{ kind: "entityRef", key: "entityId", label: "Entidad", default: "" }],
  },
  UPDATE_MISSION: {
    label: "Actualizar misión",
    hint: "Marca un objetivo de una misión como cumplido.",
    params: [
      { kind: "missionRef", key: "missionId", label: "Misión", default: "" },
      { kind: "text", key: "objectiveId", label: "Objetivo (id)", default: "", hint: "El id del objetivo dentro de esa misión." },
    ],
  },
  GENERATE_AXIA: {
    label: "Generar AXIA",
    hint: "Otorga estrellas/energía narrativa al jugador, igual que resolver un desafío.",
    params: [{ kind: "text", key: "source", label: "Origen", default: "challenge", hint: "Etiqueta interna de dónde vino esta recompensa (solo informativa)." }],
  },
  START_CHALLENGE: {
    label: "Iniciar desafío",
    hint: "Abre directamente un desafío matemático ya colocado en el nivel, sin esperar a que el jugador interactúe con su entidad.",
    params: [{ kind: "challengeRef", key: "challengeId", label: "Desafío", default: "" }],
  },
  MOVE_PLAYER: {
    label: "Mover a Alex",
    hint: "Traslada al jugador a una posición del mapa, caminando o al instante.",
    params: [
      { kind: "number", key: "x", label: "X (%)", default: 50 },
      { kind: "number", key: "y", label: "Y (%)", default: 50 },
      { kind: "boolean", key: "instant", label: "Instantáneo", default: false, hint: "Si está activo, Alex aparece ahí directamente en vez de caminar." },
    ],
  },
  PLAY_SOUND: {
    label: "Reproducir sonido",
    hint: "Reproduce un efecto de sonido del juego.",
    params: [{ kind: "text", key: "sound", label: "Sonido", default: "" }],
  },
};

/** `PropertyValue` por defecto de cada parámetro — para inicializar una
 *  acción nueva en `EventChainEditor`. */
export function defaultActionParams(type: LevelActionType): Record<string, PropertyValue> {
  return Object.fromEntries(ACTION_TYPES[type].params.map((p) => [p.key, p.default]));
}
