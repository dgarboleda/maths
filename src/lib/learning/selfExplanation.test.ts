import { expect, test } from "vitest";
import { LESSONS } from "./domain";
import { explanationPrompt, selfExplains } from "./selfExplanation";

test("cada paso ofrece su justificación y dos de otros pasos del mismo ejemplo", () => {
  let prompts = 0;
  for (const lesson of LESSONS)
    lesson.examples.forEach((example, exampleIndex) => {
      if (!selfExplains(lesson, exampleIndex)) return;
      const whys = new Set(example.steps.map((step) => step.why));
      example.steps.forEach((step, stepIndex) => {
        const prompt = explanationPrompt(example, stepIndex);
        expect(prompt, `${lesson.id} ejemplo ${exampleIndex + 1}`).not.toBeNull();
        expect(prompt!.options).toHaveLength(3);
        expect(new Set(prompt!.options).size).toBe(3);
        expect(prompt!.options[prompt!.correct]).toBe(step.why);
        prompt!.options.forEach((option) => expect(whys.has(option)).toBe(true));
        expect(explanationPrompt(example, stepIndex)).toEqual(prompt);
        prompts++;
      });
    });
  expect(prompts).toBeGreaterThan(200);
});

test("el primer ejemplo se estudia completo y los de columnas conservan su animación", () => {
  for (const lesson of LESSONS) {
    expect(selfExplains(lesson, 0), lesson.id).toBe(false);
    lesson.examples.forEach((example, index) => {
      if (example.column) expect(selfExplains(lesson, index), lesson.id).toBe(false);
    });
  }
  // Casi todo el programa tiene al menos un ejemplo para explicar.
  const withPrompt = LESSONS.filter((lesson) => lesson.examples.some((_, index) => selfExplains(lesson, index)));
  expect(withPrompt.length).toBeGreaterThan(LESSONS.length * 0.8);
});

test("la justificación correcta no ocupa siempre la misma posición", () => {
  const positions = new Set<number>();
  for (const lesson of LESSONS)
    lesson.examples.forEach((example, index) => {
      if (selfExplains(lesson, index)) example.steps.forEach((_, step) => positions.add(explanationPrompt(example, step)!.correct));
    });
  expect([...positions].sort()).toEqual([0, 1, 2]);
});

test("sin dos justificaciones distintas no hay pregunta", () => {
  const example = { prompt: "p", conclusion: "c", steps: [{ math: "1", why: "igual" }, { math: "2", why: "igual" }, { math: "3", why: "otra" }] };
  expect(explanationPrompt(example, 0)).toBeNull();
  expect(explanationPrompt(example, 9)).toBeNull();
});
