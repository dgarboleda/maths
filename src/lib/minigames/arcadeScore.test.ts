import { beforeEach, describe, expect, test } from "vitest";
import {
  comboMultiplier,
  formatScore,
  pointsFor,
  readArcadeBest,
  resetArcadeBestCache,
  saveArcadeBest,
  subscribeArcadeBest,
} from "./arcadeScore";

describe("puntuación arcade", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetArcadeBestCache();
  });

  test("el combo multiplica por tramos y tiene techo", () => {
    expect([0, 2, 3, 5, 6, 9, 10, 50].map(comboMultiplier)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
    expect(pointsFor(50, 0)).toBe(50);
    expect(pointsFor(50, 4)).toBe(100);
    expect(pointsFor(-10, 12)).toBe(0);
  });

  test("el récord solo se guarda si mejora y avisa a los suscriptores", () => {
    let calls = 0;
    const off = subscribeArcadeBest(() => calls++);
    expect(readArcadeBest("snake")).toBeNull();
    expect(saveArcadeBest("snake", 0)).toBe(false);
    expect(saveArcadeBest("snake", 320)).toBe(true);
    expect(saveArcadeBest("snake", 200)).toBe(false);
    expect(saveArcadeBest("snake", 320)).toBe(false);
    expect(readArcadeBest("snake")).toBe(320);
    expect(readArcadeBest("runner")).toBeNull();
    expect(window.localStorage.getItem("numerario:arcade:snake")).toBe("320");
    expect(calls).toBe(1);
    off();
  });

  test("ignora valores guardados que no son un récord válido", () => {
    window.localStorage.setItem("numerario:arcade:topos", "trampa");
    expect(readArcadeBest("topos")).toBeNull();
  });

  test("el marcador usa cinco cifras", () => {
    expect(formatScore(0)).toBe("00000");
    expect(formatScore(1250.7)).toBe("01250");
    expect(formatScore(-3)).toBe("00000");
  });
});
