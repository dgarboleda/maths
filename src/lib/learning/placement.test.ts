import { describe, expect, test } from "vitest";
import {
  answerOutcome,
  applyPlacementAction,
  errorGroup,
  errorText,
  findQuestion,
  getLesson,
  LEARNING_UNITS,
  LESSONS,
  matchError,
  PERU_COMPETENCIES,
  PERU_MAP,
  peruLevel,
  placementCurrent,
  placementQuestion,
  recommendedLesson,
  type PlacementState,
} from "./domain";

const NOW = 1_700_000_000_000;
/** Responde la ubicación: `knows(lessonId)` decide si acierta. */
function run(knows: (lessonId: string) => boolean | "skip") {
  let state: PlacementState = applyPlacementAction(undefined, { kind: "begin" }, NOW);
  let guard = 0;
  while (state.stage === "active" && guard++ < 120) {
    const current = placementCurrent(state)!;
    const decision = knows(current.lesson.id);
    const real = current.lesson.checks[1].find((q) => q.id === state.items.at(-1)!.questionId)!;
    state =
      decision === "skip"
        ? applyPlacementAction(state, { kind: "skip", questionId: current.question.id }, NOW)
        : applyPlacementAction(
            state,
            {
              kind: "answer",
              questionId: current.question.id,
              response: decision ? String(real.answer) : "123456",
            },
            NOW,
          );
  }
  return state;
}

describe("Evaluación de ubicación", () => {
  test("cada clase tiene una pregunta de ubicación de procedimiento", () => {
    for (const lesson of LESSONS) {
      const q = placementQuestion(lesson);
      expect(q.task, lesson.id).toBe(1);
      expect(lesson.checks[1]).toContain(q);
    }
  });

  test("quien no sabe nada responde una pregunta por unidad y empieza por la primera clase", () => {
    const state = run(() => "skip");
    expect(state.stage).toBe("done");
    expect(state.items).toHaveLength(LEARNING_UNITS.length);
    expect(state.result!.mastered).toEqual([]);
    for (const unit of LEARNING_UNITS)
      expect(state.result!.start[unit.id]).toBe(LESSONS.find((l) => l.unitId === unit.id)!.id);
    expect(recommendedLesson(new Set(), state.result)).toBe(LESSONS[0]);
  });

  test("quien acierta todo responde dos preguntas por clase de fracciones", () => {
    const state = run(() => true);
    expect(state.items).toHaveLength(LESSONS.length + LESSONS.filter((l) => l.unitId === "fracciones").length);
    expect(state.result!.mastered).toHaveLength(LESSONS.length);
    expect(Object.values(state.result!.start).every((s) => s === null)).toBe(true);
    expect(recommendedLesson(new Set(), state.result)).toBeUndefined();
  });

  test("un fallo conceptual en fracciones impide recomendar saltar esa clase", () => {
    let state = applyPlacementAction(undefined, { kind: "begin" }, NOW);
    while (state.stage === "active") {
      const current = placementCurrent(state)!;
      const item = state.items.at(-1)!;
      const real = current.lesson.checks[1].find((q) => q.id === item.questionId)!;
      const fail = current.lesson.id === "fracciones-unidad" && real.task === 0;
      state = applyPlacementAction(state, { kind: "answer", questionId: current.question.id, response: fail ? "respuesta incorrecta" : String(real.answer) }, NOW);
    }
    expect(state.result!.start.fracciones).toBe("fracciones-unidad");
    expect(state.result!.mastered).not.toContain("fracciones-unidad");
    expect(state.items.filter((i) => i.lessonId === "fracciones-unidad")).toHaveLength(2);
  });

  test("una sesión antigua conserva el criterio de una pregunta", () => {
    const state = run(() => true);
    const old = { ...state, placementProtocol: undefined, items: state.items.filter((i) => getLesson(i.lessonId)!.unitId !== "fracciones" || i.questionId === placementQuestion(getLesson(i.lessonId)!).id), stage: "active" as const };
    const last = old.items.at(-1)!;
    last.correct = null;
    const current = placementCurrent(old)!;
    const finished = applyPlacementAction(old, { kind: "answer", questionId: current.question.id, response: String(placementQuestion(current.lesson).answer) }, NOW);
    expect(finished.result!.mastered).toContain("fracciones-unidad");
  });

  test("el primer fallo de una unidad marca su inicio y se pasa a la siguiente unidad", () => {
    const state = run((id) => !["fraccion-cantidad", "razones"].includes(id));
    const r = state.result!;
    expect(r.start.fracciones).toBe("fraccion-cantidad");
    expect(r.start.proporcionalidad).toBe("razones");
    expect(r.mastered).toContain("fracciones-equivalentes");
    // Las clases posteriores al fallo no se preguntan.
    expect(state.items.some((i) => i.lessonId === "fracciones-suma-resta")).toBe(false);
    expect(recommendedLesson(new Set(), r)?.id).toBe("fraccion-cantidad");
    // Lo terminado en clase también cuenta para la recomendación.
    expect(recommendedLesson(new Set(["fraccion-cantidad"]), r)?.id).not.toBe("fraccion-cantidad");
  });

  test("solo se responde la pregunta actual, una vez, y empezar de nuevo reinicia", () => {
    const begun = applyPlacementAction(undefined, { kind: "begin" }, NOW);
    expect(() =>
      applyPlacementAction(begun, { kind: "answer", questionId: "u9", response: "1" }, NOW),
    ).toThrow(/cambió/);
    expect(() =>
      applyPlacementAction(undefined, { kind: "skip", questionId: "u1" }, NOW),
    ).toThrow(/Empieza/);
    const done = run(() => "skip");
    const again = applyPlacementAction(done, { kind: "begin" }, NOW);
    expect(again.stage).toBe("active");
    expect(again.items).toHaveLength(1);
    expect(again.attempts).toBe(2);
    // El resultado anterior se conserva hasta terminar la nueva sesión.
    expect(again.result).toEqual(done.result);
  });
});

