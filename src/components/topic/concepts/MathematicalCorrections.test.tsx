import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { FractionBarConcept } from "./FractionBarConcept";
import { AlgebraConcept } from "./AlgebraConcept";

test("diez décimos se representan como una unidad y cien por ciento", () => {
  render(<FractionBarConcept mode="decimal" />);
  fireEvent.change(screen.getByLabelText("Partes coloreadas:"), { target: { value: "10" } });
  expect(screen.getByText(/10\/10 = 1 = 100%/)).toBeInTheDocument();
  expect(screen.queryByText(/10\/10 = 0,10/)).not.toBeInTheDocument();
});
test("la ecuación cuadrática distingue dos soluciones reales de la longitud no negativa", () => {
  render(<AlgebraConcept variant="quadratic" />);
  expect(screen.getByText(/tiene las soluciones/)).toHaveTextContent("−4");
  expect(screen.getByText(/solo hay x = 0/)).toHaveTextContent("no hay solución real");
});
