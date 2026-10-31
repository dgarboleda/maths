import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { SnakeGeneric } from "./SnakeGeneric";
import { NumberPacGeneric } from "./NumberPacGeneric";
import { InvadersGeneric } from "./InvadersGeneric";
import { RunnerGeneric } from "./RunnerGeneric";
import { FroggerGeneric } from "./FroggerGeneric";
import { TopoGeneric } from "./TopoGeneric";
import { BreakoutGeneric } from "./BreakoutGeneric";
import { CajasGeneric } from "./CajasGeneric";
import { CoheteGeneric } from "./CoheteGeneric";
import type { LessonExercise } from "@/lib/minigames/lessonExercise";
import { resetArcadeLevelCache, setArcadeCalm, setArcadeLevel } from "@/lib/minigames/arcadeLevel";
import { resetArcadeBestCache } from "@/lib/minigames/arcadeScore";

/**
 * Niveles altos de los minijuegos: los peligros nuevos aparecen según el
 * nivel guardado, chocar resta un corazón y nunca envía una respuesta, y el
 * modo tranquilo vuelve al juego de siempre.
 */
vi.mock("@/lib/curriculum", () => ({ getModule: () => { throw new Error("La clase no usa generadores antiguos"); } }));
vi.mock("@/lib/gameSound", () => ({ playSound: vi.fn() }));
vi.mock("@/lib/confetti", () => ({ triggerConfetti: vi.fn() }));
vi.mock("@/lib/problem", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/problem")>()),
  shuffle: <T,>(items: T[]) => items,
}));

beforeEach(() => {
  window.localStorage.clear();
  resetArcadeLevelCache();
  resetArcadeBestCache();
});
afterEach(() => vi.useRealTimers());

export function exercise(overrides: Partial<LessonExercise> = {}): LessonExercise {
  return {
    problem: { id: "p-2", difficulty: 1, kind: "lesson-practice", prompt: "¿Qué valor de x mantiene la igualdad x + 3 = 1?", answer: -2, inputType: "decimal", choices: [-4, -3, -2, -1, 0] },
    solved: false, disabled: false, paused: false, timed: false,
    input: <button>Respuesta de la clase</button>,
    onResponse: vi.fn(async () => true),
    ...overrides,
  };
}
export function key(code: string) {
  act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { code })); });
}
export function tick(ms: number) {
  for (let t = 0; t < ms; t += 50) act(() => { vi.advanceTimersByTime(50); });
}
const hearts = (container: HTMLElement) => Number(container.querySelector("[data-hearts]")?.getAttribute("data-hearts"));

test("la ficha de inicio muestra el nivel y permite el modo tranquilo", () => {
  setArcadeLevel("snake", 4);
  render(<SnakeGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={exercise()} />);
  expect(screen.getByText("NIVEL 4 DE 10")).toBeInTheDocument();
  expect(screen.getByText(/Novedad: Fruta reloj/)).toBeInTheDocument();
  const calm = screen.getByRole("button", { name: "Modo tranquilo" });
  expect(calm).toHaveAttribute("aria-pressed", "false");
  fireEvent.click(calm);
  expect(screen.getByText("MODO TRANQUILO · NIVEL 1")).toBeInTheDocument();
});

