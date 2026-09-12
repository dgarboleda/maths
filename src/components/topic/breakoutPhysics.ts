/**
 * Física pura de Math Breakout — Fase 41 (docs/plan-minijuegos-retro.md).
 * Separada de `BreakoutGeneric.tsx` a propósito: es la parte más sensible a
 * probar con precisión (colisiones, rebotes) y la más fácil de probar SIN
 * `useGameLoop` ni timers falsos — números de entrada, números de salida,
 * cero React, cero temporización simulada.
 *
 * Todo en unidades porcentuales del campo de juego (0-100), igual criterio
 * que el resto del runtime del Mundo (`RuntimeCanvas.tsx`) — nada de
 * píxeles reales, así que es responsive gratis.
 *
 * Simplificación deliberada de v1: el rebote nunca cambia `vx` (ni contra
 * paredes, paleta o bloques) — solo invierte `vy` o `vx` según el eje que
 * chocó. Sin ángulo de "puntería" al pegarle con un borde de la paleta: un
 * rebote predecible es más justo para un niño que uno con física de ángulo
 * real, y mantiene la trayectoria determinística (valioso también para
 * testear sin adivinar temporización exacta).
 */

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Mueve la pelota `dtSec` y rebota contra las paredes y el techo (no contra
 *  la paleta ni los bloques — eso depende de estado del juego, se resuelve
 *  aparte). */
export function stepBall(ball: Ball, dtSec: number, fieldWidth: number, ballSize: number): Ball {
  let { x, y } = ball;
  let { vx, vy } = ball;
  x += vx * dtSec;
  y += vy * dtSec;
  if (x < 0) {
    x = 0;
    vx = Math.abs(vx);
  } else if (x > fieldWidth - ballSize) {
    x = fieldWidth - ballSize;
    vx = -Math.abs(vx);
  }
  if (y < 0) {
    y = 0;
    vy = Math.abs(vy);
  }
  return { x, y, vx, vy };
}

/** La pelota está cayendo y su rango horizontal se solapa con la paleta, a
 *  la altura de la paleta o más abajo. */
export function hitsPaddle(ball: Ball, ballSize: number, paddleX: number, paddleWidth: number, paddleY: number): boolean {
  if (ball.vy <= 0) return false;
  if (ball.y + ballSize < paddleY) return false;
  return ball.x + ballSize > paddleX && ball.x < paddleX + paddleWidth;
}

/** El primer bloque (de los vivos) que se solapa con la pelota, si hay alguno. */
export function findHitBlock<T extends Rect>(ball: Ball, ballSize: number, blocks: readonly T[]): T | undefined {
  const ballRect: Rect = { x: ball.x, y: ball.y, w: ballSize, h: ballSize };
  return blocks.find((b) => rectsOverlap(ballRect, b));
}
