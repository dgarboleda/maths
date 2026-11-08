import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { describeFigure, LESSONS, type Figure, type Lesson, type Question } from "@/lib/learning/domain";
import { QuestionFigure } from "./QuestionFigure";

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
const FIGURES: { id: string; figure: Figure }[] = LESSONS.flatMap((lesson) =>
  questionsOf(lesson).flatMap((q) => (q.figure ? [{ id: `${lesson.id} ${q.id}`, figure: q.figure }] : [])),
);
// Una figura de cada tipo para la revisión de accesibilidad (axe es lento).
const ONE_PER_KIND = [...new Map(FIGURES.map((f) => [f.figure.kind, f])).values()];

describe("Figuras de las preguntas", () => {
  test("todas las figuras del catálogo se dibujan sin coordenadas inválidas", () => {
    expect(FIGURES.length).toBeGreaterThan(400);
    for (const { id, figure } of FIGURES) {
      const { container, unmount } = render(<QuestionFigure figure={figure} />);
      const html = container.innerHTML;
      expect(html, id).not.toMatch(/NaN|undefined|Infinity/);
      if (figure.kind === "table") {
        expect(container.querySelector("table"), id).not.toBeNull();
      } else {
        const svg = container.querySelector("svg[role=img]");
        expect(svg?.getAttribute("aria-label"), id).toBe(describeFigure(figure));
      }
      unmount();
    }
  });

  test.each(ONE_PER_KIND.map((f) => [f.figure.kind, f] as const))("%s es accesible", async (_, { figure }) => {
    const { container } = render(<QuestionFigure figure={figure} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  test("la incógnita se resalta y nunca se dibuja la respuesta en un plano", () => {
    const { container } = render(
      <QuestionFigure figure={{ kind: "triangle", shape: "right", sides: ["3 cm", "?", "4 cm"] }} />,
    );
    const ask = [...container.querySelectorAll("text")].find((t) => t.textContent === "?");
    expect(ask?.getAttribute("class")).toContain("fill-amber-200");
    expect(container.textContent).toContain("no está a escala");
  });
});
