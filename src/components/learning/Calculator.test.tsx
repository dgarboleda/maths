import { describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { CalculatorProvider, OpenCalculatorButton, useCalculatorTarget } from "./Calculator";
import { ExactCalculator } from "./ExactCalculator";

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
    sessionStorage.clear(); localStorage.clear();
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
    sessionStorage.clear(); localStorage.clear();
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

  test("resta en bloques: el alumno escribe préstamos y cifras sin solución automática", async () => {
    sessionStorage.clear(); localStorage.clear();
    const onUse = vi.fn();
    renderCalculator({ labels: ["tu respuesta"], onUse });
    await open();
    fireEvent.click(screen.getByRole("radio", { name: "Restar" }));
    numbers("325", "148");
    const board = screen.getByRole("group", { name: "325 menos 148 en columnas" });
    expect(board).toHaveTextContent("325");
    expect(board).toHaveTextContent("148");
    expect(screen.getByLabelText("Resultado: unidades")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Nota para decenas (llevada o préstamo, opcional)"), { target: { value: "1" } });
    digit("unidades", "7"); digit("decenas", "7"); digit("centenas", "1");
    fireEvent.click(screen.getByRole("button", { name: "Usar 177 en tu respuesta" }));
    expect(onUse).toHaveBeenCalledWith("177", 0);
  });

  test("acepta negativos y deja que el alumno escriba el signo y el resultado", async () => {
    sessionStorage.clear(); localStorage.clear(); const onUse = vi.fn();
    renderCalculator({ labels: ["tu respuesta"], onUse }); await open();
    fireEvent.click(screen.getByRole("radio", { name: "Restar" })); numbers("3", "4");
    expect(screen.getByRole("group", { name: "Cuenta con números con signo" })).toHaveTextContent("3 − 4");
    expect(screen.getByLabelText("Mi resultado con signo")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Mi resultado con signo"), { target: { value: "-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Usar -2 en tu respuesta" }));
    expect(onUse).toHaveBeenCalledWith("-2", 0);
  });

  test("comprueba una columna solo cuando se solicita y conserva lo escrito", async () => {
    sessionStorage.clear(); localStorage.clear(); renderCalculator(); await open(); numbers("12", "3");
    digit("unidades", "6"); digit("decenas", "1");
    expect(screen.queryByText(/Revisa la cifra de las unidades/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Comprobar mi trabajo" }));
    expect(screen.getByText(/Revisa la cifra de las unidades/)).toBeVisible();
    expect(screen.getByLabelText("Resultado: unidades")).toHaveValue("6");
    digit("unidades", "5");
    expect(screen.queryByText(/Revisa la cifra de las unidades/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Comprobar mi trabajo" }));
    expect(screen.getByText("El resultado final es correcto.")).toBeVisible();
  });

  test("encadena cuentas: el resultado pasa a la siguiente y el final se copia", async () => {
    sessionStorage.clear(); localStorage.clear();
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
    sessionStorage.clear(); localStorage.clear();
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

  test.each([
    { op: "Sumar", a: "958", b: "76", cell: "Resultado: unidades", note: "Nota para decenas (llevada o préstamo, opcional)" },
    { op: "Multiplicar", a: "325", b: "24", cell: "Producto: unidades", note: "Llevada sobre las decenas (opcional)" },
    { op: "Dividir", a: "325", b: "4", cell: "Fila 1: columna 1 de 3", note: "Fila 2: columna 1 de 3" },
  ])("recupera casillas y notas incompletas de $op", async ({ op, a, b, cell, note }) => {
    sessionStorage.clear(); localStorage.clear(); const first = renderCalculator(); await open();
    if (op !== "Sumar") fireEvent.click(screen.getByRole("radio", { name: op }));
    numbers(a, b);
    fireEvent.change(screen.getByLabelText(cell, { exact: true }), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText(note, { exact: true }), { target: { value: "2" } });
    first.unmount(); sessionStorage.clear(); renderCalculator(); await open();
    expect(screen.getByLabelText(cell, { exact: true })).toHaveValue("7");
    expect(screen.getByLabelText(note, { exact: true })).toHaveValue("2");
  });

  test("una división en la galera abierta pasa el cociente al valor elegido; el resto queda en la cadena", async () => {
    sessionStorage.clear(); localStorage.clear();
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
    sessionStorage.clear(); localStorage.clear();
    renderCalculator({ labels: ["tu respuesta"], onUse: () => {}, enabled: false });
    await open();
    fireEvent.click(screen.getByRole("radio", { name: "Restar" }));
    numbers("12", "40");
    expect(screen.getByRole("group", { name: "Cuenta con números con signo" })).toHaveTextContent("12 − 40");
    expect(screen.queryByRole("button", { name: /^Usar/ })).toBeNull();
  });

  test("la coma amplía la división y conserva las cifras y filas escritas", async () => {
    sessionStorage.clear(); localStorage.clear();
    const first = renderCalculator(); await open();
    fireEvent.click(screen.getByRole("radio", { name: "Dividir" })); numbers("3", "4");
    fireEvent.change(screen.getByLabelText("Cociente: cifra 1"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Fila 1: columna 1 de 1"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Añadir fila" }));
    fireEvent.change(screen.getByLabelText("Cociente: cifra 1"), { target: { value: "," } });
    expect(screen.getAllByLabelText(/^Cociente: cifra/)).toHaveLength(3);
    expect(screen.getByLabelText("Cociente: cifra 1")).toHaveValue("0");
    expect(screen.getByLabelText("Fila 1: columna 1 de 3")).toHaveValue("3");
    expect(screen.getByLabelText("Fila 3: columna 1 de 3")).toHaveValue("");
    expect(screen.getByText("coma")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Cociente: cifra 2"), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText("Cociente: cifra 3"), { target: { value: "5" } });
    expect(screen.getByText(/Resultado final:/)).toHaveTextContent("0,75");
    first.unmount(); renderCalculator(); await open();
    expect(screen.getByLabelText("Cociente: cifra 1")).toHaveValue("0");
    expect(screen.getByLabelText("Cociente: cifra 3")).toHaveValue("5");
    expect(screen.getByLabelText("Fila 1: columna 1 de 3")).toHaveValue("3");
  });

  test("la coma en la casilla vacía continúa después del cociente entero", async () => {
    sessionStorage.clear(); localStorage.clear(); renderCalculator(); await open();
    fireEvent.click(screen.getByRole("radio", { name: "Dividir" })); numbers("1287", "89");
    fireEvent.change(screen.getByLabelText("Cociente: cifra 1"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Cociente: cifra 2"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Fila 1: columna 2 de 4"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Cociente: cifra 3"), { target: { value: "," } });
    expect(screen.getByLabelText("Cociente: cifra 1")).toHaveValue("1");
    expect(screen.getByLabelText("Cociente: cifra 2")).toHaveValue("4");
    expect(screen.getByLabelText("Fila 1: columna 2 de 7")).toHaveValue("3");
    expect(screen.getByText("coma")).toBeInTheDocument();
  });

  test("conserva los ceros decimales al multiplicar y respeta los límites de la hoja", async () => {
    sessionStorage.clear(); localStorage.clear();
    renderCalculator();
    await open();
    fireEvent.click(screen.getByRole("radio", { name: "Multiplicar" }));
    numbers("2,50", "0,4");
    expect(screen.getByRole("group", { name: /2,50 por 0,4 en columnas/ })).toHaveTextContent("2,50");
    fireEvent.click(screen.getByRole("radio", { name: "Sumar" }));
    numbers("10000000", "1");
    expect(screen.getByRole("alert")).toHaveTextContent(/menores que 10 000 000/);
    fireEvent.click(screen.getByRole("radio", { name: "Dividir" }));
    numbers("3", "4");
    fireEvent.change(screen.getByLabelText("Cociente: cifra 1"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Cociente: cifra 1"), { target: { value: "," } });
    expect(screen.getAllByLabelText(/^Cociente: cifra/)).toHaveLength(3);
  });
});

describe("hoja manual de fracciones y divisibilidad", () => {
  const change = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label, { exact: true, selector: "input, select" }), { target: { value } });
  const fractions = () => {
    change("Numerador o entero de Primera fracción o número", "1");
    change("Denominador de Primera fracción o número", "2");
    change("Numerador o entero de Segunda fracción o número", "1");
    change("Denominador de Segunda fracción o número", "3");
  };
  test("el alumno escribe los pasos y puede usar una respuesta equivocada", async () => {
    sessionStorage.clear(); localStorage.clear();
    const onUse = vi.fn();
    renderCalculator({ labels: ["tu respuesta"], onUse });
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
    fractions();
    expect(screen.queryByText(/Resultado exacto/)).toBeNull();
    change("Operación del paso 1", "1/2 + 1/3");
    change("Resultado del paso 1", "7/6");
    change("Numerador o entero de Mi resultado", "7");
    change("Denominador de Mi resultado", "6");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar mi resultado" }));
    fireEvent.click(screen.getByRole("button", { name: "Usar 7/6 en tu respuesta" }));
    expect(onUse).toHaveBeenCalledWith("7/6", 0);
  });
  test("representa cada operación con fracciones apiladas y permite añadir operandos", async () => {
    sessionStorage.clear(); localStorage.clear(); renderCalculator(); await open();
    fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
    for (const [operation, symbol] of [["add", "+"], ["subtract", "−"], ["multiply", "×"], ["divide", "÷"]]) {
      change("Operación", operation);
      expect(screen.getByRole("region", { name: "Operación con fracciones" })).toHaveTextContent(symbol);
    }
    fractions();
    fireEvent.click(screen.getByRole("button", { name: /Añadir número/ }));
    change("Numerador o entero de Número 3", "1");
    change("Denominador de Número 3", "6");
    expect(screen.getByLabelText("Numerador o entero de Mi resultado")).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "Quitar número 3" }));
    expect(screen.queryByLabelText("Numerador o entero de Número 3")).toBeNull();
  });
  test("ofrece pistas para fracciones sin resolver ni borrar los bloques", async () => {
    sessionStorage.clear(); localStorage.clear(); renderCalculator(); await open();
    fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" })); fractions();
    change("Numerador o entero de Mi resultado", "7"); change("Denominador de Mi resultado", "6");
    expect(screen.queryByText(/Revisa el resultado final/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Comprobar mi trabajo" }));
    expect(screen.getByText(/Revisa el resultado final/)).toBeVisible();
    expect(screen.getByLabelText("Numerador o entero de Mi resultado")).toHaveValue("7");
    expect(screen.queryByText(/5\/6/)).toBeNull();
    change("Numerador o entero de Mi resultado", "5");
    expect(screen.queryByText(/Revisa el resultado final/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Comprobar mi trabajo" }));
    expect(screen.getByText("El resultado final es correcto.")).toBeVisible();
    expect(screen.getByText(/solo se comprobó el resultado/)).toBeVisible();
  });
  test("el alumno prepara y conserva fracciones equivalentes con denominador común", async () => {
    sessionStorage.clear(); localStorage.clear(); const first = renderCalculator(); await open();
    fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" })); fractions();
    change("Numerador o entero de Equivalente del número 1", "3");
    change("Denominador de Equivalente del número 1", "6");
    change("Numerador o entero de Equivalente del número 2", "2");
    change("Denominador de Equivalente del número 2", "6");
    change("Numerador o entero de Mi resultado", "5"); change("Denominador de Mi resultado", "6");
    fireEvent.click(screen.getByRole("button", { name: "Comprobar mi trabajo" }));
    expect(screen.getByText(/tienen un denominador común/)).toBeVisible();
    first.unmount(); sessionStorage.clear(); renderCalculator(); await open();
    fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
    expect(screen.getByLabelText("Numerador o entero de Equivalente del número 1")).toHaveValue("3");
    expect(screen.getByLabelText("Denominador de Equivalente del número 2")).toHaveValue("6");
  });
  test("al quitar un operando conserva su correspondencia con las demás equivalencias", async () => {
    sessionStorage.clear(); localStorage.clear(); renderCalculator(); await open();
    fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" })); fractions();
    fireEvent.click(screen.getByRole("button", { name: /Añadir número/ }));
    fireEvent.click(screen.getByRole("button", { name: /Añadir número/ }));
    change("Numerador o entero de Número 3", "1"); change("Denominador de Número 3", "4");
    change("Numerador o entero de Número 4", "1"); change("Denominador de Número 4", "6");
    change("Numerador o entero de Equivalente del número 3", "3"); change("Denominador de Equivalente del número 3", "12");
    change("Numerador o entero de Equivalente del número 4", "2"); change("Denominador de Equivalente del número 4", "12");
    fireEvent.click(screen.getByRole("button", { name: "Quitar número 3" }));
    expect(screen.getByLabelText("Denominador de Número 3")).toHaveValue("6");
    expect(screen.getByLabelText("Numerador o entero de Equivalente del número 3")).toHaveValue("2");
  });
  test("la tabla y el resultado manual se conservan y los cambios invalidan la confirmación", async () => {
    sessionStorage.clear(); localStorage.clear();
    const first = renderCalculator();
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
    change("Operación", "mcm");
    change("Primer entero", "12"); change("Segundo entero", "16");
    fireEvent.click(screen.getByRole("button", { name: /Añadir número/ }));
    change("Entero 3", "24");
    change("Divisor de la fila 1", "2"); change("Fila 1, número 1", "6"); change("Fila 1, número 2", "8"); change("Fila 1, número 3", "12");
    change("Mi resultado", "99");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar mi resultado" }));
    expect(screen.getByText("Resultado escrito: 99")).toBeVisible();
    first.unmount();
    renderCalculator(); await open();
    fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
    expect(screen.getByLabelText("Fila 1, número 3")).toHaveValue("12");
    expect(screen.getByText("Resultado escrito: 99")).toBeVisible();
    change("Segundo entero", "18");
    expect(screen.queryByText("Resultado escrito: 99")).toBeNull();
    expect(screen.getByLabelText("Mi resultado", { selector: "input" })).toHaveValue("99");
  });
  test("construye y modifica bloques de expresiones sin evaluarlas", async () => {
    sessionStorage.clear(); localStorage.clear(); renderCalculator(); await open();
    fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
    change("Operación", "expression"); change("Expresión", "(1+2)");
    fireEvent.click(screen.getByRole("button", { name: "Añadir × a la expresión" }));
    expect(screen.getByLabelText("Expresión")).toHaveValue("(1+2)×");
    fireEvent.click(screen.getByRole("button", { name: "Quitar bloque 2: 1" }));
    expect(screen.getByLabelText("Expresión")).toHaveValue("( + 2 ) ×");
    expect(screen.queryByText(/Resultado exacto/)).toBeNull();
  });
  test("conserva pasos con fracciones después de cerrar la pestaña", async () => {
    sessionStorage.clear(); localStorage.clear(); const first = renderCalculator(); await open();
    fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
    fireEvent.click(screen.getByRole("button", { name: "Añadir paso con fracciones" }));
    change("Numerador o entero de Primera fracción del paso 2", "1");
    change("Denominador de Primera fracción del paso 2", "2");
    change("Numerador o entero de Resultado del paso 2", "5");
    change("Denominador de Resultado del paso 2", "6");
    first.unmount(); sessionStorage.clear(); renderCalculator(); await open();
    fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
    expect(screen.getByLabelText("Denominador de Primera fracción del paso 2")).toHaveValue("2");
    expect(screen.getByLabelText("Numerador o entero de Resultado del paso 2")).toHaveValue("5");
  });
  test("señala la fila incorrecta de factores sin cambiarla", async () => {
    sessionStorage.clear(); localStorage.clear(); renderCalculator(); await open();
    fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
    change("Operación", "mcm"); change("Primer entero", "12"); change("Segundo entero", "18");
    change("Divisor de la fila 1", "2"); change("Fila 1, número 1", "6"); change("Fila 1, número 2", "10"); change("Mi resultado", "36");
    fireEvent.click(screen.getByRole("button", { name: "Comprobar mi trabajo" }));
    expect(screen.getByText(/Revisa la fila 1: divide/)).toBeVisible();
    expect(screen.getByLabelText("Fila 1, número 2")).toHaveValue("10");
    change("Fila 1, número 2", "9");
    expect(screen.queryByText(/Revisa la fila 1: divide/)).toBeNull();
  });
  test("el MCD mantiene los divisores junto a la fila que dividen y no resuelve por el alumno", async () => {
    sessionStorage.clear(); localStorage.clear(); renderCalculator(); await open();
    fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
    change("Operación", "mcd"); change("Primer entero", "12"); change("Segundo entero", "18");
    change("Divisor de la fila 1", "2");
    change("Fila 1, número 1", "6"); change("Fila 1, número 2", "9");
    fireEvent.click(screen.getByRole("button", { name: "Añadir fila" }));
    change("Divisor de la fila 2", "3");
    expect(screen.getByLabelText("Divisor de la fila 2").closest("tr")).toBe(screen.getByLabelText("Fila 1, número 1").closest("tr"));
    expect(screen.getByLabelText("Mi resultado", { selector: "input" })).toHaveValue("");
    change("Mi resultado", "10");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar mi resultado" }));
    expect(screen.getByText("Resultado escrito: 10")).toBeVisible();
  });
  test("no envía una fracción a una actividad que solo admite enteros", async () => {
    sessionStorage.clear(); localStorage.clear(); const onUse = vi.fn();
    renderCalculator({ labels: ["Cajas"], onUse, integerOnly: true });
    await open(); fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
    fractions(); change("Numerador o entero de Mi resultado", "5"); change("Denominador de Mi resultado", "6");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar mi resultado" }));
    expect(screen.getByRole("button", { name: "Usar 5/6 en Cajas" })).toBeDisabled();
    expect(screen.getByText(/solo admite números enteros/)).toBeVisible();
    expect(onUse).not.toHaveBeenCalled();
  });
  test("un resultado comprobado se puede usar y uno anterior requiere revisión", async () => {
    sessionStorage.clear(); localStorage.clear(); renderCalculator({ labels: ["respuesta"], onUse: vi.fn() }); await open();
    fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" })); fractions();
    change("Numerador o entero de Mi resultado", "5"); change("Denominador de Mi resultado", "6");
    fireEvent.click(screen.getByRole("button", { name: "Comprobar mi trabajo" }));
    expect(screen.getByRole("button", { name: "Usar 5/6 en respuesta" })).toBeEnabled();
    change("Operación", "multiply");
    expect(screen.getByText(/La cuenta cambió/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirmar mi resultado" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Conservar resultado" }));
    expect(screen.getByRole("button", { name: "Confirmar mi resultado" })).toBeEnabled();
  });
  test("crea una fila vacía al completar la anterior sin resolverla", async () => {
    sessionStorage.clear(); localStorage.clear(); renderCalculator(); await open();
    fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
    change("Operación", "mcm"); change("Primer entero", "12"); change("Segundo entero", "18");
    change("Divisor de la fila 1", "2"); change("Fila 1, número 1", "6"); change("Fila 1, número 2", "9");
    expect(screen.getByLabelText("Divisor de la fila 2")).toHaveValue("");
    expect(screen.getByLabelText("Fila 2, número 1")).toHaveValue("");
  });
  test("muestra la ayuda del denominador común al necesitarla", async () => {
    sessionStorage.clear(); localStorage.clear(); renderCalculator(); await open();
    fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
    change("Numerador o entero de Primera fracción o número", "1"); change("Denominador de Primera fracción o número", "2");
    change("Numerador o entero de Segunda fracción o número", "1"); change("Denominador de Segunda fracción o número", "2");
    expect(screen.getByText("Preparar denominador común (opcional)").closest("details")).not.toHaveAttribute("open");
    change("Denominador de Segunda fracción o número", "3");
    expect(screen.getByText("Preparar denominador común (opcional)").closest("details")).toHaveAttribute("open");
  });
  test("inserta los signos de expresión en la selección", async () => {
    sessionStorage.clear(); localStorage.clear(); renderCalculator(); await open();
    fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" })); change("Operación", "expression"); change("Expresión", "1234");
    const input = screen.getByLabelText("Expresión") as HTMLInputElement;
    input.setSelectionRange(1, 3);
    fireEvent.click(screen.getByRole("button", { name: "Añadir + a la expresión" }));
    expect(input).toHaveValue("1+4");
  });
  test("conserva operandos antiguos sin recuperar la solución automática", () => {
    sessionStorage.clear(); localStorage.clear();
    sessionStorage.setItem("antigua", JSON.stringify({ op: "add", a: "1/2", b: "1/3", calculated: true }));
    const onResult = vi.fn();
    render(<ExactCalculator storageKey="antigua" onResult={onResult} />);
    expect(screen.getByLabelText("Numerador o entero de Primera fracción o número")).toHaveValue("1");
    expect(screen.getByLabelText("Denominador de Segunda fracción o número")).toHaveValue("3");
    expect(screen.getByLabelText("Numerador o entero de Mi resultado")).toHaveValue("");
    expect(onResult).not.toHaveBeenCalledWith("5/6");
  });
  test("valida el formato sin resolver expresiones ni aceptar denominador cero", async () => {
    sessionStorage.clear(); localStorage.clear(); renderCalculator(); await open();
    fireEvent.click(screen.getByRole("button", { name: "Fracciones y MCM" }));
    change("Operación", "expression"); change("Expresión", "(1/2 + 1/3) * 3");
    change("Numerador o entero de Mi resultado", "17"); change("Denominador de Mi resultado", "0");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar mi resultado" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/denominador distinto de cero/);
    change("Denominador de Mi resultado", "");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar mi resultado" }));
    expect(screen.getByText("Resultado escrito: 17")).toBeVisible();
    expect(screen.queryByText(/Resultado exacto/)).toBeNull();
  });
});
