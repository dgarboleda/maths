/**
 * Rocas del jardín de Serpiente. Son obstáculos fijos: chocar con una es un
 * fallo de reflejos, nunca una respuesta. Se colocan de modo que la cabeza
 * siga pudiendo llegar a todas las opciones y a la moneda, sin piedras pegadas
 * a la cabeza ni en las dos casillas que tiene delante.
 */
export interface GridCell {
  x: number;
  y: number;
}

const key = (c: GridCell) => `${c.x},${c.y}`;
const STEPS: GridCell[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

/** Casillas alcanzables desde `start` sin pisar `blocked`. */
export function reachable(size: number, start: GridCell, blocked: ReadonlySet<string>): Set<string> {
  const seen = new Set([key(start)]);
  const queue = [start];
  while (queue.length) {
    const cell = queue.shift()!;
    for (const step of STEPS) {
      const next = { x: cell.x + step.x, y: cell.y + step.y };
      const k = key(next);
      if (next.x < 0 || next.y < 0 || next.x >= size || next.y >= size || seen.has(k) || blocked.has(k)) continue;
      seen.add(k);
      queue.push(next);
    }
  }
  return seen;
}

/** Cantidad de rocas por nivel efectivo: ninguna en el nivel 1, hasta 6. */
export function rockCount(level: number): number {
  if (level < 2) return 0;
  return Math.min(6, level - 1 + (level >= 5 ? 1 : 0));
}

/**
 * Elige hasta `count` rocas entre `free` (ya barajadas por quien llama), sin
 * cerrar el acceso desde `snake[0]` a ninguno de los `targets`.
 */
export function placeRocks(
  size: number,
  snake: readonly GridCell[],
  direction: GridCell,
  free: readonly GridCell[],
  targets: readonly GridCell[],
  count: number,
): GridCell[] {
  const head = snake[0];
  const ahead = new Set([1, 2].map((n) => key({ x: head.x + direction.x * n, y: head.y + direction.y * n })));
  const body = snake.slice(1).map(key);
  const rocks: GridCell[] = [];
  for (const cell of free) {
    if (rocks.length >= count) break;
    if (Math.abs(cell.x - head.x) + Math.abs(cell.y - head.y) <= 1 || ahead.has(key(cell))) continue;
    if (targets.some((t) => t.x === cell.x && t.y === cell.y)) continue;
    const blocked = new Set([...body, ...rocks.map(key), key(cell)]);
    const open = reachable(size, head, blocked);
    if (targets.every((t) => open.has(key(t)))) rocks.push(cell);
  }
  return rocks;
}
