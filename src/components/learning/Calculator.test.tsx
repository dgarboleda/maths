import { describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { CalculatorProvider, OpenCalculatorButton, useCalculatorTarget } from "./Calculator";

/** Una pantalla que espera números (la respuesta o los valores de un plan). */
function Screen({ labels, onUse, enabled = true, integerOnly = false }: { labels: string[]; onUse: (v: string, i: number) => void; enabled?: boolean; integerOnly?: boolean }) {
  useCalculatorTarget(labels, onUse, enabled, integerOnly);
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

  test("«Continuar la división con decimales» se aplica al momento a la división escrita", async () => {
    sessionStorage.clear();
    renderCalculator();
    await open();
    fireEvent.click(screen.getByRole("radio", { name: "Dividir" }));
    numbers("3", "4");
    // Sin decimales: 3 ÷ 4 = 0 y sobran 3, una sola casilla en el cociente.
    expect(screen.getAllByLabelText(/^Cociente: cifra/)).toHaveLength(1);
    const box = screen.getByRole("checkbox", { name: /Continuar la división/ });
    fireEvent.click(box);
    expect(screen.getAllByLabelText(/^Cociente: cifra/)).toHaveLength(3);
    fireEvent.click(box);
    expect(screen.getAllByLabelText(/^Cociente: cifra/)).toHaveLength(1);
    // Con coma en los números siempre sigue con decimales: la casilla queda marcada y fija.
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "3,5" } });
    expect(screen.getByRole("checkbox", { name: /Continuar la división/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Continuar la división/ })).toBeDisabled();
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

describe("fracciones y divisibilidad", () => {
  test("calcula fracciones exactas, muestra pasos y las pasa a la respuesta", async () => {
    sessionStorage.clear();
    const onUse = vi.fn();
    renderCalculator({ labels: ["tu respuesta"], onUse });
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
    fireEvent.change(screen.getByLabelText("Primera fracción o número"), { target: { value: "1/2" } });
    fireEvent.change(screen.getByLabelText("Segunda fracción o número"), { target: { value: "1/3" } });
    fireEvent.click(screen.getByRole("button", { name: "Calcular" }));
    expect(screen.getByText(/Denominador común: MCM/)).toHaveTextContent("6");
    expect(screen.getByText(/Resultado exacto:/)).toHaveTextContent("5/6");
    fireEvent.click(screen.getByRole("button", { name: "Usar 5/6 en tu respuesta" }));
    expect(onUse).toHaveBeenCalledWith("5/6", 0);
  });
  test("MCM, encadenamiento y cambios no dejan un resultado anterior activo", async () => {
    sessionStorage.clear();
    renderCalculator();
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
    fireEvent.change(screen.getByLabelText("Operación", { exact: true }), { target: { value: "mcm" } });
    fireEvent.change(screen.getByLabelText("Primer entero"), { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText("Segundo entero"), { target: { value: "18" } });
    fireEvent.click(screen.getByRole("button", { name: "Calcular" }));
    expect(screen.getByText(/Resultado exacto:/)).toHaveTextContent("36");
    fireEvent.click(screen.getByRole("button", { name: "Usar como primer número" }));
    expect(screen.getByLabelText("Primer entero")).toHaveValue("36");
    expect(screen.getByText("Calcula para usar el resultado.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Segundo entero"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Calcular" }));
    expect(screen.getByText(/Resultado exacto:/)).toHaveTextContent("0");
  });
});


test("no envía una fracción a una actividad que solo admite enteros", async () => {
  sessionStorage.clear();
  const onUse = vi.fn();
  renderCalculator({ labels: ["Cajas"], onUse, integerOnly: true });
  await open();
  fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
  fireEvent.change(screen.getByLabelText("Primera fracción o número"), { target: { value: "1/2" } });
  fireEvent.change(screen.getByLabelText("Segunda fracción o número"), { target: { value: "1/3" } });
  fireEvent.click(screen.getByRole("button", { name: "Calcular" }));
  expect(screen.getByRole("button", { name: "Usar 5/6 en Cajas" })).toBeDisabled();
  expect(screen.getByText(/solo admite números enteros/)).toBeVisible();
  expect(onUse).not.toHaveBeenCalled();
});

test("conserva la cuenta exacta en la misma pestaña", async () => {
  sessionStorage.clear();
  const first = renderCalculator();
  await open();
  fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
  fireEvent.change(screen.getByLabelText("Primera fracción o número"), { target: { value: "1/2" } });
  fireEvent.change(screen.getByLabelText("Segunda fracción o número"), { target: { value: "1/3" } });
  fireEvent.click(screen.getByRole("button", { name: "Calcular" }));
  first.unmount();
  renderCalculator();
  await open();
  fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
  expect(screen.getByText(/Resultado exacto:/)).toHaveTextContent("5/6");
});

test("mantiene copiable un resultado fuera del rango aceptado por la actividad", async () => {
  sessionStorage.clear();
  renderCalculator({ labels: ["tu respuesta"], onUse: vi.fn() });
  await open();
  fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
  fireEvent.change(screen.getByLabelText("Operación", { exact: true }), { target: { value: "multiply" } });
  fireEvent.change(screen.getByLabelText("Primera fracción o número"), { target: { value: "9999999" } });
  fireEvent.change(screen.getByLabelText("Segunda fracción o número"), { target: { value: "9999999" } });
  fireEvent.click(screen.getByRole("button", { name: "Calcular" }));
  expect(screen.getByRole("button", { name: /Usar 99999980000001/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: /Copiar/ })).toBeEnabled();
  expect(screen.getByText(/fuera del rango/)).toBeVisible();
});

test("calcula tres fracciones y conserva los operandos en la pestaña", async () => {
  sessionStorage.clear();
  const first = renderCalculator();
  await open();
  fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
  fireEvent.change(screen.getByLabelText("Primera fracción o número"), { target: { value: "1/2" } });
  fireEvent.change(screen.getByLabelText("Segunda fracción o número"), { target: { value: "1/3" } });
  fireEvent.click(screen.getByRole("button", { name: /Añadir número/ }));
  fireEvent.change(screen.getByLabelText("Número 3"), { target: { value: "1/6" } });
  fireEvent.click(screen.getByRole("button", { name: "Calcular" }));
  expect(screen.getByText(/Resultado exacto:/)).toHaveTextContent("1");
  first.unmount();
  renderCalculator();
  await open();
  fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
  expect(screen.getByLabelText("Número 3")).toHaveValue("1/6");
  expect(screen.getByText(/Resultado exacto:/)).toHaveTextContent("1");
  fireEvent.click(screen.getByRole("button", { name: "Quitar número 3" }));
  expect(screen.queryByLabelText("Número 3")).not.toBeInTheDocument();
  expect(screen.getByText("Calcula para usar el resultado.")).toBeVisible();
});

test("resuelve expresiones combinadas y pasa el resultado al destino", async () => {
  sessionStorage.clear();
  const onUse = vi.fn();
  renderCalculator({ labels: ["tu respuesta"], onUse });
  await open();
  fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
  fireEvent.change(screen.getByLabelText("Operación", { exact: true }), { target: { value: "expression" } });
  fireEvent.change(screen.getByLabelText("Expresión"), { target: { value: "(1/2 + 1/3) * 3" } });
  fireEvent.click(screen.getByRole("button", { name: "Calcular" }));
  expect(screen.getByText(/Resultado exacto:/)).toHaveTextContent("5/2");
  fireEvent.click(screen.getByRole("button", { name: "Usar 5/2 en tu respuesta" }));
  expect(onUse).toHaveBeenCalledWith("5/2", 0);
});

test("recupera las cuentas guardadas antes de admitir más operandos", async () => {
  sessionStorage.clear();
  sessionStorage.setItem("maths:calculadora:hijo:exacta", JSON.stringify({ op: "add", a: "1/2", b: "1/3", calculated: true }));
  renderCalculator();
  await open();
  fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
  expect(screen.getByLabelText("Primera fracción o número")).toHaveValue("1/2");
  expect(screen.getByText(/Resultado exacto:/)).toHaveTextContent("5/6");
});

test("recupera una expresión guardada y permite limpiar la cuenta", async () => {
  sessionStorage.clear();
  const first = renderCalculator();
  await open();
  fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
  fireEvent.change(screen.getByLabelText("Operación", { exact: true }), { target: { value: "expression" } });
  fireEvent.change(screen.getByLabelText("Expresión"), { target: { value: "2 + 3 * 4" } });
  fireEvent.click(screen.getByRole("button", { name: "Calcular" }));
  expect(screen.getByText(/Resultado exacto:/)).toHaveTextContent("14");
  first.unmount();
  renderCalculator();
  await open();
  fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
  expect(screen.getByLabelText("Expresión")).toHaveValue("2 + 3 * 4");
  expect(screen.getByText(/Resultado exacto:/)).toHaveTextContent("14");
  fireEvent.click(screen.getByRole("button", { name: "Limpiar cuenta" }));
  expect(screen.getByLabelText("Expresión")).toHaveValue("");
  expect(screen.getByText("Calcula para usar el resultado.")).toBeVisible();
});
