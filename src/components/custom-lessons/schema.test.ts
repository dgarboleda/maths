import { describe, expect, test } from "vitest";
import { describeCustomLessonErrors, lessonVersion, nextContentVersion, validateCustomLesson, type CustomLesson } from "../../../functions/src/customLessons/schema";

const lesson: CustomLesson = { title: "Sumas", topic: "Números", content: "Sumar une cantidades.", game: "breakout", published: true, updatedAt: 1, questions: [{ id: "q1", prompt: "¿Cuánto es 2 + 2?", answer: 3, options: ["1", "2", "3", "4", "5"], explanation: "2 + 2 = 4" }] };
const q = lesson.questions[0];
const variants: unknown[] = [
  lesson,
  { ...lesson, game: "write", questions: [{ ...q, answer: 1, options: ["3", "4"] }] },
  { ...lesson, questions: [{ ...q, options: ["1", "2", "3"] }] },
  { ...lesson, questions: [{ ...q, options: ["1", "2", "3", "4", "4"] }] },
  { ...lesson, questions: [{ ...q, answer: -1 }] },
  { ...lesson, questions: [{ ...q, answer: 5 }] },
  { ...lesson, questions: [{ ...q, options: ["1", "2", " ", "4", "5"] }] },
  { ...lesson, questions: [q, q] },
  { ...lesson, questions: [] },
  { ...lesson, title: "  " },
  { ...lesson, topic: "x".repeat(121) },
  { ...lesson, game: "otro" },
  { ...lesson, contentVersion: 0 },
  { ...lesson, contentVersion: 5, order: 2 },
  { ...lesson, order: 1.5 },
  { ...lesson, questions: [{ ...q, explanation: 3 }] },
  null,
];

describe("validación de clases personalizadas", () => {
  test("acepta una clase jugable", () => expect(validateCustomLesson(lesson)).toBe(true));
  test("rechaza respuestas ausentes, duplicadas o insuficientes para el minijuego", () => {
    for (const options of [["1", "2", "3"], ["1", "2", "3", "4", "4"], ["3", "4"]]) expect(validateCustomLesson({ ...lesson, questions: [{ ...q, options }] })).toBe(false);
  });
  test("acepta dos opciones para responder sin minijuego", () => expect(validateCustomLesson({ ...lesson, game: "write", questions: [{ ...q, answer: 1, options: ["3", "4"] }] })).toBe(true));
  test("los errores descritos coinciden con la validación", () => {
    for (const v of variants) expect(describeCustomLessonErrors(v).length === 0).toBe(validateCustomLesson(v));
  });
  test("señala la pregunta y el campo de cada error", () => {
    const errors = describeCustomLessonErrors({ ...lesson, title: "", questions: [q, { ...q, id: "q2", options: ["1", "2"], answer: -1 }] });
    expect(errors).toContainEqual(expect.objectContaining({ field: "title" }));
    expect(errors).toContainEqual(expect.objectContaining({ question: 1, field: "options", message: expect.stringContaining("hay 2") }));
    expect(errors).toContainEqual(expect.objectContaining({ question: 1, field: "answer" }));
    expect(errors.some((e) => e.question === 0)).toBe(false);
  });
});

describe("versión de contenido", () => {
  test("las clases antiguas usan updatedAt", () => {
    expect(lessonVersion({ updatedAt: 7 })).toBe(7);
    expect(lessonVersion({ updatedAt: 7, contentVersion: 3 })).toBe(3);
  });
  test("corregir textos conserva la versión y cambiar preguntas la renueva", () => {
    expect(nextContentVersion(null, lesson, 100)).toBe(100);
    expect(nextContentVersion(lesson, { questions: [{ ...q, prompt: "otro", explanation: "otra" }] }, 100)).toBe(1);
    expect(nextContentVersion({ ...lesson, contentVersion: 42 }, lesson, 100)).toBe(42);
    expect(nextContentVersion(lesson, { questions: [{ ...q, answer: 2 }] }, 100)).toBe(100);
    expect(nextContentVersion(lesson, { questions: [{ ...q, options: ["1", "2", "3", "4", "6"] }] }, 100)).toBe(100);
    expect(nextContentVersion(lesson, { questions: [q, { ...q, id: "q2" }] }, 100)).toBe(100);
  });
});
