import type {
  ChallengePlacement,
  LevelBackground,
  LevelDefinition,
  LevelDialog,
  LevelEntity,
  LevelEventRule,
  LevelExit,
  LevelIssue,
  LevelMission,
  LevelZone,
  NavPolygon,
  PropertyValue,
  Vec2,
} from "@/lib/level/schema";

/**
 * Estado y reducer del editor — docs/level-editor-plan.md §5.2. El editor
 * modifica datos (`state.level`); el runtime (Fase 9+) los interpreta. Este
 * archivo NUNCA importa nada de `src/components/level/runtime/**` — es la
 * mitad "EDITOR" de la separación editor/runtime del plan.
 */

export type EditorTool =
  | { kind: "select" }
  | { kind: "move" }
  | { kind: "editVertices" }
  | { kind: "addVertex" }
  | { kind: "drawPolygon"; role: "walkable" | "blocked" | "zone" }
  | { kind: "placeEntity"; entityType: LevelEntity["type"] }
  | { kind: "setSpawn" }
  | { kind: "setExit" }
  /** Elegir dónde se detiene Alex antes de interactuar con `entityId` —
   *  activada desde el botón "Fijar en el mapa" del panel de propiedades. */
  | { kind: "pickStandPoint"; entityId: string }
  /** Zona circular (§7 Fase 7): primer clic fija `center` (null → punto),
   *  segundo clic fija el radio y crea la zona. */
  | { kind: "drawCircleZone"; center: Vec2 | null };

export type Selection =
  | { kind: "none" }
  | { kind: "entity"; id: string }
  | { kind: "polygon"; role: "walkable" | "blocked"; id: string }
  | { kind: "zone"; id: string }
  | { kind: "dialog"; id: string }
  | { kind: "challenge"; id: string }
  | { kind: "mission"; id: string }
  | { kind: "event"; id: string }
  | { kind: "spawn" }
  | { kind: "exit"; id: string }
  /** Propiedades globales (fondo, nombre). */
  | { kind: "level" };

export interface EditorViewport {
  /** 0.25 – 4 */
  zoom: number;
  panX: number;
  panY: number;
}

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface EditorState {
  /** ÚNICA copia mutable del nivel. Todo lo demás es UI. */
  level: LevelDefinition;
  selection: Selection;
  tool: EditorTool;
  viewport: EditorViewport;
  grid: { visible: boolean; sizePct: number };
  snap: boolean;
  layerVisibility: { navigation: boolean; entities: boolean; zones: boolean; grid: boolean };
  debugNav: boolean;
  /** Polígono en curso de dibujo (misma idea que `drawingHole` de WalkDebugOverlay). */
  drafting: { role: "walkable" | "blocked" | "zone"; points: Vec2[] } | null;
  history: { past: LevelDefinition[]; future: LevelDefinition[] };
  /** Un gesto continuo (arrastrar un vértice/entidad) coalesce en UNA sola
   *  entrada de historial — ver BEGIN_GESTURE/END_GESTURE más abajo. */
  gestureOpen: boolean;
  dirty: boolean;
  saveState: SaveState;
  saveError: string | null;
  issues: LevelIssue[];
  /** Modo prueba activo. NO altera `level` ni `history` (Fase 11). */
  playtestSessionId: number | null;
}

