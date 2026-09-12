import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LevelActivityOverlay } from "./LevelActivityOverlay";
import type { ChallengePlacement } from "@/lib/level/schema";
import type { AttemptOutcome, recordModuleAttempt } from "@/lib/attemptRecorder";
import type { SkillProgress } from "@/lib/types";

/**
 * Fase 33 (docs/plan-jugabilidad.md §7) — criterios del plan: (1) todo
 * `LevelDefinition` existente con `activityId: "puzzle"` renderiza byte a
 * byte lo de hoy (acá: la ficha de `PuzzleOverlay`, no `CoheteGeneric`);
 * (2) una actividad nueva ("cohete") también pasa por el mismo mecanismo de
 * override de Play Test que ya protege "puzzle" — cero escrituras reales
 * durante una sesión de prueba.
 */
vi.mock("@/lib/firebase", () => ({
  getFirebase: async () => ({ db: {}, firestore: {} }),
}));
vi.mock("@/lib/gameSound", () => ({ playSound: () => {} }));
vi.mock("@/lib/confetti", () => ({ triggerConfetti: () => {} }));

function placement(activityId: string, moduleId = "aritmetica-d1"): ChallengePlacement {
  return { id: "challenge-1", moduleId, activityId, sourceEntityId: "entity-1" };
}

function baseProps(activityId: string, opts: { moduleId?: string; progressBySkill?: Record<string, SkillProgress>; recordAttempt?: typeof recordModuleAttempt } = {}) {
  return {
    placement: placement(activityId, opts.moduleId),
    entity: undefined,
    parentId: "padre-1",
    childId: "hijo-1",
    progressBySkill: opts.progressBySkill ?? {},
    streak: 0,
    soundOn: false,
    onClose: () => {},
    onResolved: () => {},
    recordAttempt: opts.recordAttempt,
  };
}

function outcome(correct: boolean): AttemptOutcome {
  return { updatedProgress: { recentResults: [], recentAccuracy: correct ? 1 : 0, masteredAt: null }, wasMastered: false, stars: correct ? 5 : 0 };
}

describe("LevelActivityOverlay — despacho por activityId", () => {
  test('"puzzle" renderiza PuzzleOverlay (la ficha de siempre)', () => {
    render(<LevelActivityOverlay {...baseProps("puzzle")} />);
    // PuzzleOverlay: encabezado con estado ("ACCESO DENEGADO"/headline) y el
    // botón "Salir" de su propio marco — nada de CoheteGeneric.
    expect(screen.getByRole("button", { name: "Salir" })).toBeInTheDocument();
    expect(screen.queryByText("¡Iniciar misión!")).not.toBeInTheDocument();
  });

  test('un activityId desconocido cae en "puzzle", nunca revienta', () => {
    render(<LevelActivityOverlay {...baseProps("algo-que-no-existe")} />);
    expect(screen.getByRole("button", { name: "Salir" })).toBeInTheDocument();
    expect(screen.queryByText("¡Iniciar misión!")).not.toBeInTheDocument();
  });

  test('"cohete" renderiza CoheteGeneric, no PuzzleOverlay', () => {
    render(<LevelActivityOverlay {...baseProps("cohete")} />);
    expect(screen.getByText("¡Iniciar misión!")).toBeInTheDocument();
  });
});

describe("LevelActivityOverlay — protección de Play Test (sandbox)", () => {
  test('con "cohete", el override recordAttempt se usa en vez del real (mismo mecanismo que "puzzle")', async () => {
    const user = userEvent.setup();
    const recordAttempt = vi.fn(async (_fns, _db, _parentId, _childId, _mod, _prev, correct: boolean) => outcome(correct));
    // "aritmetica-valor-posicional" (no "aritmetica-d1"): siempre pide una
    // respuesta escrita — "aritmetica-d1" usa una recta numérica (slider),
    // más lenta de manejar en un test. Su prerrequisito (aritmetica-d2) se
    // otorga acá para que el desafío no salga bloqueado.
    render(
      <LevelActivityOverlay
        {...baseProps("cohete", {
          moduleId: "aritmetica-valor-posicional",
          progressBySkill: { "aritmetica-d2": { recentResults: [], recentAccuracy: 1, masteredAt: Date.now() } },
          recordAttempt,
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "¡Iniciar misión!" }));
    await user.type(await screen.findByRole("textbox"), "999999"); // casi seguro incorrecto
    await user.click(screen.getByRole("button", { name: "Comprobar" }));

    expect(recordAttempt).toHaveBeenCalledTimes(1);
  });
});
