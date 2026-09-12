import { describe, expect, test } from "vitest";
import { findHitBlock, hitsPaddle, rectsOverlap, stepBall } from "./breakoutPhysics";

describe("rectsOverlap", () => {
  test("dos rectángulos que se solapan devuelven true", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
  });

  test("dos rectángulos separados devuelven false", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 20, w: 10, h: 10 })).toBe(false);
  });

  test("rectángulos que solo se tocan en el borde no se consideran solapados", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
  });
});

describe("stepBall", () => {
  test("mueve la pelota según su velocidad y el tiempo transcurrido", () => {
    const next = stepBall({ x: 10, y: 10, vx: 5, vy: -5 }, 1, 100, 4);
    expect(next).toEqual({ x: 15, y: 5, vx: 5, vy: -5 });
  });

  test("rebota contra la pared izquierda", () => {
    const next = stepBall({ x: 1, y: 50, vx: -10, vy: 0 }, 1, 100, 4);
    expect(next.x).toBe(0);
    expect(next.vx).toBeGreaterThan(0);
  });

  test("rebota contra la pared derecha (respeta el ancho de la pelota)", () => {
    const next = stepBall({ x: 95, y: 50, vx: 10, vy: 0 }, 1, 100, 4);
    expect(next.x).toBe(96); // 100 - ballSize(4)
    expect(next.vx).toBeLessThan(0);
  });

  test("rebota contra el techo", () => {
    const next = stepBall({ x: 50, y: 1, vx: 0, vy: -10 }, 1, 100, 4);
    expect(next.y).toBe(0);
    expect(next.vy).toBeGreaterThan(0);
  });

  test("no rebota contra el piso (eso lo decide el llamador: perder una vida)", () => {
    const next = stepBall({ x: 50, y: 95, vx: 0, vy: 10 }, 1, 100, 4);
    expect(next.y).toBe(105);
    expect(next.vy).toBe(10);
  });
});

describe("hitsPaddle", () => {
  const paddle = { x: 25, width: 24, y: 90 };

  test("pelota cayendo, alineada con la paleta y a su altura: impacta", () => {
    expect(hitsPaddle({ x: 30, y: 90, vx: 0, vy: 10 }, 4, paddle.x, paddle.width, paddle.y)).toBe(true);
  });

  test("pelota subiendo (vy<=0) nunca impacta la paleta, aunque esté alineada", () => {
    expect(hitsPaddle({ x: 30, y: 90, vx: 0, vy: -10 }, 4, paddle.x, paddle.width, paddle.y)).toBe(false);
  });

  test("pelota cayendo pero fuera del rango horizontal de la paleta: no impacta", () => {
    expect(hitsPaddle({ x: 80, y: 90, vx: 0, vy: 10 }, 4, paddle.x, paddle.width, paddle.y)).toBe(false);
  });

  test("pelota cayendo pero todavía por encima de la paleta: no impacta", () => {
    expect(hitsPaddle({ x: 30, y: 50, vx: 0, vy: 10 }, 4, paddle.x, paddle.width, paddle.y)).toBe(false);
  });
});

describe("findHitBlock", () => {
  const blocks = [
    { id: "a", x: 0, y: 0, w: 25, h: 10 },
    { id: "b", x: 25, y: 0, w: 25, h: 10 },
    { id: "c", x: 50, y: 0, w: 25, h: 10 },
  ];

  test("devuelve el bloque con el que se solapa la pelota", () => {
    const hit = findHitBlock({ x: 30, y: 2, vx: 0, vy: 0 }, 4, blocks);
    expect(hit?.id).toBe("b");
  });

  test("devuelve undefined si no hay ningún bloque en esa posición", () => {
    const hit = findHitBlock({ x: 30, y: 90, vx: 0, vy: 0 }, 4, blocks);
    expect(hit).toBeUndefined();
  });

  test("con varios bloques posibles, devuelve el primero de la lista", () => {
    const overlapping = [
      { id: "x", x: 30, y: 0, w: 10, h: 10 },
      { id: "y", x: 32, y: 0, w: 10, h: 10 },
    ];
    const hit = findHitBlock({ x: 33, y: 2, vx: 0, vy: 0 }, 4, overlapping);
    expect(hit?.id).toBe("x");
  });
});
