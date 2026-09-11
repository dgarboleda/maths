import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getModule, type ModuleDef } from "@/lib/curriculum";
import type { Problem } from "@/lib/problem";
import type { AttemptOutcome } from "@/lib/attemptRecorder";
import { PuzzleOverlay, type PuzzleRules } from "./PuzzleOverlay";

/**
 * Fase 29 (docs/plan-jugabilidad.md §3): reintentos (`maxAttemptsPerChallenge`),
 * pista diferida (`hintsAfterAttempts`), `lockedModulePolicy` y "Salir" sin
 * resolver con `challengesAreMandatory: false`. Sin Firebase real:
 * `recordAttempt`/`awardBadges` son los mismos overrides que ya usa el Play
 * Test (Fase 11), así que no hace falta mockear `getFirebase` más que para
 * que la promesa resuelva algo — nunca se leen sus campos.
 */
vi.mock("@/lib/firebase", () => ({
  getFirebase: async () => ({ db: {}, firestore: {} }),
}));
vi.mock("@/lib/gameSound", () => ({ playSound: () => {} }));
vi.mock("@/lib/confetti", () => ({ triggerConfetti: () => {} }));

const PROBLEM: Problem = {
  id: "fixture-1",
  difficulty: 1,
  kind: "fixture",
  prompt: "¿Cuánto es 3 + 4?",
  answer: 7,
  inputType: "integer",
  hints: ["Pista conceptual", "Primer paso", "Casi la respuesta"],
};

// `missingPrerequisites` resuelve el módulo por id contra la currícula real
// (`getModule`), no contra el objeto que le pasa el componente — así que
// para probar el candado hace falta un id real con prerrequisitos reales.
// `generateProblem` sí se toma del objeto tal cual, así que se sobreescribe
// para que el problema sea determinístico en el test.
const MOD: ModuleDef = { ...getModule("aritmetica-d1")!, generateProblem: () => PROBLEM }; // sin prerrequisitos
const LOCKED_MOD: ModuleDef = { ...getModule("aritmetica-d2")!, generateProblem: () => PROBLEM }; // requiere aritmetica-d1

function outcome(correct: boolean): AttemptOutcome {
  return {
    updatedProgress: { recentResults: [], recentAccuracy: correct ? 1 : 0, masteredAt: null },
    wasMastered: false,
    stars: correct ? 5 : 0,
  };
}

const INTERACTABLE = { id: MOD.id, moduleId: MOD.id, kind: "terminal" as const, label: "Terminal", clue: "Resuélvelo", reward: "¡Bien!", x: 0, y: 0 };

function setup(rules?: PuzzleRules, mod: ModuleDef = MOD) {
  const recordAttempt = vi.fn(async (_fns, _db, _parentId, _childId, _mod, _prev, correct: boolean) => outcome(correct));
  const onWaive = vi.fn();
  render(
    <PuzzleOverlay
      parentId="padre-1"
      childId="hijo-1"
      interactable={{ ...INTERACTABLE, moduleId: mod.id }}
      mod={mod}
      progressBySkill={{}}
      streak={0}
      soundOn={false}
      rules={rules}
      onClose={() => {}}
      onResolved={() => {}}
      onWaive={onWaive}
      recordAttempt={recordAttempt}
    />,
  );
  return { recordAttempt, onWaive };
}

async function answer(user: ReturnType<typeof userEvent.setup>, value: string) {
  await user.clear(screen.getByLabelText("Tu respuesta"));
  await user.type(screen.getByLabelText("Tu respuesta"), value);
  await user.click(screen.getByRole("button", { name: "Comprobar" }));
}

