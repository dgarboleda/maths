import { describe, expect, test } from "vitest";
import { hasMath, parseMath } from "./parseMath";

const frac = (num: unknown[], den: unknown[]) => ({ kind: "frac", num, den });
const sqrt = (body: unknown[]) => ({ kind: "sqrt", body });

describe("parseMath", () => {
  test("fracciones numéricas, decimales y con letras", () => {
    expect(parseMath("3/4")).toEqual([frac(["3"], ["4"])]);
    expect(parseMath("Calcula 1/4 + 5/6.")).toEqual(["Calcula ", frac(["1"], ["4"]), " + ", frac(["5"], ["6"]), "."]);
    expect(parseMath("0,5/2")).toEqual([frac(["0,5"], ["2"])]);
    expect(parseMath("x/3 = 4")).toEqual([frac(["x"], ["3"]), " = 4"]);
    expect(parseMath("p/100")).toEqual([frac(["p"], ["100"])]);
    expect(parseMath("y₁/2")).toEqual([frac(["y₁"], ["2"])]);
  });

  test("huecos para completar y coeficientes", () => {
    expect(parseMath("2/3 = ?/9")).toEqual([frac(["2"], ["3"]), " = ", frac(["?"], ["9"])]);
    expect(parseMath("1/4 + __/12.")).toEqual([frac(["1"], ["4"]), " + ", frac(["__"], ["12"]), "."]);
    expect(parseMath("cada parte es 1/__.")).toEqual(["cada parte es ", frac(["1"], ["__"]), "."]);
    expect(parseMath("4x/4 = 12/4")).toEqual([frac(["4x"], ["4"]), " = ", frac(["12"], ["4"])]);
  });

  test("razones con palabras solo dentro de una fórmula", () => {
    expect(parseMath("sen α = opuesto/hipotenusa")).toEqual(["sen α = ", frac(["opuesto"], ["hipotenusa"])]);
    expect(parseMath("(final − inicial)/inicial × 100")).toEqual([frac(["final − inicial"], ["inicial"]), " × 100"]);
    expect(parseMath("La razón consumo/sensores es constante.").every((p) => typeof p === "string")).toBe(true);
    expect(parseMath("Cuesta 5 créditos/sensor.").every((p) => typeof p === "string")).toBe(true);
  });

  test("el signo menos queda fuera de la fracción", () => {
    expect(parseMath("−1/4")).toEqual(["−", frac(["1"], ["4"])]);
  });

  test("grupos entre paréntesis pierden los paréntesis al apilarse", () => {
    expect(parseMath("(1 × 2)/(2 × 2) = 2/4")).toEqual([frac(["1 × 2"], ["2 × 2"]), " = ", frac(["2"], ["4"])]);
    expect(parseMath("2/(2 + 3) = 2/5")).toEqual([frac(["2"], ["2 + 3"]), " = ", frac(["2"], ["5"])]);
    expect(parseMath("(a × c)/(b × d)")).toEqual([frac(["a × c"], ["b × d"])]);
  });

  test("la fórmula general: raíz dentro de una fracción", () => {
    expect(parseMath("x = (−b ± √(b² − 4ac))/(2a)")).toEqual([
      "x = ",
      frac(["−b ± ", sqrt(["b² − 4ac"])], ["2a"]),
    ]);
  });

  test("raíces de números, letras y grupos", () => {
    expect(parseMath("√225 = 15")).toEqual([sqrt(["225"]), " = 15"]);
    expect(parseMath("√(81 + 144) = √225")).toEqual([sqrt(["81 + 144"]), " = ", sqrt(["225"])]);
    expect(parseMath("√x")).toEqual([sqrt(["x"])]);
    expect(parseMath("√(9² + 12²).")).toEqual([sqrt(["9² + 12²"]), "."]);
  });

  test("exponentes con ^", () => {
    expect(parseMath("8 × 10^?.")).toEqual(["8 × ", { kind: "sup", base: ["10"], exp: "?" }, "."]);
    expect(parseMath("2^-1")).toEqual([{ kind: "sup", base: ["2"], exp: "-1" }]);
  });

  test.each([
    "Viaja a 60 km/h.",
    "Cuesta S/ 2000.",
    "Gotea 3 L/min.",
    "Consume 15 kWh/km.",
    "El 6/10/2026 hubo clase.",
    "y / x",
    "entrada/salida",
    "f(x)/2",
    "La razón 2:3",
    "Sin fórmulas.",
  ])("deja como texto: %s", (text) => {
    expect(parseMath(text).every((part) => typeof part === "string")).toBe(true);
    expect(hasMath(text)).toBe(false);
  });

  test("hasMath detecta fórmulas", () => {
    expect(hasMath("Calcula 2/3 ÷ 1/6.")).toBe(true);
    expect(hasMath("√49")).toBe(true);
  });
});
