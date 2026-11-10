import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { expect, test } from "vitest";
import { getLesson } from "@/lib/learning/domain";
import { explanationPrompt } from "@/lib/learning/selfExplanation";
import { WorkedExample } from "./WorkedExample";

const example = getLesson("fracciones-equivalentes")!.examples[1];

test("el ejemplo de estudio muestra todos los pasos con su justificación", () => {
  render(<WorkedExample example={example} explain={false} />);
  expect(screen.getAllByText("Por qué:")).toHaveLength(example.steps.length);
  expect(screen.queryByText("¿Por qué se hace este paso?")).not.toBeInTheDocument();
});

test("al explicar, la justificación aparece después de elegirla y nunca bloquea", async () => {
  const user = userEvent.setup();
  const { container } = render(<WorkedExample example={example} explain />);
  expect(screen.queryByText("Por qué:")).not.toBeInTheDocument();
  expect(screen.getAllByRole("group", { name: "¿Por qué se hace este paso?" })).toHaveLength(1);
  expect(await axe(container)).toHaveNoViolations();

  const first = explanationPrompt(example, 0)!;
  const steps = screen.getAllByRole("listitem");
  await user.click(within(steps[0]).getAllByRole("button")[first.correct]);
  expect(within(steps[0]).getByText("Lo explicaste tú")).toBeInTheDocument();
  expect(within(steps[0]).getByText("Por qué:")).toBeInTheDocument();
  expect(screen.getByText(`Explicaste 1 de ${example.steps.length} pasos por tu cuenta.`)).toBeInTheDocument();

  const second = explanationPrompt(example, 1)!;
  await user.click(within(steps[1]).getAllByRole("button")[(second.correct + 1) % 3]);
  expect(within(steps[1]).getByText("Esta es la justificación de este paso")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Mostrar todas las explicaciones" }));
  expect(screen.getAllByText("Por qué:")).toHaveLength(example.steps.length);
  expect(screen.queryByRole("button", { name: "Mostrar todas las explicaciones" })).not.toBeInTheDocument();
  expect(screen.getByText(`Explicaste 1 de ${example.steps.length} pasos por tu cuenta.`)).toBeInTheDocument();
  expect(await axe(container)).toHaveNoViolations();
});
