export interface MazeCell { x: number; y: number }
export const MAZE_SIZE = 5;
export const mazeKey = ({ x, y }: MazeCell) => `${x},${y}`;
export const mazeWall = ({ x, y }: MazeCell) => x < 0 || y < 0 || x >= MAZE_SIZE || y >= MAZE_SIZE || (x % 2 === 1 && y % 2 === 1);
const STEPS = [{ x: -1, y: 0 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
export const mazeNeighbors = (cell: MazeCell) => STEPS.map((step) => ({ x: cell.x + step.x, y: cell.y + step.y })).filter((cell) => !mazeWall(cell));

/** Los números son destinos: un recorrido no necesita responder otro antes. */
export function reachableMaze(start: MazeCell, numbers: readonly MazeCell[] = []): Set<string> {
  const terminals = new Set(numbers.map(mazeKey));
  const seen = new Set([mazeKey(start)]);
  const queue = [start];
  for (let i = 0; i < queue.length; i++) for (const next of mazeNeighbors(queue[i])) {
    const key = mazeKey(next);
    if (seen.has(key)) continue;
    seen.add(key);
    if (!terminals.has(key)) queue.push(next);
  }
  return seen;
}

/** Búsqueda acotada a 21 casillas y cinco opciones, solo al preparar ronda.
 * El orden se baraja fuera; la búsqueda no conoce valores ni la solución. */
export function mazeChoiceCells(start: MazeCell, available: readonly MazeCell[], count: number): MazeCell[] {
  function choose(from: number, selected: MazeCell[]): MazeCell[] | undefined {
    if (selected.length === count) return selected;
    for (let i = from; i <= available.length - (count - selected.length); i++) {
      const next = [...selected, available[i]];
      const reachable = reachableMaze(start, next);
      if (!next.every((cell) => reachable.has(mazeKey(cell)))) continue;
      const result = choose(i + 1, next);
      if (result) return result;
    }
  }
  return choose(0, []) ?? [];
}

/** Persigue por caminos transitables; con escudo busca alejarse. Empates
 * estables para que observar al fantasma permita anticipar su recorrido. */
export function nextMazeGhost(ghost: MazeCell, player: MazeCell, frightened: boolean): MazeCell {
  const distance = new Map<string, number>([[mazeKey(player), 0]]);
  const queue = [player];
  for (let i = 0; i < queue.length; i++) for (const cell of mazeNeighbors(queue[i])) {
    const key = mazeKey(cell);
    if (distance.has(key)) continue;
    distance.set(key, distance.get(mazeKey(queue[i]))! + 1);
    queue.push(cell);
  }
  const options = mazeNeighbors(ghost);
  return options.sort((a, b) => (frightened ? -1 : 1) * (distance.get(mazeKey(a))! - distance.get(mazeKey(b))!))[0] ?? ghost;
}
