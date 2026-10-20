import { describe, expect, test } from "vitest";
import { MODULES } from "@/lib/curriculum";
import {
  getLesson,
  isAnswerCorrect,
  LEARNING_UNITS,
  LESSONS,
  parseNumber,
} from "./domain";

describe("Contrato editorial del programa inicial", () => {
  test("doce clases completas, sin prerrequisitos ausentes ni ciclos", () => {
    expect(LESSONS.length).toBeGreaterThanOrEqual(24);
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
    const visit = (id: string, path: string[] = []) => {
      expect(path).not.toContain(id);
      const l = getLesson(id);
      expect(l).toBeDefined();
      l!.prerequisites.forEach((p) => visit(p, [...path, id]));
    };
    for (const unit of LEARNING_UNITS)
      expect(LESSONS.filter((l) => l.unitId === unit.id).length, unit.id).toBeGreaterThanOrEqual(2);
    // Cada clase pertenece a una unidad existente y sus bases van antes en el catálogo.
    LESSONS.forEach((l, i) => {
      expect(LEARNING_UNITS.some((u) => u.id === l.unitId)).toBe(true);
      l.prerequisites.forEach((p) => expect(LESSONS.findIndex((o) => o.id === p), `${l.id} ← ${p}`).toBeLessThan(i));
    });
    for (const l of LESSONS) {
      visit(l.id);
      expect(l.sections).toHaveLength(3);
      expect(l.examples.length).toBeGreaterThanOrEqual(2);
      expect(l.guided).toHaveLength(3);
      expect(l.practice).toHaveLength(7);
      expect(new Set(l.practice.map((q) => q.format)).size).toBe(3);
      expect(l.commonErrors.length).toBeGreaterThanOrEqual(3);
      l.legacyModuleIds.forEach((id) =>
        expect(MODULES.some((m) => m.id === id)).toBe(true),
      );
      l.examples.forEach((ex) => {
        expect(ex.steps.length).toBeGreaterThanOrEqual(3);
        ex.steps.forEach((step) => expect(step.why.length).toBeGreaterThan(10));
      });
      for (const bank of [
        l.diagnostic,
        l.guided,
        l.practice,
        ...l.checks,
        l.review,
        l.mixed,
        [l.application],
      ]) {
        expect(new Set(bank.map((q) => q.id)).size, l.id).toBe(bank.length);
        bank.forEach((q) => {
          expect(q.prompt.length).toBeGreaterThan(10);
          expect(q.solution.length).toBeGreaterThan(0);
          expect(q.hints).toHaveLength(3);
          expect(isAnswerCorrect(q, String(q.answer)), `${l.id} ${q.id}`).toBe(true);
          if (q.choices) {
            expect(new Set(q.choices.map((o) => o.label)).size).toBe(
              q.choices.length,
            );
            expect(q.choices.some((o) => o.id === q.answer)).toBe(true);
          } else expect(Number.isFinite(q.answer)).toBe(true);
          // Un error previsto nunca puede coincidir con la respuesta correcta.
          for (const error of q.errors ?? [])
            expect(isAnswerCorrect(q, String(error.value)), `${l.id} ${q.id} error ${error.value}`).toBe(false);
          // Cada alternativa incorrecta explica su propio error.
          for (const option of q.choices ?? [])
            if (option.id !== q.answer && bank !== l.diagnostic)
              expect(option.feedback, `${l.id} ${q.id}`).not.toMatch(/^Revisa esa afirmación/);
        });
      }
      // La aplicación es una tarea propia, distinta de los bancos.
      expect(l.application.intent).toBe("transfer");
      for (const q of [...l.practice, ...l.checks.flat(), ...l.review])
        expect(q.prompt).not.toBe(l.application.prompt);
      for (const bank of [...l.checks, l.review]) {
        expect(bank.some((q) => q.intent === "concept")).toBe(true);
        expect(bank.some((q) => q.intent === "transfer")).toBe(true);
      }
      expect(l.editorial.author.trim()).not.toBe("");
      // Una aprobación futura debe registrar una revisión de esta versión.
      if (l.editorial.status === "teacher-reviewed") {
        expect(l.editorial.review?.reviewer.trim()).toBeTruthy();
        expect(l.editorial.review?.reviewer).not.toBe(l.editorial.author);
        expect(l.editorial.review?.version).toBe(l.version);
        expect(l.editorial.review?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      } else expect(l.editorial.review).toBeUndefined();
    }
  });
  test("valores calculados a mano en problemas directos e inversos", () => {
    const fraction = getLesson("fraccion-cantidad")!;
    expect(fraction.practice[1].answer).toBe(24); // 2/5 de 60
    expect(fraction.practice[2].answer).toBe(12); // 1/5 de 60
    expect(fraction.practice[3].answer).toBe(72); // 6/5 de 60
    expect(fraction.practice[6].answer).toBe(60); // 24 son 2/5 de la reserva
    expect(fraction.checks[0][4].answer).toBe(72); // 60 son 5/6 de 72
    const percentages = getLesson("porcentajes-aplicados")!;
    expect(percentages.practice[1].answer).toBe(60); // 20% de 300
    expect(percentages.practice[2].answer).toBe(240);
    expect(percentages.practice[3].answer).toBe(360);
    expect(percentages.practice[6].answer).toBe(300); // 240 tras −20%
    expect(getLesson("ecuaciones-un-paso")!.practice[3].answer).toBe(-5); // x+9=4
    expect(getLesson("ecuaciones-un-paso")!.practice[6].answer).toBe(10); // x/5=2
    expect(getLesson("ecuaciones-dos-pasos")!.checks[0][1].answer).toBe(4); // 5x+6=26
    expect(getLesson("modelar-ecuaciones")!.practice[3].answer).toBe(4); // máx. 20: (20−6)/3 = 4,67
    expect(getLesson("modelar-ecuaciones")!.practice[6].answer).toBe(6); // 11 y 21 por 1 y 3 h
  });

  test("los dos puntos nunca separan números: en Perú «:» también es división", () => {
    // «30 − 5 × 2: 5 × 2» se lee como una división. Entre expresiones se usa
    // «→» o una frase; la razón «3:4» (sin espacio) sigue permitida.
    const ambiguous = /[\d)²³]\s*:\s+[−\-\d(x√¿]/;
    for (const l of LESSONS) {
      const texts: string[] = [];
      for (const q of [...l.diagnostic, ...l.guided, ...l.practice, ...l.checks.flat(), ...l.review, ...l.mixed, l.application])
        texts.push(q.prompt, ...q.solution, ...q.hints, ...(q.choices?.flatMap((c) => [c.label, c.feedback ?? ""]) ?? []), ...(q.errors?.map((e) => e.feedback) ?? []));
      for (const s of l.sections) texts.push(...s.paragraphs, s.formula ?? "");
      for (const e of l.examples) texts.push(e.prompt, e.conclusion, ...e.steps.flatMap((s) => [s.math, s.why]));
      for (const text of texts) expect(text, l.id).not.toMatch(ambiguous);
    }
  });

  test("las formas paralelas no repiten respuestas ni posiciones", () => {
    for (const l of LESSONS) {
      const [a, b] = l.checks;
      // Ninguna tarea numérica de la comprobación tiene la misma respuesta en ambas formas.
      a.forEach((q, i) => {
        if (q.format !== "choice") expect(b[i].answer, `${l.id} ${q.id}`).not.toBe(q.answer);
      });
      // La respuesta de las tareas de elección no ocupa siempre la misma posición.
      const positions = [...l.practice, ...a, ...b, ...l.review]
        .filter((q) => q.choices)
        .map((q) => q.choices!.findIndex((o) => o.id === q.answer));
      expect(new Set(positions).size, l.id).toBeGreaterThan(1);
    }
  });
});

describe("Entradas matemáticas", () => {
  test.each([
    ["3/4", 0.75],
    ["6/8", 0.75],
    ["0,75", 0.75],
    [".75", 0.75],
    ["−3", -3],
    ["1 / -2", -0.5],
    ["10/10", 1],
  ])("interpreta %s", (input, expected) =>
    expect(parseNumber(String(input))).toBe(expected),
  );
  test.each([
    "1/0",
    "Infinity",
    "2+3",
    "1,2,3",
    "",
    "<script>",
    "1e99",
    "1/2/3",
  ])("rechaza %s sin evaluar código", (input) =>
    expect(parseNumber(input)).toBeNull(),
  );
  test("acepta fracciones equivalentes, pero no redondeos que cambian el valor solicitado", () => {
    const q = getLesson("fracciones-unidad")!.practice[1]; // 2/6
    expect(isAnswerCorrect(q, "1/3")).toBe(true);
    expect(isAnswerCorrect(q, "0,3")).toBe(false);
  });
});