export type EditorAction =
  // ─── no mutan el nivel (no tocan history) ───
  | { type: "SELECT"; selection: Selection }
  | { type: "SET_TOOL"; tool: EditorTool }
  | { type: "SET_VIEWPORT"; viewport: Partial<EditorViewport> }
  | { type: "TOGGLE_LAYER"; layer: keyof EditorState["layerVisibility"] }
  | { type: "TOGGLE_GRID" }
  | { type: "TOGGLE_SNAP" }
  | { type: "TOGGLE_DEBUG_NAV" }
  | { type: "SET_SAVE_STATE"; state: SaveState; error?: string | null }
  | { type: "SET_ISSUES"; issues: LevelIssue[] }
  | { type: "START_PLAYTEST" }
  | { type: "STOP_PLAYTEST" }
  | { type: "DRAFT_ADD_POINT"; point: Vec2 }
  | { type: "DRAFT_START"; role: "walkable" | "blocked" | "zone" }
  | { type: "DRAFT_CANCEL" }
  /** Carga inicial (o restaurar una versión guardada): reemplaza `level` SIN
   *  pasar por el historial de undo/redo (que arranca limpio) — a diferencia
   *  de `REPLACE_LEVEL`, que si empuja historial (ver más abajo). */
  | { type: "HYDRATE_LEVEL"; level: LevelDefinition }
  /** Cierra un gesto abierto por BEGIN_GESTURE sin mutar nada — permite que
   *  la siguiente acción mutante (no relacionada) vuelva a empujar historial. */
  | { type: "END_GESTURE" }
  /** Tras un guardado exitoso: adopta `version`/`metadata.updatedAt` del
   *  servidor SIN pasar por el historial de undo (no es una edición del
   *  usuario) — a diferencia de `REPLACE_LEVEL` (restaurar una versión
   *  vieja SÍ es una edición, y sí debe poder deshacerse). */
  | { type: "SYNC_SAVED_LEVEL"; level: LevelDefinition }
  // ─── mutan el nivel (empujan historial, salvo que haya un gesto abierto) ───
  | { type: "BEGIN_GESTURE" }
  | { type: "SET_LEVEL_FIELD"; patch: Partial<Pick<LevelDefinition, "name" | "metadata" | "depth">> }
  | { type: "SET_BACKGROUND"; background: LevelBackground }
  | { type: "ADD_POLYGON"; role: "walkable" | "blocked"; polygon: NavPolygon }
  | { type: "UPDATE_POLYGON"; role: "walkable" | "blocked"; id: string; patch: Partial<NavPolygon> }
  | { type: "MOVE_VERTEX"; role: "walkable" | "blocked"; id: string; index: number; point: Vec2 }
  | { type: "INSERT_VERTEX"; role: "walkable" | "blocked"; id: string; edgeIndex: number; point: Vec2 }
  | { type: "DELETE_VERTEX"; role: "walkable" | "blocked"; id: string; index: number }
  | { type: "DELETE_POLYGON"; role: "walkable" | "blocked"; id: string }
  | { type: "SET_SPAWN"; point: Vec2 }
  | { type: "ADD_EXIT"; exit: LevelExit }
  | { type: "UPDATE_EXIT"; id: string; patch: Partial<LevelExit> }
  | { type: "DELETE_EXIT"; id: string }
  | { type: "ADD_ENTITY"; entity: LevelEntity }
  | { type: "UPDATE_ENTITY"; id: string; patch: Partial<LevelEntity> }
  | { type: "SET_ENTITY_PROPERTY"; id: string; key: string; value: PropertyValue }
  | { type: "DELETE_ENTITY"; id: string }
  | { type: "DUPLICATE_ENTITY"; id: string }
  | { type: "ADD_ZONE"; zone: LevelZone }
  | { type: "UPDATE_ZONE"; id: string; patch: Partial<LevelZone> }
  | { type: "DELETE_ZONE"; id: string }
  | { type: "ADD_DIALOG"; dialog: LevelDialog }
  | { type: "UPDATE_DIALOG"; id: string; patch: Partial<LevelDialog> }
  | { type: "DELETE_DIALOG"; id: string }
  | { type: "ADD_CHALLENGE"; challenge: ChallengePlacement }
  | { type: "UPDATE_CHALLENGE"; id: string; patch: Partial<ChallengePlacement> }
  | { type: "DELETE_CHALLENGE"; id: string }
  | { type: "ADD_MISSION"; mission: LevelMission }
  | { type: "UPDATE_MISSION"; id: string; patch: Partial<LevelMission> }
  | { type: "DELETE_MISSION"; id: string }
  | { type: "ADD_EVENT"; rule: LevelEventRule }
  | { type: "UPDATE_EVENT"; id: string; patch: Partial<LevelEventRule> }
  | { type: "DELETE_EVENT"; id: string }
  /** Restaurar una versión antigua como contenido actual — SÍ pasa por el
   *  historial (es una edición más, deshacerla debe volver a lo de antes). */
  | { type: "REPLACE_LEVEL"; level: LevelDefinition }
  // ─── historial ───
  | { type: "UNDO" }
  | { type: "REDO" };

