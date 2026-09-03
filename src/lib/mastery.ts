import type { SkillProgress } from "./types";

/**
 * Umbral de maestría del plan de contenidos: 85% de acierto en los últimos
 * 12 intentos, repartidos en al menos 2 días distintos (para que no se pueda
 * "dominar" una unidad en una sola sentada de grindeo).
 */
export const MASTERY_WINDOW = 12;
export const MASTERY_THRESHOLD = 0.85;
export const MIN_DAY_SPAN = 2;

export function emptyProgress(): SkillProgress {
  return { recentResults: [], recentAccuracy: 0, masteredAt: null };
}

/**
 * Día calendario *local* en formato AAAA-MM-DD. Antes se usaba
 * `toISOString()`, que da el día en UTC: jugando de tarde-noche al oeste de
 * Greenwich, dos sesiones de la misma tarde caían en días UTC distintos y la
 * regla de "dominar en al menos 2 días" se cumplía en una sola sentada.
 */
export function todayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function recordAttempt(
  prev: SkillProgress | undefined,
  correct: boolean,
  day: string,
): SkillProgress {
  const base = prev ?? emptyProgress();
  const recentResults = [...base.recentResults, { correct, day }].slice(-MASTERY_WINDOW);
  const accuracy = recentResults.filter((r) => r.correct).length / recentResults.length;
  const distinctDays = new Set(recentResults.map((r) => r.day)).size;

  const alreadyMastered = base.masteredAt !== null;
  const qualifiesNow =
    recentResults.length >= MASTERY_WINDOW &&
    accuracy >= MASTERY_THRESHOLD &&
    distinctDays >= MIN_DAY_SPAN;

  return {
    recentResults,
    recentAccuracy: accuracy,
    masteredAt: alreadyMastered ? base.masteredAt : qualifiesNow ? Date.now() : null,
  };
}

