/**
 * Modelo de datos del Level Editor — docs/level-editor-plan.md §4.
 *
 * Solo tipos y constantes puras: sin React, sin Firebase, sin ningún import
 * de otra parte del Level Editor (`entities/registry.ts`, `events/bus.ts`,
 * etc. importan DESDE acá, nunca al revés). `LevelDefinition` es la única
 * fuente de verdad de un nivel — el editor la modifica, el runtime la
 * interpreta (§4, §5.2, §9 del plan).
 */

export const LEVEL_SCHEMA_VERSION = 2;

/** Siempre % de la imagen de fondo, 0-100 — el mismo sistema de coordenadas
 *  que ya usan los hotspots de `questScene.ts` (`x`/`y`/`standX`/`standY`). */
export interface Vec2 {
  x: number;
  y: number;
}

/* ════════════════════════════════════════════════════════════════════════
 * NIVEL COMPLETO
 * ════════════════════════════════════════════════════════════════════════ */

export interface LevelDefinition {
  id: string;
  name: string;
  /** Versión de guardado (optimista): se incrementa en cada `saveLevel`
   *  exitoso (persistencia, Fase 3). No confundir con `schemaVersion`. */
  version: number;
  /** = LEVEL_SCHEMA_VERSION al crear; `migrateLevel` la actualiza al leer un
   *  nivel guardado con un esquema anterior. */
  schemaVersion: number;
  background: LevelBackground;
  navigation: LevelNavigation;
  entities: LevelEntity[];
  /** Zonas de interacción/disparo, poligonales o circulares. */
  zones: LevelZone[];
  dialogs: LevelDialog[];
  /** Referencias a desafíos EXISTENTES — nunca contenido académico propio. */
  challenges: ChallengePlacement[];
  missions: LevelMission[];
  events: LevelEventRule[];
  metadata: LevelMetadata;
  /**
   * Configuración de profundidad 2.5D (docs/scene-25d-plan.md §E.2) — opcional
   * y retrocompatible: un nivel sin este campo (o con `enabled: false`) se ve
   * y se comporta exactamente igual que antes de esta fase. Cuando está
   * activo, `src/lib/level/depth.ts` lo usa para calcular la escala/sombra de
   * cada entidad y del jugador según su posición Y — nunca cambia qué es
   * transitable ni el orden de pintado (y-sort), que siguen siendo
   * responsabilidad exclusiva de `layer`/`position.y`.
   */
  depth?: LevelDepthConfig;
}

/**
 * Curva profundidad→escala/sombra de todo el nivel — docs/scene-25d-plan.md
 * §E.2/§H. `range` son posiciones Y (% de imagen, mismo sistema que todo lo
 * demás); `scale`/`shadow` son los valores en los extremos de ese rango,
 * interpolados linealmente para cualquier Y intermedio y clampados fuera de
 * rango (ver `depthScaleFor` en `depth.ts`).
 */
export interface LevelDepthConfig {
  enabled: boolean;
  range: { nearY: number; farY: number };
  scale: { near: number; far: number };
  shadow: { enabled: boolean; opacityNear: number; opacityFar: number };
}

export interface LevelMetadata {
  /** uid del padre autenticado — mismo dueño que /parents/{uid}. */
  authorUid: string;
  createdAt: number;
  updatedAt: number;
  /** Sinopsis corta opcional, solo informativa (lista de niveles). */
  description?: string;
}

/* ════════════════════════════════════════════════════════════════════════
 * FONDO
 * ════════════════════════════════════════════════════════════════════════ */

