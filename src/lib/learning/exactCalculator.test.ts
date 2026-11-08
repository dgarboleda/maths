import { describe, expect, test } from "vitest";
import { calculateExact } from "./exactCalculator";

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
