import { expect, test } from "vitest";
import { getLesson, initialProgress, LESSONS } from "./domain";
import { nextStudyLesson, plannedLessonIds } from "./studyPlan";

test("el plan descarta IDs desconocidos y repetidos sin aceptar contenido ajeno al catálogo", () => {
  expect(plannedLessonIds({ lessonIds: ["angulos", "no-existe", "angulos", null, "enteros-recta"] })).toEqual(["enteros-recta", "angulos"]);
  expect(plannedLessonIds({ lessonIds: "angulos" })).toEqual([]);
  expect(plannedLessonIds(null)).toEqual([]);
});

test("prioriza la clase elegida después de sus bases y conserva todo el catálogo como alternativa", () => {
  const progress = Object.fromEntries(LESSONS.filter((lesson) => lesson.unitId === "numeros").map((lesson) => [lesson.id, { ...initialProgress(lesson), stage: "summary" as const, completedAt: 1 }]));
  expect(nextStudyLesson(progress, null, { lessonIds: ["angulos"] }).id).toBe("angulos");
  expect(nextStudyLesson({}, null, { lessonIds: ["angulos"] }).unitId).toBe("numeros");
  progress.angulos = { ...initialProgress(getLesson("angulos")!), stage: "summary", completedAt: 1 };
  expect(nextStudyLesson(progress, null, { lessonIds: ["angulos"] }).id).toBe("fracciones-unidad");
});

test("retoma una clase activa antes de cambiar de prioridad y tolera planes antiguos", () => {
  const active = initialProgress(getLesson("razones")!);
  expect(nextStudyLesson({ razones: { ...active, updatedAt: 123 } }, null, { lessonIds: ["angulos"] }).id).toBe("razones");
  expect(nextStudyLesson({}, null, { lessonIds: ["retirada"] }).id).toBe("enteros-recta");
});
