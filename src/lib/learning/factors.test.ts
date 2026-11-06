import { describe, expect, test } from "vitest";
import {
  checkFactorWork,
  errorFeedback,
  factorBugs,
  factorTrace,
  factorWorkResponse,
  getLesson,
  isAnswerCorrect,
} from "./domain";

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

describe("Tabla de factores primos (MCD y MCM)", () => {
  test("la tabla da el MCD y el MCM correctos en miles de casos", () => {
    for (let k = 0; k < 2000; k++) {
      const a = 2 + Math.floor(Math.random() * 500), b = 2 + Math.floor(Math.random() * 500);
      const t = factorTrace({ op: "mcm", values: [a, b] });
      expect(t.mcd).toBe(gcd(a, b));
      expect(t.mcm).toBe((a * b) / gcd(a, b));
      expect(t.rows.at(-1)!.next.every((v) => v === 1)).toBe(true);
    }
    const three = factorTrace({ op: "mcd", values: [24, 36, 60] });
    expect([three.mcd, three.mcm]).toEqual([12, 360]);
  });

  test("cada fila explica qué se divide y si cuenta para el MCD", () => {
    const t = factorTrace({ op: "mcm", values: [12, 18] });
    expect(t.rows.map((r) => [r.prime, r.next.join(","), r.common])).toEqual([
      [2, "6,9", true],
      [2, "3,9", false],
      [3, "1,3", true],
      [3, "1,1", false],
    ]);
    expect(t.rows[1].why).toMatch(/2 divide a 6: debajo escribes 3 y bajas sin cambiar 9\. No divide a todos/);
  });

  test("se valida toda la tabla, en cualquier orden de primos", () => {
    const spec = { op: "mcm" as const, values: [12, 18] };
    expect(factorWorkResponse(spec)).toBe("T36;2:6.9|2:3.9|3:1.3|3:1.1");
    expect(checkFactorWork(spec, "T36;2:6.9|2:3.9|3:1.3|3:1.1")?.correct).toBe(true);
    // Empezar por el 3 también vale.
    expect(checkFactorWork(spec, "T36;3:4.6|2:2.3|2:1.3|3:1.1")?.correct).toBe(true);
    expect(checkFactorWork(spec, "T36;4:3.18|2:3.9|3:1.3|3:1.1")?.problem).toEqual({ row: 1, kind: "primo" });
    expect(checkFactorWork(spec, "T36;2:6.18|2:3.9|3:1.3|3:1.1")?.problem).toEqual({ row: 1, kind: "cociente" });
    expect(checkFactorWork(spec, "T36;2:6.9|2:3.9")?.problem?.kind).toBe("incompleta");
    // Tabla bien, resultado mal: se dice qué multiplicar.
    const wrong = checkFactorWork({ op: "mcd", values: [12, 18] }, "T36;2:6.9|2:3.9|3:1.3|3:1.1")!;
    expect(wrong).toMatchObject({ correct: false, problem: null, fromTable: 6 });
  });

  test("errores típicos: el producto en el MCM y confundir MCD con MCM", () => {
    expect(factorBugs({ op: "mcm", values: [12, 18] }).map((b) => [b.id, b.value])).toEqual([["producto", 216], ["mcm-por-mcd", 6]]);
    expect(factorBugs({ op: "mcd", values: [12, 18] }).map((b) => [b.id, b.value])).toEqual([["mcd-por-mcm", 36]]);
    const q = getLesson("mcd-mcm")!.practice.find((item) => item.task === 1)!;
    expect(isAnswerCorrect(q, factorWorkResponse(q.column as { op: "mcm"; values: number[] }))).toBe(true);
    expect(isAnswerCorrect(q, String(q.answer))).toBe(true);
    const product = (q.column as { values: number[] }).values.reduce((p, v) => p * v, 1);
    expect(errorFeedback(q, String(product))).toMatch(/Multiplicaste los números/);
  });
});
