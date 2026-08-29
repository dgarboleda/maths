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

export function todayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
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

/**
 * Primer nivel (desde `floor`) que el niño todavía no domina en este hilo.
 * `floor` es la ubicación inicial por edad — el dominio manda a partir de ahí,
 * nunca se sirven niveles por debajo del piso de edad sin haberlos dominado.
 */
export function frontierDifficulty(
  progressBySkill: Record<string, SkillProgress>,
  strand: string,
  floor: number,
): number {
  for (let d = floor; d <= 10; d++) {
    if (!progressBySkill[`${strand}-d${d}`]?.masteredAt) return d;
  }
  return 10;
}

export function masteredDifficultiesBelow(
  progressBySkill: Record<string, SkillProgress>,
  strand: string,
  frontier: number,
): number[] {
  const mastered: number[] = [];
  for (let d = 1; d < frontier; d++) {
    if (progressBySkill[`${strand}-d${d}`]?.masteredAt) mastered.push(d);
  }
  return mastered;
}

/** Nivel de práctica a servir: casi siempre la frontera; a veces (repetición
 * espaciada) un repaso de un nivel ya dominado más abajo. */
export function pickPracticeDifficulty(
  progressBySkill: Record<string, SkillProgress>,
  strand: string,
  floor: number,
): number {
  const frontier = frontierDifficulty(progressBySkill, strand, floor);
  const reviewPool = masteredDifficultiesBelow(progressBySkill, strand, frontier);
  if (reviewPool.length > 0 && Math.random() < 0.25) {
    return reviewPool[Math.floor(Math.random() * reviewPool.length)];
  }
  return frontier;
}

export function masteredCount(progressBySkill: Record<string, SkillProgress>, strand: string): number {
  let count = 0;
  for (let d = 1; d <= 10; d++) {
    if (progressBySkill[`${strand}-d${d}`]?.masteredAt) count++;
  }
  return count;
}
