import { describe, expect, test } from "vitest";
import {
  ADVENTURES,
  applyAdventureAction,
  expertInputs,
  expertRounds,
  expertRoundSolved,
  expertVariant,
  getExpertChallenge,
  STAR_REWARDS,
  type AdventureDef,
  type AdventureState,
} from "./domain";

const NOW = 1_700_000_000_000;

/** Solución de la misión y de la partida original (0) del reto experto,
 *  calculadas a mano: los retos empezados antes de las partidas siguen
 *  jugando estos datos. */
const SOLVED: Record<string, { mission: number[]; expert: number[] }> = {
  apagon: { mission: [100, 45, 35], expert: [90, 15, 15] },
  "camara-fria": { mission: [-24, -18, 3], expert: [-21, -15, 2] },
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
/** Retos con varios planes válidos: la cámara admite un margen, el
 *  ascensor varias cargas con los mismos viajes y el torneo, la misma
 *  terna en cualquier orden. El resto acepta un único plan. */
const SEVERAL = new Set(["camara-fria", "ascensor-carga", "torneo-lanzamientos"]);

/** Todos los planes posibles de un reto. */
function* plans(adventure: AdventureDef): Generator<number[]> {
  const inputs = expertInputs(adventure, getExpertChallenge(adventure.id));
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
const space = (adventure: AdventureDef) => expertInputs(adventure, getExpertChallenge(adventure.id)).reduce((total, input) => total * (input.max - input.min + 1), 1);
const clean = (text: string) => !/undefined|NaN|null|Infinity/.test(text);

describe("retos expertos", () => {
  test("todas las aventuras tienen un reto con varias partidas distintas", () => {
    expect(ADVENTURES.filter((adventure) => !getExpertChallenge(adventure.id)).map((a) => a.id)).toEqual([]);
    expect(Object.keys(SOLVED).sort()).toEqual(ADVENTURES.map((a) => a.id).sort());
    for (const adventure of ADVENTURES) {
      const challenge = getExpertChallenge(adventure.id)!;
      expect(challenge.variants, adventure.id).toBeGreaterThanOrEqual(5);
      expect(challenge.variants, adventure.id).toBeLessThanOrEqual(12);
      const briefs = new Set(Array.from({ length: challenge.variants }, (_, v) => challenge.round(v).brief));
      expect(briefs.size, adventure.id).toBe(challenge.variants);
    }
  });

  test("la partida original conserva los datos del reto anterior a las partidas", () => {
    for (const adventure of ADVENTURES) expect(getExpertChallenge(adventure.id)!.solution(0), adventure.id).toEqual(SOLVED[adventure.id].expert);
  });

  for (const adventure of ADVENTURES) {
    const challenge = getExpertChallenge(adventure.id)!;
    const { mission } = SOLVED[adventure.id];
    test(`${adventure.id}: cada partida tiene solución, distinta de la misión, y responde a cualquier plan`, () => {
      const inputs = expertInputs(adventure, challenge);
      for (let v = 0; v < challenge.variants; v++) {
        const round = challenge.round(v), solution = challenge.solution(v);
        expect(clean(round.brief) && clean(round.success) && round.goals.every(clean), `${adventure.id} #${v}`).toBe(true);
        expect(solution, `${adventure.id} #${v}`).toHaveLength(inputs.length);
        solution.forEach((value, i) => {
          expect(Number.isInteger(value), `${adventure.id} #${v}`).toBe(true);
          expect(value).toBeGreaterThanOrEqual(inputs[i].min);
          expect(value).toBeLessThanOrEqual(inputs[i].max);
        });
        expect(round.evaluate(solution), `${adventure.id} #${v}`).toEqual({
          goals: round.goals.map(() => true),
          feedback: `¡Reto superado! ${round.success}`,
        });
        if (!challenge.inputs) expect(round.evaluate(mission).goals.every(Boolean), `${adventure.id} #${v}`).toBe(false);
        for (const plan of [inputs.map((i) => i.min), inputs.map((i) => i.max), mission.slice(0, inputs.length), solution.map((x, i) => (i === 0 ? x + 1 : x))]) {
          const result = round.evaluate(plan.map((x, i) => Math.min(inputs[i].max, Math.max(inputs[i].min, x))));
          if (!result.goals.every(Boolean)) {
            expect(result.feedback.length, `${adventure.id} #${v} ${plan}`).toBeGreaterThan(20);
            expect(clean(result.feedback), `${adventure.id} #${v} ${result.feedback}`).toBe(true);
          }
        }
      }
    });

    // Espacios pequeños: se prueban todos los planes de cada partida.
    if (space(adventure) <= 200_000)
      test(`${adventure.id}: en cada partida, solo se aceptan los planes correctos`, () => {
        for (let v = 0; v < challenge.variants; v++) {
          const round = challenge.round(v), solution = challenge.solution(v);
          const found: number[][] = [];
          for (const plan of plans(adventure)) if (round.evaluate(plan).goals.every(Boolean)) found.push(plan);
          expect(found, `${adventure.id} #${v}`).toContainEqual(solution);
          if (adventure.id === "torneo-lanzamientos")
            expect(new Set(found.map((plan) => [...plan].sort((a, b) => a - b).join())), `#${v}`).toEqual(new Set([[...solution].sort((a, b) => a - b).join()]));
          else if (adventure.id === "ascensor-carga") expect(found.every((plan) => plan[1] === solution[1]), `#${v}`).toBe(true);
          else if (!SEVERAL.has(adventure.id)) expect(found, `${adventure.id} #${v}`).toEqual([solution]);
        }
      }, 60_000);
  }

  test("receta: en cada partida solo sirve usar todos los huevos", () => {
    const recipe = getExpertChallenge("receta-festival")!;
    for (let v = 0; v < recipe.variants; v++) {
      const [, , eggs, ] = recipe.solution(v);
      const bag = Number(/bolsas de harina de (\d+) g/.exec(recipe.round(v).brief)![1]);
      const ok = Array.from({ length: 21 }, (_, e) => e).filter((e) =>
        recipe.round(v).evaluate([100 * e, 150 * e, e, Math.ceil((100 * e) / bag)]).goals.every(Boolean));
      expect(ok, `#${v}`).toEqual([eggs]);
    }
  });

  test("los óptimos de la partida original son óptimos de verdad", () => {
    let best = Infinity;
    for (let p = 0; p <= 20; p++) for (let g = 0; g <= 20; g++)
      if (2 * p + 5 * g >= 47 && p + g <= 14) best = Math.min(best, 300 * p + 800 * g);
    expect(best).toBe(7400);
    let top = 0;
    for (let p = 0; p <= 20; p++) for (let s = 0; s <= 20; s++) {
      const n = p + s;
      if (n >= 20 && n <= 30 && 2 * n - 4 * p >= 15) top = Math.max(top, p / n);
    }
    expect(top).toBeCloseTo(11 / 30);
    expect(Math.max(...Array.from({ length: 22 }, (_, a) => (44 - 2 * a) * a))).toBe(242);
    expect(Array.from({ length: 10 }, (_, y) => y).find((y) => y > 0 && 1000 * 1.1 ** y > 1000 + 120 * y)).toBe(5);
  });
});

describe("motor del reto experto", () => {
  const id = "ascensor-carga";
  const challenge = getExpertChallenge(id)!;
  const completed = (): AdventureState =>
    applyAdventureAction(applyAdventureAction(undefined, { kind: "inspect" }, NOW, id), { kind: "dispatch", allocation: [11, 4] }, NOW, id);
  const accepted = (now = NOW) => applyAdventureAction(completed(), { kind: "inspect", expert: true }, now, id, getExpertChallenge(id));

  test("se desbloquea al completar la misión, exige leer el informe y reparte una partida", () => {
    const fresh = applyAdventureAction(undefined, { kind: "inspect" }, NOW, id);
    expect(() => applyAdventureAction(fresh, { kind: "inspect", expert: true }, NOW, id, getExpertChallenge(id))).toThrow(/Completa primero la misión/);
    const done = completed();
    expect(() => applyAdventureAction(done, { kind: "dispatch", allocation: [9, 8], expert: true }, NOW, id, getExpertChallenge(id))).toThrow(/Lee primero el nuevo informe/);
    const read = accepted();
    expect(read.expert).toMatchObject({ inspected: true, attempts: 0, completedAt: null, solvedAt: null });
    expect(read.expert!.variant).toBeGreaterThanOrEqual(0);
    expect(read.expert!.variant).toBeLessThan(challenge.variants);
    // Releer no cambia la partida.
    expect(applyAdventureAction(read, { kind: "inspect", expert: true }, NOW + 5, id, getExpertChallenge(id)).expert!.variant).toBe(read.expert!.variant);
    expect(read.completedAt).toBe(done.completedAt);
    expect(read.allocation).toEqual([11, 4]);
    // Distintas horas reparten partidas distintas.
    expect(new Set(Array.from({ length: 40 }, (_, i) => accepted(NOW + i * 977).expert!.variant)).size).toBeGreaterThan(2);
  });

  test("superar una partida se registra una vez; otra partida trae datos nuevos sin repetir premio", () => {
    let state = accepted();
    const first = expertVariant(state.expert);
    expect(() => applyAdventureAction(state, { kind: "replay", expert: true }, NOW, id, getExpertChallenge(id))).toThrow(/Supera esta partida/);
    state = applyAdventureAction(state, { kind: "dispatch", allocation: [0, 0], expert: true }, NOW + 1, id, getExpertChallenge(id));
    expect(state.expert).toMatchObject({ attempts: 1, completedAt: null });
    state = applyAdventureAction(state, { kind: "dispatch", allocation: challenge.solution(first), expert: true }, NOW + 2, id, getExpertChallenge(id));
    expect(state.expert).toMatchObject({ attempts: 2, completedAt: NOW + 2, solvedAt: NOW + 2, rounds: 1 });
    // Probar de nuevo la misma partida no cuenta otra vez.
    state = applyAdventureAction(state, { kind: "dispatch", allocation: challenge.solution(first), expert: true }, NOW + 3, id, getExpertChallenge(id));
    expect(state.expert).toMatchObject({ attempts: 3, completedAt: NOW + 2, rounds: 1 });

    state = applyAdventureAction(state, { kind: "replay", expert: true }, NOW + 4, id, getExpertChallenge(id));
    const second = expertVariant(state.expert);
    expect(second).not.toBe(first);
    expect(state.expert).toMatchObject({ attempts: 0, solvedAt: null, completedAt: NOW + 2, rounds: 1, allocation: [0, 0] });
    expect(expertRoundSolved(state.expert)).toBe(false);
    state = applyAdventureAction(state, { kind: "dispatch", allocation: challenge.solution(second), expert: true }, NOW + 5, id, getExpertChallenge(id));
    expect(state.expert).toMatchObject({ completedAt: NOW + 2, solvedAt: NOW + 5, rounds: 2 });
    expect(STAR_REWARDS.adventureExpert).toBe(5);
  });

  test("un reto empezado antes de las partidas sigue con la partida original", () => {
    const legacy: AdventureState = {
      ...completed(),
      expert: { inspected: true, attempts: 1, allocation: [9, 9], feedback: "", completedAt: null },
    };
    expect(expertVariant(legacy.expert)).toBe(0);
    const solved = applyAdventureAction(legacy, { kind: "dispatch", allocation: [9, 8], expert: true }, NOW, id, getExpertChallenge(id));
    expect(solved.expert).toMatchObject({ completedAt: NOW, solvedAt: NOW, rounds: 1 });
    // Superado antes de las partidas: cuenta como una partida y permite otra.
    const old = { ...legacy.expert!, completedAt: NOW };
    expect(expertRoundSolved(old)).toBe(true);
    expect(expertRounds(old)).toBe(1);
    const next = applyAdventureAction({ ...legacy, expert: old }, { kind: "replay", expert: true }, NOW + 1, id, getExpertChallenge(id));
    expect(next.expert).toMatchObject({ rounds: 1, solvedAt: null, completedAt: NOW });
    expect(expertVariant(next.expert)).not.toBe(0);
  });

  test("valida las entradas propias del reto", () => {
    const rocket = "trayectoria-cohete";
    let state = applyAdventureAction(applyAdventureAction(undefined, { kind: "inspect" }, NOW, rocket), { kind: "dispatch", allocation: [4, 16] }, NOW, rocket);
    state = applyAdventureAction(state, { kind: "inspect", expert: true }, NOW, rocket, getExpertChallenge(rocket));
    expect(state.expert!.allocation).toEqual([0, 0, 0]);
    expect(() => applyAdventureAction(state, { kind: "dispatch", allocation: [25, 2], expert: true }, NOW, rocket, getExpertChallenge(rocket))).toThrow(/número entero/);
    expect(() => applyAdventureAction(state, { kind: "dispatch", allocation: [25, 2, 13], expert: true }, NOW, rocket, getExpertChallenge(rocket))).toThrow(/número entero/);
    const solution = getExpertChallenge(rocket)!.solution(expertVariant(state.expert));
    expect(applyAdventureAction(state, { kind: "dispatch", allocation: solution, expert: true }, NOW, rocket, getExpertChallenge(rocket)).expert!.completedAt).toBe(NOW);
  });
});
