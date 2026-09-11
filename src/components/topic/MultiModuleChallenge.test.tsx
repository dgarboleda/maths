import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ModuleDef } from "@/lib/curriculum";
import type { Problem } from "@/lib/problem";
import { MultiModuleChallenge } from "./MultiModuleChallenge";

/**
 * Fase 34 (docs/plan-jugabilidad.md §8) — criterio de aceptación del plan:
 * "3 fallos con lives: 3 disparan onDefeat y no pintan closingMessage. Sin
 * lives, el comportamiento es idéntico al actual" (test de regresión).
 */
vi.mock("@/lib/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "hijo-1" }, parentId: "padre-1", loading: false, role: "parent", childId: undefined }),
}));
vi.mock("@/lib/firebase", () => ({
  getFirebase: async () => ({
    db: {},
    firestore: {
      collection: () => "collection-ref",
      doc: () => "doc-ref",
      getDocs: async () => ({ forEach: () => {} }), // skillsProgress vacío: sin progreso previo
      addDoc: async () => {},
      setDoc: async () => {},
      serverTimestamp: () => "server-timestamp",
      writeBatch: () => ({ set: () => {}, commit: async () => {} }),
      increment: (n: number) => n,
    },
  }),
}));
vi.mock("@/lib/gameSound", () => ({ playSound: () => {} }));
vi.mock("@/lib/confetti", () => ({ triggerConfetti: () => {} }));

function wrongProblem(id: string): Problem {
  return { id, difficulty: 1, kind: "fixture", prompt: "¿Cuánto es 1 + 1?", answer: 2, inputType: "integer" };
}

function fixtureModule(id: string): ModuleDef {
  return {
    id,
    strandSlug: "aritmetica",
    difficulty: 1,
    label: `Módulo ${id}`,
    emoji: "🧪",
    tier: 1,
    prerequisites: [],
    generateProblem: () => wrongProblem(id),
    ConceptComponent: () => null,
  };
}

const MODULES = [fixtureModule("mod-1"), fixtureModule("mod-2"), fixtureModule("mod-3")];
const THEME = { icon: "💥", title: "Prueba", tagline: "Tagline de prueba", closingMessage: "¡Ganaste!" };

// El input real se etiqueta con `aria-labelledby` al enunciado (pisa el
// `aria-label="Tu respuesta"` por precedencia ARIA — ver PuzzleOverlay.test.tsx
// en Fase 29 para el mismo hallazgo) — un solo textbox visible por vez.
async function answerWrong(user: ReturnType<typeof userEvent.setup>) {
  // `findByRole` (no `getByRole`): el progreso se carga async (`getFirebase`
  // → `getDocs`) antes de dejar "Cargando…" — sin esperarlo, la primera
  // llamada de cada test corre contra un DOM que todavía no tiene el input.
  await user.type(await screen.findByRole("textbox"), "999");
  await user.click(screen.getByRole("button", { name: "Comprobar" }));
}

describe("MultiModuleChallenge — vidas (Fase 34)", () => {
  test("con lives: 3, tres fallos seguidos disparan onDefeat y nunca pintan closingMessage", async () => {
    const user = userEvent.setup();
    const onDefeat = vi.fn();
    render(<MultiModuleChallenge childId="hijo-1" modules={MODULES} theme={THEME} lives={3} onDefeat={onDefeat} />);

    await screen.findByText("¿Cuánto es 1 + 1?");
    await answerWrong(user); // fallo 1/3 — sigue habiendo vidas: pantalla de feedback normal
    expect(onDefeat).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: "Siguiente" }));

    await answerWrong(user); // fallo 2/3
    expect(onDefeat).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: "Siguiente" }));

    await answerWrong(user); // fallo 3/3 — se agotaron las vidas
    expect(onDefeat).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Te quedaste sin vidas.")).toBeInTheDocument();
    expect(screen.queryByText(THEME.closingMessage)).not.toBeInTheDocument();
  });

  test('con lives: 3, "Volver a intentar" reinicia desde el primer módulo', async () => {
    const user = userEvent.setup();
    render(<MultiModuleChallenge childId="hijo-1" modules={MODULES} theme={THEME} lives={3} />);

    for (let i = 0; i < 2; i++) {
      await answerWrong(user);
      await user.click(await screen.findByRole("button", { name: "Siguiente" }));
    }
    await answerWrong(user); // agota las 3 vidas
    await user.click(await screen.findByRole("button", { name: "Volver a intentar" }));

    expect(await screen.findByText("Prueba · 1/3")).toBeInTheDocument();
  });

  test("sin lives (el comportamiento de siempre), fallar todo no dispara ninguna derrota", async () => {
    const user = userEvent.setup();
    const onDefeat = vi.fn();
    render(<MultiModuleChallenge childId="hijo-1" modules={MODULES} theme={THEME} onDefeat={onDefeat} />);

    for (let i = 0; i < MODULES.length; i++) {
      await answerWrong(user);
      await user.click(await screen.findByRole("button", { name: "Siguiente" }));
    }

    expect(onDefeat).not.toHaveBeenCalled();
    expect(await screen.findByText(THEME.closingMessage)).toBeInTheDocument();
  });

  test("onStepResolved recibe el problema resuelto (para derivar el dígito del código, no Math.random())", async () => {
    const user = userEvent.setup();
    const onStepResolved = vi.fn();
    render(<MultiModuleChallenge childId="hijo-1" modules={[fixtureModule("mod-1")]} theme={THEME} onStepResolved={onStepResolved} />);

    await user.type(await screen.findByRole("textbox"), "2");
    await user.click(screen.getByRole("button", { name: "Comprobar" }));

    expect(onStepResolved).toHaveBeenCalledWith(0, true, expect.objectContaining({ answer: 2 }));
  });
});
