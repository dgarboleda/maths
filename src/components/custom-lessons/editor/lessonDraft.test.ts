import { describe, expect, test } from "vitest";
import type { CustomLesson } from "../../../../functions/src/customLessons/schema";
import { canonicalTopic, groupLessons, NO_TOPIC, topicKey } from "./groupLessons";
import { moveOption, planSave, removeOption } from "./lessonDraft";

const base: CustomLesson = { title: "Sumas", topic: "Números", content: "Sumar une cantidades.", game: "write", published: true, updatedAt: 10, contentVersion: 5, order: 3, questions: [{ id: "q1", prompt: "¿2 + 2?", answer: 1, options: ["3", "4"], explanation: "" }] };

describe("guardar una clase", () => {
  test("guardar una clase publicada no la despublica", () => {
    const plan = planSave({ ...base, title: "Sumas fáciles" }, base, "keep", [], 99);
    expect(plan).toMatchObject({ ok: true, resetsProgress: false, lesson: { published: true, updatedAt: 99, contentVersion: 5, order: 3, title: "Sumas fáciles" } });
  });
  test("retirar la pasa a borrador", () => expect(planSave(base, base, "unpublish", [], 99)).toMatchObject({ ok: true, lesson: { published: false } }));
  test("avisa si cambiar las respuestas reinicia el progreso", () => {
    const plan = planSave({ ...base, questions: [{ ...base.questions[0], answer: 0 }] }, base, "keep", [], 99);
    expect(plan).toMatchObject({ ok: true, resetsProgress: true, lesson: { contentVersion: 99 } });
  });
  test("una clase publicada con errores no se guarda", () => {
    const plan = planSave({ ...base, questions: [{ ...base.questions[0], options: ["4", "4"] }] }, base, "keep", [], 99);
    expect(plan.ok).toBe(false);
  });
  test("un borrador solo necesita título", () => {
    expect(planSave({ ...base, questions: [] }, null, "draft", [], 99)).toMatchObject({ ok: true, lesson: { published: false, order: 3, contentVersion: 99 } });
    expect(planSave({ ...base, title: " " }, null, "draft", [], 99)).toMatchObject({ ok: false, errors: [{ field: "title" }] });
  });
  test("una clase nueva va al final de su tema y se limpia el texto de las respuestas", () => {
    const plan = planSave({ ...base, order: undefined, questions: [{ ...base.questions[0], options: [" 3 ", "4"] }] }, null, "publish", [], 99);
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
    expect(moveOption(["a", "b", "c"], 1, 1, 0)).toEqual({ options: ["b", "a", "c"], answer: 0 });
    expect(moveOption(["a", "b", "c"], 0, 1, 0)).toEqual({ options: ["b", "a", "c"], answer: 1 });
    expect(moveOption(["a", "b", "c"], 2, 0, 1)).toEqual({ options: ["b", "a", "c"], answer: 2 });
    expect(moveOption(["a", "b"], 1, 1, 2)).toEqual({ options: ["a", "b"], answer: 1 });
  });
  test("quitar la correcta obliga a elegir otra", () => {
    expect(removeOption(["a", "b", "c"], 1, 1)).toEqual({ options: ["a", "c"], answer: -1 });
    expect(removeOption(["a", "b", "c"], 2, 0)).toEqual({ options: ["b", "c"], answer: 1 });
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
