import { describe, expect, test, vi } from "vitest";
import { recordModuleAttempt } from "./attemptRecorder";
import type { ModuleDef } from "./curriculum";

/**
 * Fase 32 (docs/plan-jugabilidad.md §6): `repeatsToday` llegaba siempre en
 * 0 acá — machacar el mismo desafío fácil rendía estrellas plenas para
 * siempre en el camino principal (PuzzleOverlay/LevelRuntime), a
 * diferencia de la pestaña Práctica ([moduleId]/page.tsx), que sí lo
 * cuenta. Fixtures mínimos de Firestore: ningún dato real, solo que las
 * llamadas encadenen sin explotar.
 */
function fakeFirestoreFns() {
  const batch = { set: vi.fn(), commit: vi.fn(async () => {}) };
  return {
    addDoc: vi.fn(async () => {}),
    collection: vi.fn(() => "collection-ref"),
    doc: vi.fn(() => "doc-ref"),
    serverTimestamp: vi.fn(() => "server-timestamp"),
    setDoc: vi.fn(async () => {}),
    writeBatch: vi.fn(() => batch),
    increment: vi.fn((n: number) => n),
  } as unknown as typeof import("firebase/firestore");
}

const MOD: ModuleDef = {
  id: "mod-1",
  strandSlug: "aritmetica",
  difficulty: 5,
  label: "Módulo de prueba",
  emoji: "🧪",
  tier: 1,
  prerequisites: [],
  generateProblem: () => {
    throw new Error("no se usa en este test");
  },
  ConceptComponent: () => null,
};

describe("recordModuleAttempt — repeatsToday", () => {
  test("sin repeatsToday (default 0), rinde estrellas plenas", async () => {
    const fns = fakeFirestoreFns();
    const outcome = await recordModuleAttempt(fns, {} as never, "padre", "hijo", MOD, undefined, true, 0);
    expect(outcome.stars).toBe(10); // baseStars(5) = 10, sin streak/pistas/repeticiones
  });

  test("con repeatsToday > 0, las estrellas bajan (mismo diminishingFactor que la pestaña Práctica)", async () => {
    const fns = fakeFirestoreFns();
    const outcome = await recordModuleAttempt(fns, {} as never, "padre", "hijo", MOD, undefined, true, 0, 0, 2);
    expect(outcome.stars).toBeLessThan(10);
    expect(outcome.stars).toBe(4); // 10 * diminishingFactor(2) = 10 * 0.4 = 4
  });

  test("una respuesta incorrecta no otorga estrellas, sea cual sea repeatsToday", async () => {
    const fns = fakeFirestoreFns();
    const outcome = await recordModuleAttempt(fns, {} as never, "padre", "hijo", MOD, undefined, false, 0, 0, 5);
    expect(outcome.stars).toBe(0);
  });
});
