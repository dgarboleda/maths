import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import { axe } from "jest-axe";
import { FormularioSheet, formularioUnits } from "./FormularioSheet";

test("el formulario imprimible agrupa por unidad y filtra una sola", async () => {
  expect(formularioUnits().every((unit) => unit.lessons.every((lesson) => lesson.formulas.length > 0))).toBe(true);
  const view = render(<FormularioSheet childId="ana" unitId="expresiones" />);
  expect(screen.getByRole("heading", { level: 1, name: "Formulario: Expresiones, ecuaciones y funciones" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Progresiones aritméticas y geométricas" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Teorema de Pitágoras" })).not.toBeInTheDocument();
  expect(within(screen.getByRole("navigation", { name: "Unidades" })).getByRole("link", { name: "Expresiones, ecuaciones y funciones" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("button", { name: /Imprimir/ })).toBeInTheDocument();
  expect(await axe(view.container)).toHaveNoViolations();
  view.rerender(<FormularioSheet childId="ana" unitId="no-existe" />);
  expect(screen.getByRole("heading", { level: 1, name: "Formulario de matemáticas" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Teorema de Pitágoras" })).toBeInTheDocument();
});
