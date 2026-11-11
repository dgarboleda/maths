import { expect, test } from "vitest";
import { ADVENTURES, adventureStars, LEARNING_UNITS, LESSONS, LESSON_STARS_MAX, STAR_REWARDS } from "./domain";
import { ledgerTotals, starPlan } from "./starPlan";

const adventuresMax = ADVENTURES.reduce((sum, a) => sum + adventureStars(a), 0) + ADVENTURES.length * STAR_REWARDS.adventureExpert;

const done = { completedAt: 1 } as never;
// Con el reparto actual: terminada (1) y comprobación sin ayuda (4).
const proven = { lessonId: "x", completedAt: 1, checkPassedAt: 1, rewarded: { lesson: true, check: true } } as never;

test("calcula lo ganado y lo posible por sección", () => {
  const plan = starPlan({
    // Una clase terminada antes del nuevo reparto (pagó 5) y una del reparto actual.
    progress: { [LESSONS[0].id]: done, [LESSONS[1].id]: proven, [LESSONS[2].id]: { completedAt: null } as never },
    reviews: { "repaso-numeros": done },
    adventures: { [ADVENTURES[0].id]: done },
    ledger: { earned: 40, spent: 12 },
  });
  const by = Object.fromEntries(plan.sections.map((s) => [s.id, s]));
  expect(by.lessons).toMatchObject({ earned: 5 + STAR_REWARDS.lesson + STAR_REWARDS.lessonCheck, done: 2, total: LESSONS.length, possible: LESSONS.length * LESSON_STARS_MAX });
  expect(by.mixed).toMatchObject({ earned: STAR_REWARDS.mixed, total: LEARNING_UNITS.length });
  expect(by.adventures).toMatchObject({ earned: adventureStars(ADVENTURES[0]), possible: adventuresMax });
  // Lo fijo: clases + repaso mixto + aventura (según su dificultad).
  const fixed = 5 + STAR_REWARDS.lesson + STAR_REWARDS.lessonCheck + STAR_REWARDS.mixed + adventureStars(ADVENTURES[0]);
  // El resto del historial son del repaso diario u otras actividades.
  expect(by.daily).toMatchObject({ earned: 40 - fixed, possible: null });
  expect(plan).toMatchObject({ earned: 40, spent: 12 });
  expect(plan.possible).toBe(LESSONS.length * LESSON_STARS_MAX + LEARNING_UNITS.length * 5 + adventuresMax);
  expect(plan.remaining).toBe(plan.possible - fixed);
});

test("sin historial cargado no inventa totales", () => {
  const plan = starPlan({ progress: {}, reviews: {}, adventures: {}, ledger: null });
  expect(plan.earned).toBeNull();
  expect(plan.spent).toBeNull();
  expect(plan.remaining).toBe(plan.possible);
});

test("separa ganadas y canjeadas en el historial", () => {
  expect(ledgerTotals([5, 10, -8, 2, Number.NaN])).toEqual({ earned: 17, spent: 8 });
});
