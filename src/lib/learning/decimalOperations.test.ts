import { describe, expect, test } from "vitest";
import {
  checkDivisionWork,
  checkOpenDivision,
  dividendText,
  divisionAnswerText,
  divisionBugs,
  divisionHints,
  divisionResponseCorrect,
  divisionSolution,
  divisionTrace,
  divisionWorkResponse,
  encodeOpenDivision,
  exactPlaces,
  fmtProduct,
  multiplyBugs,
  multiplyHints,
  multiplySolution,
  multiplyTrace,
  operationResult,
  validMultiplySpec,
} from "./core";

const round = (x: number, d = 6) => Number(x.toFixed(d));

describe("Multiplicación en columnas", () => {
  test("el trazado coincide con el producto en miles de casos, también con decimales", () => {
    for (let k = 0; k < 3000; k++) {
      const sa = k % 4, sb = Math.floor(k / 4) % 3;
      const A = 1 + Math.floor(Math.random() * 99999);
      const B = 1 + Math.floor(Math.random() * 999);
      const a = round(A / 10 ** sa), b = round(B / 10 ** sb);
      const spec = { op: "multiply" as const, a, b };
      if (!validMultiplySpec(spec)) continue;
      const t = multiplyTrace(spec);
      expect(t.result).toBe(round(a * b, t.scale));
      // Cada cifra escrita es una sola cifra y la suma de las filas da el producto.
      for (const s of t.steps) if (s.kind !== "comma") expect(s.digit).toBeLessThan(10);
      expect(t.partials.reduce((s, p) => s + p.value, 0)).toBe(t.product);
    }
  });

  test("filas desplazadas, llevadas y suma: 347 × 25", () => {
    const t = multiplyTrace({ op: "multiply", a: 347, b: 25 });
    expect(t.partials.map((p) => [p.digit, p.shift, p.value])).toEqual([
      [5, 0, 1735],
      [2, 1, 6940],
    ]);
    expect(t.summed).toBe(true);
    expect(t.result).toBe(8675);
    // La fila de las decenas empieza con un 0 en las unidades.
    expect(t.steps.find((s) => s.row === 1)).toMatchObject({ column: 0, digit: 0, topIndex: -1 });
    expect(t.steps.find((s) => s.row === 0 && s.topIndex === 0)!.why).toBe("5 × 7 = 35. Escribes 5 y llevas 3.");
    expect(t.steps.find((s) => s.row === 0 && s.topIndex === 1)!.why).toBe("5 × 4 = 20, más 3 que llevabas, 23. Escribes 3 y llevas 2.");
    expect(multiplySolution({ op: "multiply", a: 347, b: 25 }).join(" ")).toContain("1\u00a0735 + 6\u00a0940 = 8\u00a0675");
  });

  test("un 0 abajo no necesita fila, pero la siguiente se desplaza", () => {
    const t = multiplyTrace({ op: "multiply", a: 213, b: 104 });
    expect(t.partials.map((p) => [p.digit, p.shift])).toEqual([
      [4, 0],
      [1, 2],
    ]);
    expect(t.result).toBe(22152);
    expect(t.steps.find((s) => s.row === 1)!.why).toMatch(/El 0 de las decenas de abajo da una fila de ceros/);
    // Un multiplicador de una sola cifra distinta de 0 no lleva fila de suma.
    expect(multiplyTrace({ op: "multiply", a: 347, b: 30 })).toMatchObject({ summed: false, result: 10410 });
  });

  test("decimales: se multiplica sin coma y se cuentan los decimales de los dos factores", () => {
    const t = multiplyTrace({ op: "multiply", a: 2.4, b: 0.3 });
    expect([t.A, t.B, t.product, t.scale, t.result]).toEqual([24, 3, 72, 2, 0.72]);
    expect(t.steps.at(-1)).toMatchObject({ kind: "comma", digit: 2 });
    // Faltan cifras: se completa con ceros a la izquierda.
    const small = multiplyTrace({ op: "multiply", a: 0.2, b: 0.3 });
    expect(small.resultDigits).toEqual([6, 0, 0]);
    expect(small.steps.at(-1)!.why).toMatch(/completas con 2 ceros a la izquierda: 0,06/);
    expect(fmtProduct(6, 2)).toBe("0,06");
    expect(fmtProduct(12345, 1)).toBe("1 234,5");
    expect(multiplyHints({ op: "multiply", a: 2.4, b: 0.3 })[0]).toMatch(/cuenta los decimales/);
  });

  test("errores típicos reconocibles por el producto", () => {
    const ids = (a: number, b: number) => Object.fromEntries(multiplyBugs({ op: "multiply", a, b }).map((x) => [x.id, x.value]));
    // (7 + 3) × 5 en lugar de 7 × 5 + 3; sin llevar; sin desplazar.
    expect(ids(347, 25)).toMatchObject({ "sin-desplazar": 1735 + 694, "sin-llevar": 505 + 6840 });
    expect(ids(47, 6)["llevada-antes"]).toBe(482); // 6 × 7 = 42; (4 + 4) × 6 = 48
    // Coma como en la suma (2 decimales en lugar de 3) y coma olvidada.
    expect(ids(1.25, 0.4)).toMatchObject({ "coma-como-suma": 5, "coma-olvidada": 500 });
    for (const [a, b] of [[347, 25], [2.4, 0.3], [1.25, 0.4], [608, 7]])
      for (const bug of multiplyBugs({ op: "multiply", a, b })) expect(bug.value).not.toBe(operationResult({ op: "multiply", a, b }));
  });
});

