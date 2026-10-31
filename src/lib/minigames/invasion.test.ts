import { expect, test } from "vitest";
import { advanceInvaders, initialInvaders, INVASION_BOTTOM } from "./invasion";

test("las alternativas aparecen en momentos distintos y pueden compartir pantalla", () => {
  const start = initialInvaders(5);
  expect(start.filter((y) => y >= 0)).toHaveLength(1);
  const next = advanceInvaders(start, 2_000, 900, 4);
  expect(next.positions.filter((y) => y >= 0).length).toBeGreaterThan(1);
  expect(new Set(next.positions).size).toBe(5);
  expect(next.hits).toEqual([]);
});

test("solo la alternativa que alcanza la columna de la nave choca; las demás se esquivan y reaparecen", () => {
  const { positions, hits, dodged } = advanceInvaders([INVASION_BOTTOM - 1, INVASION_BOTTOM - 1, 20], 200, 900, 1);
  expect(hits).toEqual([1]);
  expect(dodged).toEqual([0]);
  expect(positions[0]).toBeLessThan(0);
  expect(positions[1]).toBeLessThan(0);
  expect(positions[2]).toBeGreaterThan(20);
});
