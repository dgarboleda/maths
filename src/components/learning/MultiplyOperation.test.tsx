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

  test("guiada con decimales: tras las cifras, el alumno toca dónde va la coma del producto", () => {
    const onComplete = vi.fn();
    render(<MultiplySheet spec={{ op: "multiply", a: 2.4, b: 0.3 }} mode="guided" response="" onChange={() => {}} onComplete={onComplete} />);
    fireEvent.change(screen.getByLabelText("Producto: unidades"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Producto: decenas"), { target: { value: "7" } });
    expect(screen.getByText(/¿Dónde va la coma del producto\? Cuenta las cifras decimales de los dos factores/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Poner la coma con 1 cifra a su derecha" }));
    expect(screen.getByText(/cuenta las cifras decimales de 2,4 y de 0,3/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Poner la coma con 1 cifra a su derecha" }));
    expect(screen.queryByText(/cuenta las cifras decimales de 2,4 y de 0,3/)).toBeNull();
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Poner la coma con 2 cifras a su derecha" }));
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
    expect(onChange).toHaveBeenLastCalledWith("500");
    // La coma se escribe en la casilla: en una vacía, a su derecha.
    fireEvent.change(screen.getByLabelText("Producto: unidades de millar"), { target: { value: "," } });
    expect(onChange).toHaveBeenLastCalledWith("0,500");
    // En una casilla llena, la coma va a su izquierda (y la cifra no cambia).
    fireEvent.change(screen.getByLabelText("Producto: decenas"), { target: { value: "," } });
    expect(onChange).toHaveBeenLastCalledWith("500");
    fireEvent.keyDown(screen.getByLabelText("Producto: decenas"), { key: "," });
    expect(onChange).toHaveBeenLastCalledWith("5,00");
    expect(screen.getByLabelText("Producto: decenas")).toHaveValue("0");
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
    expect(screen.getByText("0,75")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    unmount();
    render(<DivisionDemo spec={{ op: "divide", a: 4.8, b: 0.15 }} layout="completa" initialStep={Infinity} />);
    expect(screen.getByText(/4,8 ÷ 0,15 = 480 ÷ 15/)).toBeInTheDocument();
  });

  test("galera abierta: el alumno pone la coma y una casilla vacía deja la respuesta incompleta", () => {
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
    // No hay huecos ni botones: «,» en una casilla llena pone la coma detrás de ella.
    expect(screen.queryByRole("button", { name: /coma/ })).toBeNull();
    q(1, ",");
    expect(onChange).toHaveBeenLastCalledWith("L0,75;20,0");
    expect(screen.getByLabelText("Cociente: cifra 1")).toHaveValue("0");
    // Otra vez, incluso desde otra casilla, la quita sin borrar cifras.
    q(3, ",");
    expect(onChange).toHaveBeenLastCalledWith("L075;20,0");
    fireEvent.keyDown(screen.getByLabelText("Cociente: cifra 1"), { key: "," });
    expect(onChange).toHaveBeenLastCalledWith("L0,75;20,0");
  });

  test("galera guiada: al bajar la primera cifra decimal, el alumno marca la coma del cociente", () => {
    const onComplete = vi.fn();
    render(<DivisionSheet spec={{ op: "divide", a: 12.6, b: 3 }} layout="abreviada" mode="guided" response="" onChange={() => {}} onComplete={onComplete} />);
    // 12 ÷ 3: cociente 4, resta 0 y baja el 6 (décimas).
    fireEvent.change(screen.getByLabelText("Cociente: cifra 1"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Resta del paso 1: casilla 2 de 2"), { target: { value: "6" } });
    expect(screen.queryByLabelText("Resta del paso 1: casilla 2 de 2")).toBeNull();
    expect(screen.getByText(/Acabas de bajar el 6, la primera cifra decimal/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Cociente: cifra 2")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Poner la coma después de la cifra 1 del cociente" }));
    fireEvent.change(screen.getByLabelText("Cociente: cifra 2"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Resta del paso 2: casilla 2 de 2"), { target: { value: "0" } });
    expect(onComplete).toHaveBeenCalledWith("A4,2;6,0");
  });

  test("galera libre: sin la coma, el procedimiento no está completo y se avisa al revisar", () => {
    const onChange = vi.fn();
    const response = "C42;12,06,6,0";
    const { unmount } = render(
      <DivisionSheet spec={{ op: "divide", a: 12.6, b: 3 }} layout="completa" mode="free" response={response} failedResponse={response} onChange={onChange} />,
    );
    expect(screen.getByText(/Las cifras están bien: revisa la coma del cociente/)).toBeInTheDocument();
    // «,» en una casilla llena del cociente: la coma va detrás de ella.
    fireEvent.change(screen.getByLabelText("Cociente: cifra 1"), { target: { value: "," } });
    expect(onChange).toHaveBeenLastCalledWith("C4,2;12,06,6,0");
    expect(screen.getByLabelText("Cociente: cifra 1")).toHaveAttribute("inputmode", "decimal");
    unmount();
    // Una división natural no pide coma: teclado solo de cifras.
    render(<DivisionSheet spec={{ op: "divide", a: 756, b: 3 }} layout="completa" mode="free" response="" onChange={() => {}} />);
    expect(screen.getByLabelText("Cociente: cifra 1")).toHaveAttribute("inputmode", "numeric");
  });
});