describe("División con decimales", () => {
  test("cociente decimal de naturales: se añaden ceros y la coma sube al cociente", () => {
    const t = divisionTrace({ op: "divide", a: 3, b: 4, places: 2 });
    expect([t.quotient, t.remainder, t.quotientText, t.quotientPrefix]).toEqual([0.75, 0, "0,75", "0,"]);
    expect(dividendText(t)).toBe("3,00");
    expect(t.steps[0].why).toMatch(/^En la parte entera no cabe 4: llegas hasta las décimas, así que el cociente empieza con «0,»/);
    expect(divisionAnswerText({ op: "divide", a: 3, b: 4, places: 2 })).toBe("0,75");
    const u = divisionTrace({ op: "divide", a: 27, b: 4, places: 2 });
    expect([u.quotientText, u.commaAfter]).toEqual(["6,75", 0]);
    expect(u.steps[0].why).toMatch(/añades un 0 en las décimas y lo bajas; como empiezas con las décimas, pones la coma/);
  });

  test("dividendo decimal: la coma del cociente va al bajar la primera cifra decimal", () => {
    const t = divisionTrace({ op: "divide", a: 12.6, b: 3 });
    expect([t.quotientText, t.decimals, t.padded]).toEqual(["4,2", 1, 0]);
    expect(t.steps[0].why).toMatch(/Bajas el 6, que son décimas: pones la coma en el cociente/);
    expect(divisionTrace({ op: "divide", a: 0.06, b: 3 }).quotientText).toBe("0,02");
    expect(divisionTrace({ op: "divide", a: 1.2, b: 4 }).quotientText).toBe("0,3");
  });

  test("divisor decimal: se multiplican los dos por la misma potencia de 10", () => {
    const t = divisionTrace({ op: "divide", a: 4.8, b: 0.15 });
    expect([t.shift, t.dividend, t.divisor, t.quotient]).toEqual([2, 480, 15, 32]);
    expect(divisionSolution({ op: "divide", a: 4.8, b: 0.15 })[0]).toMatch(/4,8 ÷ 0,15 = 480 ÷ 15/);
    expect(divisionHints({ op: "divide", a: 4.8, b: 0.15 })[0]).toMatch(/^Primero convierte el divisor en entero/);
    expect(divisionTrace({ op: "divide", a: 7.2, b: 0.09 }).quotient).toBe(80);
    expect(divisionTrace({ op: "divide", a: 6.3, b: 0.7 }).quotient).toBe(9);
  });

  test("el trazado coincide con la división en miles de casos con decimales", () => {
    for (let k = 0; k < 2000; k++) {
      const a = round(Math.floor(Math.random() * 1e5) / 10 ** (k % 4));
      const b = round((1 + Math.floor(Math.random() * 99)) / 10 ** (k % 3));
      const places = k % 3;
      const spec = { op: "divide" as const, a, b, places };
      const t = divisionTrace(spec);
      const expected = Math.floor(round(a / b, 9) * 10 ** t.decimals + 1e-9) / 10 ** t.decimals;
      expect(t.quotient, JSON.stringify(spec)).toBeCloseTo(expected, 9);
      expect(Number(t.quotientText.replace(/\s/g, "").replace(",", "."))).toBeCloseTo(t.quotient, 9);
      for (const s of t.steps) expect(s.rest).toBeLessThan(t.divisor);
    }
  });

  test("las respuestas decimales se aceptan en texto y en la galera; el resto no se pide", () => {
    const spec = { op: "divide" as const, a: 3, b: 4, places: 2 };
    expect(divisionResponseCorrect(spec, "0,75")).toBe(true);
    expect(divisionResponseCorrect(spec, "0.75")).toBe(true);
    expect(divisionResponseCorrect(spec, "75")).toBe(false);
    expect(divisionResponseCorrect(spec, divisionWorkResponse(spec))).toBe(true);
    expect(checkDivisionWork(spec, divisionWorkResponse(spec, "abreviada"))).toMatchObject({ correct: true, quotient: 0.75 });
    // Galera abierta: las cifras del cociente con su coma fija.
    expect(checkOpenDivision(spec, encodeOpenDivision("075", ["28", "20", "20", "0"]))).toMatchObject({ correct: true, quotient: 0.75 });
    expect(checkOpenDivision(spec, encodeOpenDivision("075", ["20", "0"]))).toMatchObject({ correct: true });
  });

  test("errores típicos: coma olvidada, divisor sin ajustar y cero omitido", () => {
    const bugs = (a: number, b: number, places?: number) =>
      Object.fromEntries(divisionBugs({ op: "divide", a, b, places }).map((x) => [x.id, x.value]));
    expect(bugs(3, 4, 2)).toMatchObject({ "coma-olvidada": 75 });
    expect(bugs(4.8, 0.15)).toMatchObject({ "divisor-sin-ajustar": 0.32 });
    // 6,12 ÷ 6 = 1,02: sin el 0 del cociente quedaría 1,2.
    expect(bugs(6.12, 6)).toMatchObject({ "cero-omitido": 1.2 });
    expect(exactPlaces(3, 4)).toBe(2);
    expect(exactPlaces(10, 3)).toBeNull();
  });

  test("las divisiones naturales no cambian", () => {
    const t = divisionTrace({ op: "divide", a: 1385, b: 12 });
    expect([t.quotient, t.remainder, t.decimals, t.quotientText]).toEqual([115, 5, 0, "115"]);
    expect(divisionAnswerText({ op: "divide", a: 1385, b: 12 })).toBe("115 r 5");
  });
});
