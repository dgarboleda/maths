import { describe, expect, test } from "vitest";
import {
  ADVENTURES,
  applyAdventureAction,
  getAdventure,
  getLesson,
  initialAdventure,
  LEARNING_UNITS,
} from "./domain";

const NOW = 1_700_000_000_000;
/** Un plan correcto por aventura, calculado a mano. */
const SOLUTIONS: Record<string, number[]> = {
  apagon: [90, 20, 10],
  "camara-fria": [-24, -18, 3],
  "receta-festival": [500, 750, 5, 2],
  "ascensor-carga": [10, 4],
  "jardin-baldosas": [8, 36],
  "huerto-escolar": [10, 8],
  "torneo-lanzamientos": [8, 8, 10],
};
const play = (id: string, allocation: number[]) =>
  applyAdventureAction(
    applyAdventureAction(undefined, { kind: "inspect" }, NOW, id),
    { kind: "dispatch", allocation },
    NOW,
    id,
  );

describe("Aventuras por unidad", () => {
  test("una aventura por unidad, con ids propios y clases existentes", () => {
    expect(new Set(ADVENTURES.map((a) => a.id)).size).toBe(ADVENTURES.length);
    for (const unit of LEARNING_UNITS)
      expect(ADVENTURES.filter((a) => a.unitId === unit.id), unit.id).toHaveLength(1);
    for (const adventure of ADVENTURES) {
      // El id comparte la callable con clases y repasos: no puede chocar.
      expect(getLesson(adventure.id)).toBeUndefined();
      expect(adventure.id.startsWith("repaso-")).toBe(false);
      expect(adventure.id).toMatch(/^[a-z][a-z0-9-]{0,40}$/);
      adventure.lessonIds.forEach((id) => expect(getLesson(id), id).toBeDefined());
      expect(adventure.inputs.length).toBeGreaterThanOrEqual(2);
      for (const input of adventure.inputs) {
        expect(input.min).toBeLessThan(input.max);
        expect(input.start).toBeGreaterThanOrEqual(input.min);
        expect(input.start).toBeLessThanOrEqual(input.max);
        expect(input.clue.length).toBeGreaterThan(10);
      }
      expect(initialAdventure(adventure.id).allocation).toHaveLength(adventure.inputs.length);
    }
  });

  test.each(ADVENTURES.map((a) => a.id))("%s: el plan inicial falla y el correcto completa", (id) => {
    const adventure = getAdventure(id)!;
    const start = adventure.evaluate(adventure.inputs.map((i) => i.start));
    expect(start.goals).toHaveLength(adventure.goals.length);
    expect(start.goals.every(Boolean)).toBe(false);
    const done = play(id, SOLUTIONS[id]);
    expect(done.completedAt).toBe(NOW);
    expect(adventure.evaluate(SOLUTIONS[id]).goals.every(Boolean)).toBe(true);
  });

  test("cada error frecuente recibe una pista propia", () => {
    expect(play("camara-fria", [-24, -15, 3]).feedback).toMatch(/por encima de −18/);
    expect(play("camara-fria", [-28, -18, 4]).feedback).toMatch(/Restar un negativo suma/);
    expect(play("receta-festival", [206, 750, 5, 2]).feedback).toMatch(/no crecen sumando/);
    expect(play("receta-festival", [500, 750, 5, 3]).feedback).toMatch(/sobra/);
    expect(play("ascensor-carga", [12, 4]).feedback).toMatch(/Sobrecarga/);
    expect(play("ascensor-carga", [8, 5]).feedback).toMatch(/solo hay tiempo para 4/);
    expect(play("jardin-baldosas", [8, 32]).feedback).toMatch(/esquinas/);
    expect(play("jardin-baldosas", [7, 32]).feedback).toMatch(/menos de 50/);
    expect(play("jardin-baldosas", [10, 44]).feedback).toMatch(/solo tiene 40/);
    expect(play("huerto-escolar", [20, 16]).feedback).toMatch(/dos lados/);
    expect(play("huerto-escolar", [12, 6]).completedAt).toBe(NOW);
    expect(play("huerto-escolar", [8, 10]).feedback).toMatch(/camino de riego/);
    expect(play("torneo-lanzamientos", [8, 8, 8]).feedback).toMatch(/de 3 lanzamientos/);
    expect(play("torneo-lanzamientos", [9, 9, 8]).feedback).toMatch(/moda es 9/);
  });

  test("el plan debe tener una entrada por decisión y respetar los rangos", () => {
    const inspected = applyAdventureAction(undefined, { kind: "inspect" }, NOW, "ascensor-carga");
    for (const allocation of [[10], [10, 4, 1], [10, 2.5], [-1, 4], [10, 21]])
      expect(() =>
        applyAdventureAction(inspected, { kind: "dispatch", allocation }, NOW, "ascensor-carga"),
      ).toThrow(/entero/);
    expect(() => applyAdventureAction(undefined, { kind: "inspect" }, NOW, "no-existe")).toThrow(
      /no existe/,
    );
  });
});
