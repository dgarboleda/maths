import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { axe } from "jest-axe";
import { Challenge, niceRange, niceStep, useGhost } from "./GraphVisuals";
import { LearningVisual, modes } from "./LearningVisual";

afterEach(() => vi.useRealTimers());

test("elige pasos y rangos redondos para los ejes", () => {
  expect(niceStep(10)).toBe(2);
  expect(niceStep(100)).toBe(20);
  expect(niceStep(5120)).toBe(1000);
  expect(niceStep(0)).toBe(1);
  expect(niceRange([2, 5, 8, 23])).toEqual({ range: [0, 25], step: 5 });
  expect(niceRange([-6, 4])).toEqual({ range: [-6, 6], step: 2 });
});

test("el estado anterior se conserva durante una ráfaga de cambios y se renueva al detenerse", () => {
  vi.useFakeTimers();
  const { result, rerender } = renderHook(({ v }) => useGhost(v, 1000), { initialProps: { v: 1 } });
  expect(result.current).toBeUndefined();
  rerender({ v: 2 });
  rerender({ v: 3 });
  expect(result.current).toBe(1);
  act(() => { vi.advanceTimersByTime(1100); });
  rerender({ v: 4 });
  expect(result.current).toBe(3);
});

test("las modas se calculan, incluso cuando hay dos o ninguna", () => {
  expect(modes([3, 4, 4, 5, 6, 9])).toEqual([4]);
  expect(modes([3, 4, 4, 5, 5, 6])).toEqual([4, 5]);
  expect(modes([1, 2, 3])).toEqual([]);
});

test("media, mediana y moda: el diagrama y la moda siguen a los datos", () => {
  render(<LearningVisual kind="data" />);
  const slider = screen.getByLabelText(/Cambia el último dato/);
  fireEvent.change(slider, { target: { value: 5 } });
  expect(screen.getByText("4 y 5")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: /media 4,5 .*mediana 4,5/ })).toBeInTheDocument();
  fireEvent.change(slider, { target: { value: 14 } });
  expect(screen.getByText("¡Conseguido! Explica por qué funciona.")).toBeInTheDocument();
});

test("el reto se comprueba solo y permite pasar a otro", async () => {
  const view = render(<Challenge goals={[{ text: "Meta A", met: false, hint: "Pista A" }, { text: "Meta B", met: true }]} />);
  expect(screen.getByText("Pista A")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Otro reto" }));
  expect(screen.getByText("Meta B")).toBeInTheDocument();
  expect(screen.getByText(/Conseguido/)).toBeInTheDocument();
  expect(await axe(view.container)).toHaveNoViolations();
});

test("las progresiones muestran los saltos, se leen punto a punto y tienen tabla", async () => {
  render(<LearningVisual kind="sequence" />);
  const reader = await screen.findByLabelText("Lee un término de la gráfica");
  fireEvent.change(reader, { target: { value: 2 } });
  expect(reader).toHaveAttribute("aria-valuetext", "a₃ = 8");
  expect(screen.getAllByText("a₃ = 8")).toHaveLength(2); // etiqueta en la gráfica y lectura accesible
  expect(screen.getAllByText("+3").length).toBeGreaterThan(0);
  expect(screen.getByText("Ver la tabla de valores")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/^Diferencia d/), { target: { value: 4 } });
  expect(screen.getByText(/Con una progresión aritmética, consigue que a₅ = 18/).parentElement).toHaveTextContent("¡Conseguido!");
});

test("la recta compara con su estado anterior y nombra los ejes", async () => {
  const { container } = render(<LearningVisual kind="linear" />);
  fireEvent.change(await screen.findByLabelText(/pendiente/), { target: { value: 1 } });
  expect(screen.getByText(/En gris, cómo era antes del último cambio/)).toBeInTheDocument();
  expect(container.querySelectorAll("path.stroke-slate-500").length).toBe(1);
  const labels = [...container.querySelectorAll("svg text")].map((t) => t.textContent);
  expect(labels).toEqual(expect.arrayContaining(["x", "y"]));
});

test("la balanza se resuelve haciendo lo mismo en los dos platos y se inclina si no", async () => {
  render(<LearningVisual kind="equation" />);
  const quitar = await screen.findByRole("button", { name: "Quitar 1 de cada lado" });
  expect(screen.getByRole("img", { name: /izquierda 3x \+ 6, a la derecha 15\. Está equilibrada/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Quitar 1 solo a la izquierda" }));
  expect(screen.getByRole("img", { name: /inclinada hacia la derecha/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Empezar de nuevo" }));
  for (let i = 0; i < 6; i++) fireEvent.click(quitar);
  fireEvent.click(screen.getByRole("button", { name: "Repartir en 3 grupos iguales" }));
  expect(screen.getByText(/Resuelto: x = 3/)).toBeInTheDocument();
  expect(screen.getByText(/Despeja x manteniendo la balanza/).parentElement).toHaveTextContent("¡Conseguido!");
});
