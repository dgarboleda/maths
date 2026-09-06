import type { WalkableArea } from "./navmesh";
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

/**
 * Se antepone al diálogo normal de la Dra. Nia solo la primera vez que se le
 * habla en toda la partida (`!hasAnyRealPlay(progressBySkill)`, ver
 * QuestScene — no `quest.doneCount === 0`, porque la evaluación de ubicación
 * puede otorgar objetivos de entrada sin que el jugador haya pisado el mundo
 * nunca). Qué es AXIA ya se reveló al terminar la evaluación de ubicación
 * —el "despertar de la terminal" de docs/guion-narrativa-math-quest.md
 * §7-8, ver jugar/[childId]/evaluacion/page.tsx—, así que esto no repite esa
 * parte: presenta a Khaos y a los Null por primera vez (§12-14), la pieza
 * que faltaba para que "Null Drenador" y "NEXUS" en el resto del diálogo
 * tengan sentido.
 */
export const NIA_ORIGIN_INTRO: string[] = [
  "Lo que hiciste en la terminal no pasó desapercibido. Durante generaciones nadie había vuelto a generar AXIA... y alguien lo ha notado.",
  "Se llama Khaos. Hace siglos hizo desaparecer el AXIA para poder controlarlo todo. Ahora que ha vuelto a aparecer, Khaos también ha despertado.",
  "Para eso usa a los Null: criaturas a su servicio que absorben el AXIA que vas generando y lo convierten en NEXUS, su energía de control.",
];

export const PLAYER_START = { x: 57, y: 71 };

/** Dimensiones nativas de `city-central.webp` — ancla el cálculo de `useCameraBox`. */
export const CIUDAD_CENTRAL_IMAGE_SIZE = { width: 1600, height: 907 };

/**
 * Zona pisable de la plaza, trazada a mano en % de imagen con el overlay
 * `?walkdebug=1` de `QuestScene` sobre `city-central.webp` — reemplaza el
 * clamp rectangular que antes limitaba `wander()` sin ninguna relación con
 * el arte real. `boundary` es el contorno de la plaza y sus calles; `holes`
 * son los obstáculos que el avatar no puede atravesar (fuente, edificios).
 */
export const CIUDAD_CENTRAL_WALKABLE: WalkableArea = {
  boundary: [
    { x: 35.3, y: 38.8 },
    { x: 35.4, y: 38.8 },
    { x: 37.7, y: 43.9 },
    { x: 41.1, y: 40.7 },
    { x: 41.2, y: 40.8 },
    { x: 43.9, y: 44 },
    { x: 46.9, y: 42.7 },
    { x: 49.2, y: 35 },
    { x: 50.5, y: 31.9 },
    { x: 52.5, y: 30.5 },
    { x: 55.7, y: 33.8 },
    { x: 52.3, y: 37.8 },
    { x: 51.1, y: 43.7 },
    { x: 55.5, y: 47.9 },
    { x: 58.5, y: 44.1 },
    { x: 61.3, y: 41.4 },
    { x: 63.3, y: 43.1 },
    { x: 60.2, y: 47.2 },
    { x: 58.5, y: 51.6 },
    { x: 59.9, y: 56.1 },
    { x: 59.8, y: 61 },
    { x: 60.5, y: 63.9 },
    { x: 63.9, y: 61.8 },
    { x: 66.8, y: 57.4 },
    { x: 68.9, y: 52.5 },
    { x: 71.1, y: 50.6 },
    { x: 73.9, y: 49.3 },
    { x: 76.1, y: 46 },
    { x: 78.8, y: 48.8 },
    { x: 75.5, y: 54.4 },
    { x: 66.9, y: 63.2 },
    { x: 62.9, y: 66.7 },
    { x: 60.4, y: 73 },
    { x: 58.5, y: 78.4 },
    { x: 54.1, y: 90 },
    { x: 47.6, y: 100 },
    { x: 39.7, y: 99.5 },
    { x: 43.8, y: 94.6 },
    { x: 50.1, y: 86.3 },
    { x: 53.3, y: 76.1 },
    { x: 51.5, y: 73 },
    { x: 48.4, y: 71.5 },
    { x: 44.5, y: 69.3 },
    { x: 41.6, y: 71.9 },
    { x: 40.7, y: 74.4 },
    { x: 40.3, y: 77 },
    { x: 41.1, y: 80.3 },
    { x: 43.5, y: 82.2 },
    { x: 42.3, y: 84.6 },
    { x: 40.3, y: 88 },
    { x: 37.6, y: 93.3 },
    { x: 36.2, y: 98.5 },
    { x: 31.9, y: 99.4 },
    { x: 33.4, y: 91.7 },
    { x: 33.2, y: 88.4 },
    { x: 31.8, y: 84.9 },
    { x: 33.3, y: 83 },
    { x: 35.2, y: 86.3 },
    { x: 37.4, y: 85.4 },
    { x: 36.6, y: 79.8 },
    { x: 37.6, y: 70.8 },
    { x: 34.1, y: 61.5 },
    { x: 33.9, y: 54.5 },
    { x: 33, y: 48.6 },
    { x: 31.3, y: 43.4 },
    { x: 33.3, y: 40.8 },
  ],
  holes: [
    [
      { x: 54.8, y: 53.1 },
      { x: 55.9, y: 56.9 },
      { x: 55.6, y: 61.7 },
      { x: 52.7, y: 65.8 },
      { x: 48.7, y: 66.7 },
      { x: 43.7, y: 65.8 },
      { x: 40, y: 61.1 },
      { x: 39.2, y: 57.7 },
      { x: 40.7, y: 53.3 },
      { x: 43.5, y: 50.5 },
      { x: 46.7, y: 49.8 },
      { x: 51.8, y: 50.5 },
    ],
  ],
};

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
      "La central está fuera de servicio desde anoche. Un Null Drenador se instaló en el generador y absorbe el AXIA antes de que llegue a las luces.",
      "Vi luz parpadeando en la terminal junto a la puerta blindada. Creo que aún pide un código de acceso.",
      "Si consigues el código, iremos abriendo camino hacia el generador antes de que Khaos convierta más AXIA en NEXUS. ¿Vamos?",
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
    outcome: "⚡ CENTRAL RESTAURADA · El AXIA vuelve a fluir y las luces de la ciudad se encienden",
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
