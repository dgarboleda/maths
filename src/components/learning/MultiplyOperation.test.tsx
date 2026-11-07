import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { MultiplyDemo, MultiplyExplorer, MultiplySheet } from "./MultiplyOperation";
import { DivisionDemo, DivisionSheet } from "./DivisionOperation";
import { operationMistake } from "./Operation";

describe("Hoja de multiplicación", () => {
  test("guiada: corrige cada cifra, muestra la llevada sobre el factor y entrega el producto", () => {
    const onComplete = vi.fn();
    render(<MultiplySheet spec={{ op: "multiply", a: 47, b: 6 }} mode="guided" response="" onChange={() => {}} onComplete={onComplete} />);
    fireEvent.change(screen.getByLabelText("Producto: unidades"), { target: { value: "3" } });
    expect(screen.getByText(/Revisa esa cifra/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Producto: unidades"), { target: { value: "2" } });
    expect(screen.getByText("6 × 7 = 42. Escribes 2 y llevas 4.")).toBeInTheDocument();
    expect(screen.getByText(/Llevas 4 sobre las decenas/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Producto: decenas"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Producto: centenas"), { target: { value: "2" } });
    expect(onComplete).toHaveBeenCalledWith("282");
  });

  test("guiada con decimales: tras las cifras se elige cuántos decimales lleva el producto", () => {
    const onComplete = vi.fn();
    render(<MultiplySheet spec={{ op: "multiply", a: 2.4, b: 0.3 }} mode="guided" response="" onChange={() => {}} onComplete={onComplete} />);
    fireEvent.change(screen.getByLabelText("Producto: unidades"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Producto: decenas"), { target: { value: "7" } });
    expect(screen.getByText(/¿Cuántas cifras decimales lleva el producto\? Cuenta las de los dos factores/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "1" }));
    expect(screen.getByText(/cuenta las cifras decimales de 2,4 y de 0,3/)).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("radio", { name: "2" }));
    expect(onComplete).toHaveBeenCalledWith("0,72");
  });

  test("guiada con varias cifras: la fila de las decenas empieza con un 0 y luego se suman", () => {
    const onComplete = vi.fn();
    render(<MultiplySheet spec={{ op: "multiply", a: 12, b: 13 }} mode="guided" response="" onChange={() => {}} onComplete={onComplete} />);
    const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
    type("Fila del 3 de las unidades: unidades", "6");
    type("Fila del 3 de las unidades: decenas", "3");
    expect(screen.getByText(/Ahora multiplicas por el 1 de las decenas/)).toBeInTheDocument();
    type("Fila del 1 de las decenas: unidades", "0");
    type("Fila del 1 de las decenas: decenas", "2");
    type("Fila del 1 de las decenas: centenas", "1");
    type("Suma de las filas: unidades", "6");
    type("Suma de las filas: decenas", "5");
    type("Suma de las filas: centenas", "1");
    expect(onComplete).toHaveBeenCalledWith("156");
  });

  test("libre: filas de borrador, el producto en la última fila y la coma elegida por el alumno", async () => {
    const onChange = vi.fn();
    const { container } = render(<MultiplySheet spec={{ op: "multiply", a: 1.25, b: 0.4 }} mode="free" response="" onChange={onChange} />);
    expect(screen.queryByLabelText(/borrador/)).toBeNull(); // una sola cifra abajo: sin filas intermedias
    fireEvent.change(screen.getByLabelText("Producto: unidades"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Producto: decenas"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Producto: centenas"), { target: { value: "5" } });
    expect(onChange).toHaveBeenLastCalledWith("");
    fireEvent.click(screen.getByRole("radio", { name: "3" }));
    expect(onChange).toHaveBeenLastCalledWith("0,500");
    expect(await axe(container)).toHaveNoViolations();
  });

  test("libre: tras un intento, distingue la coma mal puesta de una cifra equivocada", () => {
    const { unmount } = render(
      <MultiplySheet spec={{ op: "multiply", a: 2.4, b: 0.3 }} mode="free" response="7,2" failedResponse="7,2" onChange={() => {}} />,
    );
    expect(screen.getByText(/Las cifras están bien: revisa la coma/)).toBeInTheDocument();
    unmount();
    render(<MultiplySheet spec={{ op: "multiply", a: 347, b: 25 }} mode="free" response="8665" failedResponse="8665" onChange={() => {}} />);
    expect(screen.getAllByLabelText(/Fila \d \(borrador\)/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Revisa la columna de las decenas del producto/)).toBeInTheDocument();
    expect(operationMistake({ op: "multiply", a: 2.4, b: 0.3 }, "7,2")).toMatch(/las cifras están bien, pero la coma no/);
  });

  test("demostración y laboratorio: el desarrollo completo es accesible", async () => {
    const { container, unmount } = render(<MultiplyDemo spec={{ op: "multiply", a: 0.2, b: 0.3 }} initialStep={Infinity} />);
    expect(screen.getByText(/completas con 2 ceros a la izquierda: 0,06/)).toBeInTheDocument();
    expect(screen.getAllByText("cero añadido", { exact: false })).toHaveLength(2);
    expect(await axe(container)).toHaveNoViolations();
    unmount();
    render(<MultiplyExplorer id="lab" />);
    fireEvent.click(screen.getByRole("radio", { name: "2 decimales" }));
    expect(screen.getByText(/3,47 × 25 =/)).toBeInTheDocument();
  });
});

describe("Galera con decimales", () => {
  test("la coma, los ceros añadidos y el prefijo 0, se ven en el desarrollo", async () => {
    const { container, unmount } = render(<DivisionDemo spec={{ op: "divide", a: 3, b: 4, places: 2 }} layout="completa" initialStep={Infinity} />);
    expect(screen.getAllByText("cero añadido", { exact: false })).toHaveLength(2);
    expect(screen.getByText("0,")).toBeInTheDocument();
    expect(screen.getByText("0,75")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    unmount();
    render(<DivisionDemo spec={{ op: "divide", a: 4.8, b: 0.15 }} layout="completa" initialStep={Infinity} />);
    expect(screen.getByText(/4,8 ÷ 0,15 = 480 ÷ 15/)).toBeInTheDocument();
  });

  test("galera abierta: la coma del cociente está fija y una casilla vacía deja la respuesta incompleta", () => {
    const onChange = vi.fn();
    render(<DivisionSheet spec={{ op: "divide", a: 3, b: 4, places: 2 }} layout="completa" mode="open" response="" onChange={onChange} />);
    const q = (i: number, value: string) => fireEvent.change(screen.getByLabelText(`Cociente: cifra ${i}`), { target: { value } });
    fireEvent.change(screen.getByLabelText("Fila 1: columna 2 de 3"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Fila 1: columna 3 de 3"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Fila 2: columna 3 de 3"), { target: { value: "0" } });
    q(1, "0");
    q(3, "5");
    expect(onChange).toHaveBeenLastCalledWith("");
    q(2, "7");
    expect(onChange).toHaveBeenLastCalledWith("L075;20,0");
  });
});