export interface LevelBackground {
  /** Ruta bajo /illustrations/, mismo criterio que hoy. */
  src: string;
  /** px nativos — igual que CIUDAD_CENTRAL_IMAGE_SIZE. */
  width: number;
  height: number;
  /** Obligatorio (accesibilidad) — `validateLevel` lo exige no vacío. */
  alt: string;
  /** Solo afecta la rejilla del editor (rombos en vez de cuadrados), nunca
   *  las coordenadas ni el sistema de navegación. */
  projection: "flat" | "isometric";
  /** Filtros condicionados por flags de evento — sustituye al
   *  `if (flags.cityRestored)` hardcodeado de QuestScene.tsx:413-415 por una
   *  regla configurable. */
  filters?: LevelBackgroundFilter[];
  /**
   * Capas decorativas de parallax, detrás o delante del fondo principal
   * (`src`) — docs/scene-25d-plan.md §E.1. Opcional, vacía por defecto: sin
   * ninguna capa, el resultado visual es idéntico al de antes de esta fase
   * (una sola imagen fija a la cámara, `src`). El propio `src` se comporta
   * como si fuera una capa implícita de `depth: 1` (se mueve exactamente
   * como la cámara, igual que siempre) — las capas de este array son
   * ADICIONALES a esa, nunca la reemplazan.
   */
  layers?: LevelBackgroundLayer[];
}

export interface LevelBackgroundFilter {
  id: string;
  when: ConditionExpr;
  /** p. ej. "brightness(1.1) saturate(1.25)". */
  css: string;
}

/**
 * Una capa decorativa de fondo — docs/scene-25d-plan.md §E.1/§H.3.
 */
export interface LevelBackgroundLayer {
  id: string;
  /** Ruta bajo /illustrations/, mismo criterio que el fondo principal. */
  src: string;
  /**
   * Qué tan cerca de la cámara se mueve esta capa: `0` = fija (cielo/
   * horizonte, no se desplaza), `1` = se mueve exactamente como el fondo
   * principal, `>1` = capa cercana que se desplaza más rápido que la cámara
   * (efecto de proximidad). Ver `parallaxOffset` en `depth.ts`.
   */
  depth: number;
  /** Desplazamiento vertical en % de la imagen, para capas que no cubren la
   *  escena completa (p. ej. una silueta de horizonte). */
  offsetY: number;
  /** 0-1. */
  opacity: number;
  /** Si la imagen se repite horizontalmente al desplazarse. */
  loop: boolean;
  /** Efecto ambiental CSS asociado — docs/scene-25d-plan.md §C.4. `"none"` =
   *  capa de imagen estática simple, igual que cualquier otra. */
  effect: "particles" | "glow" | "fog" | "none";
}

/* ════════════════════════════════════════════════════════════════════════
 * NAVEGACIÓN
 * ════════════════════════════════════════════════════════════════════════ */

export interface NavPolygon {
  id: string;
  /** Polígono simple, ≥3 vértices, en % de imagen. */
  points: Vec2[];
  /** Si empieza activo (transitable/bloqueado) o si depende de un evento
   *  (UNLOCK_AREA) para activarse — ver runtime/navigation.ts (Fase 9). */
  initiallyEnabled: boolean;
}

/**
 * A dónde lleva un `LevelExit` — docs/level-editor-plan-v2.md §3.4 (Fase 16,
 * schemaVersion 2). `"href"` es la escotilla: sigue permitiendo cualquier
 * ruta para casos no cubiertos, pero el editor nunca la genera por defecto —
 * siempre elige un nivel real (`"level"`) o "volver al mapa" (`"worldMap"`)
 * de un desplegable, nunca escribiendo una ruta a mano.
 */
export type LevelExitTarget = { kind: "level"; levelId: string } | { kind: "worldMap" } | { kind: "href"; href: string };

export interface LevelExit {
  id: string;
  /** Zona de salida del nivel (vuelve al mapa/zona anterior). */
  polygon: Vec2[];
  label: string;
  target: LevelExitTarget;
  /** @deprecated Solo `schemaVersion` 1. `migrate.ts` lo traduce a `target`
   *  al leer y lo conserva sin usar — nada en el runtime ni en el editor
   *  vuelve a leer este campo. */
  targetHref?: string;
}

export interface LevelNavigation {
  walkablePolygons: NavPolygon[];
  blockedPolygons: NavPolygon[];
  /** Punto de inicio de Alex — debe caer dentro de un walkable. */
  spawn: Vec2;
  exits: LevelExit[];
}

