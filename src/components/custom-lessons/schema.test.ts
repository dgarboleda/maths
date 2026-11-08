import { describe, expect, test } from "vitest";
import { describeCustomLessonErrors, isPublicLesson, lessonVersion, nextContentVersion, numericMatches, parseNumber, prerequisiteMet, publicLesson, sanitizeLesson, validateCustomLesson, visibleTo, type ChoiceQuestion, type CustomLesson, type NumericQuestion } from "../../../functions/src/customLessons/schema";

const q: ChoiceQuestion = { id: "q1", prompt: "¿Cuánto es 2 + 2?", answer: 3, options: ["1", "2", "3", "4", "5"], explanation: "2 + 2 = 4" };
const lesson: CustomLesson = { title: "Sumas", topic: "Números", content: "Sumar une cantidades.", game: "breakout", published: true, updatedAt: 1, questions: [q] };
const n: NumericQuestion = { id: "n1", kind: "numeric", prompt: "Simplifica 6/8", value: "3/4", explanation: "Divide entre 2.", hint: "Busca un divisor común." };
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
  { ...lesson, game: "write", questions: [n] },
  { ...lesson, questions: [n] },
  { ...lesson, game: "write", questions: [{ ...n, value: "abc" }] },
  { ...lesson, questions: [{ ...q, optionFeedback: ["", "", "", "", ""] }] },
  { ...lesson, questions: [{ ...q, optionFeedback: [""] }] },
  { ...lesson, assignedTo: ["c1", "c1"] },
  { ...lesson, availableFrom: 10, dueAt: 5 },
  { ...lesson, requires: "otra/clase" },
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
  test("las preguntas numéricas solo se juegan sin minijuego y necesitan un número", () => {
    expect(validateCustomLesson({ ...lesson, game: "write", questions: [n] })).toBe(true);
    expect(describeCustomLessonErrors({ ...lesson, questions: [n] })).toContainEqual(expect.objectContaining({ question: 0, field: "value" }));
    expect(describeCustomLessonErrors({ ...lesson, game: "write", questions: [{ ...n, value: "tres" }] })).toContainEqual(expect.objectContaining({ field: "value" }));
  });
  test("un borrador admite preguntas incompletas pero no tipos ni tamaños inválidos", () => {
    const draft = { ...lesson, published: false, questions: [{ ...q, prompt: "", options: ["", ""], answer: -1 }, { ...n, value: "" }] };
    expect(describeCustomLessonErrors(draft, { draft: true })).toEqual([]);
    expect(describeCustomLessonErrors({ ...draft, title: "" }, { draft: true })).toContainEqual(expect.objectContaining({ field: "title" }));
    expect(describeCustomLessonErrors({ ...draft, content: "x".repeat(10001) }, { draft: true })).toContainEqual(expect.objectContaining({ field: "content" }));
    expect(describeCustomLessonErrors({ ...draft, questions: [{ ...q, options: "a" }] }, { draft: true })).toContainEqual(expect.objectContaining({ field: "options" }));
  });
});

describe("respuestas numéricas", () => {
  test("lee enteros, decimales con coma o punto, fracciones y números mixtos", () => {
    expect(parseNumber("12")).toBe(12);
    expect(parseNumber(" 0,75 ")).toBe(0.75);
    expect(parseNumber("−2.5")).toBe(-2.5);
    expect(parseNumber("-3/4")).toBe(-0.75);
    expect(parseNumber("1 1/2")).toBe(1.5);
    for (const bad of ["", "abc", "1/0", "1,2,3", "3/"]) expect(parseNumber(bad)).toBeNull();
  });
  test("acepta formas equivalentes y el margen", () => {
    for (const ok of ["3/4", "6/8", "0,75", "0.75"]) expect(numericMatches(n, ok)).toBe(true);
    expect(numericMatches(n, "0,7")).toBe(false);
    expect(numericMatches({ value: "3,14", tolerance: 0.01 }, "3,15")).toBe(true);
    expect(numericMatches({ value: "3,14", tolerance: 0.01 }, "3,16")).toBe(false);
  });
});

