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
 * Paredes y bloques solo invierten `vy` o `vx` según el eje que chocó. La
 * paleta, en cambio, fija `vx` según dónde golpea la pelota
 * (`paddleBounceVx`): sin esa "puntería" la pelota subía siempre por la
 * misma columna y los bloques de las demás eran inalcanzables.
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

/** La pelota está cayendo y se solapa con la paleta: su rango horizontal y
 *  también el vertical. Sin el límite inferior, una pelota que ya rebasó la
 *  paleta y se desliza en diagonal por debajo volvería a "rebotar". */
export function hitsPaddle(ball: Ball, ballSize: number, paddleX: number, paddleWidth: number, paddleY: number, paddleHeight = 3): boolean {
  if (ball.vy <= 0) return false;
  if (ball.y + ballSize < paddleY) return false;
  if (ball.y > paddleY + paddleHeight) return false;
  return ball.x + ballSize > paddleX && ball.x < paddleX + paddleWidth;
}

/** El primer bloque (de los vivos) que se solapa con la pelota, si hay alguno. */
export function findHitBlock<T extends Rect>(ball: Ball, ballSize: number, blocks: readonly T[]): T | undefined {
  const ballRect: Rect = { x: ball.x, y: ball.y, w: ballSize, h: ballSize };
  return blocks.find((b) => rectsOverlap(ballRect, b));
}

/** Ángulo de "puntería": la velocidad horizontal depende de dónde golpea la
 *  pelota en la paleta (centro = casi vertical, bordes = ±80% de la
 *  velocidad). Sin esto la pelota sube siempre por la misma columna y un
 *  bloque fuera de ella sería inalcanzable. */
export function paddleBounceVx(ballX: number, ballSize: number, paddleX: number, paddleWidth: number, speed: number): number {
  const half = paddleWidth / 2;
  const offset = (ballX + ballSize / 2 - (paddleX + half)) / half;
  return Math.max(-1, Math.min(1, offset)) * speed * 0.8;
}