/* ════════════════════════════════════════════════════════════════════════
 * ENTIDADES
 * ════════════════════════════════════════════════════════════════════════ */

/**
 * Id de un `EntityTypeDef` registrado (Fase 6, `src/lib/level/entities/`).
 * A propósito NO es una unión cerrada: el contrato de extensibilidad del
 * plan (§7.5) exige que añadir un tipo nuevo toque solo 2 archivos —
 * `types/nuevo.tsx` + una línea en `entities/index.ts` — y una unión
 * cerrada acá obligaría a tocar este archivo también. Los 6 tipos base son
 * `"npc" | "enemy" | "door" | "terminal" | "collectible" | "interactive"`
 * (ver `src/lib/level/entities/index.ts`); cualquier otro string es válido
 * en cuanto haya un `EntityTypeDef` registrado con ese id — `getEntityType`
 * lanza en tiempo de ejecución si no lo hay.
 */
export type EntityTypeId = string;

export type PropertyValue = string | number | boolean | Vec2 | string[] | Vec2[];

export interface EntityInteraction {
  mode: "click" | "proximity" | "none";
  /** Dónde se detiene Alex antes de interactuar. */
  standPoint: Vec2 | null;
  /** % de imagen, usado si mode === "proximity". */
  radius: number;
  prompt: string;
  lockedNote: string;
  enabledWhen: ConditionExpr;
}

export interface EntityStateDef {
  id: string;
  label: string;
  /** Override de imagen; null = usa el arte del tipo. */
  sprite: string | null;
  visible: boolean;
  /** Ids de NavPolygon (de `blockedPolygons`) que quedan activos como
   *  bloqueadores mientras la entidad está en este estado — así una puerta
   *  cambia la malla de navegación de verdad, no solo el sprite. */
  activeBlockerIds: string[];
  /** Animación/estilo, p. ej. "anim-breathe world-ring-glow". */
  className?: string;
}

export interface EntityStateMachineDef {
  /** Id de un EntityStateDef. */
  initial: string;
  states: EntityStateDef[];
}

/**
 * Instancia colocada en el nivel. La lista de estados POSIBLES vive en el
 * `EntityTypeDef` (`defaultStates`, Fase 6); acá solo se guarda cuál es el
 * estado inicial de ESTA instancia (por si se quiere colocar una puerta ya
 * abierta, por ejemplo) — nunca el estado "actual" de una partida en curso,
 * que es puramente de runtime (`runtime/state.ts`, Fase 9) y no se persiste.
 */
export interface LevelEntity {
  id: string;
  type: EntityTypeId;
  name: string;
  position: Vec2;
  /** Grados. */
  rotation: number;
  /** 1 = tamaño por defecto del tipo. */
  scale: number;
  /** Desempate del y-sort (docs/level-editor-plan.md §7.4). */
  layer: number;
  visible: boolean;
  interaction: EntityInteraction;
  state: { initial: string };
  /** Shape según EntityTypeDef.properties (Fase 6). */
  properties: Record<string, PropertyValue>;
}

/* ════════════════════════════════════════════════════════════════════════
 * ZONAS, DIÁLOGOS, DESAFÍOS, MISIONES
 * ════════════════════════════════════════════════════════════════════════ */

export type LevelZoneShape = { kind: "polygon"; points: Vec2[] } | { kind: "circle"; center: Vec2; radius: number };

export interface LevelZone {
  id: string;
  name: string;
  shape: LevelZoneShape;
}

export interface LevelDialogLine {
  /** null = narrador. */
  speakerEntityId: string | null;
  portrait?: string;
  text: string;
}

export interface LevelDialog {
  id: string;
  name: string;
  lines: LevelDialogLine[];
}

/**
 * El editor SOLO referencia un desafío existente — nunca define enunciado,
 * respuesta ni generador. `moduleId`/`activityId` son la misma clave que ya
 * usa el sistema académico (`curriculum.ts`, `skillsProgress/{moduleId}`).
 */
