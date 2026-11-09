import { describe, expect, test } from "vitest";
import { checkCommonDenominator, checkManualWork, checkReciprocals } from "./calculatorCheck";
import { checkSignedWork, checkWrittenWork } from "./calculatorWrittenCheck";
import { divisionRowVariants } from "./core";

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
  test("ignora un paso estructurado vacío pero señala uno incompleto", () => {
    const empty = { operation: "", left: "", right: "", operator: "+", result: "" };
    expect(checkManualWork("add", ["1/2", "1/3"], "", [empty], rows, "5/6").ok).toBe(true);
    expect(checkManualWork("add", ["1/2", "1/3"], "", [{ ...empty, left: "1/2" }], rows, "5/6").details.join(" ")).toMatch(/Completa el paso/);
  });
  test("comprueba los inversos escritos sin imponer una representación única", () => {
    expect(checkReciprocals(["1/2", "3/4"], ["4/3"])).toBeNull();
    expect(checkReciprocals(["1/2", "3/4"], ["8/6"])).toBeNull();
    expect(checkReciprocals(["1/2", "-3/4"], ["4/-3"])).toBeNull();
    expect(checkReciprocals(["1", "2"], ["1/2"])).toBeNull();
    expect(checkReciprocals(["1", "0,5"], ["2"])).toBeNull();
    expect(checkReciprocals(["1/2", "3/4"], ["3/4"])).toMatch(/divisor 1/);
    expect(checkReciprocals(["1", "2", "3"], ["1/2", ""])).toMatch(/Completa/);
    expect(checkManualWork("divide", ["1/2", "3/4", "5/6"], "", [], rows, "4/5", [], ["4/3", "6/5"]).ok).toBe(true);
    expect(checkReciprocals(["1", "2"], ["1/0"])).toMatch(/formato/);
    const correct = checkManualWork("divide", ["1/2", "3/4"], "", [], rows, "2/3", [], ["4/3"]);
    expect(correct.ok).toBe(true);
    expect(correct.details.join(" ")).toMatch(/inversos escritos son correctos/);
    const wrong = checkManualWork("divide", ["1/2", "3/4"], "", [], rows, "2/3", [], ["3/4"]);
    expect(wrong.ok).toBe(false);
    expect(wrong.details.join(" ")).toMatch(/Revisa el inverso/);
    expect(checkManualWork("divide", ["1/2", "0"], "", [], rows, "0", [], ["1/0"]).message).toMatch(/dividir entre 0/);
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
  test("admite cuatro números y comprueba el MCM con cero", () => {
    const four = [{ divisor: "2", cells: ["1", "1", "1", "1"] }];
    expect(checkManualWork("mcd", ["2", "2", "2", "2"], "", [], four, "2").ok).toBe(true);
    const zero = checkManualWork("mcm", ["0", "4"], "", [], [{ divisor: "2", cells: ["0", "2"] }], "0");
    expect(zero.ok).toBe(true);
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
    expect(checkWrittenWork(spec, "7800", draft, "prestamo").message).toMatch(/productos parciales/);
  });
  test("no acepta dos productos parciales que usan la misma cifra del factor", () => {
    const spec = { op: "multiply" as const, a: 325, b: 24 };
    const draft = { digits: ["0", "0", "8", "7"], commaAt: null, notes: [], scratch: [["0", "0", "3", "1"], ["0", "0", "3", "1"]] };
    expect(checkWrittenWork(spec, "7800", draft, "prestamo").ok).toBe(false);
    const repeated = { ...draft, scratch: [["0", "5", "6"], ["0", "0", "5", "6"]] };
    expect(checkWrittenWork({ op: "multiply", a: 325, b: 22 }, "7150", { ...repeated, digits: ["0", "5", "1", "7"] }, "prestamo").ok).toBe(true);
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
  test("comprueba resultados y pasos de las operaciones manuales", () => {
    const examples = [
      ["subtract", ["5/6", "1/3"], "1/2", "1/3"],
      ["multiply", ["-2/3", "9/4"], "-3/2", "3/2"],
      ["divide", ["3/4", "1/2"], "3/2", "3/8"],
      ["mcm", ["4", "6"], "12", "24"],
      ["mcd", ["8", "15"], "1", "2"],
    ] as const;
    for (const [op, values, correct, wrong] of examples) {
      const correctReport = checkManualWork(op, [...values], "", [], rows, correct);
      expect(correctReport.message).not.toMatch(/Revisa el resultado final/);
      expect(checkManualWork(op, [...values], "", [], rows, wrong).message).toMatch(/Revisa el resultado final/);
    }
    expect(checkManualWork("expression", [], "2 + 3 × 4", [], rows, "14").ok).toBe(true);
    expect(checkManualWork("expression", [], "2 + 3 × 4", [], rows, "20").ok).toBe(false);
  });
  test("explica la limitación de decimales periódicos en divisiones con signo", () => {
    const division = { op: "divide" as const, a: "-1", b: "3" };
    expect(checkSignedWork(division, "-0,333", "").message).toMatch(/periódicos/);
    expect(checkSignedWork(division, "0,333", "").message).toMatch(/signos/);
    expect(checkSignedWork({ ...division, b: "2" }, "-0,4", "").message).toMatch(/Revisa el resultado/);
    expect(checkSignedWork({ ...division, b: "2" }, "-0,5", "").ok).toBe(true);
  });
  test("distingue una división decimal aproximada de una exacta", () => {
    const recurring = { op: "divide" as const, a: 10, b: 3, places: 3 };
    const work = `L3,333;${divisionRowVariants(recurring)[0].map((row) => row.value).join(",")}`;
    expect(checkWrittenWork(recurring, work, undefined, "prestamo")).toMatchObject({ ok: true, message: expect.stringMatching(/aproximado/) });
  });
  test("revisa llevadas y préstamos escritos sin exigir anotaciones", () => {
    const sum = { op: "add" as const, a: 58, b: 27 };
    const draft = { digits: ["5", "8"], commaAt: null, notes: ["", "1"] };
    expect(checkWrittenWork(sum, "85", draft, "prestamo").ok).toBe(true);
    expect(checkWrittenWork(sum, "85", { ...draft, notes: ["", "2"] }, "prestamo").message).toMatch(/llevada/);
    expect(checkWrittenWork(sum, "85", { ...draft, notes: [] }, "prestamo").ok).toBe(true);
    const subtraction = { op: "subtract" as const, a: 100, b: 1 };
    const borrowed = { digits: ["9", "9", ""], commaAt: null, notes: ["10", "9", "0"] };
    expect(checkWrittenWork(subtraction, "99", borrowed, "prestamo").ok).toBe(true);
    expect(checkWrittenWork(subtraction, "99", { ...borrowed, notes: ["10", "8", "0"] }, "prestamo").message).toMatch(/préstamo/);
    const compensation = { op: "subtract" as const, a: 32, b: 17 };
    const compensated = { digits: ["5", "1"], commaAt: null, notes: ["12", "1"] };
    expect(checkWrittenWork(compensation, "15", compensated, "compensacion").ok).toBe(true);
    expect(checkWrittenWork(compensation, "15", { ...compensated, notes: ["8", "1"] }, "compensacion").message).toMatch(/compensación/);
  });
  test("detecta filas de división desplazadas y acepta filas alineadas", () => {
    const spec = { op: "divide" as const, a: 17, b: 5 };
    const draft = { quotient: ["3"], comma: null, rows: [["1", "5"], ["", "2"]] };
    expect(checkWrittenWork(spec, "L3;15,2", draft, "prestamo").ok).toBe(true);
    expect(checkWrittenWork(spec, "L3;15,2", { ...draft, rows: [["1", "5"], ["2", ""]] }, "prestamo").message).toMatch(/alineación/);
  });
  test("comprueba cero en MCM y MCD y detecta filas equivocadas", () => {
    expect(checkManualWork("mcm", ["0", "4"], "", [], rows, "0").ok).toBe(true);
    expect(checkManualWork("mcd", ["0", "4"], "", [], [{ divisor: "2", cells: ["0", "2"] }, { divisor: "2", cells: ["0", "1"] }], "4").ok).toBe(true);
    expect(checkManualWork("mcm", ["0", "4"], "", [], [{ divisor: "2", cells: ["0", "3"] }], "0").ok).toBe(false);
    expect(checkManualWork("mcd", ["0", "0"], "", [], rows, "0").ok).toBe(false);
  });
  test("señala vínculos que no puede reconocer sin rechazar pasos válidos", () => {
    const related = [{ operation: "1/2 + 1/3", result: "5/6" }, { operation: "5/6 * 1", result: "5/6" }];
    expect(checkManualWork("add", ["1/2", "1/3"], "", related, rows, "5/6").details.join(" ")).not.toMatch(/No pude relacionar/);
    const unrelated = [{ operation: "7 * 8", result: "56" }];
    const report = checkManualWork("add", ["1/2", "1/3"], "", unrelated, rows, "5/6");
    expect(report.ok).toBe(true);
    expect(report.details.join(" ")).toMatch(/No pude relacionar/);
  });
  test("revisa las filas de la división y no da por comprobado un procedimiento ausente", () => {
    const spec = { op: "divide" as const, a: 17, b: 5 };
    expect(checkWrittenWork(spec, "", undefined, "prestamo").message).toMatch(/fila/);
    expect(checkWrittenWork(spec, "L3;15,2", undefined, "prestamo")).toMatchObject({ ok: true, details: [expect.stringMatching(/no se pudo comprobar la alineación/)] });
    expect(checkWrittenWork(spec, "L3;14,2", undefined, "prestamo").ok).toBe(false);
  });
});
