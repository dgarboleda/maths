import { describe, expect, test } from "vitest";
import { scaleWithWave, waveIndex } from "./difficultyCurve";

describe("waveIndex", () => {
  test("antes de completar la primera tanda, oleada 0", () => {
    expect(waveIndex(0, 3)).toBe(0);
    expect(waveIndex(2, 3)).toBe(0);
  });

  test("cada perWave aciertos sube una oleada", () => {
    expect(waveIndex(3, 3)).toBe(1);
    expect(waveIndex(6, 3)).toBe(2);
    expect(waveIndex(8, 3)).toBe(2);
  });

  test("correctCount negativo (defensivo) no da oleada negativa", () => {
    expect(waveIndex(-5, 3)).toBe(0);
  });

  test("perWave 0 o negativo no revienta, devuelve 0", () => {
    expect(waveIndex(10, 0)).toBe(0);
    expect(waveIndex(10, -1)).toBe(0);
  });
});

describe("scaleWithWave", () => {
  test("oleada 0 devuelve el valor base", () => {
    expect(scaleWithWave(450, -30, 0, 180)).toBe(450);
  });

  test("step negativo baja el valor por oleada sin cruzar el piso (max)", () => {
    expect(scaleWithWave(450, -30, 1, 180)).toBe(420);
    expect(scaleWithWave(450, -30, 20, 180)).toBe(180); // se agotaría por debajo del piso
  });

  test("step positivo sube el valor por oleada sin cruzar el techo (max)", () => {
    expect(scaleWithWave(3, 1, 1, 7)).toBe(4);
    expect(scaleWithWave(3, 1, 20, 7)).toBe(7);
  });

  test("oleada negativa (defensivo) se trata como oleada 0", () => {
    expect(scaleWithWave(450, -30, -5, 180)).toBe(450);
  });
});
