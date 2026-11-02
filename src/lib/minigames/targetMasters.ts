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
