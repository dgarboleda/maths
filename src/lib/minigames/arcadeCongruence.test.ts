import { describe, expect, test } from "vitest";
import { LESSONS, isAnswerCorrect, parseNumber, type Question } from "@/lib/learning/domain";
import { MODULES } from "@/lib/curriculum";
import { lessonProblem } from "./lessonExercise";
import { arcadeValues, choiceLabel } from "./lessonArcade";

/**
 * Congruencia entre la pregunta y lo que muestran los minijuegos: lo que se
 * lee en cada alternativa es lo que se envía y se corrige igual, ninguna
 * etiqueta se repite, se respeta la forma que pide el enunciado y la
 * respuesta no se delata por su forma ni por copiar el enunciado.
 */

const practice: Question[] = LESSONS.flatMap((lesson) => lesson.practice).filter((q) => lessonProblem(q) !== null);
const where = (q: Question) => `${q.id}: ${q.prompt}`;
const ASKS_DECIMAL = /\b(?:como|en|forma)\s+(?:un\s+|número\s+)*decimal\b/i;
const EITHER_FORM = /fracci[oó]n\s+o\s+decimal|decimal\s+o\s+fracci[oó]n/i;
const ASKS_FRACTION = /\b(?:como|en forma de)\s+(?:una\s+)?fracci[oó]n\b/i;

describe("clases: pregunta y alternativas del juego", () => {
  test("hay preguntas de práctica que auditar", () => {
    expect(practice.length).toBeGreaterThan(200);
  });

  test.each(practice.map((q) => [where(q), q] as const))("%s", (_, q) => {
    const problem = lessonProblem(q)!;
    const values = problem.choices!;
    const labels = values.map((value) => choiceLabel(problem, value));
    const answer = q.answer as number;

    // Lo que se lee se corrige igual que lo que se envía, y solo una opción es correcta.
    labels.forEach((label, i) => {
      expect(parseNumber(label), `«${label}» no se puede leer como número`).not.toBeNull();
      expect(isAnswerCorrect(q, label), `«${label}» se corrige distinto de ${values[i]}`).toBe(isAnswerCorrect(q, String(values[i])));
    });
    expect(values.filter((value) => isAnswerCorrect(q, String(value)))).toHaveLength(1);
    expect(new Set(labels).size, `etiquetas repetidas: ${labels.join(" · ")}`).toBe(labels.length);

    // Se respeta la forma pedida.
    const correctLabel = labels[values.findIndex((value) => isAnswerCorrect(q, String(value)))];
    if (ASKS_DECIMAL.test(q.prompt) && !EITHER_FORM.test(q.prompt)) expect(correctLabel, "pide decimal").not.toContain("/");
    if (ASKS_FRACTION.test(q.prompt) && !EITHER_FORM.test(q.prompt) && !Number.isInteger(answer)) expect(correctLabel, "pide fracción").toContain("/");

    // Cambiar de forma (fracción ↔ decimal ↔ porcentaje) no se resuelve
    // copiando un número del enunciado. Elegir «la mayor» entre varios sí.
    if (/\b(?:como|en)\s+(?:un\s+)?(?:decimal|fracci[oó]n|porcentaje)\b/i.test(q.prompt) && !EITHER_FORM.test(q.prompt)) {
      const tokens = q.prompt.replace(/−/g, "-").match(/-?\d+(?:[.,]\d+)?(?:\/\d+)?/g) ?? [];
      expect(tokens, `la respuesta «${correctLabel}» aparece tal cual en el enunciado`).not.toContain(correctLabel.replace(/−/g, "-"));
    }

    // Distractores generados dentro del dominio (los errores razonados del contenido se respetan).
    const authored = (q.errors ?? []).map((e) => e.value);
    const invented = values.filter((value) => value !== answer && !authored.some((e) => typeof e === "number" && Math.abs(e - value) < 1e-8));
    if (answer >= 0 && !/[−-]\s?\d/.test(q.prompt)) expect(invented.filter((v) => v < 0), "negativos inventados").toEqual([]);
    if (/probabilidad|\bP\(/i.test(q.prompt) && answer >= 0 && answer <= 1) expect(invented.filter((v) => v < 0 || v > 1), "probabilidad fuera de [0, 1]").toEqual([]);
  });
});

describe("modo legado: módulos del currículo en los minijuegos de los niveles", () => {
  // Cada minijuego pide entre 3 (carriles) y 8 (bloques) alternativas.
  const SLOTS = [3, 5, 8];
  const SAMPLES = 60;

  test.each(MODULES.map((mod) => [mod.id, mod] as const))("%s", (_, mod) => {
    for (let i = 0; i < SAMPLES; i++) {
      const problem = mod.generateProblem();
      for (const count of SLOTS) {
        const values = arcadeValues(problem, count, Math.max(8, count * 2));
        const labels = values.map((value) => choiceLabel(problem, value));
        const context = `${problem.prompt} → ${labels.join(" · ")}`;
        expect(values, context).toContain(problem.answer);
        expect(values.length, context).toBeGreaterThanOrEqual(2);
        expect(values.length, context).toBeLessThanOrEqual(count);
        expect(new Set(labels).size, `etiquetas repetidas: ${context}`).toBe(labels.length);
        if (problem.choiceLabels) {
          // Opciones de texto: nunca el índice interno en lugar de su nombre.
          for (const label of labels) expect(problem.choiceLabels, context).toContain(label);
        } else {
          for (const [k, label] of labels.entries()) {
            const read = parseNumber(label);
            expect(read, `«${label}» no se puede leer: ${context}`).not.toBeNull();
            expect(Math.abs(read! - values[k]), `«${label}» no es ${values[k]}`).toBeLessThan(1e-6);
          }
        }
        if (problem.answer < 0 && !problem.choices)
          expect(values.filter((v) => v < 0).length, `el signo delata la respuesta: ${context}`).toBeGreaterThan(1);
      }
    }
  });
});