const MUTATING = new Set<EditorAction["type"]>([
  "BEGIN_GESTURE",
  "SET_LEVEL_FIELD",
  "SET_BACKGROUND",
  "ADD_POLYGON",
  "UPDATE_POLYGON",
  "MOVE_VERTEX",
  "INSERT_VERTEX",
  "DELETE_VERTEX",
  "DELETE_POLYGON",
  "SET_SPAWN",
  "ADD_EXIT",
  "UPDATE_EXIT",
  "DELETE_EXIT",
  "ADD_ENTITY",
  "UPDATE_ENTITY",
  "SET_ENTITY_PROPERTY",
  "DELETE_ENTITY",
  "DUPLICATE_ENTITY",
  "ADD_ZONE",
  "UPDATE_ZONE",
  "DELETE_ZONE",
  "ADD_DIALOG",
  "UPDATE_DIALOG",
  "DELETE_DIALOG",
  "ADD_CHALLENGE",
  "UPDATE_CHALLENGE",
  "DELETE_CHALLENGE",
  "ADD_MISSION",
  "UPDATE_MISSION",
  "DELETE_MISSION",
  "ADD_EVENT",
  "UPDATE_EVENT",
  "DELETE_EVENT",
  "REPLACE_LEVEL",
]);

const HISTORY_LIMIT = 50;

/** El polígono al que apunta `selection`, o `null` si la selección no es un
 *  polígono (o apunta a uno que ya no existe). Lo usan `PolygonEditor` y
 *  `EditorBottomBar` (contador de vértices) — una sola fuente de verdad
 *  para "cuál es el polígono seleccionado ahora mismo". */
export function findSelectedPolygon(
  level: LevelDefinition,
  selection: Selection,
): { role: "walkable" | "blocked"; polygon: NavPolygon } | null {
  if (selection.kind !== "polygon") return null;
  const list = selection.role === "walkable" ? level.navigation.walkablePolygons : level.navigation.blockedPolygons;
  const polygon = list.find((p) => p.id === selection.id);
  return polygon ? { role: selection.role, polygon } : null;
}

export function createInitialEditorState(level: LevelDefinition): EditorState {
  return {
    level,
    selection: { kind: "none" },
    tool: { kind: "select" },
    viewport: { zoom: 1, panX: 0, panY: 0 },
    grid: { visible: false, sizePct: 5 },
    snap: false,
    layerVisibility: { navigation: true, entities: true, zones: true, grid: true },
    debugNav: false,
    drafting: null,
    history: { past: [], future: [] },
    gestureOpen: false,
    dirty: false,
    saveState: "idle",
    saveError: null,
    issues: [],
    playtestSessionId: null,
  };
}

function withPolygon(level: LevelDefinition, role: "walkable" | "blocked", updater: (list: NavPolygon[]) => NavPolygon[]): LevelDefinition {
  const key = role === "walkable" ? "walkablePolygons" : "blockedPolygons";
  return { ...level, navigation: { ...level.navigation, [key]: updater(level.navigation[key]) } };
}

function polygonsOf(level: LevelDefinition, role: "walkable" | "blocked"): NavPolygon[] {
  return role === "walkable" ? level.navigation.walkablePolygons : level.navigation.blockedPolygons;
}

/** Aplica la mutación de `action` sobre `level`. Devuelve el mismo `level`
 *  para acciones no reconocidas (nunca debería pasar: `MUTATING` y este
 *  switch se mantienen en sync). */
