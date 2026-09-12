import { describe, expect, test } from "vitest";
import { choiceSet } from "./problem";

/**
 * Fase 36 (docs/plan-minijuegos-retro.md) — `choiceSet` gana un tercer
 * parámetro `count` (default 3) para que los minijuegos arcade puedan pedir
 * más candidatos simultáneos en pantalla. Test de regresión explícito: sin
 * `count`, el comportamiento es idéntico al de antes del cambio.
 */
describe("choiceSet", () => {
  test("sin count, devuelve 3 valores (comportamiento de siempre)", () => {
    const options = choiceSet(10, 3);
    expect(options).toHaveLength(3);
  });

  test("incluye siempre la respuesta correcta", () => {
    const options = choiceSet(10, 3);
    expect(options).toContain(10);
  });

  test("nunca devuelve negativos", () => {
    const options = choiceSet(1, 5);
    expect(options.every((n) => n >= 0)).toBe(true);
  });

  test("con count explícito, devuelve exactamente esa cantidad de valores únicos", () => {
    const options = choiceSet(20, 5, 6);
    expect(options).toHaveLength(6);
    expect(new Set(options).size).toBe(6);
    expect(options).toContain(20);
  });
});
