"use client";

import dynamic from "next/dynamic";
import type { Question } from "@/lib/learning/core";

// Solo las preguntas con figura descargan el dibujo (presupuesto de JS).
const QuestionFigure = dynamic(() => import("./QuestionFigure").then((module) => module.QuestionFigure), {
  loading: () => <p role="status">Preparando la figura…</p>,
});

/** Figura de apoyo de la pregunta, si la tiene. */
export function QuestionFigureSlot({ question }: { question: Pick<Question, "figure"> }) {
  if (!question.figure) return null;
  return (
    <figure className="my-3">
      <QuestionFigure figure={question.figure} />
    </figure>
  );
}
