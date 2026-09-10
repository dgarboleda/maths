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

  // `...base` primero (Fase 26/27): antes se armaba el objeto de vuelta con
  // solo estos 3 campos, así que cualquier otro campo de `SkillProgress`
  // (`masteredVia`, y ahora `reviewBox`/`lastReviewAt`) se perdía en la
  // siguiente práctica normal — `attemptRecorder.ts` guarda el resultado con
  // `setDoc` sin `merge`, así que "perderse acá" es "desaparecer de
  // Firestore". Sin este spread, el repaso espaciado nunca podría avanzar
  // de caja: cada llamada volvería a ver `reviewBox` como `undefined`.
  return {
    ...base,
    recentResults,
    recentAccuracy: accuracy,
    masteredAt: alreadyMastered ? base.masteredAt : qualifiesNow ? Date.now() : null,
  };
}

/** Intervalos del repaso espaciado, en días, uno por caja de Leitner (§5.1,
 *  docs/plan-salto-producto.md) — un módulo recién dominado empieza en la
 *  caja 0. */
export const REVIEW_INTERVALS_DAYS = [3, 7, 21, 60] as const;

/** `null` si el módulo no está dominado — no hay ningún repaso que programar
 *  todavía. `lastReviewAt` ausente ⇒ se cuenta desde `masteredAt` (el primer
 *  repaso, antes de que exista ningún repaso previo). */
export function reviewDueAt(p: SkillProgress): number | null {
  if (p.masteredAt === null) return null;
  const box = Math.min(Math.max(p.reviewBox ?? 0, 0), REVIEW_INTERVALS_DAYS.length - 1);
  const from = p.lastReviewAt ?? p.masteredAt;
  return from + REVIEW_INTERVALS_DAYS[box] * 24 * 60 * 60 * 1000;
}

export function isReviewDue(p: SkillProgress, now: number = Date.now()): boolean {
  const due = reviewDueAt(p);
  return due !== null && now >= due;
}

/**
 * Un repaso de un módulo YA DOMINADO — nunca toca `recentResults` ni
 * `masteredAt` (P1, docs/plan-salto-producto.md §0): un repaso fallado
 * vuelve a la caja 0, nunca re-bloquea el módulo. Acertarlo sube una caja
 * (tope: la última, 60 días); fallarlo la reinicia en 0 — mismo criterio
 * que un mazo de Leitner de papel.
 */
export function recordReview(p: SkillProgress, correct: boolean, now: number = Date.now()): SkillProgress {
  const currentBox = p.reviewBox ?? 0;
  return {
    ...p,
    reviewBox: correct ? Math.min(currentBox + 1, REVIEW_INTERVALS_DAYS.length - 1) : 0,
    lastReviewAt: now,
  };
}

