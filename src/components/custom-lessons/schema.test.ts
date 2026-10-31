import { describe, expect, test } from "vitest";
import { validateCustomLesson } from "../../../functions/src/customLessons/schema";

const lesson = { title: "Sumas", topic: "Números", content: "Sumar une cantidades.", game: "breakout", published: true, updatedAt: 1, questions: [{ id: "q1", prompt: "¿Cuánto es 2 + 2?", answer: 3, options: ["1", "2", "3", "4", "5"], explanation: "2 + 2 = 4" }] };
describe("clases personalizadas", () => {
  test("acepta una clase jugable", () => expect(validateCustomLesson(lesson)).toBe(true));
  test("rechaza respuestas ausentes, duplicadas o insuficientes para el minijuego", () => {
    for (const options of [["1", "2", "3"], ["1", "2", "3", "4", "4"], ["3", "4"]]) expect(validateCustomLesson({ ...lesson, questions: [{ ...lesson.questions[0], options }] })).toBe(false);
  });
  test("acepta dos opciones para responder sin minijuego", () => expect(validateCustomLesson({ ...lesson, game: "write", questions: [{ ...lesson.questions[0], answer: 1, options: ["3", "4"] }] })).toBe(true));
});
