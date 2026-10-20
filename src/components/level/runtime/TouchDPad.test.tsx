import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { TouchDPad } from "./TouchDPad";

afterEach(() => vi.useRealTimers());

test("al mantener pulsado repite con el manejador más reciente, no con el del primer toque", () => {
  vi.useFakeTimers();
  const first = vi.fn();
  const latest = vi.fn();
  const view = render(<TouchDPad onMove={first} />);
  const up = screen.getByRole("button", { name: "Mover arriba" });
  fireEvent.pointerDown(up);
  expect(first).toHaveBeenCalledTimes(1);
  view.rerender(<TouchDPad onMove={latest} />);
  act(() => { vi.advanceTimersByTime(170); });
  expect(latest).toHaveBeenCalledTimes(1);
  expect(first).toHaveBeenCalledTimes(1);
  fireEvent.pointerUp(up);
  act(() => { vi.advanceTimersByTime(500); });
  expect(latest).toHaveBeenCalledTimes(1);
});

test("en modo en línea no flota sobre el contenido", () => {
  render(<TouchDPad inline onMove={vi.fn()} />);
  expect(screen.getByLabelText("Control de movimiento").className).not.toContain("absolute");
});


test("sin repetición, mantener pulsado hace un único movimiento", () => {
  vi.useFakeTimers();
  const onMove = vi.fn();
  render(<TouchDPad inline repeat={false} onMove={onMove} />);
  const right = screen.getByRole("button", { name: "Mover a la derecha" });
  fireEvent.pointerDown(right);
  act(() => { vi.advanceTimersByTime(1000); });
  fireEvent.pointerUp(right);
  expect(onMove).toHaveBeenCalledExactlyOnceWith(5, 0);
});
