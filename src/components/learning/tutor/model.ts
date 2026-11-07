/**
 * Estado y reglas de los materiales manipulables del tutor visual. Sin React:
 * cada acción del alumno (tocar una pieza, añadir una fila, partir una
 * reserva) es una transición pura y comprobable.
 */

/** Origen de una pieza suelta: «a» las que había, «b» las que llegan. */
export type Cube = "a" | "b";

export interface PlaceValueState {
  kind: "place-value";
  tens: number;
  loose: Cube[];
  tray: Cube[];
}
export interface ArrayState {
  kind: "array";
  rows: number;
  cols: number;
  /** Cambia en cada giro: permite volver a reproducir la animación. */
  turns: number;
  /** Proporcionalidad: el valor por fila es fijo; solo cambia el número de filas. */
  lockCols?: boolean;
  /** Distributiva: el rectángulo es fijo y se parte por columnas. */
  lockSize?: boolean;
  /** Columna donde empieza la segunda parte (1…cols−1); sin valor, un solo bloque. */
  split?: number;
  /** Factor común: permite quitar la separación y juntar los dos bloques. */
  canMerge?: boolean;
  /** Nombres en contexto: «sensores» y «unidades por sensor». */
  rowsLabel?: string;
  colsLabel?: string;
}
/** Fracción de una cantidad: el total se parte en `den` grupos iguales y se toman `taken`. */
export interface PartOfState {
  kind: "part-of";
  total: number;
  den: number;
  taken: number;
}
export interface Part {
  num: number;
  den: number;
}
export interface FractionState {
  kind: "fractions";
  top: Part;
  bottom: Part;
  joined: boolean;
  /** Falso en las escenas de equivalencia y comparación: no se suman. */
  joinable?: boolean;
}
/** Recta numérica: se avanza o retrocede de uno en uno desde `start`. */
export interface LineState {
  kind: "line";
  start: number;
  pos: number;
  min: number;
  max: number;
  /** Modo saltos (multiplicar enteros): tamaño fijo del salto, con signo. */
  jump?: number;
  /** Permite tomar el opuesto (multiplicar por −1). */
  canFlip?: boolean;
  jumps?: number;
  flips?: number;
}
/** Reparto (división): decenas y unidades por repartir entre `groups` grupos iguales. */
export interface ShareState {
  kind: "share";
  groups: number;
  tens: number;
  units: number;
  /** Lo que ya recibió cada grupo (todos reciben lo mismo). */
  eachTens: number;
  eachUnits: number;
}
/** Balanza: `xs` cajas x y `left` pesas de 1 a la izquierda; `right` pesas a la derecha. */
export interface BalanceState {
  kind: "balance";
  xs: number;
  left: number;
  right: number;
}
export type ManipulativeState = PlaceValueState | ArrayState | FractionState | LineState | BalanceState | ShareState | PartOfState;

export type TutorAction =
  | { type: "to-tray"; index: number }
  | { type: "from-tray"; index: number }
  | { type: "bundle" }
  | { type: "unbundle" }
  | { type: "rows"; delta: 1 | -1 }
  | { type: "cols"; delta: 1 | -1 }
  | { type: "turn" }
  | { type: "split"; bar: "top" | "bottom"; factor?: 2 | 3 }
  | { type: "join" }
  | { type: "step"; delta: 1 | -1 }
  | { type: "jump" }
  | { type: "flip" }
  | { type: "share-ten" }
  | { type: "share-unit" }
  | { type: "break-ten" }
  | { type: "move-split"; delta: 1 | -1 }
  | { type: "merge" }
  | { type: "den"; delta: 1 | -1 }
  | { type: "take"; delta: 1 | -1 }
  | { type: "remove-both" }
  | { type: "remove-left" }
  | { type: "share" };

/** Aviso narrado cuando una acción no se puede hacer (clave de `guion.json`). */
export type Notice = "no-se-puede-juntar" | "balanza-desequilibrada" | "no-se-puede-repartir" | "no-alcanza-para-todos";

export const TRAY_SIZE = 10;
export const ARRAY_MAX = 10;
export const MAX_DENOMINATOR = 12;

export function reduce(state: ManipulativeState, action: TutorAction): { state: ManipulativeState; notice?: Notice } {
  switch (state.kind) {
    case "place-value":
      return { state: reducePlaceValue(state, action) };
    case "array":
      return { state: reduceArray(state, action) };
    case "fractions":
      return reduceFractions(state, action);
    case "line":
      return { state: reduceLine(state, action) };
    case "balance":
      return reduceBalance(state, action);
    case "share":
      return reduceShare(state, action);
    case "part-of":
      return { state: reducePartOf(state, action) };
  }
}

