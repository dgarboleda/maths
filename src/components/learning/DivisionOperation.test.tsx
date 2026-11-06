import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { divisionWorkResponse } from "@/lib/learning/domain";
import { DivisionDemo, DivisionSheet } from "./DivisionOperation";

const quotient = (n: number) => screen.getByLabelText(`Cociente: cifra ${n}`);
/** Escribe una fila alineada a la derecha en sus casillas. */
function row(kind: "Producto" | "Resta", step: number, text: string) {
  const cells = screen.getAllByLabelText(new RegExp(`^${kind} del paso ${step}: casilla`));
  const start = cells.length - text.length;
  text.split("").forEach((d, i) => fireEvent.change(cells[start + i], { target: { value: d } }));
}

describe("Galera de la división larga", () => {
  test("guiada: corrige cada casilla, exige el 0 y entrega el procedimiento completo", () => {
    const onComplete = vi.fn();
    const { container } = render(
      <DivisionSheet spec={{ op: "divide", a: 612, b: 6 }} layout="completa" mode="guided"
        response="" onChange={() => {}} onComplete={onComplete} />,
    );
    fireEvent.change(quotient(1), { target: { value: "1" } });
    expect(screen.getByText(/Multiplica la cifra del cociente por el divisor: 1 × 6/)).toBeInTheDocument();
    row("Producto", 1, "6");
    row("Resta", 1, "01");
    expect(screen.getByText(/Bajas el 1: queda 1\./)).toBeInTheDocument();
    // Saltarse el 0 escribiendo el 2 se corrige en el momento.
    fireEvent.change(quotient(2), { target: { value: "2" } });
    expect(screen.getByText(/Revisa esa cifra/)).toBeInTheDocument();
    fireEvent.change(quotient(2), { target: { value: "0" } });
    row("Producto", 2, "0");
    // Un producto mal escrito se señala.
    row("Resta", 2, "13");
    expect(screen.getByText(/Revisa la resta del paso 2/)).toBeInTheDocument();
    row("Resta", 2, "12");
    fireEvent.change(quotient(3), { target: { value: "2" } });
    row("Producto", 3, "12");
    row("Resta", 3, "0");
    expect(onComplete).toHaveBeenCalledWith("C102;6,01,0,12,12,0");
    expect(container).toHaveTextContent(/Cociente 102 · resto 0/);
  });

  test("libre: se escribe todo el procedimiento y se envía al completarlo", async () => {
    const onChange = vi.fn();
    const spec = { op: "divide" as const, a: 757, b: 3 };
    const { container } = render(<DivisionSheet spec={spec} layout="completa" mode="free" response="" onChange={onChange} />);
    fireEvent.change(quotient(1), { target: { value: "2" } });
    expect(onChange).toHaveBeenLastCalledWith("");
    row("Producto", 1, "6");
    row("Resta", 1, "15");
    fireEvent.change(quotient(2), { target: { value: "5" } });
    row("Producto", 2, "15");
    row("Resta", 2, "07");
    fireEvent.change(quotient(3), { target: { value: "2" } });
    row("Producto", 3, "6");
    row("Resta", 3, "1");
    expect(onChange).toHaveBeenLastCalledWith(divisionWorkResponse(spec));
    expect(await axe(container)).toHaveNoViolations();
  });

  test("libre: tras un intento fallido señala la primera casilla que no coincide", () => {
    const failed = "C252;6,15,14,07,6,1";
    render(
      <DivisionSheet spec={{ op: "divide", a: 757, b: 3 }} layout="completa" mode="free"
        response={failed} failedResponse={failed} onChange={() => {}} />,
    );
    expect(screen.getByText(/Revisa el producto del paso 2/)).toBeInTheDocument();
    // Lo escrito se conserva.
    expect(quotient(1)).toHaveValue("2");
  });

  test("demostración: la disposición completa escribe los productos; la abreviada solo los restos", () => {
    const rows = (root: HTMLElement, label: string) =>
      [...root.querySelectorAll(".sr-only")].filter((el) => el.textContent?.startsWith(label)).length;
    const full = render(<DivisionDemo spec={{ op: "divide", a: 756, b: 3 }} layout="completa" initialStep={3} />);
    expect(rows(full.container, "producto del paso")).toBe(3);
    expect(rows(full.container, "resta del paso")).toBe(3);
    expect(full.container).toHaveTextContent(/Cociente 252 · resto 0/);
    full.unmount();
    const short = render(<DivisionDemo spec={{ op: "divide", a: 756, b: 3 }} layout="abreviada" initialStep={3} />);
    expect(rows(short.container, "producto del paso")).toBe(0);
    expect(rows(short.container, "resta del paso")).toBe(3);
  });

  test("abierta: galera en blanco, filas a elección y respuesta flexible", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <DivisionSheet spec={{ op: "divide", a: 612, b: 6 }} layout="completa" mode="open" response="" onChange={onChange} />,
    );
    // No se revela la estructura: tres casillas de cociente y dos filas vacías.
    expect(screen.getAllByLabelText(/^Cociente: cifra/)).toHaveLength(3);
    expect(screen.getAllByLabelText(/^Fila 2: columna/)).toHaveLength(3);
    expect(screen.queryByLabelText(/^Fila 3: columna/)).toBeNull();
    // De memoria y bajando el 2 junto al 1: «012» y «0».
    "102".split("").forEach((d, i) => fireEvent.change(quotient(i + 1), { target: { value: d } }));
    "012".split("").forEach((d, i) => fireEvent.change(screen.getByLabelText(`Fila 1: columna ${i + 1} de 3`), { target: { value: d } }));
    fireEvent.change(screen.getByLabelText("Fila 2: columna 3 de 3"), { target: { value: "0" } });
    expect(onChange).toHaveBeenLastCalledWith("L102;012,0");
    fireEvent.click(screen.getByRole("button", { name: "Añadir fila" }));
    expect(screen.getAllByLabelText(/^Fila 3: columna/)).toHaveLength(3);
    expect(await axe(container)).toHaveNoViolations();
  });
});
