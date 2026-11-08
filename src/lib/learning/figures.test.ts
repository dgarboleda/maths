import { describe, expect, test } from "vitest";
import { describeFigure, figureLabels, LESSONS, type Lesson, type Question } from "./domain";

const questionsOf = (lesson: Lesson): Question[] => [
  ...lesson.diagnostic,
  ...lesson.guided,
  ...lesson.practice,
  ...lesson.checks[0],
  ...lesson.checks[1],
  ...lesson.review,
  ...lesson.mixed,
  lesson.application,
];
const withFigure = LESSONS.flatMap((lesson) =>
  questionsOf(lesson)
    .filter((q) => q.figure)
    .map((q) => ({ lesson: lesson.id, q })),
);

/** «8,5 cm» → 8.5; «(2x + 10)°» → null. */
function labelNumber(label: string): number | null {
  const m = label.replace(/ /g, " ").match(/^\s*(−|-)?(\d+(?:[ ]\d{3})*(?:,\d+)?)\s*(°|cm²|cm³|m²|m³|cm|dm|mm|km|m|soles|L)?\s*$/);
  if (!m) return null;
  const value = Number(m[2].replace(/ /g, "").replace(",", "."));
  return m[1] ? -value : value;
}

/** Clases que dependen de una figura y la cantidad mínima de preguntas con
 *  figura (sobre 32). Ver la investigación en docs/figuras-preguntas.md. */
const COVERAGE: Record<string, number> = {
  "rectas-paralelas": 20,
  "clasificacion-figuras": 20,
  "graficos-estadisticos": 20,
  circulo: 20,
  "areas-poligonos": 20,
  "perimetro-area": 15,
  "area-superficie": 20,
  transformaciones: 20,
  "tales-congruencia": 15,
  semejanza: 10,
  trigonometria: 20,
  "distancia-punto-medio": 20,
  "volumen-conos-esferas": 20,
  volumen: 10,
  angulos: 15,
  pitagoras: 15,
  "tablas-frecuencia": 15,
  "probabilidad-condicional": 15,
  "estadistica-dispersion": 10,
  "media-mediana-moda": 5,
  "probabilidad-compuesta": 5,
  "probabilidad-simple": 5,
  "funciones-lineales": 5,
  "funcion-cuadratica": 2,
  "enteros-recta": 5,
  "fracciones-unidad": 5,
  proporcionalidad: 5,
  "proporcionalidad-inversa": 3,
};

describe("Figuras de apoyo de las preguntas", () => {
  test("las clases que dependen de una figura la tienen en sus bancos", () => {
    const missing = Object.entries(COVERAGE).flatMap(([id, min]) => {
      const lesson = LESSONS.find((l) => l.id === id);
      if (!lesson) return [`${id}: no existe`];
      const count = questionsOf(lesson).filter((q) => q.figure).length;
      return count >= min ? [] : [`${id}: ${count} < ${min}`];
    });
    expect(missing).toEqual([]);
  });

  // Una filtración es un rótulo igual a la respuesta que el enunciado no
  // dice (en «el alterno interno de 65°» la respuesta es el dato mismo).
  test("ninguna figura muestra la respuesta numérica", () => {
    const leaks = withFigure.flatMap(({ lesson, q }) => {
      if (typeof q.answer !== "number") return [];
      return figureLabels(q.figure!)
        .filter((label) => {
          const value = labelNumber(label);
          return value !== null && Math.abs(value - (q.answer as number)) < 1e-9 && !q.prompt.includes(label);
        })
        .map((label) => `${lesson} ${q.id}: «${label}» = ${q.answer} (${q.prompt.slice(0, 60)})`);
    });
    expect(leaks).toEqual([]);
  });

  test("toda figura tiene una descripción para lectores de pantalla", () => {
    for (const { q } of withFigure) {
      const text = describeFigure(q.figure!);
      expect(text.length).toBeGreaterThan(10);
      expect(text).not.toMatch(/undefined|NaN/);
    }
  });

  test("los puntos de un plano tienen nombres distintos y las referencias existen", () => {
    for (const { lesson, q } of withFigure) {
      const f = q.figure!;
      if (f.kind !== "plane") continue;
      const names = f.points.map((p) => p.name);
      expect(new Set(names).size, `${lesson} ${q.id}`).toBe(names.length);
      const refs = [...(f.segments ?? []).flat(), ...(f.vectors ?? []).flatMap((v) => (v.from ? [v.from] : [])), ...(f.legs ? [f.legs.from, f.legs.to] : [])];
      for (const r of refs) expect(names, `${lesson} ${q.id}`).toContain(r);
    }
  });

  test("los gráficos y las tablas son coherentes", () => {
    for (const { lesson, q } of withFigure) {
      const f = q.figure!;
      if (f.kind === "table") for (const row of f.rows) expect(row.length, `${lesson} ${q.id}`).toBe(f.head.length);
      if (f.kind === "tree") expect(f.second.length, `${lesson} ${q.id}`).toBe(f.first.length);
      if (f.kind === "chart") for (const d of f.data) expect(Number.isFinite(d.value), `${lesson} ${q.id}`).toBe(true);
      if (f.kind === "fraction-bar") for (const b of f.bars) expect(b.shaded).toBeLessThanOrEqual(b.parts);
    }
  });
});