test("Serpiente: sin rocas en el nivel 1; con nivel alto hay rocas y reloj, y chocar resta un corazón sin responder", () => {
  vi.useFakeTimers();
  const first = render(<SnakeGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={exercise()} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  expect(first.container.querySelectorAll("[data-rock]")).toHaveLength(0);
  expect(first.container.querySelector("[data-clock]")).toBeNull();
  first.unmount();

  setArcadeLevel("snake", 5);
  const data = exercise();
  const { container } = render(<SnakeGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  expect(container.querySelectorAll("[data-rock]")).toHaveLength(5);
  expect(container.querySelector("[data-clock]")).not.toBeNull();
  expect(hearts(container)).toBe(3);
  // Hacia arriba hasta el borde: choque de reflejos.
  key("ArrowUp");
  tick(4000);
  expect(hearts(container)).toBeLessThan(3);
  expect(data.onResponse).not.toHaveBeenCalled();
});

test("Serpiente en modo tranquilo juega como en el nivel 1 aunque el nivel guardado sea alto", () => {
  setArcadeLevel("snake", 8);
  setArcadeCalm(true);
  const { container } = render(<SnakeGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={exercise()} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  expect(container.querySelectorAll("[data-rock]")).toHaveLength(0);
  expect(container.querySelector("[data-level]")).toHaveAttribute("data-level", "1");
});

test("Laberinto: el segundo fantasma aparece desde el nivel 4 y alcanzarte resta un corazón sin responder", async () => {
  vi.useFakeTimers();
  const low = render(<NumberPacGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={exercise()} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  expect(low.container.querySelector("[data-ghost2]")).toBeNull();
  low.unmount();

  setArcadeLevel("numberpac", 4);
  const data = exercise();
  const { container } = render(<NumberPacGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  expect(container.querySelector("[data-ghost2]")).not.toBeNull();
  // Ir y volver entre dos casillas hasta que un fantasma alcance al jugador.
  for (let i = 0; i < 60 && hearts(container) === 3; i++) {
    key(i % 2 ? "ArrowUp" : "ArrowDown");
    // Deja que se guarde una opción pisada antes de seguir.
    for (let t = 0; t < 300; t += 50) await act(async () => { vi.advanceTimersByTime(50); });
  }
  expect(hearts(container)).toBeLessThan(3);
  for (const [value] of vi.mocked(data.onResponse).mock.calls) expect([-4, -3, -2, -1, 0]).toContain(value);
});

test("Invasión: los meteoritos llegan desde el nivel 3, cuestan corazones y nunca disparan", () => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0.5); // siempre la columna central, donde está la nave
  setArcadeLevel("invaders", 3);
  const data = exercise();
  const { container } = render(<InvadersGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  let sawMeteor = false;
  for (let t = 0; t < 6000 && hearts(container) === 3; t += 50) {
    tick(50);
    sawMeteor ||= container.querySelector("[data-meteor-col]") !== null;
  }
  expect(sawMeteor).toBe(true);
  expect(hearts(container)).toBeLessThan(3);
  expect(data.onResponse).not.toHaveBeenCalled();
  vi.mocked(Math.random).mockRestore();
});

test("Autopista: dos conos desde el nivel 6; chocar resta un corazón y no responde", () => {
  vi.useFakeTimers();
  setArcadeLevel("runner", 6);
  const data = exercise();
  const { container } = render(<RunnerGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  const cones = [...container.querySelectorAll("[data-cone]")];
  expect(cones).toHaveLength(2);
  // Elegir el carril de un cono y dejar que llegue.
  const coneLane = cones[0].closest("button")!;
  fireEvent.click(coneLane);
  tick(3000);
  expect(hearts(container)).toBe(2);
  expect(data.onResponse).not.toHaveBeenCalled();
});

test("Estanque: el segundo cocodrilo nada desde el nivel 4", () => {
  const low = render(<FroggerGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={exercise()} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  expect(low.container.querySelector("[data-croc2]")).toBeNull();
  low.unmount();
  setArcadeLevel("frogger", 4);
  const { container } = render(<FroggerGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={exercise()} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  expect(container.querySelector("[data-croc2]")).not.toBeNull();
});

test("Topos: desde el nivel 3 sale el topo bomba; tocarlo resta un corazón y no responde", () => {
  vi.useFakeTimers();
  setArcadeLevel("topos", 3);
  const data = exercise();
  const { container } = render(<TopoGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  for (let t = 0; t < 4000 && !screen.queryByRole("button", { name: /Topo bomba/ }); t += 50) tick(50);
  fireEvent.click(screen.getByRole("button", { name: /Topo bomba/ }));
  expect(hearts(container)).toBe(2);
  expect(data.onResponse).not.toHaveBeenCalled();
});

test("Topos con «Sin prisas» no muestra bombas aunque el nivel sea alto", () => {
  vi.useFakeTimers();
  setArcadeLevel("topos", 8);
  render(<TopoGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={exercise()} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  fireEvent.click(screen.getByRole("button", { name: "Sin prisas" }));
  tick(6000);
  expect(screen.queryByRole("button", { name: /Topo bomba/ })).toBeNull();
});

test("Bloques: la gema aparece desde el nivel 2 y la fila se mueve desde el nivel 3", () => {
  vi.useFakeTimers();
  setArcadeLevel("breakout", 3);
  const { container } = render(<BreakoutGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={exercise()} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  expect(container.querySelector("[data-gem]")).not.toBeNull();
  const block = () => screen.getAllByRole("button", { name: /Apuntar al bloque/ })[0].style.left;
  const before = block();
  tick(400);
  expect(block()).not.toBe(before);
});

test("Caja numérica: desde el nivel 4 usa almacenes difíciles y muestra el par", () => {
  setArcadeLevel("cajas", 4);
  const { container } = render(<CajasGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={exercise()} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  expect(["estantes", "muelle"]).toContain(container.querySelector("[data-sokoban-board]")?.getAttribute("data-warehouse"));
  expect(screen.getByText(/Pasos: 0\/\d+ par/)).toBeInTheDocument();
});

test("Cohete: el reto con tiempo se acorta desde el nivel 4", () => {
  setArcadeLevel("cohete", 6);
  render(<CoheteGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={exercise({ timed: true })} />);
  fireEvent.click(screen.getByRole("button", { name: /Iniciar misión/ }));
  expect(screen.getByText("24s")).toBeInTheDocument();
});
