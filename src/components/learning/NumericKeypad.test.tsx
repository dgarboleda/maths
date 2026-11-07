import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { NumericKeypadArea } from "./NumericKeypad";
import { ColumnSheet } from "./ColumnOperation";
import { RuffiniSheet } from "./RuffiniOperation";

const original = window.matchMedia;
function touch(coarse: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: coarse && query === "(pointer: coarse)",
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
const key = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

describe("Teclado numérico de las hojas", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    window.matchMedia = original;
  });

  test("con decimales ofrece la tecla «,», que pone la coma sin borrar la cifra", () => {
    touch(true);
    const onChange = vi.fn();
    render(
      <NumericKeypadArea comma>
        <ColumnSheet spec={{ op: "add", a: 3.5, b: 1.25 }} strategy="prestamo" mode="free" response="" onChange={onChange} />
      </NumericKeypadArea>,
    );
    act(() => screen.getByLabelText("Resultado: centésimas", { exact: true }).focus());
    key("Escribir 5");
    key("Escribir 7");
    key("Escribir coma");
    key("Escribir 4");
    expect(onChange).toHaveBeenLastCalledWith("4,75");
  });

  test("sin decimales no hay tecla de coma", () => {
    touch(true);
    render(
      <NumericKeypadArea>
        <ColumnSheet spec={{ op: "add", a: 958, b: 76 }} strategy="prestamo" mode="free" response="" onChange={() => {}} />
      </NumericKeypadArea>,
    );
    expect(screen.queryByRole("button", { name: "Escribir coma" })).toBeNull();
  });

  test("en pantalla táctil escribe en la casilla enfocada sin abrir el teclado del sistema", async () => {
    touch(true);
    const onChange = vi.fn();
    const { container } = render(
      <NumericKeypadArea>
        <ColumnSheet spec={{ op: "add", a: 958, b: 76 }} strategy="prestamo" mode="free" response="" onChange={onChange} />
      </NumericKeypadArea>,
    );
    const units = screen.getByLabelText("Resultado: unidades", { exact: true });
    expect(units).toHaveAttribute("inputmode", "none");
    act(() => units.focus());
    key("Escribir 4");
    // La hoja pasa sola a las decenas: el teclado sigue en la casilla enfocada.
    key("Escribir 3");
    key("Escribir 0");
    key("Escribir 1");
    expect(onChange).toHaveBeenLastCalledWith("1034");
    // Borrar y moverse a la derecha (hacia las unidades).
    key("Borrar");
    expect(onChange).toHaveBeenLastCalledWith("34");
    key("Mover a la derecha");
    expect(document.activeElement).toBe(screen.getByLabelText("Resultado: centenas", { exact: true }));
    // En el borde izquierdo la hoja no salta a otras casillas.
    key("Mover a la izquierda");
    key("Mover a la izquierda");
    expect(document.activeElement).toBe(screen.getByLabelText("Resultado: unidades de millar", { exact: true }));
    expect(await axe(container)).toHaveNoViolations();
  });

  test("Ruffini tiene la tecla del signo menos", () => {
    touch(true);
    const onChange = vi.fn();
    render(
      <NumericKeypadArea sign>
        <RuffiniSheet spec={{ op: "ruffini", coefficients: [1, 0, -7, 6], root: -3 }} mode="free" response="" onChange={onChange} />
      </NumericKeypadArea>,
    );
    act(() => screen.getByLabelText("Esquina de la tabla").focus());
    key("Escribir signo menos");
    key("Escribir 3");
    expect(screen.getByLabelText("Esquina de la tabla")).toHaveValue("−3");
  });

  test("se puede volver al teclado del teléfono, y sin pantalla táctil no aparece", () => {
    touch(true);
    const { unmount } = render(
      <NumericKeypadArea>
        <ColumnSheet spec={{ op: "add", a: 12, b: 3 }} strategy="prestamo" mode="free" response="" onChange={() => {}} />
      </NumericKeypadArea>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Usar el teclado del teléfono" }));
    expect(screen.queryByRole("group", { name: "Teclado numérico" })).toBeNull();
    expect(screen.getByLabelText("Resultado: unidades", { exact: true })).toHaveAttribute("inputmode", "numeric");
    fireEvent.click(screen.getByRole("button", { name: "Usar el teclado de la hoja" }));
    expect(screen.getByRole("group", { name: "Teclado numérico" })).toBeInTheDocument();
    unmount();
    touch(false);
    render(
      <NumericKeypadArea>
        <ColumnSheet spec={{ op: "add", a: 12, b: 3 }} strategy="prestamo" mode="free" response="" onChange={() => {}} />
      </NumericKeypadArea>,
    );
    expect(screen.queryByRole("group", { name: "Teclado numérico" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Usar el teclado/ })).toBeNull();
  });
});