describe("versión para alumnos", () => {
  test("no lleva respuestas, explicaciones, pistas ni comentarios", () => {
    const full: CustomLesson = { ...lesson, game: "write", order: 4, contentVersion: 9, assignedTo: ["c1"], questions: [{ ...q, optionFeedback: ["a", "b", "c", "", "e"], hint: "pista" }, n] };
    const shown = publicLesson(full);
    const text = JSON.stringify(shown);
    for (const secret of ['"answer"', "explanation", "hint", "optionFeedback", '"value"', "pista"]) expect(text).not.toContain(secret);
    expect(shown).toMatchObject({ version: 9, order: 4, audience: ["c1"], questions: [{ id: "q1", kind: "choice", options: q.options }, { id: "n1", kind: "numeric" }] });
    expect(isPublicLesson(shown)).toBe(true);
    expect(publicLesson(lesson).audience).toEqual(["*"]);
  });
  test("visibilidad por alumno y fecha, y clase previa", () => {
    const shown = { ...publicLesson({ ...lesson, assignedTo: ["c1"], availableFrom: 100 }), version: 7 };
    expect(visibleTo(shown, "c1", 100)).toBe(true);
    expect(visibleTo(shown, "c1", 99)).toBe(false);
    expect(visibleTo(shown, "c2", 200)).toBe(false);
    expect(prerequisiteMet(shown, undefined, "c2", 200)).toBe(true);
    expect(prerequisiteMet(undefined, undefined, "c1", 200)).toBe(true);
    expect(prerequisiteMet(shown, { completed: true, lessonVersion: 6 }, "c1", 200)).toBe(false);
    expect(prerequisiteMet(shown, { completed: true, lessonVersion: 7 }, "c1", 200)).toBe(true);
  });
  test("sanitizar descarta campos desconocidos", () => {
    const dirty = { ...lesson, extra: "x", questions: [{ ...q, extra: 1 }] } as unknown as CustomLesson;
    expect(JSON.stringify(sanitizeLesson(dirty))).not.toContain("extra");
  });
});

describe("versión de contenido", () => {
  test("las clases antiguas usan updatedAt", () => {
    expect(lessonVersion({ updatedAt: 7 })).toBe(7);
    expect(lessonVersion({ updatedAt: 7, contentVersion: 3 })).toBe(3);
  });
  test("corregir textos conserva la versión y cambiar preguntas la renueva", () => {
    expect(nextContentVersion(null, lesson, 100)).toBe(100);
    expect(nextContentVersion(lesson, { questions: [{ ...q, prompt: "otro", explanation: "otra", hint: "nueva", optionFeedback: ["a", "", "", "", ""] }] }, 100)).toBe(1);
    expect(nextContentVersion({ ...lesson, contentVersion: 42 }, lesson, 100)).toBe(42);
    expect(nextContentVersion(lesson, { questions: [{ ...q, answer: 2 }] }, 100)).toBe(100);
    expect(nextContentVersion(lesson, { questions: [{ ...q, options: ["1", "2", "3", "4", "6"] }] }, 100)).toBe(100);
    expect(nextContentVersion(lesson, { questions: [q, { ...q, id: "q2" }] }, 100)).toBe(100);
    const numeric = { ...lesson, questions: [n] };
    expect(nextContentVersion(numeric, { questions: [{ ...n, prompt: "otro" }] }, 100)).toBe(1);
    expect(nextContentVersion(numeric, { questions: [{ ...n, value: "0,75" }] }, 100)).toBe(100);
  });
});

test("valida y publica recursos interactivos sin revelar respuestas", () => {
  const visual = { id: "v1", kind: "custom-number-line" as const, title: "Explora", description: "Mueve el punto", min: -5, max: 7, initial: 2 };
  const withVisual = { ...lesson, visuals: [visual] };
  expect(validateCustomLesson(withVisual)).toBe(true);
  expect(sanitizeLesson(withVisual).visuals).toEqual([visual]);
  const shown = publicLesson(sanitizeLesson(withVisual));
  expect(shown.visuals).toEqual([visual]);
  expect(JSON.stringify(shown)).not.toContain('"answer"');
  expect(isPublicLesson(shown)).toBe(true);
  expect(nextContentVersion(lesson, withVisual, 99)).toBe(lessonVersion(lesson));
  for (const invalid of [
    { ...visual, min: 8 }, { ...visual, initial: 9 }, { ...visual, min: -100, max: 100 },
    { ...visual, kind: "codigo-arbitrario" }, { ...visual, initial: 1.5 },
  ]) expect(describeCustomLessonErrors({ ...lesson, visuals: [invalid] })).toContainEqual(expect.objectContaining({ field: "visuals" }));
  expect(describeCustomLessonErrors({ ...lesson, visuals: [visual, visual] })).toContainEqual(expect.objectContaining({ field: "visuals" }));
  expect(describeCustomLessonErrors({ ...lesson, visuals: Array.from({ length: 9 }, (_, i) => ({ ...visual, id: `v${i}` })) })).toContainEqual(expect.objectContaining({ field: "visuals" }));
  expect(isPublicLesson({ ...shown, visuals: [{ ...visual, max: 1000 }] })).toBe(false);
});
