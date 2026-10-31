import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { OrbitalManeuver } from "./OrbitalManeuver";

afterEach(() => vi.useRealTimers());

test("esquivar y recoger suman puntos; la pausa detiene los encuentros", () => {
  vi.useFakeTimers();
  const bonus = vi.fn();
  const view = render(<OrbitalManeuver paused={false} round={0} onBonus={bonus} />);
  fireEvent.click(screen.getByRole("button", { name: "Iniciar maniobra" }));
  fireEvent.click(screen.getByRole("button", { name: "Ruta 1" }));
  view.rerender(<OrbitalManeuver paused round={0} onBonus={bonus} />);
  act(() => vi.advanceTimersByTime(5_000));
  expect(bonus).not.toHaveBeenCalled();
  view.rerender(<OrbitalManeuver paused={false} round={0} onBonus={bonus} />);
  act(() => vi.advanceTimersByTime(2_200));
  expect(bonus).toHaveBeenCalledWith(20);
  act(() => vi.advanceTimersByTime(2_100));
  expect(bonus).toHaveBeenCalledWith(50);
});

test("chocar consume escudo sin conceder puntos", () => {
  vi.useFakeTimers();
  const bonus = vi.fn();
  render(<OrbitalManeuver paused={false} round={0} onBonus={bonus} />);
  fireEvent.click(screen.getByRole("button", { name: "Iniciar maniobra" }));
  act(() => vi.advanceTimersByTime(2_200));
  expect(screen.getByText("Escudo: 2/3")).toBeInTheDocument();
  expect(bonus).not.toHaveBeenCalled();
  expect(screen.getByRole("status")).toHaveTextContent("No afecta tu respuesta");
});
