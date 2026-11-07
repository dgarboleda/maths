import { describe, expect, test } from "vitest";
import { describeCustomLessonErrors, parseNumber, type CustomLesson, type LessonProgress } from "../../../../functions/src/customLessons/schema";
import { numericDistractors } from "./distractors";
import { summarizeLessonStats } from "./lessonStats";
import { TEMPLATES, duplicateLesson, exportLesson, importLesson } from "./lessonTools";
import { needsSync } from "./useCustomLessons";

const lesson: CustomLesson = { title: "Sumas", topic: "Números", content: "x", game: "write", published: true, updatedAt: 10, contentVersion: 5, order: 2, assignedTo: ["c1"], requires: "otra", questions: [{ id: "q1", kind: "choice", prompt: "¿2 + 2?", answer: 1, options: ["3", "4"], explanation: "" }, { id: "n1", kind: "numeric", prompt: "¿1/2?", value: "0,5", explanation: "" }] };

describe("distractores numéricos", () => {
  test("respetan el formato de la respuesta y no la repiten", () => {
    const ints = numericDistractors("12", 4)!;
    expect(ints).toHaveLength(4);
    expect(ints).not.toContain("12");
    expect(ints.every((s) => /^\d+$/.test(s))).toBe(true);
    const decimals = numericDistractors("0,75", 4)!;
    expect(decimals.every((s) => /^\d+,\d{2}$/.test(s))).toBe(true);
    const fractions = numericDistractors("3/4", 4)!;
    expect(fractions).toContain("4/3");
    expect(fractions.every((s) => parseNumber(s) !== 0.75)).toBe(true);
  });
  test("evitan los valores ya escritos y los negativos si la respuesta no lo es", () => {
    const out = numericDistractors("1", 4, ["2", "0"])!;
    expect(out).not.toContain("2");
    expect(out).not.toContain("0");
    expect(out.every((s) => parseNumber(s)! >= 0)).toBe(true);
    expect(numericDistractors("tres", 3)).toBeNull();
  });
});

describe("plantillas, copias e importación", () => {
  test("las plantillas se pueden publicar tal cual", () => {
    for (const t of TEMPLATES) expect(describeCustomLessonErrors({ ...t.build(), published: true })).toEqual([]);
  });
  test("duplicar crea un borrador con preguntas nuevas y sin posición", () => {
    const copy = duplicateLesson(lesson);
    expect(copy).toMatchObject({ title: "Sumas (copia)", published: false });
    expect(copy.order).toBeUndefined();
    expect(copy.contentVersion).toBeUndefined();
    expect(copy.questions.map((q) => q.id)).not.toContain("q1");
  });
  test("exportar e importar conserva el contenido y descarta lo propio de la familia", () => {
    const result = importLesson(exportLesson(lesson));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lesson).toMatchObject({ title: "Sumas", published: false, questions: [{ kind: "choice", options: ["3", "4"] }, { kind: "numeric", value: "0,5" }] });
    expect(result.lesson.assignedTo).toBeUndefined();
    expect(result.lesson.requires).toBeUndefined();
  });
  test("rechaza archivos que no son clases", () => {
    expect(importLesson("no json")).toMatchObject({ ok: false });
    expect(importLesson(JSON.stringify({ title: 3 }))).toMatchObject({ ok: false });
  });
});

describe("resultados y sincronización", () => {
  test("resume intentos de la versión actual por pregunta y por alumno", () => {
    const students = [{ id: "a", name: "Ana" }, { id: "b", name: "Bea" }, { id: "c", name: "Cris" }];
    const progress = new Map<string, Partial<LessonProgress>>([
      ["a", { lessonVersion: 5, completed: true, answers: ["q1", "n1"], attempts: { q1: { tries: 1, firstTryCorrect: true, solved: true, wrong: [] }, n1: { tries: 3, firstTryCorrect: false, solved: true, wrong: ["0,05", "5"] } } }],
      ["b", { lessonVersion: 5, completed: false, answers: [], attempts: { q1: { tries: 2, firstTryCorrect: false, solved: false, wrong: [0, 0] } } }],
      ["c", { lessonVersion: 4, completed: true, answers: ["q1"] }],
    ]);
    const stats = summarizeLessonStats(lesson, students, progress);
    expect(stats.completed).toBe(1);
    expect(stats.students.map((s) => [s.name, s.started, s.completed])).toEqual([["Ana", true, true], ["Bea", true, false], ["Cris", false, false]]);
    expect(stats.questions[0]).toMatchObject({ attempted: 2, solved: 1, firstTryRate: 50, averageTries: 1.5, topWrong: { label: "3", count: 2 } });
    expect(stats.questions[1]).toMatchObject({ attempted: 1, firstTryRate: 0, topWrong: { count: 1 } });
  });
  test("detecta clases publicadas sin versión para alumnos y versiones que sobran", () => {
    const items = [{ id: "a", published: true }, { id: "b", published: false }];
    expect(needsSync(items, new Set(["a"]))).toBe(false);
    expect(needsSync(items, new Set())).toBe(true);
    expect(needsSync(items, new Set(["a", "b"]))).toBe(true);
  });
});