function reducePlaceValue(s: PlaceValueState, action: TutorAction): PlaceValueState {
  switch (action.type) {
    case "to-tray": {
      if (s.tray.length >= TRAY_SIZE || !s.loose[action.index]) return s;
      return { ...s, loose: s.loose.filter((_, i) => i !== action.index), tray: [...s.tray, s.loose[action.index]] };
    }
    case "from-tray": {
      if (!s.tray[action.index]) return s;
      return { ...s, tray: s.tray.filter((_, i) => i !== action.index), loose: [...s.loose, s.tray[action.index]] };
    }
    case "bundle":
      return s.tray.length === TRAY_SIZE ? { ...s, tens: s.tens + 1, tray: [] } : s;
    case "unbundle":
      return s.tens > 0 ? { ...s, tens: s.tens - 1, loose: [...s.loose, ...Array<Cube>(TRAY_SIZE).fill("a")] } : s;
    default:
      return s;
  }
}

function reduceArray(s: ArrayState, action: TutorAction): ArrayState {
  const clamp = (n: number) => Math.min(ARRAY_MAX, Math.max(1, n));
  switch (action.type) {
    case "rows":
      return s.lockSize ? s : { ...s, rows: clamp(s.rows + action.delta) };
    case "cols":
      return s.lockSize || s.lockCols ? s : { ...s, cols: clamp(s.cols + action.delta) };
    case "turn":
      return s.lockSize || s.lockCols ? s : { ...s, rows: s.cols, cols: s.rows, turns: s.turns + 1 };
    case "move-split": {
      if (s.split === undefined) return s;
      const split = Math.min(s.cols - 1, Math.max(1, s.split + action.delta));
      return { ...s, split };
    }
    case "merge":
      return s.canMerge && s.split !== undefined ? { ...s, split: undefined } : s;
    default:
      return s;
  }
}

function reduceFractions(s: FractionState, action: TutorAction): { state: FractionState; notice?: Notice } {
  switch (action.type) {
    case "split": {
      const part = s[action.bar];
      const factor = action.factor ?? 2;
      if (s.joined || part.den * factor > MAX_DENOMINATOR) return { state: s };
      return { state: { ...s, [action.bar]: { num: part.num * factor, den: part.den * factor } } };
    }
    case "join": {
      if (s.joined || s.joinable === false) return { state: s };
      if (s.top.den !== s.bottom.den) return { state: s, notice: "no-se-puede-juntar" };
      return { state: { ...s, top: { num: s.top.num + s.bottom.num, den: s.top.den }, bottom: { num: 0, den: s.bottom.den }, joined: true } };
    }
    default:
      return { state: s };
  }
}

const clampLine = (s: LineState, pos: number) => Math.min(s.max, Math.max(s.min, pos));

function reduceLine(s: LineState, action: TutorAction): LineState {
  switch (action.type) {
    case "step":
      return s.jump ? s : { ...s, pos: clampLine(s, s.pos + action.delta) };
    case "jump": {
      // Tras tomar el opuesto no se salta más: así la recta muestra (−1) × n × salto.
      if (!s.jump || (s.flips ?? 0) % 2 === 1) return s;
      const pos = clampLine(s, s.pos + s.jump);
      return pos === s.pos ? s : { ...s, pos, jumps: (s.jumps ?? 0) + 1 };
    }
    case "flip":
      return s.canFlip ? { ...s, pos: -s.pos, flips: (s.flips ?? 0) + 1 } : s;
    default:
      return s;
  }
}

function reduceShare(s: ShareState, action: TutorAction): { state: ShareState; notice?: Notice } {
  switch (action.type) {
    case "share-ten":
      if (s.tens < s.groups) return { state: s, notice: "no-alcanza-para-todos" };
      return { state: { ...s, tens: s.tens - s.groups, eachTens: s.eachTens + 1 } };
    case "share-unit":
      if (s.units < s.groups) return { state: s, notice: "no-alcanza-para-todos" };
      return { state: { ...s, units: s.units - s.groups, eachUnits: s.eachUnits + 1 } };
    case "break-ten":
      return s.tens > 0 ? { state: { ...s, tens: s.tens - 1, units: s.units + 10 } } : { state: s };
    default:
      return { state: s };
  }
}

/** Partes posibles: solo divisores del total, para que los grupos sean iguales. */
export function divisors(total: number): number[] {
  return Array.from({ length: Math.min(total, 10) }, (_, i) => i + 1).filter((d) => total % d === 0);
}

function reducePartOf(s: PartOfState, action: TutorAction): PartOfState {
  switch (action.type) {
    case "den": {
      const options = divisors(s.total);
      const i = options.indexOf(s.den) + action.delta;
      if (i < 0 || i >= options.length) return s;
      return { ...s, den: options[i], taken: Math.min(s.taken, options[i]) };
    }
    case "take":
      return { ...s, taken: Math.min(s.den, Math.max(0, s.taken + action.delta)) };
    default:
      return s;
  }
}

