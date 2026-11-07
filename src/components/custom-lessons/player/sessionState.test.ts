import { describe, expect, test } from "vitest";
import { publicLesson, type PublicLesson } from "../../../../functions/src/customLessons/schema";
import { listLessons } from "../CustomLessonList";
import { hasNextOpen, initialSession, sessionReducer, shuffledOrder, type SessionAction, type SessionState } from "./sessionState";

const lesson: PublicLesson = publicLesson({ title: "Sumas", topic: "Números", content: "x", game: "write", published: true, updatedAt: 1, contentVersion: 7, questions: [
  { id: "q1", kind: "choice", prompt: "¿2 + 2?", answer: 1, options: ["3", "4", "5"], explanation: "" },
  { id: "q2", kind: "numeric", prompt: "¿1/2?", value: "0,5", explanation: "" },
] });
const run = (actions: SessionAction[], state: SessionState = initialSession) => actions.reduce(sessionReducer, state);
const loaded = (completed: string[] = [], l = lesson): SessionAction => ({ type: "loaded", lesson: l, completed, locked: false });

describe("sesión de una clase", () => {
  test("empieza por la primera pregunta sin acertar y baraja sus opciones", () => {
    const s = run([loaded(["q1"]), { type: "start", random: () => 0 }]);
    expect(s).toMatchObject({ phase: "question", index: 1, order: [] });
    const c = run([loaded(), { type: "start", random: () => 0 }]);
    expect(c.order).toEqual([1, 2, 0]);
    expect([...c.order].sort()).toEqual([0, 1, 2]);
  });
  test("un fallo muestra comentario y pista; un acierto la explicación y deja avanzar", () => {
    const wrong = run([loaded(), { type: "start" }, { type: "answering" }, { type: "answered", correct: false, explanation: "", comment: "Has restado.", hint: "Cuenta con los dedos.", stars: 0 }]);
    expect(wrong).toMatchObject({ solved: false, busy: false, feedback: { kind: "wrong", comment: "Has restado.", hint: "Cuenta con los dedos." } });
    const right = sessionReducer(wrong, { type: "answered", correct: true, explanation: "2 + 2 = 4", comment: "", hint: "", stars: 0 });
    expect(right).toMatchObject({ solved: true, completed: ["q1"], feedback: { kind: "correct", explanation: "2 + 2 = 4" } });
    expect(hasNextOpen(right)).toBe(true);
    const last = run([{ type: "next" }, { type: "answered", correct: true, explanation: "", comment: "", hint: "", stars: 5 }], right);
    expect(hasNextOpen(last)).toBe(false);
    expect(run([{ type: "next" }], last)).toMatchObject({ phase: "finished", stars: 5 });
  });
  test("si cambia la versión mientras se juega, vuelve a la introducción", () => {
    const playing = run([loaded(), { type: "start" }]);
    expect(sessionReducer(playing, loaded([], { ...lesson, title: "Sumas fáciles" }))).toMatchObject({ phase: "question", lesson: { title: "Sumas fáciles" } });
    expect(sessionReducer(playing, loaded([], { ...lesson, version: 8 }))).toMatchObject({ phase: "intro", notice: expect.stringContaining("actualizado") });
  });
  test("clase no disponible o bloqueada", () => {
    expect(sessionReducer(initialSession, { type: "loaded", lesson: null, completed: [], locked: false }).status).toBe("missing");
    expect(sessionReducer(initialSession, { type: "loaded", lesson, completed: [], locked: true }).status).toBe("locked");
  });
  test("el barajado es una permutación", () => {
    for (let i = 0; i < 20; i++) expect([...shuffledOrder(5)].sort()).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("lista de clases del alumno", () => {
  const entry = (id: string, extra: Partial<PublicLesson> = {}) => ({ ...lesson, ...extra, id });
  test("oculta las futuras y las de otros alumnos, marca terminadas, bloqueadas y entregas pasadas", () => {
    const lessons = [
      entry("a"),
      entry("b", { requires: "a", dueAt: 50 }),
      entry("c", { availableFrom: 200 }),
      entry("d", { audience: ["otro"] }),
      entry("e", { requires: "d" }),
    ];
    const items = listLessons(lessons, new Map(), "yo", 100);
    expect(items.map((i) => i.id)).toEqual(["a", "b", "e"]);
    expect(items.find((i) => i.id === "b")).toMatchObject({ locked: true, lockedBy: "Sumas", overdue: true });
    expect(items.find((i) => i.id === "e")).toMatchObject({ locked: false });
    const done = listLessons(lessons, new Map([["a", { completed: true, lessonVersion: 7 }]]), "yo", 100);
    expect(done.find((i) => i.id === "a")?.done).toBe(true);
    expect(done.find((i) => i.id === "b")?.locked).toBe(false);
  });
});
