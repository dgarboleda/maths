import { describe, expect, test } from "vitest";
import {
  checkRuffiniWork,
  errorFeedback,
  getLesson,
  isAnswerCorrect,
  polynomialText,
  ruffiniBugs,
  ruffiniTrace,
  ruffiniWorkResponse,
} from "./domain";

const evaluate = (cs: number[], x: number) => cs.reduce((acc, c) => acc * x + c, 0);
const ruf = (coefficients: number[], root: number) => ({ op: "ruffini" as const, coefficients, root });

describe("Regla de Ruffini", () => {
  test("el resto es P(r) y el cociente reconstruye el polinomio (teorema del resto)", () => {
    for (let k = 0; k < 2000; k++) {
      const n = 2 + Math.floor(Math.random() * 5);
      const cs = Array.from({ length: n }, (_, i) => (i === 0 ? 1 + Math.floor(Math.random() * 9) : Math.floor(Math.random() * 21) - 10));
      const r = Math.floor(Math.random() * 13) - 6;
      const t = ruffiniTrace(ruf(cs, r));
      expect(t.remainder).toBe(evaluate(cs, r));
      // P(x) = (x − r)·Q(x) + resto, comprobado en otro punto.
      expect(evaluate(cs, 7)).toBe((7 - r) * evaluate(t.quotient, 7) + t.remainder);
    }
  });

  test("escribe polinomios y explica cada columna", () => {
    expect(polynomialText([1, 0, -7, 6])).toBe("x³ − 7x + 6");
    expect(polynomialText([2, -1, 0])).toBe("2x² − x");
    const t = ruffiniTrace(ruf([1, 0, -7, 6], -3));
    expect(t.steps.map((s) => s.result)).toEqual([1, -3, 2, 0]);
    expect(t.steps[1].why).toBe("−3 × 1 = −3; 0 + (−3) = −3.");
  });

  test("se valida toda la tabla y se dice qué revisar", () => {
    const spec = ruf([1, 0, -7, 6], -3);
    expect(ruffiniWorkResponse(spec)).toBe("R-3|1,0,-7,6|-3,9,-6|1,-3,2,0");
    expect(checkRuffiniWork(spec, "R-3|1,0,-7,6|-3,9,-6|1,-3,2,0")?.correct).toBe(true);
    expect(checkRuffiniWork(spec, "R−3|1,0,−7,6|−3,9,−6|1,−3,2,0")?.correct).toBe(true);
    // Esquina con el signo del divisor.
    expect(checkRuffiniWork(spec, "R3|1,0,-7,6|3,9,6|1,3,2,12")?.firstError).toEqual({ kind: "root", column: 0 });
    // Sin el 0 del término que falta: la tabla no tiene el tamaño correcto.
    expect(checkRuffiniWork(spec, "R-3|1,-7,6|-3,30|1,-10,36")).toBeNull();
    const q = getLesson("ruffini")!.practice.find((item) => item.task === 3)!;
    const s = q.column as { op: "ruffini"; coefficients: number[]; root: number };
    const subtracted = ruffiniWorkResponse(s).split("|");
    const t = ruffiniTrace(s);
    subtracted[3] = [t.steps[0].result, s.coefficients[1] - t.steps[1].product!, ...t.steps.slice(2).map((x) => x.result)].join(",");
    expect(errorFeedback(q, subtracted.join("|"))).toMatch(/se suma.*no se resta/);
    expect(isAnswerCorrect(q, ruffiniWorkResponse(s))).toBe(true);
  });

  test("errores típicos reconocibles por el resto", () => {
    expect(ruffiniBugs(ruf([1, 0, -7, 6], -3)).map((b) => b.id)).toEqual(["signo-esquina", "sin-cero"]);
    expect(ruffiniBugs(ruf([2, -3, 1, 5], 2)).map((b) => b.id)).toEqual(["signo-esquina"]);
    const sign = ruffiniBugs(ruf([2, -3, 1, 5], 2)).find((b) => b.id === "signo-esquina")!;
    expect(sign.value).toBe(evaluate([2, -3, 1, 5], -2));
  });
});
