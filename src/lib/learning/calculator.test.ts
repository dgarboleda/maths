import { describe, expect, test } from "vitest";
import { calculatorEntry, calculatorSpec, decimalInput, entryText } from "./calculator";

describe("Calculadora: lógica", () => {
  test("lee números con coma o punto y pone arriba el factor más largo", () => {
    expect(decimalInput("3.5a,2")).toBe("3,52");
    expect(calculatorSpec("multiply", "4", "347")).toEqual({ spec: { op: "multiply", a: 347, b: 4, scaleA: 0, scaleB: 0 } });
    expect(calculatorSpec("divide", "3", "4")).toEqual({ spec: { op: "divide", a: 3, b: 4 } });
    expect(calculatorSpec("divide", "3", "4", true)).toEqual({ spec: { op: "divide", a: 3, b: 4, places: 2 } });
    expect(calculatorSpec("subtract", "3", "4")).toEqual({ problem: expect.stringMatching(/no puede ser menor/) });
    expect(calculatorSpec("divide", "3", "0,125")).toEqual({ problem: expect.stringMatching(/dos decimales/) });
  });

  test("cada cuenta terminada se describe con lo que escribió el alumno", () => {
    const sum = calculatorSpec("add", "12", "3");
    if (!("spec" in sum)) throw new Error();
    expect(entryText(calculatorEntry("add", "12", "3", sum.spec, "15"))).toBe("12 + 3 = 15");
    const division = calculatorSpec("divide", "17", "5");
    if (!("spec" in division)) throw new Error();
    expect(entryText(calculatorEntry("divide", "17", "5", division.spec, "L3;15,2"))).toBe("17 ÷ 5 = 3 (resto 2)");
    const recurring = calculatorSpec("divide", "10", "3", true);
    if (!("spec" in recurring)) throw new Error();
    expect(entryText(calculatorEntry("divide", "10", "3", recurring.spec, "L3,333;1,10,10,1"))).toBe("10 ÷ 3 ≈ 3,333");
  });
});
