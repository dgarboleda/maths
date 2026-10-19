import { describe, expect, test } from "vitest";
import { LESSONS, isAnswerCorrect } from "@/lib/learning/domain";
import { lessonProblem, pickPracticeGame, PRACTICE_GAMES } from "./lessonExercise";

describe("ejercicios de clase en los minijuegos", () => {
  test("cada clase ofrece práctica numérica y conserva sus preguntas conceptuales", () => {
    for (const lesson of LESSONS) {
      expect(lesson.practice.some((q) => lessonProblem(q) !== null)).toBe(true);
      for (const question of lesson.practice) {
        const problem = lessonProblem(question);
        if (question.format === "choice") {
          expect(problem).toBeNull();
          continue;
        }
        expect(problem?.id).toBe(question.id);
        expect(problem?.prompt).toBe(question.prompt);
        expect(problem?.choices).toHaveLength(5);
        expect(new Set(problem?.choices).size).toBe(5);
        // Exactamente una alternativa satisface el evaluador educativo real.
        expect(problem?.choices?.filter((n) => isAnswerCorrect(question, String(n))))
          .toEqual([question.answer]);
      }
    }
  });
  test.each([-12, 0, 0.375, 1 / 3])("admite signos, cero y fracciones (%s) sin generar opciones infinitamente", (answer) => {
    const base = LESSONS[0].practice.find((q) => typeof q.answer === "number")!;
    const problem = lessonProblem({ ...base, answer, errors: [{ value: answer + 2, feedback: "Revisa la unidad." }] });
    expect(problem?.choices).toContain(answer);
    expect(problem?.choices).toContain(answer + 2);
    expect(new Set(problem?.choices).size).toBe(5);
    expect(problem?.choices?.every(Number.isFinite)).toBe(true);
  });
  test("una pregunta sobre fracciones conserva una representación fraccionaria legible", () => {
    const question = LESSONS[0].practice[1];
    const problem = lessonProblem(question)!;
    expect(question.answer).toBe(1 / 3);
    expect(problem.choiceLabels?.[problem.choices!.indexOf(1 / 3)]).toBe("1/3");
  });
});

describe("pickPracticeGame", () => {
  test("reparte entre todos los juegos según el azar", () => {
    const n = PRACTICE_GAMES.length;
    expect(PRACTICE_GAMES.map((_, i) => pickPracticeGame(() => (i + 0.5) / n))).toEqual([...PRACTICE_GAMES]);
    expect(pickPracticeGame(() => 0)).toBe("frogger");
    expect(pickPracticeGame(() => 0.999999)).toBe("breakout");
  });

  test("las e2e pueden fijar el juego", () => {
    const scope = globalThis as { __MATHS_TEST_PRACTICE_GAME__?: string };
    scope.__MATHS_TEST_PRACTICE_GAME__ = "cohete";
    try {
      expect(pickPracticeGame(() => 0)).toBe("cohete");
    } finally {
      delete scope.__MATHS_TEST_PRACTICE_GAME__;
    }
  });
});
