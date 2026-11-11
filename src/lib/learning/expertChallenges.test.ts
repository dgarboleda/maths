import { describe, expect, test } from "vitest";
import { ADVENTURES, applyAdventureAction, expertInputs, STAR_REWARDS, type AdventureDef, type AdventureState } from "./domain";

const NOW = 1_700_000_000_000;

/** Solución de la misión (fase 1) y del reto experto, calculadas a mano. */
const SOLVED: Record<string, { mission: number[]; expert: number[] }> = {
  apagon: { mission: [100, 45, 35], expert: [90, 15, 15] },
  "camara-fria": { mission: [-24, -18, 3], expert: [-21, -15, 3] },
  "receta-festival": { mission: [700, 1050, 7, 3], expert: [900, 1350, 9, 4] },
  "ascensor-carga": { mission: [11, 4], expert: [9, 8] },
  "jardin-baldosas": { mission: [11, 48], expert: [13, 120] },
  "huerto-escolar": { mission: [12, 10], expert: [22, 11] },
  "torneo-lanzamientos": { mission: [8, 8, 9], expert: [7, 8, 10] },
  "convoy-suministros": { mission: [36, 42], expert: [24, 60] },
  "mezcla-emergencia": { mission: [17, 17], expert: [7, 2] },
  "mercado-barrio": { mission: [144, 3], expert: [168, 4] },
  "rescate-montana": { mission: [12, 10], expert: [10, 18] },
  "feria-energia": { mission: [6, 4], expert: [6, 7] },
  "ruta-dron": { mission: [6, 4], expert: [9, 6] },
  "deposito-agua": { mission: [12, 8000], expert: [8, 4900] },
  "puente-valle": { mission: [10, 5], expert: [29, 10] },
  "tombola-solidaria": { mission: [6, 14], expert: [11, 19] },
  "alerta-meteorologica": { mission: [5, 75], expert: [12, 60] },
  "ahorro-observatorio": { mission: [1100, 1210], expert: [5, 1600] },
  "trayectoria-cohete": { mission: [4, 16], expert: [25, 2, 8] },
};

/** Todos los planes posibles de un reto (los espacios son pequeños). */
function* plans(adventure: AdventureDef): Generator<number[]> {
  const inputs = expertInputs(adventure);
  const values = inputs.map((input) => input.min);
  while (true) {
    yield [...values];
    let i = values.length - 1;
    while (i >= 0 && values[i] === inputs[i].max) {
      values[i] = inputs[i].min;
      i--;
    }
    if (i < 0) return;
    values[i]++;
  }
}
function solutions(adventure: AdventureDef) {
  const found: number[][] = [];
  for (const plan of plans(adventure)) if (adventure.expert!.evaluate(plan).goals.every(Boolean)) found.push(plan);
  return found;
}
const space = (adventure: AdventureDef) => expertInputs(adventure).reduce((total, input) => total * (input.max - input.min + 1), 1);

describe("retos expertos", () => {
  test("todas las aventuras tienen reto experto", () => {
    expect(ADVENTURES.filter((adventure) => !adventure.expert).map((a) => a.id)).toEqual([]);
    expect(Object.keys(SOLVED).sort()).toEqual(ADVENTURES.map((a) => a.id).sort());
  });

  for (const adventure of ADVENTURES) {
    const { mission, expert } = SOLVED[adventure.id];
    const challenge = adventure.expert!;
    test(`${adventure.id}: tiene solución, distinta de la misión, y cada pista se explica`, () => {
      expect(adventure.evaluate(mission).goals.every(Boolean)).toBe(true);
      expect(challenge.goals.length).toBeGreaterThanOrEqual(2);
      expect(challenge.evaluate(expert)).toEqual({ goals: challenge.goals.map(() => true), feedback: `¡Reto superado! ${challenge.success}` });
      // La respuesta de la misión no supera el reto (si las entradas son las mismas).
      if (!challenge.inputs) expect(challenge.evaluate(mission).goals.every(Boolean)).toBe(false);
      // Las entradas propias admiten la solución y el plan inicial.
      const inputs = expertInputs(adventure);
      expect(expert).toHaveLength(inputs.length);
      expert.forEach((value, i) => {
        expect(value).toBeGreaterThanOrEqual(inputs[i].min);
        expect(value).toBeLessThanOrEqual(inputs[i].max);
      });
      // Cualquier plan con fallo recibe una pista concreta, no vacía ni indefinida.
      for (const plan of [inputs.map((i) => i.min), inputs.map((i) => i.max), mission.slice(0, inputs.length)]) {
        const result = challenge.evaluate(plan);
        if (!result.goals.every(Boolean)) {
          expect(result.feedback.length, `${adventure.id} ${plan}`).toBeGreaterThan(20);
          expect(result.feedback).not.toMatch(/undefined|NaN/);
        }
      }
    });

    // Los espacios de entrada grandes (miles de litros, gramos) se comprueban
    // con la solución conocida; el resto, plan por plan.
    if (space(adventure) <= 6_000_000)
      test(`${adventure.id}: el conjunto de soluciones es el esperado`, () => {
        const found = solutions(adventure);
        expect(found.length, adventure.id).toBeGreaterThan(0);
        expect(found).toContainEqual(expert);
        // Retos de «el mejor», «el mínimo» o «el máximo»: una sola respuesta.
        // La cámara admite varios planes; el torneo, el mismo trío en cualquier orden.
        if (adventure.id === "camara-fria") expect(found.length).toBeLessThanOrEqual(8);
        else if (adventure.id === "torneo-lanzamientos")
          expect(new Set(found.map((plan) => [...plan].sort((a, b) => a - b).join()))).toEqual(new Set(["7,8,10"]));
        else expect(found, adventure.id).toEqual([expert]);
      });
  }

  test("los óptimos son óptimos de verdad", () => {
    // Feria: el coste mínimo con al menos 47 kW y 14 generadores.
    let best = Infinity;
    for (let p = 0; p <= 20; p++) for (let g = 0; g <= 20; g++)
      if (2 * p + 5 * g >= 47 && p + g <= 14) best = Math.min(best, 300 * p + 800 * g);
    expect(best).toBe(7400);
    // Tómbola: la mayor probabilidad con 20–30 boletos y 15 soles de ganancia.
    let top = 0;
    for (let p = 0; p <= 20; p++) for (let s = 0; s <= 20; s++) {
      const n = p + s;
      if (n >= 20 && n <= 30 && 2 * n - 4 * p >= 15) top = Math.max(top, p / n);
    }
    expect(top).toBeCloseTo(11 / 30);
    // Receta: solo con los 9 huevos se cumple todo (la harina y la leche
    // dependen de los huevos; el espacio completo es demasiado grande).
    const recipe = ADVENTURES.find((a) => a.id === "receta-festival")!.expert!;
    expect(Array.from({ length: 21 }, (_, e) => e).filter((e) =>
      recipe.evaluate([100 * e, 150 * e, e, Math.ceil((100 * e) / 250)]).goals.every(Boolean))).toEqual([9]);
    // Huerto contra la pared: la mayor área con 44 m de cerca en tres lados.
    expect(Math.max(...Array.from({ length: 22 }, (_, a) => (44 - 2 * a) * a))).toBe(242);
    // Ahorro: el primer año en que 10 % compuesto supera a 12 % simple.
    expect(Array.from({ length: 10 }, (_, y) => y).find((y) => y > 0 && 1000 * 1.1 ** y > 1000 + 120 * y)).toBe(5);
  });
});

