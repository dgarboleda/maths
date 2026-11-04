import { expect, test } from "vitest";
import { getLesson, initialProgress } from "./domain";
import { FORMULA_LESSON_IDS, formulasFor } from "./formulas";
import { hasHelpContent, lessonScreenHelp, questionHelp } from "./screenHelp";
import { parseMath, type MathPart } from "@/lib/math/parseMath";

const hasFraction = (parts: MathPart[]): boolean =>
  parts.some((part) => typeof part !== "string" && (part.kind === "frac" || hasFraction(part.kind === "sqrt" ? part.body : part.kind === "sup" ? part.base : [])));

test("cada formulario pertenece a una clase publicada y no repite nombres", () => {
  for (const id of FORMULA_LESSON_IDS) {
    expect(getLesson(id), id).toBeDefined();
    const names = formulasFor(id).map((formula) => formula.name);
    expect(new Set(names).size, id).toBe(names.length);
  }
  expect(formulasFor("no-existe")).toEqual([]);
});

test("toda barra de una fórmula se dibuja como fracción apilada", () => {
  for (const id of FORMULA_LESSON_IDS)
    for (const { expression } of formulasFor(id))
      if (expression.includes("/")) expect(hasFraction(parseMath(expression)), expression).toBe(true);
});

test("las progresiones ofrecen el término general y la suma de ambos tipos", () => {
  const expressions = formulasFor("progresiones").map((formula) => formula.expression);
  expect(expressions).toEqual(expect.arrayContaining(["aₙ = a₁ + (n − 1) · d", "aₙ = a₁ · rⁿ⁻¹", "Sₙ = (n · (a₁ + aₙ))/2"]));
});

test("el foco muestra el formulario en la clase y la práctica, pero no en el punto de partida ni en el repaso mixto", () => {
  const lesson = getLesson("progresiones")!;
  const start = initialProgress(lesson);
  expect(lessonScreenHelp(lesson, { ...start, stage: "class", index: 0 }).formulas).toHaveLength(formulasFor("progresiones").length);
  const practice = lessonScreenHelp(lesson, { ...start, stage: "practice", index: 0 }, lesson.practice[0]);
  expect(practice.formulas?.length).toBeGreaterThan(0);
  expect(hasHelpContent({ ...practice, ideas: [] })).toBe(true);
  expect(lessonScreenHelp(lesson, { ...start, stage: "diagnostic", index: 0 }, lesson.diagnostic[0]).formulas).toEqual([]);
  expect(questionHelp(lesson, lesson.mixed[0], { formulas: false }).formulas).toEqual([]);
});

import { CALC_KEYS, CUE_KEYS, formatResult, formulaByKey, relatedFormula } from "./formulas";

test("cada calculadora y cada señal apuntan a una fórmula existente", () => {
  for (const key of [...CALC_KEYS, ...CUE_KEYS]) expect(formulaByKey(key), key).toBeDefined();
});

test("las calculadoras dan el resultado de la fórmula y rechazan datos sin sentido", () => {
  const calc = (key: string) => formulaByKey(key)!.formula.calc!;
  expect(calc("progresiones#Término general (aritmética)").compute({ a1: 3, d: 4, n: 10 })).toBe(39);
  expect(calc("progresiones#Suma de n términos (geométrica)").compute({ a1: 2, r: 3, n: 5 })).toBe(242);
  expect(Number.isNaN(calc("progresiones#Suma de n términos (geométrica)").compute({ a1: 2, r: 1, n: 5 }))).toBe(true);
  expect(calc("pitagoras#Hallar la hipotenusa").compute({ a: 3, b: 4 })).toBe(5);
  expect(Number.isNaN(calc("pitagoras#Hallar un cateto").compute({ c: 5, b: 8 }))).toBe(true);
  expect(formatResult(1157.625)).toBe("1157,625");
  expect(formatResult(-1.5)).toBe("−1,5");
  expect(formatResult(Math.PI * 25)).toBe("78,5398");
  expect(formatResult(NaN)).toBe("—");
});

test("relaciona el enunciado con la fórmula adecuada solo cuando hay una ganadora clara", () => {
  expect(relatedFormula("progresiones", "En la progresión aritmética 5, 8, 11…, ¿cuál es el término 12?")?.name).toBe("Término general (aritmética)");
  expect(relatedFormula("progresiones", "En la progresión geométrica 2, 10, 50… el término 5 es")?.name).toBe("Término general (geométrica)");
  expect(relatedFormula("pitagoras", "La hipotenusa mide 10 m y un cateto 8 m. ¿Cuánto mide el otro cateto?")?.name).toBe("Hallar un cateto");
  expect(relatedFormula("probabilidad-simple", "Si P(rojo) = 4/10, entonces P(no rojo) = __")?.name).toBe("Complemento");
  // Empate (¿aritmética o geométrica?) o señal débil: no se sugiere nada.
  expect(relatedFormula("progresiones", "¿Cuánto suman los 20 primeros términos de la progresión 1, 3, 5…?")).toBeUndefined();
  expect(relatedFormula("progresiones", "Una planta crece 2 cm cada semana.")).toBeUndefined();
  expect(relatedFormula("razones", "Cualquier cosa")).toBeUndefined();
});

test("la ayuda de un problema identifica la clase, sus prerrequisitos y la fórmula relacionada, salvo en el repaso mixto", () => {
  const lesson = getLesson("progresiones")!;
  const question = { ...lesson.practice[0], prompt: "En la progresión aritmética 3, 7, 11…, ¿cuál es el término 10?" };
  const help = questionHelp(lesson, question);
  expect(help.relatedFormula).toBe("progresiones#Término general (aritmética)");
  expect(help).toMatchObject({ lessonId: "progresiones", unitId: "expresiones" });
  expect(help.prerequisites?.map((p) => p.id)).toEqual(["expresiones-algebraicas", "potencias-raices"]);
  const mixed = questionHelp(lesson, question, { formulas: false, identify: false });
  expect(mixed).not.toHaveProperty("lessonId");
  expect(mixed).not.toHaveProperty("prerequisites");
  expect(mixed.relatedFormula).toBeUndefined();
});
