import { expect, test } from "vitest";
import { MAZE_SIZE, mazeChoiceCells, mazeKey, mazeNeighbors, mazeShieldCell, mazeWall, nextMazeGhost, reachableMaze } from "./maze";

const floor = Array.from({ length: MAZE_SIZE ** 2 }, (_, index) => ({ x: index % MAZE_SIZE, y: Math.floor(index / MAZE_SIZE) })).filter((cell) => !mazeWall(cell));

test("el escudo extra no exige cruzar una respuesta ni al fantasma", () => {
  const player = { x: 0, y: 0 }, ghost = { x: 4, y: 4 }, answers = [{ x: 2, y: 0 }, { x: 0, y: 4 }];
  const shield = mazeShieldCell(player, ghost, answers, floor);
  expect(shield).toBeDefined();
  expect(reachableMaze(player, [...answers, ghost]).has(mazeKey(shield!))).toBe(true);
  expect([player, ghost, ...answers].map(mazeKey)).not.toContain(mazeKey(shield!));
  expect(mazeShieldCell(player, ghost, answers, [ghost, ...answers, player])).toBeUndefined();
});

test("todas las posiciones de salida permiten cinco opciones alcanzables sin responder otra antes", () => {
  for (const player of floor) for (const ghost of floor) {
    if (mazeKey(player) === mazeKey(ghost)) continue;
    const free = floor.filter((cell) => mazeKey(cell) !== "0,0" && mazeKey(cell) !== mazeKey(player) && mazeKey(cell) !== mazeKey(ghost));
    // Orden normal y contrario: el barajado no decide si existe solución.
    for (const order of [free, [...free].reverse()]) {
      const choices = mazeChoiceCells(player, order, 5);
      expect(choices).toHaveLength(5);
      expect(new Set(choices.map(mazeKey)).size).toBe(5);
      expect(choices.every((cell) => free.includes(cell))).toBe(true);
      for (const target of choices) {
        const blocked = new Set(choices.filter((cell) => cell !== target).map(mazeKey));
        const seen = new Set([mazeKey(player)]);
        const pending = [player];
        while (pending.length) {
          const cell = pending.shift()!;
          for (const next of mazeNeighbors(cell)) if (!seen.has(mazeKey(next)) && !blocked.has(mazeKey(next))) {
            seen.add(mazeKey(next));
            pending.push(next);
          }
        }
        expect(seen.has(mazeKey(target))).toBe(true);
      }
    }
  }
});

test("el fantasma elige un paso del pasillo hacia el jugador o huye del escudo", () => {
  expect(nextMazeGhost({ x: 2, y: 2 }, { x: 0, y: 0 }, false)).toEqual({ x: 1, y: 2 });
  expect(nextMazeGhost({ x: 2, y: 2 }, { x: 0, y: 0 }, true)).toEqual({ x: 3, y: 2 });
  for (const ghost of floor) for (const player of floor) for (const shield of [false, true]) {
    const next = nextMazeGhost(ghost, player, shield);
    expect(mazeWall(next)).toBe(false);
    expect(Math.abs(next.x - ghost.x) + Math.abs(next.y - ghost.y)).toBe(1);
  }
});
