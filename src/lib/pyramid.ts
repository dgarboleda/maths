import { randInt } from "./problem";

export type PyramidOp = "suma" | "resta" | "multiplicacion" | "fracciones";

export interface PyramidPuzzle {
  op: PyramidOp;
  rows: number[][]; // rows[0] = base ... rows[last] = ápice (largo 1)
  denominator?: number; // solo para "fracciones": cada número es un numerador sobre este denominador fijo
}

function combine(a: number, b: number, op: PyramidOp): number {
  if (op === "resta") return a - b;
  if (op === "multiplicacion") return a * b;
  return a + b; // suma y fracciones (fracciones suma numeradores de igual denominador)
}

export function generatePyramid(op: PyramidOp): PyramidPuzzle {
  const baseSize = op === "multiplicacion" ? 3 : op === "fracciones" ? 3 : 4;
  const [min, max] = op === "multiplicacion" ? [1, 4] : op === "fracciones" ? [1, 3] : [1, 9];

  const base = Array.from({ length: baseSize }, () => randInt(min, max));
  const rows: number[][] = [base];
  for (let r = 1; r < baseSize; r++) {
    const prev = rows[r - 1];
    const row: number[] = [];
    for (let i = 0; i < prev.length - 1; i++) row.push(combine(prev[i], prev[i + 1], op));
    rows.push(row);
  }

  return { op, rows, denominator: op === "fracciones" ? 12 : undefined };
}

export function opSymbol(op: PyramidOp): string {
  if (op === "resta") return "−";
  if (op === "multiplicacion") return "×";
  return "+";
}

export function formatCell(value: number, op: PyramidOp, denominator?: number): string {
  if (op === "fracciones" && denominator) return `${value}/${denominator}`;
  return String(value);
}

/** Todas las celdas a resolver, de abajo hacia arriba y de izquierda a derecha. */
export function buildTargetList(rows: number[][]): Array<{ r: number; c: number }> {
  const targets: Array<{ r: number; c: number }> = [];
  for (let r = 1; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) targets.push({ r, c });
  }
  return targets;
}

/** Nivel 1-10 equivalente, para reutilizar la misma fórmula de estrellas del resto de la app. */
export function pyramidDifficulty(op: PyramidOp): number {
  if (op === "multiplicacion") return 5;
  if (op === "fracciones") return 7;
  return 3;
}