export interface ChallengePlacement {
  id: string;
  /** ModuleDef.id real (p. ej. "aritmetica-d1"). */
  moduleId: string;
  /** Por ahora siempre "puzzle" (única actividad hoy); reservado para más adelante. */
  activityId: string;
  /** Qué entidad dispara este desafío. */
  sourceEntityId: string;
}

export type ObjectiveSource =
  | { kind: "challenge"; challengeId: string } // se cumple con hasCorrectAttempt real
  | { kind: "zone"; zoneId: string } // se cumple al entrar a la zona
  | { kind: "collectible"; entityId: string } // se cumple al recogerlo
  | { kind: "flag"; flag: string; value: boolean }; // se cumple cuando un evento fija ese flag

export interface LevelMissionObjective {
  id: string;
  label: string;
  source: ObjectiveSource;
}

export interface LevelMission {
  id: string;
  title: string;
  premise: string;
  objectives: LevelMissionObjective[];
}

/* ════════════════════════════════════════════════════════════════════════
 * EVENTOS
 * ════════════════════════════════════════════════════════════════════════ */

export type LevelEventType =
  | "ON_INTERACT"
  | "ON_CHALLENGE_STARTED"
  | "ON_CHALLENGE_SUCCESS"
  | "ON_CHALLENGE_FAILED"
  | "ON_ITEM_COLLECTED"
  | "ON_MISSION_COMPLETE"
  | "ON_ENTER_ZONE"
  | "ON_EXIT_ZONE";

export interface LevelEventTrigger {
  type: LevelEventType;
  entityId?: string;
  challengeId?: string;
  zoneId?: string;
  missionId?: string;
}

export type ConditionExpr =
  | { kind: "always" }
  | { kind: "flag"; flag: string; value: boolean }
  | { kind: "entityState"; entityId: string; state: string }
  | { kind: "all"; of: ConditionExpr[] }
  | { kind: "any"; of: ConditionExpr[] }
  | { kind: "not"; of: ConditionExpr };

export type LevelActionType =
  | "SET_FLAG"
  | "CHANGE_OBJECT_STATE"
  | "ACTIVATE_OBJECT"
  | "OPEN_DOOR"
  | "CLOSE_DOOR"
  | "UNLOCK_AREA"
  | "REVEAL_AREA"
  | "SHOW_DIALOG"
  | "SHOW_CLUE"
  | "SPAWN_OBJECT"
  | "UPDATE_MISSION"
  | "GENERATE_AXIA"
  | "START_CHALLENGE"
  | "MOVE_PLAYER"
  | "PLAY_SOUND";

export interface LevelAction {
  type: LevelActionType;
  params: Record<string, PropertyValue>;
  /** Acumulado dentro de la cadena — docs/level-editor-plan.md §8.5. */
  delayMs: number;
}

export interface LevelEventRule {
  id: string;
  name: string;
  trigger: LevelEventTrigger;
  when: ConditionExpr;
  once: boolean;
  actions: LevelAction[];
}

/* ════════════════════════════════════════════════════════════════════════
 * VALIDACIÓN
 * ════════════════════════════════════════════════════════════════════════ */

/**
 * A qué clase de elemento del nivel apunta un `LevelIssue` — deliberadamente
 * un tipo propio (no el `Selection` del editor, Fase 4): este módulo no
 * puede depender del editor ni del runtime (los importa a ellos, nunca al
 * revés), así que define su propio vocabulario mínimo de "a qué se refiere
 * este aviso". El editor mapea esto a su `Selection` al mostrar el
 * `IssuesPanel`.
 */
export type LevelIssueTargetKind =
  | "level"
  | "background"
  | "entity"
  | "polygon"
  | "zone"
  | "dialog"
  | "challenge"
  | "mission"
  | "event"
  | "spawn"
  | "exit";

export interface LevelIssueTarget {
  kind: LevelIssueTargetKind;
  id?: string;
}

export interface LevelIssue {
  severity: "error" | "warning";
  message: string;
  target?: LevelIssueTarget;
}
