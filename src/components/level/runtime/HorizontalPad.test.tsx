import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { HorizontalPad } from "./HorizontalPad";
import { useArrowKeys } from "@/lib/minigames/useArrowKeys";

afterEach(() => vi.useRealTimers());

test("el botón de acción conserva espacio nativo y no duplica teclado ni toque", () => {
  const onAction = vi.fn();
  function Host() {
    useArrowKeys({ action: onAction }, { enabled: true });
    return <HorizontalPad inline onLeft={vi.fn()} onRight={vi.fn()} onAction={onAction} />;
  }
  render(<Host />);
  const action = screen.getByRole("button", { name: "Disparar" });
  fireEvent.keyDown(action, { code: "Space" });
  expect(onAction).not.toHaveBeenCalled();
  fireEvent.click(action, { detail: 0 });
  expect(onAction).toHaveBeenCalledTimes(1);
  fireEvent.pointerDown(action); fireEvent.pointerUp(action); fireEvent.click(action, { detail: 1 });
  expect(onAction).toHaveBeenCalledTimes(2);
});

test("desactivar cancela la repetición y bloquea también el botón de acción", () => {
  vi.useFakeTimers();
  const onLeft = vi.fn(), onAction = vi.fn();
  const view = render(<HorizontalPad inline onLeft={onLeft} onRight={vi.fn()} onAction={onAction} />);
  fireEvent.pointerDown(screen.getByRole("button", { name: "Mover a la izquierda" }));
  view.rerender(<HorizontalPad inline disabled onLeft={onLeft} onRight={vi.fn()} onAction={onAction} />);
  act(() => { vi.advanceTimersByTime(500); });
  fireEvent.pointerDown(screen.getByRole("button", { name: "Disparar" }));
  expect(onAction).not.toHaveBeenCalled();
  expect(onLeft).toHaveBeenCalledTimes(1);
});
