import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { DivisionDemo, DivisionSheet, firstWrongQuotientDigit } from "./DivisionOperation";

const digit = (n: number) => screen.getByLabelText(`Cociente: cifra ${n}`);

describe("Galera de la división larga", () => {
  test("guiada: corrige cada cifra, exige el 0 y entrega el cociente", () => {
    const onComplete = vi.fn();
    render(
      <DivisionSheet spec={{ op: "divide", a: 612, b: 6 }} layout="completa" mode="guided"
        response="" onChange={() => {}} onComplete={onComplete} />,
    );
    fireEvent.change(digit(1), { target: { value: "1" } });
    expect(screen.getByText(/Bajas el 1: queda 1\./)).toBeInTheDocument();
    // Saltarse el 0 escribiendo el 2 se corrige en el momento.
    fireEvent.change(digit(2), { target: { value: "2" } });
    expect(screen.getByText(/Revisa esa cifra/)).toBeInTheDocument();
    fireEvent.change(digit(2), { target: { value: "0" } });
    fireEvent.change(digit(3), { target: { value: "2" } });
    expect(onComplete).toHaveBeenCalledWith("102");
  });

  test("libre: no revela cuántas cifras tiene el cociente y señala la primera que no coincide", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <DivisionSheet spec={{ op: "divide", a: 756, b: 3 }} layout="completa" mode="free" response="" onChange={onChange} />,
    );
    expect(screen.getAllByLabelText(/^Cociente: cifra/)).toHaveLength(3);
    fireEvent.change(digit(1), { target: { value: "2" } });
    fireEvent.change(digit(2), { target: { value: "5" } });
    fireEvent.change(digit(3), { target: { value: "2" } });
    expect(onChange).toHaveBeenLastCalledWith("252");
    expect(await axe(container)).toHaveNoViolations();
    expect(firstWrongQuotientDigit("12", 102)).toBe(1);
    expect(firstWrongQuotientDigit("102", 102)).toBeNull();
  });

  test("demostración: la disposición completa escribe los productos; la abreviada solo los restos", () => {
    const { container, unmount } = render(<DivisionDemo spec={{ op: "divide", a: 756, b: 3 }} layout="completa" initialStep={3} />);
    const products = (root: HTMLElement) => [...root.querySelectorAll(".sr-only")].filter((el) => el.textContent === "restas ").length;
    expect(products(container)).toBe(3);
    expect(container).toHaveTextContent(/Cociente 252 · resto 0/);
    unmount();
    const short = render(<DivisionDemo spec={{ op: "divide", a: 756, b: 3 }} layout="abreviada" initialStep={3} />);
    expect(products(short.container)).toBe(0);
  });
});
