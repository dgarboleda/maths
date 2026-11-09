import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { ColumnDemo, ColumnSheet, firstWrongColumn } from "./ColumnOperation";

const digit = (place: string) => screen.getByLabelText(`Resultado: ${place}`);

describe("Hoja de columnas", () => {
  test("guiada: corrige cada cifra, muestra la llevada y entrega el resultado", () => {
    const onComplete = vi.fn();
    const onChange = vi.fn();
    render(
      <ColumnSheet spec={{ op: "add", a: 347, b: 285 }} strategy="prestamo" mode="guided"
        response="" onChange={onChange} onComplete={onComplete} />,
    );
    fireEvent.change(digit("unidades"), { target: { value: "3" } });
    expect(screen.getByText(/Revisa esa cifra/)).toBeInTheDocument();
    fireEvent.change(digit("unidades"), { target: { value: "2" } });
    expect(screen.getByText(/llevas 1 a las decenas/)).toBeInTheDocument();
    expect(screen.getByText(/Marca en decenas/)).toBeInTheDocument();
    fireEvent.change(digit("decenas"), { target: { value: "3" } });
    fireEvent.change(digit("centenas"), { target: { value: "6" } });
    expect(onComplete).toHaveBeenCalledWith("632");
  });

  test("libre: no revela cuántas cifras tiene el resultado y compone la respuesta", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <ColumnSheet spec={{ op: "add", a: 958, b: 76 }} strategy="prestamo" mode="free" response="" onChange={onChange} />,
    );
    expect(screen.getAllByLabelText(/^Resultado:/)).toHaveLength(4);
    fireEvent.change(digit("unidades"), { target: { value: "4" } });
    fireEvent.change(digit("decenas"), { target: { value: "3" } });
    fireEvent.change(digit("centenas"), { target: { value: "0" } });
    fireEvent.change(digit("unidades de millar"), { target: { value: "1" } });
    expect(onChange).toHaveBeenLastCalledWith("1034");
    expect(await axe(container)).toHaveNoViolations();
  });

  test("libre: señala la primera columna que no coincide", () => {
    expect(firstWrongColumn("223", 177)).toBe(0);
    expect(firstWrongColumn("187", 177)).toBe(1);
    expect(firstWrongColumn("177", 177)).toBeNull();
    render(
      <ColumnSheet spec={{ op: "subtract", a: 325, b: 148 }} strategy="prestamo" mode="free"
        response="187" onChange={() => {}} wrongColumn={1} />,
    );
    expect(screen.getByText(/Revisa la columna de las decenas/)).toBeInTheDocument();
  });

  test("demostración: compensación marca +1 abajo; préstamo tacha arriba", () => {
    const { unmount } = render(<ColumnDemo spec={{ op: "subtract", a: 325, b: 148 }} strategy="compensacion" initialStep={3} />);
    expect(screen.getAllByText(/compensado/)).toHaveLength(2);
    unmount();
    render(<ColumnDemo spec={{ op: "subtract", a: 325, b: 148 }} strategy="prestamo" initialStep={3} />);
    expect(screen.getAllByText(/tachado/)).toHaveLength(3); // 5→15, 2→11, 3→2
  });

  test("con decimales: la coma está alineada y la respuesta la incluye", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ColumnSheet spec={{ op: "add", a: 3.5, b: 1.25 }} strategy="prestamo" mode="free" response="" onChange={onChange} />,
    );
    fireEvent.change(digit("centésimas"), { target: { value: "5" } });
    fireEvent.change(digit("décimas"), { target: { value: "7" } });
    fireEvent.change(digit("unidades"), { target: { value: "4" } });
    // La coma la pone el alumno: sin ella, el resultado no lleva decimales.
    expect(onChange).toHaveBeenLastCalledWith("475");
    // Sin botones ni huecos: la coma se escribe en la casilla (teclado propio o físico).
    expect(screen.queryByRole("button", { name: /coma/ })).toBeNull();
    expect(digit("unidades")).toHaveAttribute("inputmode", "decimal");
    // En una casilla llena, la coma va a su izquierda.
    fireEvent.change(digit("décimas"), { target: { value: "," } });
    expect(onChange).toHaveBeenLastCalledWith("4,75");
    // La siguiente pulsación la quita, incluso desde otra casilla.
    fireEvent.change(digit("centésimas"), { target: { value: "," } });
    expect(onChange).toHaveBeenLastCalledWith("475");
    fireEvent.change(digit("centésimas"), { target: { value: "," } });
    expect(onChange).toHaveBeenLastCalledWith("47,5");
    // El 0 que completa 3,5 → 3,50 se ve y se anuncia.
    expect(container).toHaveTextContent(/cero añadido 0/);
    expect(firstWrongColumn("4,65", 4.75, 2)).toBe(1);
  });

  test("guiada con decimales: al terminar la parte decimal, el alumno coloca la coma", () => {
    const onComplete = vi.fn();
    render(<ColumnSheet spec={{ op: "add", a: 3.5, b: 1.25 }} strategy="prestamo" mode="guided" response="" onChange={() => {}} onComplete={onComplete} />);
    fireEvent.change(digit("centésimas"), { target: { value: "5" } });
    fireEvent.change(digit("décimas"), { target: { value: "7" } });
    expect(screen.getByText(/¿Dónde va la coma del resultado\?/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Resultado: unidades")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Poner la coma con 1 cifra a su derecha" }));
    expect(screen.getByText(/Ahí no/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Poner la coma con 1 cifra a su derecha" }));
    expect(screen.queryByText(/Ahí no/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Poner la coma con 2 cifras a su derecha" }));
    fireEvent.change(digit("unidades"), { target: { value: "4" } });
    expect(onComplete).toHaveBeenCalledWith("4,75");
  });

  test("libre: tras un intento, avisa si las cifras están bien y la coma no", () => {
    render(<ColumnSheet spec={{ op: "add", a: 3.5, b: 1.25 }} strategy="prestamo" mode="free" response="47,5" commaWrong onChange={() => {}} />);
    expect(screen.getByText(/Las cifras están bien: revisa la coma/)).toBeInTheDocument();
  });

  test("libre: escribir «,» en una casilla pone la coma tras la última cifra escrita", () => {
    const onChange = vi.fn();
    render(<ColumnSheet spec={{ op: "add", a: 3.5, b: 1.25 }} strategy="prestamo" mode="free" response="" onChange={onChange} />);
    fireEvent.change(digit("centésimas"), { target: { value: "5" } });
    fireEvent.change(digit("décimas"), { target: { value: "7" } });
    // Se escribe de derecha a izquierda: «,» en la casilla vacía siguiente.
    fireEvent.change(digit("unidades"), { target: { value: "," } });
    fireEvent.change(digit("unidades"), { target: { value: "4" } });
    expect(onChange).toHaveBeenLastCalledWith("4,75");
    // En una casilla llena, la coma va a su izquierda y la cifra no cambia.
    fireEvent.keyDown(digit("centésimas"), { key: "." });
    expect(onChange).toHaveBeenLastCalledWith("475");
    fireEvent.keyDown(digit("centésimas"), { key: "." });
    expect(onChange).toHaveBeenLastCalledWith("47,5");
    expect(digit("centésimas")).toHaveValue("5");
  });

  test("libre: una casilla vacía entre cifras deja la respuesta incompleta", () => {
    const onChange = vi.fn();
    render(<ColumnSheet spec={{ op: "add", a: 586, b: 378 }} strategy="prestamo" mode="free" response="" onChange={onChange} />);
    // 9, 6 y 4 en millares, centenas y decenas, sin unidades: no es 964.
    fireEvent.change(digit("unidades de millar"), { target: { value: "9" } });
    fireEvent.change(digit("centenas"), { target: { value: "6" } });
    fireEvent.change(digit("decenas"), { target: { value: "4" } });
    expect(onChange).toHaveBeenLastCalledWith("");
    expect(screen.getByText(/Completa las casillas vacías entre las cifras/)).toBeInTheDocument();
    fireEvent.change(digit("unidades"), { target: { value: "4" } });
    expect(onChange).toHaveBeenLastCalledWith("9644");
    // Las casillas vacías de la izquierda no cuentan.
    fireEvent.change(digit("unidades de millar"), { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith("644");
  });
});