describe("Correspondencia con el CNEB (Perú)", () => {
  test("cada clase tiene competencia y grado orientativo", () => {
    for (const lesson of LESSONS) {
      const peru = PERU_MAP[lesson.id];
      expect(peru, lesson.id).toBeDefined();
      expect(Object.keys(PERU_COMPETENCIES)).toContain(peru.competency);
      expect(peru.grade).toBeGreaterThanOrEqual(1);
      expect(peru.grade).toBeLessThanOrEqual(5);
    }
    expect(Object.keys(PERU_MAP).every((id) => getLesson(id))).toBe(true);
  });

  test("el grado alcanzado exige todas las clases de los grados anteriores", () => {
    const grade1 = Object.entries(PERU_MAP)
      .filter(([, m]) => m.competency === "forma" && m.grade === 1)
      .map(([id]) => id);
    expect(peruLevel("forma", new Set())).toBe(0);
    expect(peruLevel("forma", new Set(grade1))).toBe(1);
    expect(peruLevel("forma", new Set([...grade1, "circulo"]))).toBe(1);
    expect(peruLevel("forma", new Set([...grade1, "circulo", "volumen"]))).toBe(2);
  });
});

describe("Diagnóstico de respuestas", () => {
  test("encuentra cada pregunta por su identificador, sin ambigüedad entre bancos", () => {
    for (const lesson of LESSONS) {
      const banks = [lesson.diagnostic, lesson.guided, lesson.practice, ...lesson.checks, lesson.review, lesson.mixed, [lesson.application]];
      const ids = banks.flat().map((q) => q.id);
      expect(new Set(ids).size, lesson.id).toBe(ids.length);
      for (const q of banks.flat()) expect(findQuestion(lesson, q.id)?.question).toBe(q);
    }
  });

  test("reconoce errores previstos numéricos y de opción, y agrupa formas paralelas", () => {
    const lesson = getLesson("perimetro-area")!;
    const area = lesson.practice.find((q) => q.errors?.length)!;
    const error = area.errors![0];
    expect(matchError(area, String(area.answer))).toBeNull();
    expect(matchError(area, String(error.value))).toBe(`e:${error.value}`);
    expect(errorText(area, `e:${error.value}`)).toBe(error.feedback);
    expect(matchError(area, "987654")).toBeNull();
    const concept = lesson.practice.find((q) => q.choices)!;
    const wrong = concept.choices!.find((c) => c.id !== concept.answer)!;
    expect(matchError(concept, wrong.id)).toBe(`c:${wrong.id}`);
    expect(errorText(concept, `c:${wrong.id}`)).toBe(wrong.feedback);
    expect(errorGroup("Sumaste 6 a 200 y obtuviste 2,5")).toBe("Sumaste # a # y obtuviste #");
    const outcome = answerOutcome(lesson.id, area, "practice", undefined, String(error.value));
    expect(outcome).toMatchObject({ lessonId: lesson.id, correct: false, error: `e:${error.value}`, task: area.task });
  });
});