describe("PuzzleOverlay — reintentos (Fase 29)", () => {
  test("con maxAttemptsPerChallenge: 3, dos fallos no escriben nada y el tercero (correcto) escribe un único intento", async () => {
    const user = userEvent.setup();
    const { recordAttempt } = setup({ maxAttemptsPerChallenge: 3, hintsAfterAttempts: 0, lockedModulePolicy: "showLocked", challengesAreMandatory: true });

    await answer(user, "1"); // fallo 1/3 — sin escribir
    expect(recordAttempt).not.toHaveBeenCalled();
    expect(screen.getByText(/inténtalo de nuevo/i)).toHaveTextContent("intento 2 de 3");

    await answer(user, "2"); // fallo 2/3 — sin escribir
    expect(recordAttempt).not.toHaveBeenCalled();
    expect(screen.getByText(/inténtalo de nuevo/i)).toHaveTextContent("intento 3 de 3");

    await answer(user, "7"); // acierta en el último intento
    expect(recordAttempt).toHaveBeenCalledTimes(1);
    expect(recordAttempt.mock.calls[0][6]).toBe(true); // `correct`
    expect(await screen.findByText(/CÓDIGO ACEPTADO/)).toBeInTheDocument();
  });

  test("con maxAttemptsPerChallenge: 2, agotar los intentos sin acertar escribe un único intento incorrecto", async () => {
    const user = userEvent.setup();
    const { recordAttempt } = setup({ maxAttemptsPerChallenge: 2, hintsAfterAttempts: 0, lockedModulePolicy: "showLocked", challengesAreMandatory: true });

    await answer(user, "1"); // fallo 1/2 — sin escribir
    expect(recordAttempt).not.toHaveBeenCalled();

    await answer(user, "2"); // fallo 2/2 — se agotó: escribe el resultado final (incorrecto)
    expect(recordAttempt).toHaveBeenCalledTimes(1);
    expect(recordAttempt.mock.calls[0][6]).toBe(false);
    expect(await screen.findByText(/CÓDIGO RECHAZADO/)).toBeInTheDocument();
  });

  test("maxAttemptsPerChallenge: 0 (ilimitado) nunca escribe hasta acertar", async () => {
    const user = userEvent.setup();
    const { recordAttempt } = setup({ maxAttemptsPerChallenge: 0, hintsAfterAttempts: 0, lockedModulePolicy: "showLocked", challengesAreMandatory: true });

    for (const wrong of ["1", "2", "3", "4", "5"]) {
      await answer(user, wrong);
    }
    expect(recordAttempt).not.toHaveBeenCalled();

    await answer(user, "7");
    expect(recordAttempt).toHaveBeenCalledTimes(1);
    expect(recordAttempt.mock.calls[0][6]).toBe(true);
  });

  test("sin `rules` (Ciudad Central legacy) revela el resultado en el primer intento, igual que siempre", async () => {
    const user = userEvent.setup();
    const { recordAttempt } = setup(undefined);

    await answer(user, "1");
    expect(recordAttempt).toHaveBeenCalledTimes(1);
    expect(recordAttempt.mock.calls[0][6]).toBe(false);
    expect(await screen.findByText(/CÓDIGO RECHAZADO/)).toBeInTheDocument();
  });
});

describe("PuzzleOverlay — pista diferida (hintsAfterAttempts)", () => {
  test("con hintsAfterAttempts: 1, la pista no aparece hasta el primer fallo", async () => {
    const user = userEvent.setup();
    setup({ maxAttemptsPerChallenge: 0, hintsAfterAttempts: 1, lockedModulePolicy: "showLocked", challengesAreMandatory: true });

    expect(screen.queryByRole("button", { name: "Ejecutar diagnóstico" })).not.toBeInTheDocument();
    await answer(user, "1");
    expect(screen.getByRole("button", { name: "Ejecutar diagnóstico" })).toBeInTheDocument();
  });
});

describe("PuzzleOverlay — lockedModulePolicy", () => {
  test("showLocked (por defecto) bloquea un módulo con prerrequisito faltante", () => {
    setup({ maxAttemptsPerChallenge: 1, hintsAfterAttempts: 0, lockedModulePolicy: "showLocked", challengesAreMandatory: true }, LOCKED_MOD);
    expect(screen.getByText(/El sistema no te reconoce todavía/)).toBeInTheDocument();
  });

  test("allowAnyway deja jugar el mismo módulo bloqueado", () => {
    setup({ maxAttemptsPerChallenge: 1, hintsAfterAttempts: 0, lockedModulePolicy: "allowAnyway", challengesAreMandatory: true }, LOCKED_MOD);
    expect(screen.queryByText(/El sistema no te reconoce todavía/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Tu respuesta")).toBeInTheDocument();
  });
});

describe("PuzzleOverlay — Salir sin resolver (challengesAreMandatory)", () => {
  test("con challengesAreMandatory: false, Salir sin resolver avisa con onWaive", async () => {
    const user = userEvent.setup();
    const { onWaive } = setup({ maxAttemptsPerChallenge: 1, hintsAfterAttempts: 0, lockedModulePolicy: "showLocked", challengesAreMandatory: false });
    await user.click(screen.getByRole("button", { name: "Salir" }));
    expect(onWaive).toHaveBeenCalledTimes(1);
  });

  test("con challengesAreMandatory: true (por defecto), Salir sin resolver NO avisa", async () => {
    const user = userEvent.setup();
    const { onWaive } = setup({ maxAttemptsPerChallenge: 1, hintsAfterAttempts: 0, lockedModulePolicy: "showLocked", challengesAreMandatory: true });
    await user.click(screen.getByRole("button", { name: "Salir" }));
    expect(onWaive).not.toHaveBeenCalled();
  });

  test("con challengesAreMandatory: false pero el módulo bloqueado, Salir NO avisa", async () => {
    const user = userEvent.setup();
    const { onWaive } = setup({ maxAttemptsPerChallenge: 1, hintsAfterAttempts: 0, lockedModulePolicy: "showLocked", challengesAreMandatory: false }, LOCKED_MOD);
    await user.click(screen.getByRole("button", { name: "Salir" }));
    expect(onWaive).not.toHaveBeenCalled();
  });
});
