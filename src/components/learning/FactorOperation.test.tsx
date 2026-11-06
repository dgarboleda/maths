import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { FactorDemo, FactorSheet } from "./FactorOperation";

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("Tabla de factores primos", () => {
  test("guiada MCD: solo primos comunes y termina cuando no queda ninguno común", () => {
    const onComplete = vi.fn();
    render(<FactorSheet spec={{ op: "mcd", values: [18, 27] }} mode="guided" response="" onChange={() => {}} onComplete={onComplete} />);
    // 2 divide a 18 pero no a 27: no sirve para el MCD.
    type("Primo de la fila 1", "2");
    expect(screen.getByText(/dividir a todos los números de la fila/)).toBeInTheDocument();
    type("Primo de la fila 1", "3");
    type("Fila 2: número 1", "6");
    type("Fila 2: número 2", "9");
    type("Primo de la fila 2", "3");
    type("Fila 3: número 1", "2");
    type("Fila 3: número 2", "3");
    // 2 y 3 no tienen divisor común: no se pide llegar a 1.
    expect(screen.getByText(/Ya no queda ningún divisor común/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Primo de la fila 3")).toBeNull();
    type("MCD de 18, 27", "9");
    expect(onComplete).toHaveBeenCalledWith("T9;3:6.9|3:2.3");
  });

  test("guiada MCM: se sigue hasta que todos sean 1", () => {
    const onComplete = vi.fn();
    render(<FactorSheet spec={{ op: "mcm", values: [4, 6] }} mode="guided" response="" onChange={() => {}} onComplete={onComplete} />);
    type("Primo de la fila 1", "2");
    type("Fila 2: número 1", "2");
    type("Fila 2: número 2", "3");
    type("Primo de la fila 2", "2");
    type("Fila 3: número 1", "1");
    type("Fila 3: número 2", "3");
    type("Primo de la fila 3", "3");
    type("Fila 4: número 1", "1");
    type("Fila 4: número 2", "1");
    type("MCM de 4, 6", "12");
    expect(onComplete).toHaveBeenCalledWith("T12;2:2.3|2:1.3|3:1.1");
  });

  test("libre: la tabla y el resultado se envían juntos; tras fallar se dice qué revisar", async () => {
    const onChange = vi.fn();
    const failed = "T6;2:6.9|2:3.9|3:1.3|3:1.1";
    const { container } = render(
      <FactorSheet spec={{ op: "mcm", values: [12, 18] }} mode="free" response={failed} failedResponse={failed} onChange={onChange} />,
    );
    // El motivo lo da la respuesta de la actividad: la hoja no lo repite.
    expect(screen.queryByText(/Para el MCM multiplica todos los primos/)).toBeNull();
    type("MCM de 12, 18", "36");
    expect(onChange).toHaveBeenLastCalledWith("T36;2:6.9|2:3.9|3:1.3|3:1.1");
    expect(await axe(container)).toHaveNoViolations();
  });

  test("demostración: marca las filas comunes y da MCM y MCD", () => {
    const { container } = render(<FactorDemo spec={{ op: "mcm", values: [12, 18] }} initialStep={Infinity} />);
    expect(screen.getAllByLabelText("divide a todos")).toHaveLength(2);
    expect(container).toHaveTextContent(/MCM = 2 × 2 × 3 × 3 = 36 · MCD = 2 × 3 = 6/);
  });

  test("libre: al escribir el primo de la última línea aparece otra para los cocientes", () => {
    // MCD(18; 27): 18, 27 | 2 → 9, 27 | 3 → 3, 9 | 3 → aquí faltaba la línea siguiente.
    render(<FactorSheet spec={{ op: "mcd", values: [18, 27] }} mode="free" response="" onChange={() => {}} />);
    type("Primo de la fila 1", "2");
    type("Fila 2: número 1", "9");
    type("Fila 2: número 2", "27");
    type("Primo de la fila 2", "3");
    type("Fila 3: número 1", "3");
    type("Fila 3: número 2", "9");
    expect(screen.queryByLabelText("Fila 4: número 1")).toBeNull();
    type("Primo de la fila 3", "3");
    expect(screen.getByLabelText("Fila 4: número 1")).toBeInTheDocument();
  });

  test("libre: tras un fallo se señala la fila sin repetir el motivo", () => {
    const failed = "T6;2:6.18|2:3.9|3:1.3|3:1.1";
    render(<FactorSheet spec={{ op: "mcd", values: [12, 18] }} mode="free" response={failed} failedResponse={failed} onChange={() => {}} />);
    expect(screen.getByText("Revisa la fila 1: es la primera que no coincide.")).toBeInTheDocument();
  });
});
