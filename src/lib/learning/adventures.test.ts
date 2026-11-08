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
  apagon: [100, 45, 35],
  "camara-fria": [-24, -18, 3],
  "receta-festival": [700, 1050, 7, 3],
  "ascensor-carga": [11, 4],
  "jardin-baldosas": [11, 48],
  "huerto-escolar": [12, 10],
  "torneo-lanzamientos": [8, 8, 9],
  "convoy-suministros": [36, 42],
  "mezcla-emergencia": [17, 17],
  "mercado-barrio": [144, 3],
  "rescate-montana": [12, 10],
  "feria-energia": [6, 4],
  "ruta-dron": [6, 4],
  "deposito-agua": [12, 8000],
  "puente-valle": [10, 5],
  "tombola-solidaria": [6, 14],
  "alerta-meteorologica": [5, 75],
  "ahorro-observatorio": [1100, 1210],
  "trayectoria-cohete": [4, 16],
};
const play = (id: string, allocation: number[]) =>
  applyAdventureAction(
    applyAdventureAction(undefined, { kind: "inspect" }, NOW, id),
    { kind: "dispatch", allocation },
    NOW,
    id,
  );

describe("Aventuras por unidad", () => {
  test("cada unidad tiene aventuras con ids propios y clases existentes", () => {
    expect(new Set(ADVENTURES.map((a) => a.id)).size).toBe(ADVENTURES.length);
    for (const unit of LEARNING_UNITS)
      expect(ADVENTURES.filter((a) => a.unitId === unit.id), unit.id).not.toHaveLength(0);
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
    expect(play("receta-festival", [210, 1050, 7, 3]).feedback).toMatch(/no crecen sumando/);
    expect(play("receta-festival", [700, 1050, 7, 4]).feedback).toMatch(/sobra/);
    expect(play("ascensor-carga", [12, 4]).feedback).toMatch(/Sobrecarga/);
    expect(play("ascensor-carga", [8, 5]).feedback).toMatch(/solo hay tiempo para 4/);
    expect(play("jardin-baldosas", [11, 44]).feedback).toMatch(/esquinas/);
    expect(play("jardin-baldosas", [10, 44]).feedback).toMatch(/menos de 110/);
    expect(play("jardin-baldosas", [12, 52]).feedback).toMatch(/solo tiene 48/);
    expect(getAdventure("jardin-baldosas")!.evaluate([11, 50]).goals[2]).toBe(false);
    expect(play("jardin-baldosas", [11, 50]).feedback).toMatch(/Elegiste 50/);
    expect(play("huerto-escolar", [24, 20]).feedback).toMatch(/dos lados/);
    expect(play("huerto-escolar", [13, 9]).completedAt).toBe(NOW);
    expect(play("huerto-escolar", [10, 12]).feedback).toMatch(/camino de riego/);
    expect(play("torneo-lanzamientos", [7, 7, 7]).feedback).toMatch(/de 3 lanzamientos/);
    expect(play("torneo-lanzamientos", [7, 8, 10]).feedback).toMatch(/rango es 6/);
    expect(play("torneo-lanzamientos", [9, 9, 7]).feedback).toMatch(/empate/);
  });

  test("las nuevas misiones se recomiendan tras una clase de su unidad", () => {
    for (const adventure of ADVENTURES.slice(7)) {
      const lastLesson = getLesson(adventure.lessonIds.at(-1)!);
      expect(lastLesson?.unitId, adventure.id).toBe(adventure.unitId);
    }
    expect(getAdventure("deposito-agua")!.lessonIds.at(-1)).toBe("volumen");
  });

  test("las nuevas misiones distinguen errores de razonamiento", () => {
    expect(play("convoy-suministros", [72, 78]).completedAt).toBeFalsy();
    expect(play("mercado-barrio", [140, 3]).completedAt).toBeFalsy();
    expect(play("feria-energia", [5, 5]).completedAt).toBeFalsy();
    expect(play("tombola-solidaria", [6, 13]).completedAt).toBeFalsy();
    expect(play("alerta-meteorologica", [5, 30]).completedAt).toBeFalsy();
    expect(play("trayectoria-cohete", [4, 12]).completedAt).toBeFalsy();
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
