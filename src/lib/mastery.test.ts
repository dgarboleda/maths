import { describe, expect, test } from "vitest";
import {
  MASTERY_THRESHOLD,
  MASTERY_WINDOW,
  REVIEW_INTERVALS_DAYS,
  emptyProgress,
  isReviewDue,
  recordAttempt,
  recordReview,
  reviewDueAt,
} from "./mastery";
import type { SkillProgress } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

function masteredProgress(overrides: Partial<SkillProgress> = {}): SkillProgress {
  return { ...emptyProgress(), masteredAt: 1_000_000, ...overrides };
}

describe("mastery — recordAttempt conserva campos ajenos (Fase 27)", () => {
  test("masteredVia, reviewBox y lastReviewAt sobreviven a un recordAttempt posterior", () => {
    const prev: SkillProgress = masteredProgress({ masteredVia: "placement", reviewBox: 2, lastReviewAt: 5_000 });
    const updated = recordAttempt(prev, true, "2026-01-01");
    expect(updated.masteredVia).toBe("placement");
    expect(updated.reviewBox).toBe(2);
    expect(updated.lastReviewAt).toBe(5_000);
  });

  test("dominar por primera vez sigue funcionando igual que antes (sin reviewBox todavía)", () => {
    let progress: SkillProgress | undefined;
    for (let i = 0; i < MASTERY_WINDOW; i++) {
      progress = recordAttempt(progress, true, `2026-01-0${(i % 2) + 1}`);
    }
    expect(progress!.masteredAt).not.toBeNull();
    expect(progress!.reviewBox).toBeUndefined();
  });
});

describe("mastery — reviewDueAt / isReviewDue", () => {
  test("un módulo no dominado nunca tiene repaso vencido", () => {
    expect(reviewDueAt(emptyProgress())).toBeNull();
    expect(isReviewDue(emptyProgress())).toBe(false);
  });

  test("un módulo recién dominado no tiene repaso vencido; a los 3 días sí (caja 0)", () => {
    const masteredAt = 1_000_000;
    const progress = masteredProgress({ masteredAt });
    expect(isReviewDue(progress, masteredAt + 1)).toBe(false);
    expect(isReviewDue(progress, masteredAt + REVIEW_INTERVALS_DAYS[0] * DAY_MS - 1)).toBe(false);
    expect(isReviewDue(progress, masteredAt + REVIEW_INTERVALS_DAYS[0] * DAY_MS)).toBe(true);
  });

  test("progreso sin reviewBox/lastReviewAt (P2: aditivo) se cuenta desde masteredAt en caja 0", () => {
    const masteredAt = 2_000_000;
    const progress: SkillProgress = { ...emptyProgress(), masteredAt };
    expect(progress.reviewBox).toBeUndefined();
    expect(progress.lastReviewAt).toBeUndefined();
    expect(reviewDueAt(progress)).toBe(masteredAt + REVIEW_INTERVALS_DAYS[0] * DAY_MS);
  });
});

describe("mastery — recordReview", () => {
  test("repaso acertado: caja +1, y el próximo vence 7 días después de ESTE repaso", () => {
    const now = 10_000_000;
    const progress = masteredProgress({ reviewBox: 0 });
    const updated = recordReview(progress, true, now);
    expect(updated.reviewBox).toBe(1);
    expect(updated.lastReviewAt).toBe(now);
    expect(reviewDueAt(updated)).toBe(now + REVIEW_INTERVALS_DAYS[1] * DAY_MS);
  });

  test("repaso fallado: vuelve a la caja 0, y masteredAt queda intacto (P1)", () => {
    const progress = masteredProgress({ reviewBox: 3, masteredAt: 42 });
    const updated = recordReview(progress, false, 99_999);
    expect(updated.reviewBox).toBe(0);
    expect(updated.masteredAt).toBe(42); // nunca se re-bloquea el módulo
  });

  test("no sube más allá de la última caja", () => {
    const progress = masteredProgress({ reviewBox: REVIEW_INTERVALS_DAYS.length - 1 });
    const updated = recordReview(progress, true, 0);
    expect(updated.reviewBox).toBe(REVIEW_INTERVALS_DAYS.length - 1);
  });

  test("no toca recentResults ni recentAccuracy", () => {
    const progress = masteredProgress({ recentResults: [{ correct: true, day: "2026-01-01" }], recentAccuracy: 1 });
    const updated = recordReview(progress, false, 0);
    expect(updated.recentResults).toBe(progress.recentResults);
    expect(updated.recentAccuracy).toBe(progress.recentAccuracy);
  });
});

describe("mastery — MASTERY_THRESHOLD (regresión de referencia, sin cambios en esta fase)", () => {
  test("sigue siendo 0.85", () => {
    expect(MASTERY_THRESHOLD).toBe(0.85);
  });
});
