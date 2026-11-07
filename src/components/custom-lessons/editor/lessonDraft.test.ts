import { describe, expect, test } from "vitest";
import type { ChoiceQuestion, CustomLesson } from "../../../../functions/src/customLessons/schema";
import { canonicalTopic, groupLessons, NO_TOPIC, topicKey } from "./groupLessons";
import { addOption, convertQuestion, fieldId, moveOption, planSave, removeOption } from "./lessonDraft";

const q1: ChoiceQuestion = { id: "q1", prompt: "¿2 + 2?", answer: 1, options: ["3", "4"], explanation: "" };
const base: CustomLesson = { title: "Sumas", topic: "Números", content: "Sumar une cantidades.", game: "write", published: true, updatedAt: 10, contentVersion: 5, order: 3, questions: [q1] };

describe("guardar una clase", () => {
  test("guardar una clase publicada no la despublica", () => {
    const plan = planSave({ ...base, title: "Sumas fáciles" }, base, "keep", [], 99);
    expect(plan).toMatchObject({ ok: true, resetsProgress: false, lesson: { published: true, updatedAt: 99, contentVersion: 5, order: 3, title: "Sumas fáciles" } });
  });
  test("retirar la pasa a borrador", () => expect(planSave(base, base, "unpublish", [], 99)).toMatchObject({ ok: true, lesson: { published: false } }));
  test("avisa si cambiar las respuestas reinicia el progreso", () => {
    const plan = planSave({ ...base, questions: [{ ...q1, answer: 0 }] }, base, "keep", [], 99);
    expect(plan).toMatchObject({ ok: true, resetsProgress: true, lesson: { contentVersion: 99 } });
  });
  test("una clase publicada con errores no se guarda", () => {
    const plan = planSave({ ...base, questions: [{ ...q1, options: ["4", "4"] }] }, base, "keep", [], 99);
    expect(plan.ok).toBe(false);
  });
  test("un borrador solo necesita título", () => {
    expect(planSave({ ...base, questions: [] }, null, "draft", [], 99)).toMatchObject({ ok: true, lesson: { published: false, order: 3, contentVersion: 99 } });
    expect(planSave({ ...base, title: " " }, null, "draft", [], 99)).toMatchObject({ ok: false, errors: [{ field: "title" }] });
  });
  test("una clase nueva va al final de su tema y se limpia el texto de las respuestas", () => {
    const plan = planSave({ ...base, order: undefined, questions: [{ ...q1, options: [" 3 ", "4"] }] }, null, "publish", [], 99);
    expect(plan).toMatchObject({ ok: true, lesson: { order: 99, questions: [{ options: ["3", "4"] }] } });
  });
  test("conserva el orden guardado aunque el borrador tenga uno anterior", () => {
    expect(planSave({ ...base, order: 1 }, { ...base, order: 7 }, "keep", [], 99)).toMatchObject({ lesson: { order: 7 } });
  });
  test("reutiliza la grafía de un tema existente", () => {
    expect(planSave({ ...base, topic: "  números " }, base, "keep", ["Números"], 99)).toMatchObject({ lesson: { topic: "Números" } });
  });
});

describe("respuestas", () => {
  test("la correcta acompaña a su respuesta al moverla", () => {
    expect(moveOption({ options: ["a", "b", "c"], answer: 1 }, 1, 0)).toEqual({ options: ["b", "a", "c"], answer: 0 });
    expect(moveOption({ options: ["a", "b", "c"], answer: 0 }, 1, 0)).toEqual({ options: ["b", "a", "c"], answer: 1 });
    expect(moveOption({ options: ["a", "b", "c"], answer: 2 }, 0, 1)).toEqual({ options: ["b", "a", "c"], answer: 2 });
    expect(moveOption({ options: ["a", "b"], answer: 1 }, 1, 2)).toEqual({ options: ["a", "b"], answer: 1 });
  });
  test("el comentario de cada respuesta se mueve, se quita y se añade con ella", () => {
    expect(moveOption({ options: ["a", "b"], answer: 0, optionFeedback: ["", "fb"] }, 1, 0)).toEqual({ options: ["b", "a"], answer: 1, optionFeedback: ["fb", ""] });
    expect(removeOption({ options: ["a", "b", "c"], answer: 0, optionFeedback: ["", "x", "y"] }, 1)).toEqual({ options: ["a", "c"], answer: 0, optionFeedback: ["", "y"] });
    expect(addOption({ options: ["a"], answer: 0, optionFeedback: [""] })).toEqual({ options: ["a", ""], answer: 0, optionFeedback: ["", ""] });
  });
  test("quitar la correcta obliga a elegir otra", () => {
    expect(removeOption({ options: ["a", "b", "c"], answer: 1 }, 1)).toEqual({ options: ["a", "c"], answer: -1 });
    expect(removeOption({ options: ["a", "b", "c"], answer: 2 }, 0)).toEqual({ options: ["b", "c"], answer: 1 });
  });
  test("cambiar el tipo conserva el texto y la respuesta correcta", () => {
    const numeric = convertQuestion({ ...q1, hint: "cuenta" }, "numeric");
    expect(numeric).toEqual({ id: "q1", prompt: "¿2 + 2?", explanation: "", hint: "cuenta", kind: "numeric", value: "4" });
    expect(convertQuestion(numeric, "choice")).toMatchObject({ kind: "choice", options: ["4", ""], answer: 0, hint: "cuenta" });
  });
  test("las preguntas numéricas se validan al publicar", () => {
    const lesson = { ...base, questions: [{ id: "n1", kind: "numeric" as const, prompt: "¿6/8?", value: "tres cuartos", explanation: "" }] };
    expect(planSave(lesson, null, "publish", [], 99)).toMatchObject({ ok: false, errors: [{ question: 0, field: "value" }] });
    expect(planSave({ ...lesson, questions: [{ ...lesson.questions[0], value: " 3/4 " }] }, null, "publish", [], 99)).toMatchObject({ ok: true, lesson: { questions: [{ value: "3/4" }] } });
    expect(fieldId({ question: 0, field: "value" })).toBe("question-0-value");
  });
});

describe("temas", () => {
  test("ignora mayúsculas y espacios", () => {
    expect(topicKey("  Fracciones   Decimales ")).toBe("fracciones decimales");
    expect(canonicalTopic("fracciones", ["Fracciones"])).toBe("Fracciones");
    expect(canonicalTopic(" Geometría  plana", ["Fracciones"])).toBe("Geometría plana");
  });
  test("agrupa por tema, ordena y deja «Sin tema» al final", () => {
    const l = (title: string, topic: string, order?: number, updatedAt = 1) => ({ title, topic, order, updatedAt });
    const groups = groupLessons([l("B", "fracciones", 2), l("Suelta", ""), l("A", "Fracciones", 1), l("C", "Álgebra", undefined, 5)]);
    expect(groups.map((g) => [g.topic, g.lessons.map((x) => x.title)])).toEqual([["Álgebra", ["C"]], ["Fracciones", ["A", "B"]], [NO_TOPIC, ["Suelta"]]]);
  });
});
