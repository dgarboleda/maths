import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Borrador } from "./Borrador";

const open = () => fireEvent.click(screen.getByRole("button", { name: /Borrador de cálculo/ }));
const numbers = (a: string, b: string) => {
  fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: a } });
  fireEvent.change(screen.getAllByRole("textbox")[1], { target: { value: b } });
  fireEvent.click(screen.getByRole("button", { name: "Escribir la cuenta" }));
};

describe("Borrador de cálculo", () => {
  test("una suma en columnas: sin corrección y con el resultado copiable", async () => {
    const onUse = vi.fn();
    const { container } = render(<Borrador targets={["tu respuesta"]} onUse={onUse} />);
    open();
    numbers("958", "76");
    // Se puede escribir un resultado equivocado: el borrador no corrige.
    for (const [place, d] of [["unidades", "4"], ["decenas", "3"], ["centenas", "0"], ["unidades de millar", "2"]] as const)
      fireEvent.change(screen.getByLabelText(`Resultado: ${place}`, { exact: true }), { target: { value: d } });
    expect(screen.queryByText(/Revisa/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Usar 2034 en tu respuesta" }));
    expect(onUse).toHaveBeenCalledWith("2034", 0);
    expect(await axe(container)).toHaveNoViolations();
  });

  test("una división en la galera abierta copia el cociente al valor elegido", () => {
    const onUse = vi.fn();
    render(<Borrador targets={["Agua", "Luz"]} onUse={onUse} />);
    open();
    fireEvent.click(screen.getByRole("radio", { name: "Dividir" }));
    numbers("612", "6");
    ["1", "0", "2"].forEach((d, i) => fireEvent.change(screen.getByLabelText(`Cociente: cifra ${i + 1}`), { target: { value: d } }));
    fireEvent.change(screen.getByLabelText("Fila 1: columna 3 de 3"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Copiar en"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Usar 102" }));
    expect(onUse).toHaveBeenCalledWith("102", 1);
  });

  test("avisa de cuentas que no se pueden escribir", () => {
    render(<Borrador />);
    open();
    fireEvent.click(screen.getByRole("radio", { name: "Restar" }));
    numbers("12", "40");
    expect(screen.getByRole("alert")).toHaveTextContent(/no puede ser menor/);
    // Sin destino, el borrador es solo para calcular.
    expect(screen.queryByRole("button", { name: /^Usar/ })).toBeNull();
  });
});
