import { describe, expect, test } from "vitest";
import {
  columnBugs,
  columnHints,
  columnSolution,
  columnTrace,
  errorFeedback,
  getLesson,
  isAnswerCorrect,
  recommendedLesson,
  type SubtractStrategy,
} from "./domain";

const STRATEGIES: SubtractStrategy[] = ["prestamo", "compensacion"];

describe("Operaciones en columnas", () => {
  test("el trazado coincide con la operación en miles de casos y con ambas estrategias", () => {
    for (let k = 0; k < 3000; k++) {
      const a = Math.floor(Math.random() * 1e6);
      const b = Math.floor(Math.random() * 1e6);
      expect(columnTrace({ op: "add", a, b }).result).toBe(a + b);
      for (const s of STRATEGIES)
        expect(columnTrace({ op: "subtract", a: Math.max(a, b), b: Math.min(a, b) }, s).result).toBe(Math.abs(a - b));
    }
    // Ceros a la izquierda del resultado y préstamo en cadena.
    expect(columnTrace({ op: "subtract", a: 1000, b: 999 }).resultDigits).toEqual([1]);
  });

  test("préstamo y compensación operan distinto pero dan las mismas cifras", () => {
    const loan = columnTrace({ op: "subtract", a: 302, b: 158 }, "prestamo");
    const comp = columnTrace({ op: "subtract", a: 302, b: 158 }, "compensacion");
    expect(loan.steps.map((s) => [s.workTop, s.workBottom])).toEqual([[12, 8], [9, 5], [2, 1]]);
    expect(comp.steps.map((s) => [s.workTop, s.workBottom])).toEqual([[12, 8], [10, 6], [3, 2]]);
    expect(loan.steps.map((s) => s.digit)).toEqual(comp.steps.map((s) => s.digit));
    // El cero que presta se explica como 10 − 1 = 9.
    expect(loan.steps[1].why).toMatch(/queda 9/);
  });

  test("reconoce los errores sistemáticos clásicos por su resultado", () => {
    const bugs = (op: "add" | "subtract", a: number, b: number) =>
      Object.fromEntries(columnBugs({ op, a, b }).map((bug) => [bug.id, bug.value]));
    expect(bugs("subtract", 325, 148)).toEqual({ "menor-del-mayor": 223, "sin-devolver": 287 });
    expect(bugs("subtract", 302, 158)).toMatchObject({ "cero-sin-restar": 154 });
    expect(bugs("add", 347, 285)).toEqual({ "sin-llevar": 522, "sin-reagrupar": 51212 });
    // Sin reagrupar no hay error típico que diagnosticar.
    expect(columnBugs({ op: "add", a: 123, b: 456 })).toEqual([]);
    // Nunca coinciden con el resultado correcto ni se repiten.
    for (let k = 0; k < 500; k++) {
      const a = Math.floor(Math.random() * 1e5), b = Math.floor(Math.random() * a);
      const values = columnBugs({ op: "subtract", a, b }).map((bug) => bug.value);
      expect(values).not.toContain(a - b);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  test("las pistas avanzan de la idea a la primera columna y a casi todo el resultado", () => {
    const [idea, first, almost] = columnHints({ op: "subtract", a: 325, b: 148 }, "compensacion");
    expect(idea).toMatch(/suma 10 arriba y 1 abajo/);
    expect(first).toMatch(/15 − 8 = 7/);
    expect(almost).toMatch(/…77/);
    expect(columnSolution({ op: "add", a: 958, b: 76 }).at(-1)).toMatch(/Comprobación/);
  });

  test("la pregunta en columnas diagnostica el error en el servidor y en el navegador", () => {
    const lesson = getLesson("suma-resta-columnas")!;
    const q = lesson.practice.find((item) => item.column?.op === "subtract")!;
    expect(isAnswerCorrect(q, String(q.answer))).toBe(true);
    const bug = columnBugs(q.column!).find((b) => b.id === "menor-del-mayor")!;
    expect(isAnswerCorrect(q, String(bug.value))).toBe(false);
    expect(errorFeedback(q, String(bug.value))).toMatch(/cifra menor de la mayor/);
  });

  test("la base de primaria no hace retroceder a quien ya avanza en el programa", () => {
    expect(recommendedLesson(new Set(), null)?.id).toBe("suma-resta-columnas");
    expect(recommendedLesson(new Set(["enteros-recta"]), null)?.id).toBe("enteros-suma-resta");
  });
});
