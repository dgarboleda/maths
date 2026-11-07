import { describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { CalculatorProvider, OpenCalculatorButton, useCalculatorTarget } from "./Calculator";

/** Una pantalla que espera números (la respuesta o los valores de un plan). */
function Screen({ labels, onUse, enabled = true }: { labels: string[]; onUse: (v: string, i: number) => void; enabled?: boolean }) {
  useCalculatorTarget(labels, onUse, enabled);
  return <OpenCalculatorButton />;
}

const renderCalculator = (screenProps?: Parameters<typeof Screen>[0]) =>
  render(
    <CalculatorProvider childId="hijo">
      {screenProps ? <Screen {...screenProps} /> : <p>Inicio</p>}
    </CalculatorProvider>,
  );
const open = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Calculadora" }));
  await screen.findByRole("button", { name: "Escribir la cuenta" });
};
const numbers = (a: string, b: string) => {
  fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: a } });
  fireEvent.change(screen.getAllByRole("textbox")[1], { target: { value: b } });
  fireEvent.click(screen.getByRole("button", { name: "Escribir la cuenta" }));
};
const digit = (place: string, value: string) =>
  fireEvent.change(screen.getByLabelText(`Resultado: ${place}`, { exact: true }), { target: { value } });

describe("Calculadora global", () => {
  test("botón flotante: abre el panel lateral y se cierra con Escape devolviendo el foco", async () => {
    sessionStorage.clear();
    const { container } = renderCalculator();
    const fab = screen.getByRole("button", { name: "Calculadora" });
    expect(fab).toHaveAttribute("aria-expanded", "false");
    await open();
    expect(fab).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("complementary", { name: "Calculadora" })).toBeVisible();
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.keyDown(screen.getByRole("button", { name: "Escribir la cuenta" }), { key: "Escape" });
    expect(screen.queryByRole("complementary", { name: "Calculadora" })).toBeNull();
    await act(() => new Promise((r) => requestAnimationFrame(r)));
    expect(fab).toHaveFocus();
  });

  test("una suma en columnas: sin corrección y con el resultado para la respuesta", async () => {
    sessionStorage.clear();
    const onUse = vi.fn();
    renderCalculator({ labels: ["tu respuesta"], onUse });
    // Acceso también desde la pregunta.
    fireEvent.click(screen.getByRole("button", { name: "Hacer cuentas en la calculadora" }));
    await screen.findByRole("button", { name: "Escribir la cuenta" });
    numbers("958", "76");
    // Se puede escribir un resultado equivocado: la calculadora no corrige.
    for (const [place, d] of [["unidades", "4"], ["decenas", "3"], ["centenas", "0"], ["unidades de millar", "2"]] as const) digit(place, d);
    expect(screen.queryByText(/Revisa/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Usar 2034 en tu respuesta" }));
    expect(onUse).toHaveBeenCalledWith("2034", 0);
    // Al usarlo, el panel se cierra para ver la respuesta.
    expect(screen.queryByRole("complementary", { name: "Calculadora" })).toBeNull();
  });

  test("encadena cuentas: el resultado pasa a la siguiente y el final se copia", async () => {
    sessionStorage.clear();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderCalculator();
    await open();
    numbers("12", "3");
    digit("unidades", "5");
    digit("decenas", "1");
    fireEvent.click(screen.getByRole("button", { name: /Seguir con 15/ }));
    expect(screen.getByRole("list")).toHaveTextContent("12 + 3 = 15");
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("15");
    await act(() => new Promise((r) => requestAnimationFrame(r)));
    expect(screen.getAllByRole("textbox")[1]).toHaveFocus();
    fireEvent.click(screen.getByRole("radio", { name: "Multiplicar" }));
    fireEvent.change(screen.getAllByRole("textbox")[1], { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Escribir la cuenta" }));
    expect(screen.getByRole("group", { name: /15 por 4 en columnas/ })).toBeInTheDocument();
    // Antes de escribir el producto, el resultado final es el de la cadena.
    expect(screen.getByText(/Resultado final/)).toHaveTextContent("15");
    for (const [place, d] of [["unidades", "0"], ["decenas", "6"]]) fireEvent.change(screen.getByLabelText(`Producto: ${place}`, { exact: true }), { target: { value: d } });
    expect(screen.getByText(/Resultado final/)).toHaveTextContent("60");
    fireEvent.click(screen.getByRole("button", { name: /Copiar/ }));
    await screen.findAllByText("Copiado: 60");
    expect(writeText).toHaveBeenCalledWith("60");
    // Un resultado anterior se reutiliza en la cuenta nueva.
    fireEvent.click(screen.getByRole("button", { name: /Seguir con 60/ }));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Usar 15 en la cuenta nueva" }));
    expect(screen.getAllByRole("textbox")[1]).toHaveValue("15");
    fireEvent.click(screen.getByRole("button", { name: /Empezar de nuevo/ }));
    expect(screen.queryByRole("list")).toBeNull();
  });

  test("la cadena se conserva al cambiar de pantalla (misma pestaña)", async () => {
    sessionStorage.clear();
    const first = renderCalculator();
    await open();
    numbers("12", "3");
    digit("unidades", "5");
    digit("decenas", "1");
    fireEvent.click(screen.getByRole("button", { name: /Seguir con 15/ }));
    first.unmount();
    renderCalculator();
    await open();
    expect(screen.getByRole("list")).toHaveTextContent("12 + 3 = 15");
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("15");
  });

  test("una división en la galera abierta pasa el cociente al valor elegido; el resto queda en la cadena", async () => {
    sessionStorage.clear();
    const onUse = vi.fn();
    renderCalculator({ labels: ["Agua", "Luz"], onUse });
    await open();
    fireEvent.click(screen.getByRole("radio", { name: "Dividir" }));
    numbers("17", "5");
    ["3"].forEach((d) => fireEvent.change(screen.getAllByLabelText(/^Cociente: cifra/).at(-1)!, { target: { value: d } }));
    fireEvent.change(screen.getByLabelText("Fila 1: columna 2 de 2"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Copiar en"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /Seguir con 3/ }));
    expect(screen.getByRole("list")).toHaveTextContent("17 ÷ 5 = 3 (resto 2)");
    fireEvent.click(screen.getByRole("button", { name: "Usar 3" }));
    expect(onUse).toHaveBeenCalledWith("3", 1);
  });

  test("sin pantalla que espere un número, solo se calcula y se copia", async () => {
    sessionStorage.clear();
    renderCalculator({ labels: ["tu respuesta"], onUse: () => {}, enabled: false });
    await open();
    fireEvent.click(screen.getByRole("radio", { name: "Restar" }));
    numbers("12", "40");
    expect(screen.getByRole("alert")).toHaveTextContent(/no puede ser menor/);
    expect(screen.queryByRole("button", { name: /^Usar/ })).toBeNull();
  });

  test("conserva los ceros decimales al multiplicar y respeta los límites de la hoja", async () => {
    sessionStorage.clear();
    renderCalculator();
    await open();
    fireEvent.click(screen.getByRole("radio", { name: "Multiplicar" }));
    numbers("2,50", "0,4");
    expect(screen.getByRole("group", { name: /2,50 por 0,4 en columnas/ })).toHaveTextContent("2,50");
    fireEvent.click(screen.getByRole("radio", { name: "Sumar" }));
    numbers("10000000", "1");
    expect(screen.getByRole("alert")).toHaveTextContent(/menores que 10 000 000/);
    fireEvent.click(screen.getByRole("radio", { name: "Dividir" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Continuar la división/ }));
    numbers("3", "4");
    expect(screen.getAllByLabelText(/^Cociente: cifra/)).toHaveLength(3);
  });
});
