import { describe, expect, test } from "vitest";
import { MODULES, getModule, type ModuleDef } from "@/lib/curriculum";
import { MAX_GRADE, MAX_PISA_LEVEL, PISA_CATEGORIES } from "@/lib/pisa";
import { QUESTS } from "@/lib/world/quests";

/**
 * Invariantes del grafo de la currícula (docs/curricula-pisa.md): que la
 * secuencia sea lógica y progresiva no depende de revisar a mano cada
 * cambio — un prerrequisito de un grado o nivel PISA más alto que el tema
 * que lo exige, un ciclo, o un generador que produce una respuesta que el
 * widget no puede aceptar, fallan aquí.
 */

/** Los ids que ya existían antes de la currícula PISA: son doc ids de
 *  `skillsProgress` guardados en Firestore, así que nunca se renombran. */
const IDS_HISTORICOS = [
  ...["aritmetica", "algebra", "geometria", "medicion", "logica"].flatMap((strand) =>
    Array.from({ length: 10 }, (_, i) => `${strand}-d${i + 1}`),
  ),
  "aritmetica-mcd-mcm",
  "aritmetica-fracciones-2",
];

function prereqs(mod: ModuleDef): ModuleDef[] {
  return mod.prerequisites.map((id) => getModule(id)).filter((m): m is ModuleDef => m !== undefined);
}

describe("Grafo de la currícula", () => {
  test("los ids son únicos", () => {
    const ids = MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("los ids históricos siguen existiendo", () => {
    const ids = new Set(MODULES.map((m) => m.id));
    for (const id of IDS_HISTORICOS) expect(ids.has(id), id).toBe(true);
  });

  test("todo prerrequisito existe y no es el propio módulo", () => {
    for (const mod of MODULES) {
      for (const p of mod.prerequisites) {
        expect(getModule(p), `${mod.id} → ${p}`).toBeDefined();
        expect(p, mod.id).not.toBe(mod.id);
      }
    }
  });

  test("no hay ciclos", () => {
    const state = new Map<string, "visitando" | "listo">();
    function visit(mod: ModuleDef, path: string[]): void {
      if (state.get(mod.id) === "listo") return;
      if (state.get(mod.id) === "visitando") throw new Error(`Ciclo: ${[...path, mod.id].join(" → ")}`);
      state.set(mod.id, "visitando");
      for (const p of prereqs(mod)) visit(p, [...path, mod.id]);
      state.set(mod.id, "listo");
    }
    for (const mod of MODULES) expect(() => visit(mod, [])).not.toThrow();
  });

  test("el grado es 0–10 y la etiqueta PISA es válida en todo módulo de código", () => {
    const categories = new Set(PISA_CATEGORIES.map((c) => c.slug));
    for (const mod of MODULES) {
      expect(Number.isInteger(mod.tier) && mod.tier >= 0 && mod.tier <= MAX_GRADE, `${mod.id}: grado ${mod.tier}`).toBe(true);
      expect(mod.pisa, `${mod.id} sin etiqueta PISA`).toBeDefined();
      expect(categories.has(mod.pisa!.category), `${mod.id}: categoría ${mod.pisa!.category}`).toBe(true);
      expect(
        Number.isInteger(mod.pisa!.level) && mod.pisa!.level >= 0 && mod.pisa!.level <= MAX_PISA_LEVEL,
        `${mod.id}: nivel ${mod.pisa!.level}`,
      ).toBe(true);
    }
  });

  test("progresivo: ningún prerrequisito es de un grado o un nivel PISA mayor que el tema que lo exige", () => {
    for (const mod of MODULES) {
      for (const p of prereqs(mod)) {
        expect(p.tier, `${mod.id} (grado ${mod.tier}) exige ${p.id} (grado ${p.tier})`).toBeLessThanOrEqual(mod.tier);
        expect(
          p.pisa!.level,
          `${mod.id} (nivel ${mod.pisa!.level}) exige ${p.id} (nivel ${p.pisa!.level})`,
        ).toBeLessThanOrEqual(mod.pisa!.level);
      }
    }
  });

  test("los objetivos de las misiones del mundo apuntan a módulos existentes", () => {
    for (const quest of QUESTS) {
      for (const objective of quest.objectives) {
        expect(getModule(objective.moduleId), `${quest.id}/${objective.id}`).toBeDefined();
      }
    }
  });
});

describe("Generadores: cada módulo produce problemas que su widget puede aceptar", () => {
  const MUESTRAS = 300;

  for (const mod of MODULES) {
    test(mod.id, () => {
      for (let i = 0; i < MUESTRAS; i++) {
        const p = mod.generateProblem();
        const where = `${mod.id}: "${p.prompt}" → ${p.answer}`;
        expect(p.prompt.trim().length, where).toBeGreaterThan(0);
        expect(Number.isFinite(p.answer), where).toBe(true);
        expect(p.hints?.length, `${where} (pistas)`).toBe(3);

        switch (p.inputType) {
          case "integer":
            expect(Number.isInteger(p.answer), where).toBe(true);
            break;
          case "decimal":
            expect(Math.abs(p.answer * 100 - Math.round(p.answer * 100)), where).toBeLessThan(1e-6);
            break;
          case "choice":
            expect(p.choices, where).toBeDefined();
            expect(p.choices, where).toContain(p.answer);
            expect(new Set(p.choices).size, `${where} (opciones repetidas)`).toBe(p.choices!.length);
            if (p.choiceLabels) expect(p.choiceLabels.length, where).toBe(p.choices!.length);
            break;
          case "numberLine":
            expect(p.answer, where).toBeGreaterThanOrEqual(p.lineMin ?? 0);
            expect(p.answer, where).toBeLessThanOrEqual(p.lineMax ?? Infinity);
            break;
          default:
            break;
        }
      }
    });
  }
});
