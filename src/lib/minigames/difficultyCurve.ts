/**
 * Curva de dificultad compartida por los minijuegos arcade (Fase 36,
 * docs/plan-minijuegos-retro.md) — "cada N aciertos, sube la velocidad/
 * cantidad de distractores, con techo". Pura, sin estado: cada juego es
 * dueño de sus propias constantes (`base`/`step`/`max`), esto solo comparte
 * la fórmula.
 */

/** Oleada actual (0-based) dado cuántas respuestas correctas lleva la partida. */
export function waveIndex(correctCount: number, perWave: number): number {
  if (perWave <= 0) return 0;
  return Math.floor(Math.max(0, correctCount) / perWave);
}

/**
 * Valor que sube (o baja, con `step` negativo) `step` por oleada desde
 * `base`, sin cruzar nunca `max` (para `step` negativo, `max` actúa como
 * piso: `scaleWithWave(450, -30, 5, 180)` nunca baja de 180).
 */
export function scaleWithWave(base: number, step: number, wave: number, max: number): number {
  const raw = base + step * Math.max(0, wave);
  return step >= 0 ? Math.min(raw, max) : Math.max(raw, max);
}
