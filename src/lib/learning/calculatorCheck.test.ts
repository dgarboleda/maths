import { describe, expect, test } from "vitest";
import { checkCommonDenominator, checkManualWork } from "./calculatorCheck";
import { checkSignedWork, checkWrittenWork } from "./calculatorWrittenCheck";

const blankStep = { operation: "", result: "" };
const rows = [{ divisor: "", cells: [] }];

describe("comprobación de la hoja", () => {
  test("acepta fracciones equivalentes y no revela la solución al fallar", () => {
    expect(checkManualWork("add", ["1/2", "1/3"], "", [blankStep], rows, "10/12").ok).toBe(true);
    const wrong = checkManualWork("add", ["1/2", "1/3"], "", [blankStep], rows, "7/6");
    expect(wrong.ok).toBe(false);
    expect(JSON.stringify(wrong)).not.toContain("5/6");
  });
  test("revisa equivalencias con cualquier denominador común sin dar la respuesta", () => {
    expect(checkCommonDenominator(["1/2", "1/3"], ["3/6", "2/6"])).toBeNull();
    expect(checkCommonDenominator(["1/2", "1/3"], ["6/12", "4/12"])).toBeNull();
    expect(checkCommonDenominator(["1/2", "1/3"], ["2/6", "2/6"])).toMatch(/número 1/);
    expect(checkCommonDenominator(["1/2", "1/3"], ["3/6", "4/12"])).toMatch(/aún no son iguales/);
    expect(checkCommonDenominator(["1/2", "1/3"], ["3/6", ""])).toMatch(/Completa/);
    expect(checkCommonDenominator(["-1/2", "1/3"], ["3/-6", "2/6"])).toMatch(/aún no son iguales/);
    const checked = checkManualWork("add", ["1/2", "1/3"], "", [], rows, "5/6", ["3/6", "2/6"]);
    expect(checked.ok).toBe(true);
    expect(checked.details.join(" ")).toMatch(/denominador común/);
    const wrong = checkManualWork("subtract", ["1/2", "1/3"], "", [], rows, "1/6", ["2/6", "2/6"]);
    expect(wrong.ok).toBe(false);
    expect(wrong.details.join(" ")).toMatch(/número 1/);
  });
  test("señala el paso incorrecto aunque el resultado final sea correcto", () => {
    const report = checkManualWork("add", ["1/2", "1/3"], "", [{ operation: "1/2 + 1/3", result: "7/6" }], rows, "5/6");
    expect(report.ok).toBe(false);
    expect(report.details.join(" ")).toMatch(/paso 1/);
    expect(report.message).toMatch(/resultado final es correcto/);
  });
  test("agrupa ambas fracciones al comprobar un paso estructurado de división", () => {
    const step = { operation: "", left: "1/2", right: "3/4", operator: "÷", result: "2/3" };
    expect(checkManualWork("divide", ["1/2", "3/4"], "", [step], rows, "2/3").ok).toBe(true);
    expect(checkManualWork("divide", ["1/2", "3/4"], "", [{ ...step, result: "1/24" }], rows, "2/3").ok).toBe(false);
    expect(checkManualWork("divide", ["-1/2", "3/4"], "", [{ ...step, left: "-1/2", result: "-2/3" }], rows, "-2/3").ok).toBe(true);
  });
  test("distingue entre equivalencia y una fracción simplificada", () => {
    expect(checkManualWork("simplify", ["2/4"], "", [], rows, "2/4").message).toMatch(/simplificar/);
    expect(checkManualWork("simplify", ["2/4"], "", [], rows, "01/02").ok).toBe(true);
  });
  test("comprueba expresiones y avisa de divisiones por cero", () => {
    expect(checkManualWork("expression", [], "(1/2 + 1/3) * 3", [], rows, "5/2").ok).toBe(true);
    expect(checkManualWork("divide", ["1/2", "0"], "", [], rows, "0").message).toMatch(/dividir entre 0/);
  });
  test("revisa la primera fila errónea de factores y acepta distintos órdenes", () => {
    const valid = [{ divisor: "3", cells: ["4", "6"] }, { divisor: "2", cells: ["2", "3"] }, { divisor: "2", cells: ["1", "3"] }, { divisor: "3", cells: ["1", "1"] }];
    expect(checkManualWork("mcm", ["12", "18"], "", [], valid, "36").ok).toBe(true);
    const bad = [{ divisor: "3", cells: ["5", "6"] }];
    expect(checkManualWork("mcm", ["12", "18"], "", [], bad, "36").details.join(" ")).toMatch(/fila 1/);
    const missing = [{ divisor: "", cells: [] }, ...valid];
    expect(checkManualWork("mcm", ["12", "18"], "", [], missing, "36").details.join(" ")).toMatch(/fila 1/);
  });
  test("admite cuatro números y es explícita cuando no puede revisar una tabla con cero", () => {
    const four = [{ divisor: "2", cells: ["1", "1", "1", "1"] }];
    expect(checkManualWork("mcd", ["2", "2", "2", "2"], "", [], four, "2").ok).toBe(true);
    const zero = checkManualWork("mcm", ["0", "4"], "", [], [{ divisor: "2", cells: ["0", "2"] }], "0");
    expect(zero.ok).toBe(false);
    expect(zero.details.join(" ")).toMatch(/cero/);
  });
  test("compara sumas de fracciones de forma exacta, también con enteros grandes", () => {
    for (let a = -3; a <= 3; a++) for (let b = 1; b <= 4; b++) for (let c = -2; c <= 2; c++) for (let d = 1; d <= 4; d++) {
      expect(checkManualWork("add", [`${a}/${b}`, `${c}/${d}`], "", [], rows, `${a * d + c * b}/${b * d}`).ok).toBe(true);
    }
    expect(checkManualWork("add", ["999999999999999999999999999999", "1"], "", [], rows, "1000000000000000000000000000000").ok).toBe(false); // La entrada tiene un límite de 30 cifras.
  });
  test("comprueba una tabla completa con más de tres números", () => {
    const table = [
      { divisor: "2", cells: ["3", "5", "15", "21"] },
      { divisor: "3", cells: ["1", "5", "5", "7"] },
      { divisor: "5", cells: ["1", "1", "1", "7"] },
      { divisor: "7", cells: ["1", "1", "1", "1"] },
    ];
    expect(checkManualWork("mcm", ["6", "10", "15", "21"], "", [], table, "210").ok).toBe(true);
  });
  test("revisa factores con números negativos sin perder el signo", () => {
    const table = [{ divisor: "3", cells: ["-2", "-3"] }];
    expect(checkManualWork("mcd", ["−6", "-9"], "", [], table, "3").ok).toBe(true);
    table[0].cells[1] = "3";
    expect(checkManualWork("mcd", ["−6", "-9"], "", [], table, "3").details.join(" ")).toMatch(/fila 1/);
  });
  test("localiza cifras erróneas y acepta resultados con signo escritos por el alumno", () => {
    const spec = { op: "add" as const, a: 12, b: 3 };
    const draft = { digits: ["6", "1", ""], commaAt: null, notes: [] };
    expect(checkWrittenWork(spec, "16", draft, "prestamo")).toMatchObject({ ok: false, wrongColumn: 0 });
    const partial = { digits: ["5", "", ""], commaAt: null, notes: [] };
    expect(checkWrittenWork(spec, "5", partial, "prestamo").message).toMatch(/cifras que faltan/);
    expect(checkSignedWork({ op: "subtract", a: "3", b: "4" }, "-1", "").ok).toBe(true);
    expect(checkSignedWork({ op: "subtract", a: "3", b: "4" }, "1", "").ok).toBe(false);
  });
  test("comprueba productos parciales sin aceptar como correcto un borrador erróneo", () => {
    const spec = { op: "multiply" as const, a: 325, b: 24 };
    const draft = { digits: ["0", "0", "8", "7"], commaAt: null, notes: [], scratch: [["0", "0", "3", "1"], ["0", "0", "5", "6"]] };
    expect(checkWrittenWork(spec, "7800", draft, "prestamo").ok).toBe(true);
    draft.scratch[0][2] = "4";
    expect(checkWrittenWork(spec, "7800", draft, "prestamo").message).toMatch(/fila 1/);
  });
  test("acepta una suma decimal bien alineada y verifica un paso firmado", () => {
    const decimal = { op: "add" as const, a: 0.5, b: 0.25 };
    expect(checkWrittenWork(decimal, "0,75", { digits: ["5", "7", "0"], commaAt: 2, notes: [] }, "prestamo").ok).toBe(true);
    const signed = { op: "subtract" as const, a: "3", b: "4" };
    expect(checkSignedWork(signed, "-1", "3 − 4 = −1").ok).toBe(true);
    expect(checkSignedWork(signed, "-1", "3 − 4 = 1").message).toMatch(/paso/);
  });
  test("acepta MCD de números primos entre sí sin filas de factores", () => {
    expect(checkManualWork("mcd", ["8", "15"], "", [], rows, "1").ok).toBe(true);
  });
  test("revisa las filas de la división y no da por comprobado un procedimiento ausente", () => {
    const spec = { op: "divide" as const, a: 17, b: 5 };
    expect(checkWrittenWork(spec, "", undefined, "prestamo").message).toMatch(/fila/);
    expect(checkWrittenWork(spec, "L3;15,2", undefined, "prestamo").ok).toBe(true);
    expect(checkWrittenWork(spec, "L3;14,2", undefined, "prestamo").ok).toBe(false);
  });
});
