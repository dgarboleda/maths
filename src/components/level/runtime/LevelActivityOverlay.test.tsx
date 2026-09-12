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

  test('"snake" renderiza SnakeGeneric, no PuzzleOverlay ni CoheteGeneric', () => {
    render(<LevelActivityOverlay {...baseProps("snake")} />);
    expect(screen.getByText("¡Empezar!")).toBeInTheDocument();
    expect(screen.queryByText("¡Iniciar misión!")).not.toBeInTheDocument();
  });

  test('"frogger" renderiza FroggerGeneric, no otra actividad', () => {
    render(<LevelActivityOverlay {...baseProps("frogger")} />);
    expect(screen.getByText(/Estanque de operaciones/)).toBeInTheDocument();
    expect(screen.queryByText("¡Iniciar misión!")).not.toBeInTheDocument();
  });

  test('"runner" renderiza RunnerGeneric, no otra actividad', () => {
    render(<LevelActivityOverlay {...baseProps("runner")} />);
    expect(screen.getByText(/Autopista de resultados/)).toBeInTheDocument();
    expect(screen.queryByText("¡Iniciar misión!")).not.toBeInTheDocument();
  });

  test('"pacman" renderiza NumberPacGeneric, no otra actividad', () => {
    render(<LevelActivityOverlay {...baseProps("pacman")} />);
    expect(screen.getByText(/Laberinto de números/)).toBeInTheDocument();
    expect(screen.queryByText("¡Iniciar misión!")).not.toBeInTheDocument();
  });

  test('"invaders" renderiza InvadersGeneric, no otra actividad', () => {
    render(<LevelActivityOverlay {...baseProps("invaders")} />);
    expect(screen.getByText(/Invasión numérica/)).toBeInTheDocument();
    expect(screen.queryByText("¡Iniciar misión!")).not.toBeInTheDocument();
  });

  test('"breakout" renderiza BreakoutGeneric, no otra actividad', () => {
    render(<LevelActivityOverlay {...baseProps("breakout")} />);
    expect(screen.getByText(/Bloques numéricos/)).toBeInTheDocument();
    expect(screen.queryByText("¡Iniciar misión!")).not.toBeInTheDocument();
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

  test('con "snake", el override recordAttempt también protege el sandbox (mismo mecanismo)', () => {
    // Solo confirma que el override llega hasta el overlay de Snake (mismo
    // criterio de despacho que "cohete") — la mecánica de juego de Snake
    // (que sí ejercita `recordAttempt` de punta a punta) ya se prueba en
    // SnakeGeneric.test.tsx; acá alcanza con que el componente monte y
    // reciba la prop, sin jugar una partida completa dentro de este archivo.
    const recordAttempt = vi.fn(async (_fns, _db, _parentId, _childId, _mod, _prev, correct: boolean) => outcome(correct));
    render(
      <LevelActivityOverlay
        {...baseProps("snake", {
          moduleId: "aritmetica-valor-posicional",
          progressBySkill: { "aritmetica-d2": { recentResults: [], recentAccuracy: 1, masteredAt: Date.now() } },
          recordAttempt,
        })}
      />,
    );
    expect(screen.getByText("¡Empezar!")).toBeInTheDocument();
  });

  test('con "frogger", el override recordAttempt también protege el sandbox (mismo mecanismo)', () => {
    // Mismo criterio que el test de "snake": la mecánica de juego de
    // Frogger (que sí ejercita `recordAttempt` de punta a punta) ya se
    // prueba en FroggerGeneric.test.tsx.
    const recordAttempt = vi.fn(async (_fns, _db, _parentId, _childId, _mod, _prev, correct: boolean) => outcome(correct));
    render(
      <LevelActivityOverlay
        {...baseProps("frogger", {
          moduleId: "aritmetica-valor-posicional",
          progressBySkill: { "aritmetica-d2": { recentResults: [], recentAccuracy: 1, masteredAt: Date.now() } },
          recordAttempt,
        })}
      />,
    );
    expect(screen.getByText(/Estanque de operaciones/)).toBeInTheDocument();
  });

  test('con "runner", el override recordAttempt también protege el sandbox (mismo mecanismo)', () => {
    const recordAttempt = vi.fn(async (_fns, _db, _parentId, _childId, _mod, _prev, correct: boolean) => outcome(correct));
    render(
      <LevelActivityOverlay
        {...baseProps("runner", {
          moduleId: "aritmetica-valor-posicional",
          progressBySkill: { "aritmetica-d2": { recentResults: [], recentAccuracy: 1, masteredAt: Date.now() } },
          recordAttempt,
        })}
      />,
    );
    expect(screen.getByText(/Autopista de resultados/)).toBeInTheDocument();
  });

  test('con "pacman", el override recordAttempt también protege el sandbox (mismo mecanismo)', () => {
    const recordAttempt = vi.fn(async (_fns, _db, _parentId, _childId, _mod, _prev, correct: boolean) => outcome(correct));
    render(
      <LevelActivityOverlay
        {...baseProps("pacman", {
          moduleId: "aritmetica-valor-posicional",
          progressBySkill: { "aritmetica-d2": { recentResults: [], recentAccuracy: 1, masteredAt: Date.now() } },
          recordAttempt,
        })}
      />,
    );
    expect(screen.getByText(/Laberinto de números/)).toBeInTheDocument();
  });

  test('con "invaders", el override recordAttempt también protege el sandbox (mismo mecanismo)', () => {
    const recordAttempt = vi.fn(async (_fns, _db, _parentId, _childId, _mod, _prev, correct: boolean) => outcome(correct));
    render(
      <LevelActivityOverlay
        {...baseProps("invaders", {
          moduleId: "aritmetica-valor-posicional",
          progressBySkill: { "aritmetica-d2": { recentResults: [], recentAccuracy: 1, masteredAt: Date.now() } },
          recordAttempt,
        })}
      />,
    );
    expect(screen.getByText(/Invasión numérica/)).toBeInTheDocument();
  });

  test('con "breakout", el override recordAttempt también protege el sandbox (mismo mecanismo)', () => {
    const recordAttempt = vi.fn(async (_fns, _db, _parentId, _childId, _mod, _prev, correct: boolean) => outcome(correct));
    render(
      <LevelActivityOverlay
        {...baseProps("breakout", {
          moduleId: "aritmetica-valor-posicional",
          progressBySkill: { "aritmetica-d2": { recentResults: [], recentAccuracy: 1, masteredAt: Date.now() } },
          recordAttempt,
        })}
      />,
    );
    expect(screen.getByText(/Bloques numéricos/)).toBeInTheDocument();
  });
});
