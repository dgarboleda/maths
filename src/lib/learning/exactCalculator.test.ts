import { describe, expect, test } from "vitest";
import { calculateExact, calculateExpression, calculateManyExact } from "./exactCalculator";

describe("calculadora exacta", () => {
  test.each([
    ["add", "1/2", "1/3", "5/6"],
    ["subtract", "1/3", "2/3", "-1/3"],
    ["multiply", "-3/4", "8/9", "-2/3"],
    ["divide", "3/4", "-2/5", "-15/8"],
    ["add", "0,1", "0,2", "3/10"],
    ["simplify", "-12/-18", "", "2/3"],
    ["simplify", "0/9", "", "0"],
    ["mcm", "12", "18", "36"],
    ["mcd", "-12", "18", "6"],
    ["mcm", "0", "9", "0"],
    ["mcm", "0", "0", "0"],
    ["multiply", "9999999,999999", "9999999,999999", "99999999999980000000000001/1000000000000"],
  ] as const)("%s con %s y %s da %s", (op, a, b, expected) => {
    const result = calculateExact(op, a, b);
    expect(result).toMatchObject({ value: expected });
    if ("steps" in result) expect(result.steps.length).toBeGreaterThan(0);
  });
  test("rechaza entradas inválidas y no confunde el cero con un resultado vacío", () => {
    expect(calculateExact("add", "1/0", "2")).toHaveProperty("problem");
    expect(calculateExact("divide", "1/2", "0")).toHaveProperty("problem");
    expect(calculateExact("mcd", "0", "0")).toHaveProperty("problem");
    expect(calculateExact("mcm", "3/2", "4")).toHaveProperty("problem");
    expect(calculateExact("add", "1/2abc", "1")).toHaveProperty("problem");
    expect(calculateExact("add", "0", "0")).toMatchObject({ value: "0" });
    expect(calculateExact("add", "99999980000001", "1")).toMatchObject({ value: "99999980000002" });
    expect(calculateExact("add", "1".repeat(31), "1")).toHaveProperty("problem");
  });
});

describe("varios números y expresiones", () => {
  test.each([
    ["add", ["1/2", "1/3", "1/6"], "1"],
    ["subtract", ["10", "3", "2"], "5"],
    ["divide", ["24", "3", "2"], "4"],
    ["multiply", ["-1/2", "3", "2/3"], "-1"],
    ["mcm", ["12", "18", "20"], "180"],
    ["mcd", ["0", "0", "18"], "18"],
    ["mcm", ["0", "0", "18"], "0"],
  ] as const)("%s con %j da %s", (op, values, value) => {
    expect(calculateManyExact(op, [...values])).toMatchObject({ value });
  });
  test("MCD y MCM de tres números coinciden con sus definiciones", () => {
    const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
    const lcm = (a: number, b: number) => a / gcd(a, b) * b;
    for (let a = 1; a <= 8; a++) for (let b = 1; b <= 8; b++) for (let c = 1; c <= 8; c++) {
      const values = [a, b, c].map(String);
      expect(calculateManyExact("mcd", values)).toMatchObject({ value: String(gcd(gcd(a, b), c)) });
      expect(calculateManyExact("mcm", values)).toMatchObject({ value: String(lcm(lcm(a, b), c)) });
    }
  });
  test("comprueba cada entrada y evita dividir entre cero", () => {
    expect(calculateManyExact("add", ["1/2", "3", "1/0"])).toHaveProperty("problem", expect.stringMatching(/número 3/));
    expect(calculateManyExact("divide", ["12", "2", "0"])).toHaveProperty("problem", expect.stringMatching(/número 3/));
    expect(calculateManyExact("mcm", ["4", "6", "3/2"])).toHaveProperty("problem", expect.stringMatching(/enteros/));
    expect(calculateManyExact("mcd", ["0", "0", "0"])).toHaveProperty("problem");
    expect(calculateManyExact("add", Array(9).fill("1"))).toHaveProperty("problem");
  });
  test.each([
    ["2 + 3 × 4", "14"],
    ["(2 + 3) × 4", "20"],
    ["(1/2 + 1/3) × 3", "5/2"],
    ["10 - 3 - 2", "5"],
    ["12 ÷ 3 ÷ 2", "2"],
    ["-(-2 + 1/2)", "3/2"],
    ["0,1 + 0,2 + 0,3", "3/5"],
  ])("resuelve %s = %s", (expression, value) => {
    const result = calculateExpression(expression);
    expect(result).toMatchObject({ value });
    if ("steps" in result) expect(result.steps.length).toBeGreaterThan(0);
  });
  test("rechaza expresiones incompletas, código y divisiones por cero", () => {
    for (const input of ["", "2 +", "(1 + 2", "2(3)", "1 / (2 - 2)", "1 + alert(1)", "2 ** 3", "(".repeat(40) + "1" + ")".repeat(40)])
      expect(calculateExpression(input), input).toHaveProperty("problem");
  });
});
