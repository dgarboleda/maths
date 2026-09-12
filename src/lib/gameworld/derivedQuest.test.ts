import { describe, expect, test } from "vitest";
import { derivedQuestProgress } from "./derivedQuest";
import { modulesForStrand } from "@/lib/curriculum";
import { STRANDS } from "@/lib/strands";
import type { SkillProgress } from "@/lib/types";

/** Fase 35 (docs/plan-jugabilidad.md §9) — criterio de aceptación del plan:
 *  "questProgress sobre un progreso con 40 módulos dominados devuelve una
 *  misión incompleta, nunca null". */
function masteredProgress(moduleIds: string[]): Record<string, SkillProgress> {
  return Object.fromEntries(moduleIds.map((id) => [id, { recentResults: [], recentAccuracy: 1, masteredAt: Date.now() }]));
}

const ALL_MODULES = STRANDS.flatMap((s) => modulesForStrand(s.slug));

describe("derivedQuestProgress", () => {
  test("con progreso vacío, arma una misión con los primeros módulos reales", () => {
    const result = derivedQuestProgress({});
    expect(result).not.toBeNull();
    expect(result!.total).toBeGreaterThan(0);
    expect(result!.complete).toBe(false);
  });

  test("con 40 módulos dominados, sigue devolviendo una misión incompleta, nunca null", () => {
    const mastered = ALL_MODULES.slice(0, 40).map((m) => m.id);
    const result = derivedQuestProgress(masteredProgress(mastered));
    expect(result).not.toBeNull();
    expect(result!.complete).toBe(false);
    expect(result!.total).toBeGreaterThan(0);
  });

  test("con absolutamente todo dominado, no queda nada que ofrecer — null, no revienta", () => {
    const result = derivedQuestProgress(masteredProgress(ALL_MODULES.map((m) => m.id)));
    expect(result).toBeNull();
  });

  test("los objetivos nunca incluyen un módulo bloqueado por prerrequisito", () => {
    // Sin nada dominado, cualquier módulo con prerrequisitos reales queda
    // bloqueado — la misión derivada nunca ofrece uno de esos.
    const result = derivedQuestProgress({});
    for (const objective of result!.objectives) {
      expect(objective.locked).toBe(false);
    }
  });

  test("rota entre las 3 premisas según cuántos módulos ya se dominaron", () => {
    const titles = new Set<string>();
    for (let n = 0; n <= 2; n++) {
      const progress = masteredProgress(ALL_MODULES.slice(0, n).map((m) => m.id));
      titles.add(derivedQuestProgress(progress)!.quest.title);
    }
    expect(titles.size).toBeGreaterThan(1);
  });
});
