/**
 * Puntuación arcade de los minijuegos: puntos, combo y récord por juego.
 *
 * Es solo un marcador de juego, local al dispositivo. No concede estrellas,
 * dominio ni premios, no se envía a Functions y no depende de responder
 * rápido: los puntos salen de acciones del juego (recoger, esquivar, rebotar,
 * empujar) y de cerrar el ejercicio, nunca del tiempo que tomó pensar.
 */

/** Multiplicador por cadena de acciones seguidas sin fallo de reflejos. */
export function comboMultiplier(combo: number): number {
  if (combo < 3) return 1;
  if (combo < 6) return 2;
  if (combo < 10) return 3;
  return 4;
}

/** Puntos ganados por una acción con la cadena actual (antes de sumarla). */
export function pointsFor(base: number, combo: number): number {
  return Math.max(0, Math.round(base)) * comboMultiplier(combo);
}

/** Puntos que suma cerrar el ejercicio o la meta del juego. */
export const SOLVE_BONUS = 500;

const KEY = (game: string) => `numerario:arcade:${game}`;
let cache: Record<string, number | null> = {};
const listeners = new Set<() => void>();

export function readArcadeBest(game: string): number | null {
  if (game in cache) return cache[game];
  let value: number | null = null;
  try {
    const raw = window.localStorage.getItem(KEY(game));
    const parsed = raw === null ? NaN : Number(raw);
    value = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
  } catch {
    // Sin almacenamiento (modo privado): el récord vale solo en esta pestaña.
  }
  cache[game] = value;
  return value;
}

/** Guarda `score` si supera el récord. Devuelve si es un récord nuevo. */
export function saveArcadeBest(game: string, score: number): boolean {
  const best = readArcadeBest(game);
  if (score <= 0 || (best !== null && score <= best)) return false;
  cache[game] = score;
  try {
    window.localStorage.setItem(KEY(game), String(score));
  } catch {
    // Sin persistencia: el récord queda en memoria.
  }
  for (const listener of listeners) listener();
  return true;
}

export function subscribeArcadeBest(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Solo para pruebas: olvida la caché en memoria. */
export function resetArcadeBestCache() {
  cache = {};
}

/** Marcador de cinco cifras, como en los recreativos. */
export function formatScore(score: number): string {
  return String(Math.max(0, Math.floor(score))).padStart(5, "0");
}
