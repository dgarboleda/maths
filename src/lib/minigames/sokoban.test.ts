import { expect, test } from "vitest";
import { SOKOBAN_SOLUTIONS } from "@/test/sokobanSolutions";
import { WAREHOUSES, deliverySquares, floorAt, initialWarehouse, moveWarehouse, sameCell, type Direction } from "./sokoban";

test.each(WAREHOUSES)("$name: las cinco cajas pueden entregarse, con giros y sin respuestas forzadas", (level) => {
  const initial = initialWarehouse(level, [10, 20, 30, 40, 50]);
  expect(initial.boxes).toHaveLength(5);
  const squares = deliverySquares(level);
  for (const box of initial.boxes) expect(squares.has(`${box.x},${box.y}`)).toBe(true);
  for (let target = 0; target < 5; target++) {
    let state = initial;
    const route = SOKOBAN_SOLUTIONS[level.id][target];
    const pushDirections = new Set<Direction>();
    for (let i = 0; i < route.length; i++) {
      const direction = route[i] as Direction;
      const result = moveWarehouse(level, state, direction);
      expect(result.blocked, `${level.id}, caja ${target}, paso ${i}`).toBeUndefined();
      if (result.state.pushes > state.pushes) pushDirections.add(direction);
      state = result.state;
      if (i < route.length - 1) expect(result.delivered).toBeUndefined();
      else expect(result.delivered).toMatchObject({ id: target, value: initial.boxes[target].value });
      expect(state.boxes.every((box) => floorAt(level, box))).toBe(true);
      expect(state.boxes.some((box) => sameCell(box, state.player))).toBe(false);
      expect(new Set(state.boxes.map((box) => `${box.x},${box.y}`)).size).toBe(5);
    }
    expect(pushDirections.size).toBeGreaterThanOrEqual(2);
    expect(initial.moves).toBe(0); // los estados anteriores no se mutan
  }
});

test("una pared y una segunda caja impiden avanzar; retroceder no tira de la caja", () => {
  const level = WAREHOUSES[0];
  const initial = initialWarehouse(level, [0, 1, 2, 3, 4]);
  expect(moveWarehouse(level, initial, "D").state).toBe(initial);
  const left = moveWarehouse(level, initial, "L").state;
  const pushed = moveWarehouse(level, left, "U").state;
  const blocked = moveWarehouse(level, pushed, "U");
  expect(blocked.state).toBe(pushed);
  expect(blocked.blocked).toMatch(/dos cajas/);
  const back = moveWarehouse(level, pushed, "D").state;
  expect(back.boxes).toEqual(pushed.boxes);
  expect(back.pushes).toBe(1);
});

test("caminar sobre la meta o empujar hacia otra casilla no entrega una respuesta", () => {
  const level = WAREHOUSES[0];
  const initial = initialWarehouse(level, [0, 1, 2, 3, 4]);
  expect(moveWarehouse(level, { ...initial, player: { x: 1, y: 2 } }, "U").delivered).toBeUndefined();
  const state = { ...initial, player: { x: 4, y: 3 }, boxes: [{ id: 0, value: 77, x: 4, y: 2 }] };
  expect(moveWarehouse(level, state, "U").delivered).toBeUndefined();
});

test("las casillas sin salida se detectan sin consultar el valor de la caja", () => {
  const squares = deliverySquares(WAREHOUSES[0]);
  expect(squares.has("1,1")).toBe(true);
  expect(squares.has("1,6")).toBe(true);
  expect(squares.has("1,7")).toBe(false);
  expect(squares.has("5,7")).toBe(false);
});
