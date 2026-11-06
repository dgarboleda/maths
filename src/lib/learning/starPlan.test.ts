import { expect, test } from "vitest";
import { ADVENTURES, LEARNING_UNITS, LESSONS, LESSON_STARS_MAX, STAR_REWARDS } from "./domain";
import { ledgerTotals, starPlan } from "./starPlan";

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
  expect(by.adventures).toMatchObject({ earned: STAR_REWARDS.adventure, possible: ADVENTURES.length * STAR_REWARDS.adventure });
  // El resto del historial (40 − 25) son del repaso diario u otras actividades.
  expect(by.daily).toMatchObject({ earned: 15, possible: null });
  expect(plan).toMatchObject({ earned: 40, spent: 12 });
  expect(plan.possible).toBe(LESSONS.length * LESSON_STARS_MAX + LEARNING_UNITS.length * 5 + ADVENTURES.length * 10);
  expect(plan.remaining).toBe(plan.possible - 25);
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
