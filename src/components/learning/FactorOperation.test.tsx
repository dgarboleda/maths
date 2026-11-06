import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { FactorDemo, FactorSheet } from "./FactorOperation";

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("Tabla de factores primos", () => {
  test("guiada: corrige primos y cocientes y pide el MCD al final", () => {
    const onComplete = vi.fn();
    render(<FactorSheet spec={{ op: "mcd", values: [12, 18] }} mode="guided" response="" onChange={() => {}} onComplete={onComplete} />);
    type("Primo de la fila 1", "4");
    expect(screen.getByText(/tiene que ser primo/)).toBeInTheDocument();
    type("Primo de la fila 1", "2");
    type("Fila 2: número 1", "6");
    type("Fila 2: número 2", "9");
    type("Primo de la fila 2", "2");
    type("Fila 3: número 1", "3");
    type("Fila 3: número 2", "8");
    expect(screen.getByText(/si no, bájalo igual/)).toBeInTheDocument();
    type("Fila 3: número 2", "9");
    type("Primo de la fila 3", "3");
    type("Fila 4: número 1", "1");
    type("Fila 4: número 2", "3");
    type("Primo de la fila 4", "3");
    type("Fila 5: número 1", "1");
    type("Fila 5: número 2", "1");
    type("MCD de 12, 18", "36");
    expect(screen.getByText(/Multiplica solo los primos/)).toBeInTheDocument();
    type("MCD de 12, 18", "6");
    expect(onComplete).toHaveBeenCalledWith("T6;2:6.9|2:3.9|3:1.3|3:1.1");
  });

  test("libre: la tabla y el resultado se envían juntos; tras fallar se dice qué revisar", async () => {
    const onChange = vi.fn();
    const failed = "T6;2:6.9|2:3.9|3:1.3|3:1.1";
    const { container } = render(
      <FactorSheet spec={{ op: "mcm", values: [12, 18] }} mode="free" response={failed} failedResponse={failed} onChange={onChange} />,
    );
    expect(screen.getByText(/Para el MCM multiplica todos los primos/)).toBeInTheDocument();
    type("MCM de 12, 18", "36");
    expect(onChange).toHaveBeenLastCalledWith("T36;2:6.9|2:3.9|3:1.3|3:1.1");
    expect(await axe(container)).toHaveNoViolations();
  });

  test("demostración: marca las filas comunes y da MCM y MCD", () => {
    const { container } = render(<FactorDemo spec={{ op: "mcm", values: [12, 18] }} initialStep={Infinity} />);
    expect(screen.getAllByLabelText("divide a todos")).toHaveLength(2);
    expect(container).toHaveTextContent(/MCM = 2 × 2 × 3 × 3 = 36 · MCD = 2 × 3 = 6/);
  });
});
