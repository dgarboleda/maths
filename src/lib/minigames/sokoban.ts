export interface Cell { x: number; y: number }
export interface Crate extends Cell { id: number; value: number }
export interface Warehouse {
  id: string;
  name: string;
  rows: readonly string[];
}
export interface WarehouseState {
  player: Cell;
  boxes: Crate[];
  moves: number;
  pushes: number;
}
export type Direction = "U" | "D" | "L" | "R";
export const DIRECTIONS: Record<Direction, Cell> = { U: { x: 0, y: -1 }, D: { x: 0, y: 1 }, L: { x: -1, y: 0 }, R: { x: 1, y: 0 } };

const TURN = ["#######", "#G#...#", "#...#.#", "#.....#", "#.$#$.#", "#..$..#", "#.$.$.#", "#..@..#", "#######"];
export const WAREHOUSES: readonly Warehouse[] = [
  { id: "giro", name: "Almacén del giro", rows: TURN },
  { id: "centro", name: "Pasillo central", rows: ["#######", "#..G..#", "#.#.#.#", "#.....#", "#.$.$.#", "#.$...#", "#.$.$.#", "#..@..#", "#######"] },
  { id: "espejo", name: "Almacén espejo", rows: TURN.map((row) => [...row].reverse().join("")) },
];

export const sameCell = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
export const floorAt = (level: Warehouse, cell: Cell) => {
  const tile = level.rows[cell.y]?.[cell.x];
  return tile !== undefined && tile !== "#";
};
export const goalAt = (level: Warehouse, cell: Cell) => level.rows[cell.y]?.[cell.x] === "G";

export function warehouseFor(problemId: string, round = 0): Warehouse {
  let hash = 0;
  for (const char of problemId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return WAREHOUSES[(hash + round) % WAREHOUSES.length];
}

export function initialWarehouse(level: Warehouse, values: readonly number[]): WarehouseState {
  let player: Cell = { x: 0, y: 0 };
  const boxes: Crate[] = [];
  for (let y = 0; y < level.rows.length; y++) for (let x = 0; x < level.rows[y].length; x++) {
    const tile = level.rows[y][x];
    if (tile === "@") player = { x, y };
    if (tile === "$" && boxes.length < values.length) boxes.push({ id: boxes.length, value: values[boxes.length], x, y });
  }
  return { player, boxes, moves: 0, pushes: 0 };
}

/** Un movimiento puro. Solo empujar hasta la meta entrega una respuesta. */
export function moveWarehouse(level: Warehouse, state: WarehouseState, direction: Direction): { state: WarehouseState; delivered?: Crate; blocked?: string } {
  const delta = DIRECTIONS[direction];
  const target = { x: state.player.x + delta.x, y: state.player.y + delta.y };
  if (!floorAt(level, target)) return { state, blocked: "Una pared bloquea el paso." };
  const box = state.boxes.find((item) => sameCell(item, target));
  if (!box) return { state: { ...state, player: target, moves: state.moves + 1 } };
  const beyond = { x: target.x + delta.x, y: target.y + delta.y };
  if (!floorAt(level, beyond)) return { state, blocked: "La caja no atraviesa paredes. Busca desde dónde empujarla." };
  if (state.boxes.some((item) => sameCell(item, beyond))) return { state, blocked: "No puedes empujar dos cajas a la vez. Haz espacio primero." };
  const moved = { ...box, ...beyond };
  return { state: { player: target, boxes: state.boxes.map((item) => item.id === box.id ? moved : item), moves: state.moves + 1, pushes: state.pushes + 1 },
    ...(goalAt(level, beyond) ? { delivered: moved } : {}) };
}

/** Casillas desde las que una caja puede alcanzar la meta, ignorando otras
 * cajas. El aviso identifica atascos geométricos, nunca cuál número es correcto. */
export function deliverySquares(level: Warehouse): Set<string> {
  const reachable = new Set<string>();
  const queue: Cell[] = [];
  for (let y = 0; y < level.rows.length; y++) for (let x = 0; x < level.rows[y].length; x++)
    if (goalAt(level, { x, y })) { reachable.add(`${x},${y}`); queue.push({ x, y }); }
  for (let i = 0; i < queue.length; i++) for (const delta of Object.values(DIRECTIONS)) {
    const previous = { x: queue[i].x - delta.x, y: queue[i].y - delta.y };
    const stand = { x: previous.x - delta.x, y: previous.y - delta.y };
    const key = `${previous.x},${previous.y}`;
    if (floorAt(level, previous) && floorAt(level, stand) && !reachable.has(key)) { reachable.add(key); queue.push(previous); }
  }
  return reachable;
}