function applyToLevel(level: LevelDefinition, action: EditorAction): LevelDefinition {
  switch (action.type) {
    case "BEGIN_GESTURE":
      return level; // solo abre el gesto; el estado lo maneja el reducer principal
    case "SET_LEVEL_FIELD":
      return { ...level, ...action.patch };
    case "SET_BACKGROUND":
      return { ...level, background: action.background };
    case "ADD_POLYGON":
      return withPolygon(level, action.role, (list) => [...list, action.polygon]);
    case "UPDATE_POLYGON":
      return withPolygon(level, action.role, (list) => list.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)));
    case "MOVE_VERTEX":
      return withPolygon(level, action.role, (list) =>
        list.map((p) => (p.id === action.id ? { ...p, points: p.points.map((pt, i) => (i === action.index ? action.point : pt)) } : p)),
      );
    case "INSERT_VERTEX":
      return withPolygon(level, action.role, (list) =>
        list.map((p) => {
          if (p.id !== action.id) return p;
          const points = p.points.slice();
          points.splice(action.edgeIndex + 1, 0, action.point);
          return { ...p, points };
        }),
      );
    case "DELETE_VERTEX":
      return withPolygon(level, action.role, (list) =>
        list
          .map((p) => (p.id === action.id ? { ...p, points: p.points.filter((_, i) => i !== action.index) } : p))
          .filter((p) => p.points.length >= 3),
      );
    case "DELETE_POLYGON":
      return withPolygon(level, action.role, (list) => list.filter((p) => p.id !== action.id));
    case "SET_SPAWN":
      return { ...level, navigation: { ...level.navigation, spawn: action.point } };
    case "ADD_EXIT":
      return { ...level, navigation: { ...level.navigation, exits: [...level.navigation.exits, action.exit] } };
    case "UPDATE_EXIT":
      return {
        ...level,
        navigation: {
          ...level.navigation,
          exits: level.navigation.exits.map((e) => (e.id === action.id ? { ...e, ...action.patch } : e)),
        },
      };
    case "DELETE_EXIT":
      return { ...level, navigation: { ...level.navigation, exits: level.navigation.exits.filter((e) => e.id !== action.id) } };
    case "ADD_ENTITY":
      return { ...level, entities: [...level.entities, action.entity] };
    case "UPDATE_ENTITY":
      return { ...level, entities: level.entities.map((e) => (e.id === action.id ? { ...e, ...action.patch } : e)) };
    case "SET_ENTITY_PROPERTY":
      return {
        ...level,
        entities: level.entities.map((e) =>
          e.id === action.id ? { ...e, properties: { ...e.properties, [action.key]: action.value } } : e,
        ),
      };
    case "DELETE_ENTITY":
      return { ...level, entities: level.entities.filter((e) => e.id !== action.id) };
    case "DUPLICATE_ENTITY": {
      const source = level.entities.find((e) => e.id === action.id);
      if (!source) return level;
      const copy: LevelEntity = {
        ...source,
        id: crypto.randomUUID(),
        name: `${source.name} (copia)`,
        position: { x: source.position.x + 2, y: source.position.y + 2 },
      };
      return { ...level, entities: [...level.entities, copy] };
    }
    case "ADD_ZONE":
      return { ...level, zones: [...level.zones, action.zone] };
    case "UPDATE_ZONE":
      return { ...level, zones: level.zones.map((z) => (z.id === action.id ? { ...z, ...action.patch } : z)) };
    case "DELETE_ZONE":
      return { ...level, zones: level.zones.filter((z) => z.id !== action.id) };
    case "ADD_DIALOG":
      return { ...level, dialogs: [...level.dialogs, action.dialog] };
    case "UPDATE_DIALOG":
      return { ...level, dialogs: level.dialogs.map((d) => (d.id === action.id ? { ...d, ...action.patch } : d)) };
    case "DELETE_DIALOG":
      return { ...level, dialogs: level.dialogs.filter((d) => d.id !== action.id) };
    case "ADD_CHALLENGE":
      return { ...level, challenges: [...level.challenges, action.challenge] };
    case "UPDATE_CHALLENGE":
      return { ...level, challenges: level.challenges.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)) };
    case "DELETE_CHALLENGE":
      return { ...level, challenges: level.challenges.filter((c) => c.id !== action.id) };
    case "ADD_MISSION":
      return { ...level, missions: [...level.missions, action.mission] };
    case "UPDATE_MISSION":
      return { ...level, missions: level.missions.map((m) => (m.id === action.id ? { ...m, ...action.patch } : m)) };
    case "DELETE_MISSION":
      return { ...level, missions: level.missions.filter((m) => m.id !== action.id) };
    case "ADD_EVENT":
      return { ...level, events: [...level.events, action.rule] };
    case "UPDATE_EVENT":
      return { ...level, events: level.events.map((r) => (r.id === action.id ? { ...r, ...action.patch } : r)) };
    case "DELETE_EVENT":
      return { ...level, events: level.events.filter((r) => r.id !== action.id) };
    case "REPLACE_LEVEL":
      return action.level;
    default:
      return level;
  }
}

