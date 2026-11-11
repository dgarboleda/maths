import {
  ADVENTURES,
  ADVENTURE_EXPERT_STARS,
  ADVENTURE_STARS,
  adventureExpertStars,
  adventureStars,
  LEARNING_UNITS,
  LESSONS,
  STAR_REWARDS,
  LESSON_STARS_MAX,
  lessonStarsEarned,
  type AdventureState,
  type LearningProgress,
  type MixedReviewState,
} from "./domain";

export interface StarSection {
  id: "lessons" | "mixed" | "adventures" | "daily";
  label: string;
  /** Qué aporta cada actividad de la sección. */
  rule: string;
  earned: number;
  /** Máximo de la sección; `null` si no tiene tope (repaso diario). */
  possible: number | null;
  done: number;
  total: number | null;
}

export interface StarPlan {
  sections: StarSection[];
  /** Ganadas en total (incluye repaso diario y actividades anteriores). */
  earned: number | null;
  /** Canjeadas por premios aprobados. */
  spent: number | null;
  /** Lo que aún puede ganarse en secciones con tope. */
  remaining: number;
  /** Tope de las secciones con tope (clases, repasos mixtos, aventuras). */
  possible: number;
}

const unitsWithLessons = LEARNING_UNITS.filter((unit) => LESSONS.some((lesson) => lesson.unitId === unit.id));

/**
 * Cuántas estrellas aporta cada sección, cuántas se ganaron y cuántas quedan.
 * Clases, repasos mixtos y aventuras se calculan con exactitud a partir del
 * progreso (cada una premia una sola vez, al completarse). El repaso diario no
 * tiene tope: sus estrellas se obtienen del historial (`ledger`), restando lo
 * anterior; incluye también las de actividades de versiones anteriores.
 */
export function starPlan({ progress, reviews, adventures, ledger }: {
  progress: Record<string, LearningProgress | undefined>;
  reviews: Record<string, MixedReviewState | undefined>;
  adventures: Record<string, AdventureState | undefined>;
  ledger?: { earned: number; spent: number } | null;
}): StarPlan {
  const lessonsDone = LESSONS.filter((lesson) => progress[lesson.id]?.completedAt).length;
  const mixedDone = Object.values(reviews).filter((review) => review?.completedAt).length;
  const adventuresDone = ADVENTURES.filter((adventure) => adventures[adventure.id]?.completedAt);
  const lessons: StarSection = {
    id: "lessons", label: "Clases",
    rule: `${STAR_REWARDS.lesson} al terminar cada clase, ${STAR_REWARDS.lessonCheck} al superar su comprobación sin ayuda y ${STAR_REWARDS.lessonRetained} al superar su repaso`,
    earned: LESSONS.reduce((sum, lesson) => sum + lessonStarsEarned(progress[lesson.id]), 0),
    possible: LESSONS.length * LESSON_STARS_MAX, done: lessonsDone, total: LESSONS.length,
  };
  const mixed: StarSection = {
    id: "mixed", label: "Repasos mixtos", rule: `${STAR_REWARDS.mixed} por cada unidad repasada`,
    earned: mixedDone * STAR_REWARDS.mixed, possible: unitsWithLessons.length * STAR_REWARDS.mixed, done: mixedDone, total: unitsWithLessons.length,
  };
  const expertsDone = ADVENTURES.filter((adventure) => adventures[adventure.id]?.expert?.completedAt);
  const missionAndExpert = (adventure: (typeof ADVENTURES)[number]) => adventureStars(adventure) + adventureExpertStars(adventure);
  const adv: StarSection = {
    id: "adventures", label: "Aventuras",
    rule: `${ADVENTURE_STARS.basica}, ${ADVENTURE_STARS.intermedia} o ${ADVENTURE_STARS.avanzada} por cada misión según su dificultad, y ${ADVENTURE_EXPERT_STARS.basica}, ${ADVENTURE_EXPERT_STARS.intermedia} o ${ADVENTURE_EXPERT_STARS.avanzada} por su reto experto`,
    earned: adventuresDone.reduce((sum, adventure) => sum + adventureStars(adventure), 0) + expertsDone.reduce((sum, adventure) => sum + adventureExpertStars(adventure), 0),
    possible: ADVENTURES.reduce((sum, adventure) => sum + missionAndExpert(adventure), 0),
    done: adventuresDone.length, total: ADVENTURES.length,
  };
  const fixed = lessons.earned + mixed.earned + adv.earned;
  const daily: StarSection = {
    id: "daily", label: "Repaso diario y otras", rule: `${STAR_REWARDS.daily} al día; ${STAR_REWARDS.streakBonus} más a los 7, 14 y 30 días seguidos`,
    earned: ledger ? Math.max(0, ledger.earned - fixed) : 0, possible: null, done: 0, total: null,
  };
  const possible = lessons.possible! + mixed.possible! + adv.possible!;
  return {
    sections: [lessons, mixed, adv, daily],
    earned: ledger ? Math.max(ledger.earned, fixed) : null,
    spent: ledger ? ledger.spent : null,
    remaining: possible - fixed,
    possible,
  };
}

/** Suma de movimientos del libro de estrellas: ganadas (positivos) y canjeadas (negativos). */
export function ledgerTotals(deltas: number[]): { earned: number; spent: number } {
  let earned = 0,
    spent = 0;
  for (const delta of deltas) {
    if (!Number.isFinite(delta)) continue;
    if (delta > 0) earned += delta;
    else spent -= delta;
  }
  return { earned, spent };
}
