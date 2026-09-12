import { describe, expect, test, vi } from "vitest";
import { recordIfBest } from "./records";
import type { PersonalRecord } from "./records";

/** Fase 35 (docs/plan-jugabilidad.md §9) — marcas personales: solo suben,
 *  nunca se reduce un valor ya guardado (P1). */
describe("recordIfBest", () => {
  function fakeFirestoreFns() {
    return {
      doc: vi.fn(() => "doc-ref"),
      setDoc: vi.fn(async () => {}),
    } as unknown as typeof import("firebase/firestore");
  }

  test("sin marca previa, cualquier puntaje se guarda como nueva marca", async () => {
    const fns = fakeFirestoreFns();
    const result = await recordIfBest(fns, {} as never, "padre-1", "hijo-1", "cohete", "mod-1", 5, null, 1000);

    expect(result).toEqual({ best: 5, at: 1000 });
    expect(fns.setDoc).toHaveBeenCalledTimes(1);
  });

  test("un puntaje mayor que la marca previa la reemplaza", async () => {
    const fns = fakeFirestoreFns();
    const prev: PersonalRecord = { best: 5, at: 500 };
    const result = await recordIfBest(fns, {} as never, "padre-1", "hijo-1", "cohete", "mod-1", 8, prev, 1500);

    expect(result).toEqual({ best: 8, at: 1500 });
    expect(fns.setDoc).toHaveBeenCalledTimes(1);
  });

  test("un puntaje igual o menor no escribe nada y devuelve la marca previa intacta", async () => {
    const fns = fakeFirestoreFns();
    const prev: PersonalRecord = { best: 8, at: 500 };

    const same = await recordIfBest(fns, {} as never, "padre-1", "hijo-1", "cohete", "mod-1", 8, prev, 1500);
    const lower = await recordIfBest(fns, {} as never, "padre-1", "hijo-1", "cohete", "mod-1", 3, prev, 1500);

    expect(same).toEqual(prev);
    expect(lower).toEqual(prev);
    expect(fns.setDoc).not.toHaveBeenCalled();
  });

  test("el documento se ubica en records/{activityId}:{moduleId} del hijo", async () => {
    const fns = fakeFirestoreFns();
    await recordIfBest(fns, {} as never, "padre-1", "hijo-1", "cohete", "mod-1", 5, null, 1000);

    expect(fns.doc).toHaveBeenCalledWith({}, "parents", "padre-1", "children", "hijo-1", "records", "cohete:mod-1");
  });
});
