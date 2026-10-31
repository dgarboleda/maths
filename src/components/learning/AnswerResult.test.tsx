import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import type { ResponseEvidence } from "@/lib/learning/domain";
import { AnswerResult } from "./AnswerResult";

const correct: ResponseEvidence = { firstCorrect: true, correct: true, attempts: 1, hintsUsed: 0, revealed: false, response: "3", updatedAt: 1 };

test("distingue respuestas autónomas, incorrectas y correctas con ayuda", () => {
  const view = render(<AnswerResult evidence={correct} />);
  expect(screen.getByText(/Correcta · resuelta de forma autónoma/)).toHaveClass("text-emerald-300");
  view.rerender(<AnswerResult evidence={{ ...correct, firstCorrect: false, correct: false }} />);
  expect(screen.getByText(/Incorrecta · repasa el razonamiento/)).toHaveClass("text-red-300");
  view.rerender(<AnswerResult evidence={{ ...correct, hintsUsed: 1 }} />);
  expect(screen.getByText(/Correcta con apoyo/)).toHaveClass("text-orange-300");
  view.rerender(<AnswerResult />);
  expect(screen.getByText(/Sin respuesta registrada/)).toHaveClass("text-orange-300");
});