/** Ya no se puede dar lo mismo a todos: lo que queda es el resto. */
export function shareDone(s: ShareState): boolean {
  return s.tens === 0 && s.units < s.groups;
}

function reduceBalance(s: BalanceState, action: TutorAction): { state: BalanceState; notice?: Notice } {
  switch (action.type) {
    case "remove-both":
      return s.left > 0 && s.right > 0 ? { state: { ...s, left: s.left - 1, right: s.right - 1 } } : { state: s };
    case "remove-left":
      // Quitar de un solo lado rompe la igualdad: se explica y no se aplica.
      return { state: s, notice: "balanza-desequilibrada" };
    case "share":
      if (s.xs > 1 && s.left === 0 && s.right % s.xs === 0) return { state: { ...s, xs: 1, right: s.right / s.xs } };
      return { state: s, notice: "no-se-puede-repartir" };
    default:
      return { state: s };
  }
}

const signed = (n: number) => (n < 0 ? `−${-n}` : String(n));

/** «4 + (−6)» o «−3 + 5»: la operación que representa el desplazamiento. */
export function lineExpression(s: LineState): string {
  if (s.jump) {
    const jumps = s.jumps ?? 0;
    const factor = s.jump < 0 ? `(${signed(s.jump)})` : String(s.jump);
    return `${(s.flips ?? 0) % 2 ? "(−1) × " : ""}${jumps} × ${factor} = ${signed(s.pos)}`;
  }
  const d = s.pos - s.start;
  return `${signed(s.start)} ${d < 0 ? "+ (" + signed(d) + ")" : "+ " + d} = ${signed(s.pos)}`;
}

/** «2x + 1 = 9»: la ecuación que muestra la balanza. */
export function balanceEquation(s: BalanceState): string {
  const x = s.xs === 1 ? "x" : `${s.xs}x`;
  return `${s.left > 0 ? `${x} + ${s.left}` : x} = ${s.right}`;
}

export function placeValueTotal(s: PlaceValueState): number {
  return s.tens * 10 + s.loose.length + s.tray.length;
}

/** Lo que muestra el material, dicho con palabras (lector de pantalla y subtítulo). */
export function describe(state: ManipulativeState): string {
  switch (state.kind) {
    case "place-value": {
      const units = state.loose.length + state.tray.length;
      return `${state.tens} ${state.tens === 1 ? "decena" : "decenas"} y ${units} ${units === 1 ? "unidad" : "unidades"} (${state.tray.length} en la bandeja). En total, ${placeValueTotal(state)}.`;
    }
    case "array":
      if (state.split !== undefined)
        return `${state.rows} × ${state.cols} partido en ${state.split} y ${state.cols - state.split} columnas: ${state.rows} × ${state.split} + ${state.rows} × ${state.cols - state.split} = ${state.rows * state.cols}.`;
      return `${state.rows} ${state.rows === 1 ? "fila" : "filas"} de ${state.cols} ${state.cols === 1 ? "panel" : "paneles"}: ${state.rows} × ${state.cols} = ${state.rows * state.cols} paneles.`;
    case "line":
      if (state.jump) return `Estás en ${signed(state.pos)}: ${lineExpression(state)}.`;
      return `Empiezas en ${signed(state.start)} y estás en ${signed(state.pos)}: ${lineExpression(state)}.`;
    case "balance":
      return `Balanza equilibrada: ${balanceEquation(state)}.`;
    case "part-of":
      return `${state.total} en ${state.den} ${state.den === 1 ? "grupo" : "grupos"} de ${state.total / state.den}; tomas ${state.taken}: ${state.taken * (state.total / state.den)}.`;
    case "share":
      return `Cada uno de los ${state.groups} grupos tiene ${state.eachTens} ${state.eachTens === 1 ? "decena" : "decenas"} y ${state.eachUnits} ${state.eachUnits === 1 ? "unidad" : "unidades"}. Por repartir: ${state.tens} ${state.tens === 1 ? "decena" : "decenas"} y ${state.units} ${state.units === 1 ? "unidad" : "unidades"}.`;
    case "fractions":
      return state.joined
        ? `Reservas juntas: ${state.top.num}/${state.top.den} de la reserva.`
        : `Arriba ${state.top.num}/${state.top.den}, abajo ${state.bottom.num}/${state.bottom.den}. ${state.top.den === state.bottom.den ? "Las partes ya son del mismo tamaño." : "Las partes tienen tamaños distintos."}`;
  }
}
