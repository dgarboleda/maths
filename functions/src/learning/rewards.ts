import type { LearningProgress, LessonRewards } from "./types";

/**
 * Estrellas que premia el servidor (`recordLearningAction`). Única fuente:
 * la usa el servidor para acreditar y la interfaz para explicar cuánto aporta
 * cada sección y cuántas quedan por ganar.
 */
export const STAR_REWARDS = {
  /** Clase terminada (una vez por clase). */
  lesson: 1,
  /** Comprobación de la clase superada sin ayuda (una vez por clase). */
  lessonCheck: 4,
  /** Repaso diferido de la clase superado (una vez por clase). */
  lessonRetained: 2,
  /** Repaso mixto de una unidad superado (una vez por unidad). */
  mixed: 5,
  /** Aventura completada (una vez por aventura). */
  adventure: 10,
  /** Primera sesión del repaso diario terminada cada día. */
  daily: 2,
  /** Extra al alcanzar una racha de 7, 14 o 30 días. */
  streakBonus: 3,
} as const;

/** Máximo de una clase: terminarla, demostrarla y recordarla. */
export const LESSON_STARS_MAX = STAR_REWARDS.lesson + STAR_REWARDS.lessonCheck + STAR_REWARDS.lessonRetained;

/** Estrellas que se pagaban antes por terminar una clase (versión anterior). */
const LEGACY_LESSON_STARS = 5;

/**
 * Lo ya pagado de una clase. Un avance anterior a este reparto (sin
 * `rewarded`) que ya estaba terminado cobró 5 estrellas al terminar: se da
 * todo por pagado para no volver a premiarlo.
 */
export function lessonRewarded(progress: LearningProgress | undefined): LessonRewards {
  if (!progress) return {};
  if (progress.rewarded) return progress.rewarded;
  return progress.completedAt ? { lesson: true, check: true, retained: true } : {};
}

/**
 * Estrellas que gana una acción en una clase: se premia demostrar (superar
 * la comprobación sin ayuda) y recordar (superar el repaso diferido), no
 * solo terminar. Devuelve también lo pagado, para guardarlo en el avance.
 */
export function lessonStars(previous: LearningProgress | undefined, next: LearningProgress): { stars: number; rewarded: LessonRewards } {
  const rewarded = { ...lessonRewarded(previous) };
  let stars = 0;
  if (!rewarded.lesson && next.completedAt) {
    rewarded.lesson = true;
    stars += STAR_REWARDS.lesson;
  }
  if (!rewarded.check && next.checkPassedAt) {
    rewarded.check = true;
    stars += STAR_REWARDS.lessonCheck;
  }
  if (!rewarded.retained && next.retainedAt) {
    rewarded.retained = true;
    stars += STAR_REWARDS.lessonRetained;
  }
  return { stars, rewarded };
}

/** Estrellas ganadas en una clase (para la interfaz). */
export function lessonStarsEarned(progress: LearningProgress | undefined): number {
  if (!progress) return 0;
  if (!progress.rewarded) return progress.completedAt ? LEGACY_LESSON_STARS : 0;
  const r = progress.rewarded;
  return (r.lesson ? STAR_REWARDS.lesson : 0) + (r.check ? STAR_REWARDS.lessonCheck : 0) + (r.retained ? STAR_REWARDS.lessonRetained : 0);
}