/** Si la selección apunta a un elemento que la mutación acaba de borrar, se
 *  limpia sola — así nunca queda "seleccionado" algo que ya no existe. */
function reconcileSelection(selection: Selection, level: LevelDefinition): Selection {
  switch (selection.kind) {
    case "entity":
      return level.entities.some((e) => e.id === selection.id) ? selection : { kind: "none" };
    case "polygon":
      return polygonsOf(level, selection.role).some((p) => p.id === selection.id) ? selection : { kind: "none" };
    case "zone":
      return level.zones.some((z) => z.id === selection.id) ? selection : { kind: "none" };
    case "dialog":
      return level.dialogs.some((d) => d.id === selection.id) ? selection : { kind: "none" };
    case "challenge":
      return level.challenges.some((c) => c.id === selection.id) ? selection : { kind: "none" };
    case "mission":
      return level.missions.some((m) => m.id === selection.id) ? selection : { kind: "none" };
    case "event":
      return level.events.some((r) => r.id === selection.id) ? selection : { kind: "none" };
    case "exit":
      return level.navigation.exits.some((e) => e.id === selection.id) ? selection : { kind: "none" };
    default:
      return selection; // "none" | "spawn" | "level" siempre válidas
  }
}

/** Tras añadir/duplicar algo, seleccionarlo — así el panel de propiedades
 *  (Fase 6) se abre directo sobre lo que se acaba de crear. */
function selectionAfterAdd(state: EditorState, action: EditorAction, level: LevelDefinition): Selection {
  switch (action.type) {
    case "ADD_ENTITY":
      return { kind: "entity", id: action.entity.id };
    case "DUPLICATE_ENTITY": {
      const last = level.entities[level.entities.length - 1];
      return last && last.id !== action.id ? { kind: "entity", id: last.id } : state.selection;
    }
    case "ADD_POLYGON":
      return { kind: "polygon", role: action.role, id: action.polygon.id };
    case "ADD_ZONE":
      return { kind: "zone", id: action.zone.id };
    case "ADD_DIALOG":
      return { kind: "dialog", id: action.dialog.id };
    case "ADD_CHALLENGE":
      return { kind: "challenge", id: action.challenge.id };
    case "ADD_MISSION":
      return { kind: "mission", id: action.mission.id };
    case "ADD_EVENT":
      return { kind: "event", id: action.rule.id };
    case "ADD_EXIT":
      return { kind: "exit", id: action.exit.id };
    default:
      return reconcileSelection(state.selection, level);
  }
}

function pushHistory(history: EditorState["history"], previousLevel: LevelDefinition): EditorState["history"] {
  const past = [...history.past, previousLevel];
  return { past: past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past, future: [] };
}

/**
 * `version`/`metadata` NUNCA se restauran desde una entrada del historial:
 * son el rastro de guardado real (lo último que confirmó el servidor), no
 * "contenido editable" — si undo los pisara con un `version` viejo, el
 * siguiente `saveLevel` mandaría esa versión desactualizada y el propio
 * guardado del usuario dispararía un `StaleLevelError` fantasma contra su
 * PROPIO guardado anterior. Deshacer/rehacer solo mueve el contenido
 * (nombre, navegación, entidades…) — el número de versión sigue el que ya
 * tenía `state.level` antes del undo/redo.
 */
