import { beforeEach, describe, expect, test } from "vitest";
import {
  arcadeMedal,
  effectiveLevel,
  LEVEL_FEATURES,
  levelBoost,
  levelPerks,
  MAX_LEVEL,
  raiseArcadeLevel,
  readArcadeCalm,
  readArcadeLevel,
  resetArcadeLevelCache,
  setArcadeCalm,
  setArcadeLevel,
} from "./arcadeLevel";
import { PRACTICE_GAMES } from "./lessonExercise";

describe("nivel arcade", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetArcadeLevelCache();
  });

  test("empieza en 1, sube de uno en uno, se guarda y no pasa del máximo", () => {
    expect(readArcadeLevel("snake")).toBe(1);
    expect(raiseArcadeLevel("snake")).toBe(2);
    expect(window.localStorage.getItem("numerario:arcade-level:snake")).toBe("2");
    resetArcadeLevelCache();
    expect(readArcadeLevel("snake")).toBe(2);
    setArcadeLevel("snake", 99);
    expect(readArcadeLevel("snake")).toBe(MAX_LEVEL);
    expect(raiseArcadeLevel("snake")).toBe(MAX_LEVEL);
    expect(readArcadeLevel("runner")).toBe(1);
  });

  test("valores guardados inválidos vuelven al nivel 1", () => {
    window.localStorage.setItem("numerario:arcade-level:topos", "trampa");
    expect(readArcadeLevel("topos")).toBe(1);
  });

  test("el modo tranquilo juega en nivel 1 y no sube el nivel guardado", () => {
    setArcadeLevel("invaders", 5);
    setArcadeCalm(true);
    expect(readArcadeCalm()).toBe(true);
    expect(effectiveLevel(readArcadeLevel("invaders"), true)).toBe(1);
    expect(raiseArcadeLevel("invaders")).toBe(5);
    expect(levelBoost(effectiveLevel(5, false))).toBe(4);
    expect(levelBoost(1)).toBe(0);
  });

  test("cada juego tiene novedades ordenadas desde el nivel 2", () => {
    for (const game of PRACTICE_GAMES) {
      const levels = LEVEL_FEATURES[game].map(([from]) => from);
      expect(levels[0]).toBeGreaterThanOrEqual(2);
      expect([...levels].sort((a, b) => a - b)).toEqual(levels);
      expect(levelPerks(game, 1).unlocked).toEqual([]);
      expect(levelPerks(game, MAX_LEVEL).next).toBeNull();
    }
    expect(levelPerks("numberpac", 4).unlocked).toContain("Un segundo fantasma que embosca");
  });

  test("las medallas piden más puntos a más nivel", () => {
    expect(arcadeMedal(500, 1)).toBe(1);
    expect(arcadeMedal(800, 1)).toBe(2);
    expect(arcadeMedal(1200, 1)).toBe(3);
    expect(arcadeMedal(1200, 6)).toBe(1);
    expect(arcadeMedal(1400, 6)).toBe(2);
  });
});
