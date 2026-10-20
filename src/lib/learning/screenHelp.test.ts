import { expect, test } from "vitest";
import { getLesson, initialProgress, LESSONS } from "./domain";
import { ideasForText, lessonScreenHelp, navigationHelp, questionHelp } from "./screenHelp";

test("explica el valor absoluto solo cuando aparece en la parte actual de la clase", () => {
  const lesson = getLesson("enteros-recta")!;
  const progress = { ...initialProgress(lesson), stage: "class" as const };
  expect(lessonScreenHelp(lesson, progress).ideas.map((idea) => idea.id)).not.toContain("absolute");
  const absolute = lessonScreenHelp(lesson, { ...progress, index: 2 }).ideas.find((idea) => idea.id === "absolute")!;
  expect(absolute.meaning).toContain("distancia de un número al cero");
  expect(absolute.example).toContain("|−4| = 4");
});

test("distingue las barras de probabilidad condicional del valor absoluto", () => {
  expect(ideasForText("Calcula P(A|B) y P(B|A).").map((idea) => idea.id)).toEqual(["conditional"]);
  expect(ideasForText("¿Cuánto vale |−6|?").map((idea) => idea.id)).toEqual(["absolute"]);
});

test("solo usa el enunciado y las opciones, nunca la solución ni las pistas", () => {
  const lesson = getLesson("enteros-recta")!;
  const question = { ...lesson.practice[1], prompt: "Calcula √16.", choices: undefined, answer: "RESPUESTA_SECRETA", hints: ["PISTA_SECRETA", "", ""] as [string, string, string], solution: ["SOLUCION_SECRETA"], explanation: "EXPLICACION_SECRETA" };
  const help = questionHelp(lesson, question);
  expect(help.ideas.map((idea) => idea.id)).toEqual(["root"]);
  expect(JSON.stringify(help)).not.toMatch(/SECRETA/);
});

test("recupera vocabulario de la lección con tildes y evita duplicar el valor absoluto", () => {
  const lesson = getLesson("enteros-recta")!;
  expect(ideasForText("Identifica el opuesto y el valor absoluto.", lesson.vocabulary).map((idea) => idea.title)).toEqual(["Valor absoluto", "Opuesto"]);
  expect(ideasForText("¿Qué es un NUMERO ENTERO?", lesson.vocabulary).map((idea) => idea.title)).toEqual(["Número entero"]);
});

test("todas las secciones publicadas tienen ayuda contextual y los símbolos más comunes están cubiertos", () => {
  for (const lesson of LESSONS) {
    for (let index = 0; index < lesson.sections.length; index++) {
      const help = lessonScreenHelp(lesson, { ...initialProgress(lesson), stage: "class", index });
      expect(help.description).not.toBe("");
      expect(help.ideas.every((idea) => idea.meaning.length > 0)).toBe(true);
    }
  }
  expect(ideasForText("√9, x², 20 %, 3/4, π, 2 < 5, 1 ≠ 0, 1/3 ≈ 0,33, 2 × 3, −2").map((idea) => idea.id)).toEqual([
    "root", "powers", "inequality", "pi", "percent", "fraction", "not-equal", "approx", "multiply", "negative",
  ]);
});

test("la ubicación conserva instrucciones sin pistas matemáticas y cada pantalla tiene su propósito", () => {
  expect(navigationHelp("/jugar/ana/aprende/ubicacion").ideas).toEqual([]);
  expect(navigationHelp("/jugar/ana/aprende/ubicacion").description).toContain("Todavía no lo sé");
  expect(navigationHelp("/jugar/ana/practicar").description).toContain("minijuegos");
  expect(navigationHelp("/jugar/ana/aprende/diario").title).toContain("Recordar");
});
