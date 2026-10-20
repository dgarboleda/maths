import { LESSONS, streakToday, type DailyReviewState, type LearningProgress } from "./domain";

/** Las mismas evidencias para el alumno, las tarjetas y el informe familiar. */
export function learningSummary(progress: Record<string, LearningProgress>, daily: DailyReviewState | null, now: number) {
  const entries = LESSONS.flatMap((lesson) => progress[lesson.id] ? [progress[lesson.id]] : []);
  return {
    completed: entries.filter((p) => p.completedAt).length,
    autonomous: entries.filter((p) => p.checkPassedAt && !p.needsSupport).length,
    retained: entries.filter((p) => p.retainedAt && p.lastReview?.passed && !p.needsSupport).length,
    support: entries.filter((p) => p.needsSupport).length,
    streak: streakToday(daily, now).current,
  };
}

export function timestampMillis(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof (value as { toMillis?: unknown }).toMillis === "function")
    return (value as { toMillis: () => number }).toMillis();
  return 0;
}
