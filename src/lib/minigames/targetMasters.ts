export type Operation = '+' | '−' | '×' | '÷';
export const OPERATIONS: Operation[] = ['+', '−', '×', '÷'];
export type Tile = { id: string; value: number; expression: string };
export type Step = { left: number; op: Operation; right: number; result: number };
export type Puzzle = { target: number; numbers: number[]; operations: Operation[]; solution: Step[] };

export function calculate(a: number, op: Operation, b: number): number | null {
  const n = op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : b === 0 ? NaN : a / b;
  return Number.isSafeInteger(n) && n >= 0 && n <= 9999 ? n : null;
}

/** Deterministic puzzles are built backwards from a valid sequence. */
export function makePuzzle(seed: number): Puzzle {
  const n = Math.max(0, Math.floor(seed));
  const a = 2 + n % 8, b = 2 + Math.floor(n / 8) % 8, c = 2 + Math.floor(n / 64) % 8;
  const group = Math.floor(n / 20) % 5;
  const first: Operation = group === 0 ? '+' : group === 1 ? '×' : group === 2 ? '×' : group === 3 ? '+' : '×';
  const second: Operation = group === 0 ? '+' : group === 1 ? '+' : group === 2 ? '÷' : group === 3 ? '−' : '−';
  const intermediate = calculate(a, first, b)!;
  const right = second === '÷' ? b : second === '−' ? Math.min(c, intermediate) : c;
  const target = calculate(intermediate, second, right)!;
  return { target, numbers: [a, b, right], operations: group === 0 ? ['+', '−'] : OPERATIONS,
    solution: [{ left: a, op: first, right: b, result: intermediate }, { left: intermediate, op: second, right, result: target }] };
}

/** Find a valid next move from the current board; all tiles must be used. */
export function solve(values: number[], target: number, operations: Operation[]): Step[] | null {
  if (values.length === 1) return values[0] === target ? [] : null;
  for (let i = 0; i < values.length; i++) for (let j = 0; j < values.length; j++) {
    if (i === j) continue;
    for (const op of operations) {
      const result = calculate(values[i], op, values[j]);
      if (result === null) continue;
      const remaining = values.filter((_, index) => index !== i && index !== j);
      const rest = solve([...remaining, result], target, operations);
      if (rest) return [{ left: values[i], op, right: values[j], result }, ...rest];
    }
  }
  return null;
}

export type Special = 'normal' | 'gemela' | 'congelada' | 'cambiante';
export type GameTile = Tile & { special: Special; alternate?: number };
export type GameStep = { leftId: string; rightId: string; op: Operation; result: number };

/** Special rules apply to the original tiles until they are combined. */
export function applyMove(tiles: GameTile[], leftId: string, rightId: string, op: Operation): GameTile[] | null {
  const left = tiles.find(tile => tile.id === leftId), right = tiles.find(tile => tile.id === rightId);
  if (!left || !right || leftId === rightId || left.special === 'congelada' || right.special === 'congelada') return null;
  if ((left.special === 'gemela') !== (right.special === 'gemela')) return null;
  const result = calculate(left.value, op, right.value);
  if (result === null) return null;
  return [...tiles.filter(tile => tile.id !== leftId && tile.id !== rightId).map(tile => tile.special === 'congelada' ? { ...tile, special: 'normal' as const } : tile),
    { id: `(${left.id},${right.id})`, value: result, expression: `(${left.expression} ${op} ${right.expression})`, special: 'normal' }];
}

/** Find a solution using the currently displayed tile values. */
export function solveBoard(tiles: GameTile[], target: number, operations: Operation[]): GameStep[] | null {
  if (tiles.length === 1) return tiles[0].value === target ? [] : null;
  return solveFixed(tiles, target, operations);
}
function solveFixed(tiles: GameTile[], target: number, operations: Operation[]): GameStep[] | null {
  if (tiles.length === 1) return tiles[0].value === target ? [] : null;
  for (const left of tiles) for (const right of tiles) for (const op of operations) {
    const next = applyMove(tiles, left.id, right.id, op);
    if (!next) continue;
    const rest = solveFixed(next, target, operations);
    if (rest) return [{ leftId: left.id, rightId: right.id, op, result: next[next.length - 1].value }, ...rest];
  }
  return null;
}

/** Generate with a known valid solution using only the selected operations. */
export function makePracticePuzzle(seed: number, operations: Operation[], difficulty: number): Puzzle {
  const allowed = operations.length ? operations : ['+'] as Operation[];
  const range = [5, 9, 15][Math.max(0, Math.min(2, difficulty))];
  const a = 2 + seed % range, b = 2 + Math.floor(seed / 7) % range, c = 2 + Math.floor(seed / 31) % range;
  const op = allowed[seed % allowed.length];
  // Construct operands so subtraction and division are always valid.
  const numbers = op === '−' ? [a + b + c, b, c] : op === '÷' ? [a * b * c, b, c] : [a, b, c];
  const first = calculate(numbers[0], op, numbers[1])!;
  const target = calculate(first, op, numbers[2])!;
  return { numbers, target, operations: allowed, solution: [{ left: numbers[0], op, right: numbers[1], result: first }, { left: first, op, right: numbers[2], result: target }] };
}

/** Find a distinct valid expression while respecting tile constraints. */
export function findAlternative(tiles: GameTile[], target: number, operations: Operation[], previous: string): { expression: string; steps: Step[] } | null {
  if (tiles.length === 1) return tiles[0].value === target && tiles[0].expression !== previous ? { expression: tiles[0].expression, steps: [] } : null;
  for (const left of tiles) for (const right of tiles) for (const op of operations) {
    const next = applyMove(tiles, left.id, right.id, op);
    if (!next) continue;
    const result = findAlternative(next, target, operations, previous);
    if (result) return { expression: result.expression, steps: [{ left: left.value, op, right: right.value, result: next[next.length - 1].value }, ...result.steps] };
  }
  return null;
}
