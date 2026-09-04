import type { QuestProgress } from "./quests";

/**
 * Guion y máquina de estados de la escena de Ciudad Central ("El apagón"),
 * puerto del prototipo de referencia. A diferencia del prototipo, `step` NO
 * es un `useState` local: se deriva en cada render de `questProgress` sobre
 * `QUESTS[0]` (ver `quests.ts`) — mismo principio ya establecido ahí ("no hay
 * estado de misión guardado en ningún lado"). El único estado que sí vive en
 * el componente es efímero y no académico: si el jugador ya saludó a la Dra.
 * Nia en esta visita (`npcGreeted`), igual que el briefing del prototipo
 * tampoco se persistía.
 *
 * La misión real `QUESTS[0]` ("apagon") tiene 3 objetivos (terminal, medidor,
 * compuerta) — uno más que los 2 puzzles del prototipo (terminal, generador):
 * se adapta la secuencia añadiendo el paso `medidor`, reutilizando el resto
 * del lenguaje visual tal cual.
 */

export type StepId = "npc" | "terminal" | "medidor" | "compuerta" | "fin";

export const STEP_ORDER: StepId[] = ["npc", "terminal", "medidor", "compuerta", "fin"];

export interface WorldFlags {
  /** La terminal quedó desbloqueada (paso `terminal` superado). */
  terminalOn: boolean;
  /** El medidor ya se leyó (paso `medidor` superado). */
  medidorListo: boolean;
  /** La compuerta del generador es visible/alcanzable (se revela al leer el medidor). */
  compuertaVisible: boolean;
  /** Misión completa: la ciudad recupera luz y color. */
  cityRestored: boolean;
}

export function worldFlags(step: StepId): WorldFlags {
  const i = STEP_ORDER.indexOf(step);
  return {
    terminalOn: i > STEP_ORDER.indexOf("terminal"),
    medidorListo: i > STEP_ORDER.indexOf("medidor"),
    compuertaVisible: i >= STEP_ORDER.indexOf("compuerta"),
    cityRestored: step === "fin",
  };
}

/**
 * Deriva el paso actual del progreso real de la misión. `npcGreeted` es
 * puramente de sesión (ver comentario de arriba): mientras no se salude a
 * Nia, el paso es siempre "npc" sin importar cuánto se haya avanzado ya —
 * al saludarla, el paso salta directo al primer objetivo real pendiente.
 */
export function stepFromQuestProgress(progress: QuestProgress, npcGreeted: boolean): StepId {
  if (!npcGreeted) return "npc";
  const pending = progress.objectives.find((o) => !o.done);
  if (!pending) return "fin";
  return pending.id as StepId;
}

export type HotspotState = "activo" | "resuelto" | "bloqueado";

export function hotspotState(hotspot: CiudadCentralHotspot, step: StepId): HotspotState {
  const idx = STEP_ORDER.indexOf(hotspot.activeAt);
  const stepIdx = STEP_ORDER.indexOf(step);
  if (idx < stepIdx) return "resuelto";
  if (idx === stepIdx) return "activo";
  return "bloqueado";
}

export type CiudadCentralHotspotKind = "npc" | "terminal" | "mecanismo" | "puerta" | "barrera";

export interface CiudadCentralHotspot {
  id: string;
  kind: CiudadCentralHotspotKind;
  label: string;
  /** Posición en % dentro de la escena. */
  x: number;
  y: number;
  /** Dónde se detiene el avatar al acercarse (en %). */
  standX: number;
  standY: number;
  /** Paso de la misión en el que este punto se vuelve interactivo. */
  activeAt: StepId;
  /** Texto de estado bloqueado — nunca depende solo del color. */
  lockedNote: string;
  /** Id del objetivo real en `QUESTS[0].objectives` (ausente en la NPC y en el aviso de la próxima misión). */
  objectiveId?: string;
  /** Diálogo/mensaje de contexto al interactuar, línea a línea. */
  intro: string[];
  /** Consecuencia visible en el mundo tras resolver. */
  outcome: string;
}

export const PLAYER_START = { x: 57, y: 71 };

export const CIUDAD_CENTRAL_HOTSPOTS: CiudadCentralHotspot[] = [
  {
    id: "nia",
    kind: "npc",
    label: "Dra. Nia",
    x: 49,
    y: 52,
    standX: 53.5,
    standY: 63,
    activeAt: "npc",
    lockedNote: "Ya te dio su pista",
    intro: [
      "La central está fuera de servicio desde anoche. Sin ella, toda la ciudad queda a oscuras.",
      "Vi luz parpadeando en la terminal junto a la puerta blindada. Creo que aún pide un código de acceso.",
      "Si consigues el código, iremos abriendo camino hacia el generador. ¿Vamos?",
    ],
    outcome: "✓ PISTA OBTENIDA · La terminal junto a la Central sigue encendida",
  },
  {
    id: "terminal",
    kind: "terminal",
    label: "Terminal de acceso",
    x: 26,
    y: 46,
    standX: 29.5,
    standY: 52,
    activeAt: "terminal",
    lockedNote: "Necesitas una pista primero",
    objectiveId: "terminal",
    intro: ["SISTEMA BLOQUEADO", "La terminal pide el código de energía faltante para seguir adelante."],
    outcome: "✓ CÓDIGO ACEPTADO · El camino hacia el medidor queda libre",
  },
  {
    id: "medidor",
    kind: "mecanismo",
    label: "Medidor de la central",
    x: 33,
    y: 33,
    standX: 36.5,
    standY: 42,
    activeAt: "medidor",
    lockedNote: "Sellado · sin acceso todavía",
    objectiveId: "medidor",
    intro: ["MEDIDOR EN ESPERA", "Hay que calibrarlo con la lectura correcta para seguir hacia el generador."],
    outcome: "✓ MEDIDOR CALIBRADO · La compuerta del generador empieza a moverse",
  },
  {
    id: "compuerta",
    kind: "puerta",
    label: "Compuerta del generador",
    x: 27,
    y: 24,
    standX: 33,
    standY: 38,
    activeAt: "compuerta",
    lockedNote: "Zona inaccesible",
    objectiveId: "compuerta",
    intro: ["NÚCLEO EN ESPERA", "Para arrancar el reactor hay que abrir la compuerta con la combinación correcta."],
    outcome: "⚡ CENTRAL RESTAURADA · Las luces de la ciudad vuelven a encenderse",
  },
  {
    id: "siguiente-mision",
    kind: "barrera",
    label: "Túnel al Distrito Taller",
    x: 74,
    y: 78,
    standX: 69,
    standY: 81,
    activeAt: "fin",
    lockedNote: "Derrumbado · se abre al restaurar la central",
    intro: [],
    outcome: "",
  },
];
