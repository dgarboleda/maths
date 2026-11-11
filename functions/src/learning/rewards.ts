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
  /** Primera sesión del repaso diario terminada cada día. */
  daily: 2,
  /** Extra al alcanzar una racha de 7, 14 o 30 días. */
  streakBonus: 3,
} as const;

/** Dificultad de una aventura: decide cuántas estrellas da completarla. */
export type AdventureDifficulty = "basica" | "intermedia" | "avanzada";

/** Estrellas por completar una aventura (una vez), según su dificultad. */
export const ADVENTURE_STARS: Readonly<Record<AdventureDifficulty, number>> = {
  basica: 5,
  intermedia: 10,
  avanzada: 15,
};

/** Estrellas por superar el reto experto de una aventura (una vez), según su dificultad. */
export const ADVENTURE_EXPERT_STARS: Readonly<Record<AdventureDifficulty, number>> = {
  basica: 3,
  intermedia: 5,
  avanzada: 8,
};

export const ADVENTURE_DIFFICULTY_LABEL: Readonly<Record<AdventureDifficulty, string>> = {
  basica: "Básica",
  intermedia: "Intermedia",
  avanzada: "Avanzada",
};

/** Estrellas que da completar esta aventura. */
export function adventureStars(adventure: { difficulty: AdventureDifficulty }): number {
  return ADVENTURE_STARS[adventure.difficulty];
}

/** Estrellas que da superar el reto experto de esta aventura. */
export function adventureExpertStars(adventure: { difficulty: AdventureDifficulty }): number {
  return ADVENTURE_EXPERT_STARS[adventure.difficulty];
}

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
  return progress.completedAt ? { lesson: true, check: true, retained: true, legacy: true } : {};
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
  const r = lessonRewarded(progress);
  // Lo que cobró de una vez antes del reparto, aunque ya tenga las marcas.
  if (r.legacy) return LEGACY_LESSON_STARS;
  return (r.lesson ? STAR_REWARDS.lesson : 0) + (r.check ? STAR_REWARDS.lessonCheck : 0) + (r.retained ? STAR_REWARDS.lessonRetained : 0);
}
