import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { RuffiniDemo, RuffiniSheet } from "./RuffiniOperation";

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const spec = { op: "ruffini" as const, coefficients: [1, 0, -7, 6], root: -3 };

describe("Tabla de Ruffini", () => {
  test("guiada: la esquina, el 0 del término que falta y cada columna", () => {
    const onComplete = vi.fn();
    render(<RuffiniSheet spec={spec} mode="guided" response="" onChange={() => {}} onComplete={onComplete} />);
    type("Esquina de la tabla", "3");
    expect(screen.getByText(/Revisa esa casilla/)).toBeInTheDocument();
    type("Esquina de la tabla", "-3");
    type("Coeficiente de x³", "1");
    type("Coeficiente de x²", "0");
    type("Coeficiente de x", "-7");
    type("Coeficiente de término independiente", "6");
    type("Suma de la columna 1", "1");
    type("Producto de la columna 2", "-3");
    type("Suma de la columna 2", "-3");
    type("Producto de la columna 3", "9");
    type("Suma de la columna 3", "2");
    type("Producto de la columna 4", "-6");
    type("Resto", "0");
    expect(onComplete).toHaveBeenCalledWith("R−3|1,0,−7,6|−3,9,−6|1,−3,2,0");
    expect(screen.getByText(/resto: 0/)).toBeInTheDocument();
  });

  test("libre: se envía la tabla completa; tras fallar se señala la casilla", async () => {
    const failed = "R3|1,0,−7,6|3,9,6|1,3,2,12";
    const { container } = render(<RuffiniSheet spec={spec} mode="free" response={failed} failedResponse={failed} onChange={() => {}} />);
    expect(screen.getByText(/Revisa la casilla marcada/)).toBeInTheDocument();
    expect(screen.getByLabelText("Esquina de la tabla")).toHaveAttribute("aria-invalid", "true");
    expect(await axe(container)).toHaveNoViolations();
  });

  test("demostración: cociente y resto", () => {
    const { container } = render(<RuffiniDemo spec={spec} initialStep={Infinity} />);
    expect(container).toHaveTextContent(/Cociente: x² − 3x \+ 2 · resto: 0/);
  });
});
