import { describe, expect, test } from "vitest";
import {
  checkDivisionWork,
  checkOpenDivision,
  divisionRowVariants,
  correctResponse,
  divisionBugs,
  divisionResponseValue,
  divisionWorkResponse,
  divisionHints,
  divisionSolution,
  divisionTrace,
  errorFeedback,
  getLesson,
  isAnswerCorrect,
  operationResult,
} from "./domain";

describe("División larga", () => {
  test("el trazado coincide con la división en miles de casos y con ambas disposiciones", () => {
    for (let k = 0; k < 3000; k++) {
      const a = Math.floor(Math.random() * 1e6);
      const b = 1 + Math.floor(Math.random() * 120);
      for (const layout of ["completa", "abreviada"] as const) {
        const t = divisionTrace({ op: "divide", a, b }, layout);
        expect([t.quotient, t.remainder]).toEqual([Math.floor(a / b), a % b]);
        // Cada paso deja un resto menor que el divisor.
        for (const s of t.steps) expect(s.rest).toBeLessThan(b);
      }
    }
    expect(divisionTrace({ op: "divide", a: 7, b: 9 })).toMatchObject({ quotient: 0, remainder: 7 });
  });

  test("empieza por el primer número en el que cabe el divisor y baja una cifra por paso", () => {
    const t = divisionTrace({ op: "divide", a: 1385, b: 12 });
    expect(t.steps.map((s) => [s.part, s.digit, s.rest, s.down])).toEqual([
      [13, 1, 1, 8],
      [18, 1, 6, 5],
      [65, 5, 5, null],
    ]);
    expect(t.steps[0].why).toMatch(/1 es menor que 12: tomas 13/);
  });

  test("el cero del cociente se explica y su omisión se diagnostica", () => {
    const t = divisionTrace({ op: "divide", a: 612, b: 6 });
    expect(t.steps.map((s) => s.digit)).toEqual([1, 0, 2]);
    expect(t.steps[1].why).toMatch(/Escribes 0 en el cociente/);
    expect(Object.fromEntries(divisionBugs({ op: "divide", a: 612, b: 6 }).map((b) => [b.id, b.value]))).toMatchObject({ "cero-omitido": 12 });
    expect(Object.fromEntries(divisionBugs({ op: "divide", a: 756, b: 3 }).map((b) => [b.id, b.value]))).toEqual({ "cifra-por-cifra": 212 });
    // Un cero al final del cociente también cuenta.
    expect(divisionBugs({ op: "divide", a: 5280, b: 24 }).map((b) => b.value)).toContain(22);
  });

  test("la disposición abreviada no escribe los productos; la solución comprueba con el resto", () => {
    expect(divisionTrace({ op: "divide", a: 756, b: 3 }, "abreviada").steps[0].why).toMatch(/de memoria/);
    expect(divisionSolution({ op: "divide", a: 1385, b: 12 }).at(-1)).toMatch(/115 × 12 \+ 5 = 1 385/);
    const [, first, almost] = divisionHints({ op: "divide", a: 612, b: 6 });
    expect(first).toMatch(/6 cabe 1 vez en 6/);
    expect(almost).toMatch(/empieza por 10…/);
  });

  test("la pregunta de división diagnostica el cero omitido en el servidor y en el navegador", () => {
    const lesson = getLesson("division-larga")!;
    const q = lesson.practice.find((item) => item.column?.op === "divide" && divisionBugs(item.column).some((b) => b.id === "cero-omitido"))!;
    expect(q.answer).toBe(operationResult(q.column!));
    const bug = divisionBugs(q.column as { op: "divide"; a: number; b: number }).find((b) => b.id === "cero-omitido")!;
    expect(isAnswerCorrect(q, String(bug.value))).toBe(false);
    expect(errorFeedback(q, String(bug.value))).toMatch(/la cifra del cociente es 0/);
  });

  test("el procedimiento completo se valida casilla a casilla, con el resto", () => {
    const spec = { op: "divide" as const, a: 757, b: 3 };
    expect(divisionWorkResponse(spec)).toBe("C252;6,15,15,07,6,1");
    expect(divisionWorkResponse(spec, "abreviada")).toBe("A252;15,07,1");
    expect(checkDivisionWork(spec, "C252;6,15,15,07,6,1")).toMatchObject({ correct: true, quotient: 252, remainder: 1 });
    // «07» y «7» valen lo mismo: no se exige escribir el 0 de delante.
    expect(checkDivisionWork(spec, "C252;6,15,15,7,6,1")?.correct).toBe(true);
    // Cociente bien pero un producto mal: no es correcto y se señala ese paso.
    expect(checkDivisionWork(spec, "C252;6,15,14,17,6,1")?.firstError).toMatchObject({ kind: "p", step: 1 });
    // Falta el resto o es otro.
    expect(checkDivisionWork(spec, "C252;6,15,15,07,6,4")?.firstError).toMatchObject({ kind: "r", step: 2 });
    expect(checkDivisionWork(spec, "C252;6,15,15,07,6,")?.correct).toBe(false);
    // Formato incompleto o de otra estructura: no se reconoce como galera.
    expect(checkDivisionWork(spec, "C25;6,15")).toBeNull();
  });

  test("la pregunta exige cociente y resto, en la galera o por escrito", () => {
    const q = getLesson("division-larga")!.practice.find((item) => item.task === 1)!;
    const spec = q.column as { op: "divide"; a: number; b: number };
    const t = divisionTrace(spec);
    expect(t.remainder).toBeGreaterThan(0);
    expect(correctResponse(q)).toBe(`${t.quotient} r ${t.remainder}`);
    expect(isAnswerCorrect(q, `${t.quotient} resto ${t.remainder}`)).toBe(true);
    expect(isAnswerCorrect(q, String(t.quotient))).toBe(false);
    expect(errorFeedback(q, String(t.quotient))).toMatch(/falta el resto/);
    expect(isAnswerCorrect(q, divisionWorkResponse(spec))).toBe(true);
    expect(isAnswerCorrect(q, divisionWorkResponse(spec, "abreviada"))).toBe(true);
  });

  test("poner otra cifra donde iba el 0 del cociente se diagnostica como el error típico", () => {
    const spec = { op: "divide" as const, a: 612, b: 6 };
    // Paso 2: queda 1 y el alumno escribe 2 en lugar de 0.
    expect(divisionResponseValue(spec, "C122;6,01,12,0,0,0")).toBe(12);
    expect(checkDivisionWork(spec, "C122;6,01,12,0,0,0")?.firstError).toMatchObject({ kind: "q", step: 1 });
  });

  test("galera abierta: acepta cualquier escritura correcta del procedimiento", () => {
    const spec = { op: "divide" as const, a: 612, b: 6 };
    expect(divisionRowVariants(spec).map((v) => v.map((r) => r.value))).toEqual([
      [6, 1, 0, 12, 12, 0], // con productos y una fila por paso
      [6, 12, 12, 0], // con productos, bajando el 2 junto al 1
      [1, 12, 0], // de memoria
      [12, 0], // de memoria, bajando el 2 junto al 1
    ]);
    for (const rows of ["6,1,0,12,12,0", "6,12,12,0", "1,12,0", "12,0", "6,012,12,0"])
      expect(checkOpenDivision(spec, `L102;${rows}`)?.correct, rows).toBe(true);
    // Cifras de más a la izquierda en el cociente no cambian su valor.
    expect(checkOpenDivision(spec, "L0102;12,0")?.correct).toBe(true);
    // Sin el 0 del cociente: se reconoce el error típico por su valor.
    expect(checkOpenDivision(spec, "L12;6,12,12,0")).toMatchObject({ correct: false, quotientCorrect: false });
    expect(divisionResponseValue(spec, "L12;6,12,12,0")).toBe(12);
    // Un producto mal: se señala ese paso.
    expect(checkOpenDivision(spec, "L102;6,12,13,0")).toMatchObject({ correct: false, mismatch: { step: 2, kind: "p" } });
    // Falta el resto.
    expect(checkOpenDivision(spec, "L102;6,12,12")?.correct).toBe(false);
  });

  test("galera abierta: la pregunta la evalúa en el servidor y explica el fallo", () => {
    const q = getLesson("division-larga")!.practice.find((item) => item.task === 1)!;
    const spec = q.column as { op: "divide"; a: number; b: number };
    const rows = divisionRowVariants(spec)[0].map((r) => r.value).join(",");
    expect(isAnswerCorrect(q, `L${divisionTrace(spec).quotient};${rows}`)).toBe(true);
    const wrong = rows.replace(/^\d+/, (p) => String(Number(p) + 1));
    expect(isAnswerCorrect(q, `L${divisionTrace(spec).quotient};${wrong}`)).toBe(false);
    expect(errorFeedback(q, `L${divisionTrace(spec).quotient};${wrong}`)).toMatch(/Revisa el producto del paso 1/);
    expect(errorFeedback(q, `L1;${rows}`)).toMatch(/El cociente no es correcto/);
  });
});