function withCurrentVersion(content: LevelDefinition, state: EditorState): LevelDefinition {
  return { ...content, version: state.level.version, metadata: state.level.metadata };
}

function undo(state: EditorState): EditorState {
  const { past, future } = state.history;
  if (past.length === 0) return state;
  const restored = withCurrentVersion(past[past.length - 1], state);
  return {
    ...state,
    level: restored,
    selection: reconcileSelection(state.selection, restored),
    history: { past: past.slice(0, -1), future: [state.level, ...future] },
    dirty: true,
  };
}

function redo(state: EditorState): EditorState {
  const { past, future } = state.history;
  if (future.length === 0) return state;
  const restored = withCurrentVersion(future[0], state);
  return {
    ...state,
    level: restored,
    selection: reconcileSelection(state.selection, restored),
    history: { past: [...past, state.level], future: future.slice(1) },
    dirty: true,
  };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "UNDO":
      return undo(state);
    case "REDO":
      return redo(state);
    case "SELECT":
      return { ...state, selection: action.selection };
    case "SET_TOOL":
      return { ...state, tool: action.tool };
    case "SET_VIEWPORT":
      return {
        ...state,
        viewport: {
          zoom: action.viewport.zoom !== undefined ? Math.min(4, Math.max(0.25, action.viewport.zoom)) : state.viewport.zoom,
          panX: action.viewport.panX ?? state.viewport.panX,
          panY: action.viewport.panY ?? state.viewport.panY,
        },
      };
    case "TOGGLE_LAYER":
      return { ...state, layerVisibility: { ...state.layerVisibility, [action.layer]: !state.layerVisibility[action.layer] } };
    case "TOGGLE_GRID":
      return { ...state, grid: { ...state.grid, visible: !state.grid.visible } };
    case "TOGGLE_SNAP":
      return { ...state, snap: !state.snap };
    case "TOGGLE_DEBUG_NAV":
      return { ...state, debugNav: !state.debugNav };
    case "SET_SAVE_STATE":
      return { ...state, saveState: action.state, saveError: action.error ?? null, dirty: action.state === "saved" ? false : state.dirty };
    case "SET_ISSUES":
      return { ...state, issues: action.issues };
    case "START_PLAYTEST":
      return { ...state, playtestSessionId: (state.playtestSessionId ?? 0) + 1, selection: { kind: "none" } };
    case "STOP_PLAYTEST":
      return { ...state, playtestSessionId: null };
    case "DRAFT_START":
      return { ...state, drafting: { role: action.role, points: [] } };
    case "DRAFT_ADD_POINT":
      return state.drafting ? { ...state, drafting: { ...state.drafting, points: [...state.drafting.points, action.point] } } : state;
    case "DRAFT_CANCEL":
      return { ...state, drafting: null };
    case "HYDRATE_LEVEL":
      return { ...createInitialEditorState(action.level) };
    case "END_GESTURE":
      return { ...state, gestureOpen: false };
    case "SYNC_SAVED_LEVEL":
      return { ...state, level: action.level };
    default:
      break;
  }

  // Todo lo demás (incluido BEGIN_GESTURE) es una mutación de `level`.
  const nextLevel = applyToLevel(state.level, action);
  if (!MUTATING.has(action.type)) return state; // nunca debería llegar acá

  const selection = selectionAfterAdd(state, action, nextLevel);

  if (action.type !== "BEGIN_GESTURE" && state.gestureOpen) {
    return { ...state, level: nextLevel, selection, dirty: true };
  }
  return {
    ...state,
    level: nextLevel,
    selection,
    dirty: action.type === "BEGIN_GESTURE" ? state.dirty : true,
    gestureOpen: action.type === "BEGIN_GESTURE" ? true : state.gestureOpen,
    history: pushHistory(state.history, state.level),
  };
}
