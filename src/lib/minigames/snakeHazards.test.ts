import { describe, expect, test } from "vitest";
import { placeRocks, reachable, rockCount, type GridCell } from "./snakeHazards";

const SIZE = 8;
const all = (): GridCell[] => Array.from({ length: SIZE * SIZE }, (_, i) => ({ x: i % SIZE, y: Math.floor(i / SIZE) }));
const key = (c: GridCell) => `${c.x},${c.y}`;

describe("rocas de Serpiente", () => {
  test("no hay rocas en el nivel 1 y nunca más de seis", () => {
    expect(rockCount(1)).toBe(0);
    expect(rockCount(2)).toBe(1);
    expect(rockCount(5)).toBe(5);
    expect(rockCount(10)).toBe(6);
  });

  test("ninguna combinación cierra el camino a las opciones ni toca la cabeza", () => {
    const snake = [{ x: 3, y: 4 }, { x: 2, y: 4 }, { x: 1, y: 4 }];
    const direction = { x: 1, y: 0 };
    for (let seed = 0; seed < 200; seed++) {
      // Orden pseudoaleatorio estable de las casillas libres.
      const free = all()
        .filter((c) => !snake.some((s) => s.x === c.x && s.y === c.y))
        .map((c, i) => ({ c, r: Math.sin(seed * 97 + i * 13) }))
        .sort((a, b) => a.r - b.r)
        .map(({ c }) => c);
      const targets = free.slice(0, 6);
      const rocks = placeRocks(SIZE, snake, direction, free.slice(6), targets, 6);
      expect(rocks.length).toBeLessThanOrEqual(6);
      const blocked = new Set([...snake.slice(1), ...rocks].map(key));
      const open = reachable(SIZE, snake[0], blocked);
      for (const t of targets) expect(open.has(key(t))).toBe(true);
      for (const r of rocks) {
        expect(Math.abs(r.x - 3) + Math.abs(r.y - 4)).toBeGreaterThan(1);
        expect([key({ x: 4, y: 4 }), key({ x: 5, y: 4 })]).not.toContain(key(r));
      }
    }
  });
});
