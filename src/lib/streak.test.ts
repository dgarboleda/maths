import { describe, expect, test, vi } from "vitest";
import { nextStreak, recordStreak } from "./streak";

/**
 * Fase 35 (docs/plan-jugabilidad.md §9) — criterio de aceptación del plan:
 * "dos sesiones el mismo día no suben la racha; días consecutivos sí; un
 * hueco reinicia a 1 y starBalance no cambia". Reloj inyectado — cero
 * dependencia del reloj real de la máquina que corre el test.
 */
describe("nextStreak", () => {
  test("sin racha previa, el primer día cuenta como 1", () => {
    expect(nextStreak(undefined, new Date(2026, 0, 15))).toEqual({ streakDays: 1, lastPlayedDay: "2026-01-15" });
  });

  test("dos sesiones el mismo día no suben la racha", () => {
    const prev = { streakDays: 3, lastPlayedDay: "2026-01-15" };
    expect(nextStreak(prev, new Date(2026, 0, 15, 23, 59))).toEqual({ streakDays: 3, lastPlayedDay: "2026-01-15" });
  });

  test("un día calendario consecutivo suma uno", () => {
    const prev = { streakDays: 3, lastPlayedDay: "2026-01-15" };
    expect(nextStreak(prev, new Date(2026, 0, 16))).toEqual({ streakDays: 4, lastPlayedDay: "2026-01-16" });
  });

  test("un hueco (se saltó un día) reinicia a 1, nunca a 0", () => {
    const prev = { streakDays: 12, lastPlayedDay: "2026-01-10" };
    expect(nextStreak(prev, new Date(2026, 0, 15))).toEqual({ streakDays: 1, lastPlayedDay: "2026-01-15" });
  });

  test("el consecutivo cruza el fin de mes correctamente", () => {
    const prev = { streakDays: 5, lastPlayedDay: "2026-01-31" };
    expect(nextStreak(prev, new Date(2026, 1, 1))).toEqual({ streakDays: 6, lastPlayedDay: "2026-02-01" });
  });
});

describe("recordStreak", () => {
  function fakeFirestoreFns() {
    return {
      doc: vi.fn(() => "doc-ref"),
      updateDoc: vi.fn(async () => {}),
    } as unknown as typeof import("firebase/firestore");
  }

  test("un día consecutivo escribe la racha nueva — y nunca toca starBalance/starLedger", async () => {
    const fns = fakeFirestoreFns();
    const result = await recordStreak(fns, {} as never, "padre-1", "hijo-1", { streakDays: 3, lastPlayedDay: "2026-01-15" }, new Date(2026, 0, 16));

    expect(result).toEqual({ streakDays: 4, lastPlayedDay: "2026-01-16" });
    expect(fns.updateDoc).toHaveBeenCalledTimes(1);
    expect(fns.doc).toHaveBeenCalledWith({}, "parents", "padre-1", "children", "hijo-1");
    // Ningún argumento de esta llamada menciona starBalance/starLedger — la
    // racha es puramente informativa.
    const [, writtenFields] = (fns.updateDoc as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(Object.keys(writtenFields)).toEqual(["streakDays", "lastPlayedDay"]);
  });

  test("ya jugado hoy: no escribe nada en Firestore", async () => {
    const fns = fakeFirestoreFns();
    const result = await recordStreak(fns, {} as never, "padre-1", "hijo-1", { streakDays: 3, lastPlayedDay: "2026-01-15" }, new Date(2026, 0, 15, 20));

    expect(result).toEqual({ streakDays: 3, lastPlayedDay: "2026-01-15" });
    expect(fns.updateDoc).not.toHaveBeenCalled();
  });
});