describe("motor del reto experto", () => {
  const id = "ascensor-carga";
  const completed = (): AdventureState =>
    applyAdventureAction(applyAdventureAction(undefined, { kind: "inspect" }, NOW, id), { kind: "dispatch", allocation: [11, 4] }, NOW, id);

  test("se desbloquea al completar la misión y exige leer el informe", () => {
    const fresh = applyAdventureAction(undefined, { kind: "inspect" }, NOW, id);
    expect(() => applyAdventureAction(fresh, { kind: "inspect", expert: true }, NOW, id)).toThrow(/Completa primero la misión/);
    const done = completed();
    expect(() => applyAdventureAction(done, { kind: "dispatch", allocation: [9, 8], expert: true }, NOW, id)).toThrow(/Lee primero el nuevo informe/);
    const read = applyAdventureAction(done, { kind: "inspect", expert: true }, NOW, id);
    expect(read.expert).toMatchObject({ inspected: true, attempts: 0, completedAt: null });
    // La misión no cambia.
    expect(read.completedAt).toBe(done.completedAt);
    expect(read.allocation).toEqual([11, 4]);
  });

  test("registra cada prueba, responde al plan y se completa una vez", () => {
    let state = applyAdventureAction(completed(), { kind: "inspect", expert: true }, NOW, id);
    state = applyAdventureAction(state, { kind: "dispatch", allocation: [11, 4], expert: true }, NOW + 1, id);
    expect(state.expert).toMatchObject({ attempts: 1, completedAt: null, allocation: [11, 4] });
    expect(state.expert!.feedback).toMatch(/margen de seguridad|600 kg/);
    state = applyAdventureAction(state, { kind: "dispatch", allocation: [9, 9], expert: true }, NOW + 2, id);
    expect(state.expert!.feedback).toMatch(/¿se puede con menos\?/);
    state = applyAdventureAction(state, { kind: "dispatch", allocation: [9, 8], expert: true }, NOW + 3, id);
    expect(state.expert).toMatchObject({ attempts: 3, completedAt: NOW + 3 });
    state = applyAdventureAction(state, { kind: "dispatch", allocation: [9, 9], expert: true }, NOW + 4, id);
    expect(state.expert!.completedAt).toBe(NOW + 3);
    expect(STAR_REWARDS.adventureExpert).toBe(5);
  });

  test("valida las entradas propias del reto", () => {
    const rocket = "trayectoria-cohete";
    let state = applyAdventureAction(applyAdventureAction(undefined, { kind: "inspect" }, NOW, rocket), { kind: "dispatch", allocation: [4, 16] }, NOW, rocket);
    state = applyAdventureAction(state, { kind: "inspect", expert: true }, NOW, rocket);
    expect(state.expert!.allocation).toEqual([0, 0, 0]);
    expect(() => applyAdventureAction(state, { kind: "dispatch", allocation: [25, 2], expert: true }, NOW, rocket)).toThrow(/número entero/);
    expect(() => applyAdventureAction(state, { kind: "dispatch", allocation: [25, 2, 11], expert: true }, NOW, rocket)).toThrow(/número entero/);
    expect(applyAdventureAction(state, { kind: "dispatch", allocation: [25, 2, 8], expert: true }, NOW, rocket).expert!.completedAt).toBe(NOW);
  });
});
