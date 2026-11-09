import { describe, expect, test } from "vitest";
import { validManualExpression, validManualNumber, validateManualSetup } from "./exactCalculator";

describe("formato de la hoja manual", () => {
  test.each(["3", "-1/2", "0,25", ".5", "12 / 3"])("acepta %s", (value) => expect(validManualNumber(value)).toBe(true));
  test.each(["", "1/0", "1/00", "1/2abc", "1/2/3"])("rechaza %s", (value) => expect(validManualNumber(value)).toBe(false));
  test("limita MCM y MCD a enteros", () => {
    expect(validateManualSetup("mcm", ["12", "16", "24"], "")).toBeNull();
    expect(validateManualSetup("mcd", ["1/2", "3"], "")).toMatch(/entero/);
    expect(validateManualSetup("add", Array(9).fill("1"), "")).toMatch(/8/);
  });
  test.each(["(1/2 + 1/3) × 3", "-2 + (3 ÷ 4)"])("admite la expresión %s", (value) => expect(validManualExpression(value)).toBe(true));
  test.each(["(1+2", "1 +", "2(3)", "1 + x"])("rechaza la expresión incompleta %s", (value) => expect(validManualExpression(value)).toBe(false));
});
