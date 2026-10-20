import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { axe } from "jest-axe";
import { SnakeGeneric } from "./SnakeGeneric";
import { RunnerGeneric } from "./RunnerGeneric";
import { NumberPacGeneric } from "./NumberPacGeneric";
import { InvadersGeneric } from "./InvadersGeneric";
import { BreakoutGeneric } from "./BreakoutGeneric";
import { TopoGeneric } from "./TopoGeneric";
import { CajasGeneric } from "./CajasGeneric";
import { AWAITING_INPUT, REFLEX_MISS } from "@/lib/minigames/lessonArcade";
import { FroggerGeneric, FROGGER_MISS } from "./FroggerGeneric";
import { CoheteGeneric } from "./CoheteGeneric";
import type { LessonExercise } from "@/lib/minigames/lessonExercise";

vi.mock("@/lib/curriculum", () => ({ getModule: () => { throw new Error("La clase no usa generadores antiguos"); } }));
vi.mock("@/lib/gameSound", () => ({ playSound: vi.fn() }));
vi.mock("@/lib/confetti", () => ({ triggerConfetti: vi.fn() }));
// Celdas libres en orden de lectura: la posición de cada opción es fija.
vi.mock("@/lib/problem", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/problem")>()),
  shuffle: <T,>(items: T[]) => items,
}));
afterEach(() => vi.useRealTimers());

function exercise(overrides: Partial<LessonExercise> = {}): LessonExercise {
  return {
    problem: { id: "p-2", difficulty: 1, kind: "lesson-practice", prompt: "¿Qué valor de x mantiene la igualdad x + 3 = 1?", answer: -2, inputType: "decimal", choices: [-4, -3, -2, -1, 0] },
    solved: false, disabled: false, paused: false, timed: false,
    input: <button>Respuesta de la clase</button>,
    onResponse: vi.fn(async () => true),
    ...overrides,
  };
}

test("Estanque con obstáculo: llegar al nenúfar envía su valor una vez y solo celebra lo guardado", async () => {
  vi.useFakeTimers();
  let complete!: (saved: boolean) => void;
  const onResponse = vi.fn(() => new Promise<boolean>((resolve) => { complete = resolve; }));
  const data = exercise({ onResponse });
  const legacy = vi.fn();
  const view = render(<FroggerGeneric moduleId="" soundOn={false} onAnswer={legacy} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  key("ArrowUp"); // al carril del obstáculo
  key("ArrowUp"); // al estanque, en la columna central: -2
  key("ArrowUp");
  expect(onResponse).toHaveBeenCalledExactlyOnceWith(-2);
  expect(screen.queryByText("¡Cruzaste el estanque!")).not.toBeInTheDocument();
  await act(async () => { complete(true); });
  view.rerender(<FroggerGeneric moduleId="" soundOn={false} onAnswer={legacy} exercise={{ ...data, solved: true, disabled: true }} />);
  expect(screen.getByText("¡Cruzaste el estanque!")).toBeInTheDocument();
  expect(legacy).not.toHaveBeenCalled();
  expect(screen.queryByText(/Estrellas|Vidas/)).not.toBeInTheDocument();
});

test("Estanque: la pausa congela el juego, chocar no cuenta y un guardado fallido permite reintentar", async () => {
  vi.useFakeTimers();
  const data = exercise({ paused: true, onResponse: vi.fn(async () => false) });
  const view = render(<FroggerGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  expect(screen.getByRole("button", { name: "¡Empezar!" })).toBeDisabled();
  view.rerender(<FroggerGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={{ ...data, paused: false }} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  key("ArrowUp");
  // En la clase el obstáculo avanza cada 900 ms: va y vuelve hasta la rana.
  tick(900 * 3);
  expect(screen.queryByText(FROGGER_MISS)).not.toBeInTheDocument();
  tick(900 * 2);
  expect(screen.getByText(FROGGER_MISS)).toBeInTheDocument();
  // La rana vuelve a la orilla, debajo del carril: no queda sobre un nenúfar.
  expect(view.container.querySelector("[data-board]")).toHaveAttribute("data-frog-lane", "orilla");
  expect(data.onResponse).not.toHaveBeenCalled();
  key("ArrowUp");
  key("ArrowUp");
  await act(async () => {});
  expect(data.onResponse).toHaveBeenCalledTimes(1);
  key("ArrowUp");
  key("ArrowUp");
  await act(async () => {});
  expect(data.onResponse).toHaveBeenCalledTimes(2);
  expect(screen.getByText(data.problem.prompt)).toBeInTheDocument();
});

test("Cohete empieza sin límite; pausar o guardar detiene el reloj opcional sin fabricar errores", () => {
  vi.useFakeTimers();
  const legacy = vi.fn();
  const data = exercise();
  const view = render(<CoheteGeneric moduleId="" soundOn={false} onAnswer={legacy} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Iniciar misión!" }));
  act(() => vi.advanceTimersByTime(40_000));
  expect(screen.getByText("Sin límite")).toBeInTheDocument();
  view.rerender(<CoheteGeneric moduleId="" soundOn={false} onAnswer={legacy} exercise={{ ...data, timed: true }} />);
  act(() => vi.advanceTimersByTime(5_000));
  expect(screen.getByText("25s")).toBeInTheDocument();
  for (const freeze of [{ paused: true }, { disabled: true }]) {
    view.rerender(<CoheteGeneric moduleId="" soundOn={false} onAnswer={legacy} exercise={{ ...data, timed: true, ...freeze }} />);
    act(() => vi.advanceTimersByTime(40_000));
    expect(screen.getByText("25s")).toBeInTheDocument();
  }
  view.rerender(<CoheteGeneric moduleId="" soundOn={false} onAnswer={legacy} exercise={{ ...data, timed: true }} />);
  act(() => vi.advanceTimersByTime(25_000));
  expect(screen.getByText("¡Buen intento!")).toBeInTheDocument();
  expect(legacy).not.toHaveBeenCalled();
  expect(data.onResponse).not.toHaveBeenCalled();
  expect(screen.queryByText(/Estrellas/)).not.toBeInTheDocument();
});


function key(code: string) {
  act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { code })); });
}
/** En pasos cortos, cada uno con su render: los juegos leen estado de React. */
function tick(ms: number) {
  for (let t = 0; t < ms; t += 50) act(() => { vi.advanceTimersByTime(50); });
}
// Opciones de la clase en orden: [-4, -3, -2, -1, 0]; la respuesta es -2.

test("Serpiente: chocar no envía respuesta ni termina; comer envía el valor", async () => {
  vi.useFakeTimers();
  const data = exercise();
  const legacy = vi.fn();
  const view = render(<SnakeGeneric moduleId="" soundOn={false} onAnswer={legacy} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  // Quieta hasta la primera flecha: nada se come solo.
  tick(5_000);
  expect(screen.getByText(AWAITING_INPUT)).toBeInTheDocument();
  expect(data.onResponse).not.toHaveBeenCalled();
  key("ArrowRight");
  tick(450 * 6); // avanza a la derecha hasta el borde
  expect(screen.getByText(REFLEX_MISS)).toBeInTheDocument();
  expect(screen.getByText(data.problem.prompt)).toBeInTheDocument();
  expect(data.onResponse).not.toHaveBeenCalled();
  // Tras chocar vuelve a esperar; la flecha arriba la lleva por la columna 3
  // hasta la fila 0, donde está -1.
  tick(2_000);
  expect(data.onResponse).not.toHaveBeenCalled();
  key("ArrowUp");
  tick(450 * 4);
  await act(async () => {});
  expect(data.onResponse).toHaveBeenCalledExactlyOnceWith(-1);
  view.rerender(<SnakeGeneric moduleId="" soundOn={false} onAnswer={legacy} exercise={{ ...data, solved: true }} />);
  expect(screen.getByText("¡Lograste la meta!")).toBeInTheDocument();
  expect(legacy).not.toHaveBeenCalled();
  expect(screen.queryByText(/Estrellas/)).not.toBeInTheDocument();
});

test("Serpiente: en pausa no se mueve ni responde", () => {
  vi.useFakeTimers();
  const data = exercise();
  const view = render(<SnakeGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  view.rerender(<SnakeGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={{ ...data, paused: true }} />);
  key("ArrowUp");
  tick(10_000);
  expect(screen.queryByText(REFLEX_MISS)).not.toBeInTheDocument();
  expect(data.onResponse).not.toHaveBeenCalled();
});

test("Carrera: se empieza fuera de los carriles; sin elegir no cuenta y la primera flecha elige el primero", async () => {
  vi.useFakeTimers();
  const data = exercise();
  render(<RunnerGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  expect(screen.getByText("Elige un carril con las flechas")).toBeInTheDocument();
  tick(2600);
  expect(screen.getByText(REFLEX_MISS)).toBeInTheDocument();
  expect(data.onResponse).not.toHaveBeenCalled();
  key("ArrowDown"); // fuera → carril 0
  key("ArrowDown");
  key("ArrowDown"); // carril 2, donde está -2
  tick(2600);
  await act(async () => {});
  expect(data.onResponse).toHaveBeenCalledExactlyOnceWith(-2);
});

test("Laberinto: comer un número envía su valor", async () => {
  vi.useFakeTimers();
  const data = exercise();
  render(<NumberPacGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  tick(3_000); // sin flecha no avanza: nada se come solo
  expect(data.onResponse).not.toHaveBeenCalled();
  expect(screen.getByText(AWAITING_INPUT)).toBeInTheDocument();
  key("ArrowRight");
  tick(400); // de (0,0) a (1,0), donde está -4
  await act(async () => {});
  expect(data.onResponse).toHaveBeenCalledExactlyOnceWith(-4);
  expect(screen.queryByText(/Vidas/)).not.toBeInTheDocument();
});

test("Invasión: aterrizar no cuenta; disparar envía la columna apuntada", async () => {
  vi.useFakeTimers();
  const data = exercise();
  render(<InvadersGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  tick(900 * 5);
  expect(screen.getByText(REFLEX_MISS)).toBeInTheDocument();
  expect(data.onResponse).not.toHaveBeenCalled();
  key("Space"); // columna central: -2
  await act(async () => {});
  expect(data.onResponse).toHaveBeenCalledExactlyOnceWith(-2);
});

test("Bloques en la clase: la pelota espera sobre la paleta y nada se responde solo", () => {
  vi.useFakeTimers();
  const data = exercise();
  render(<BreakoutGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  tick(5_000);
  expect(data.onResponse).not.toHaveBeenCalled();
  expect(screen.queryByText(REFLEX_MISS)).not.toBeInTheDocument();
  expect(screen.queryByText(/Vidas/)).not.toBeInTheDocument();
});

test.each([
  ["Serpiente", SnakeGeneric], ["Carrera", RunnerGeneric], ["Laberinto", NumberPacGeneric],
  ["Invasión", InvadersGeneric], ["Bloques", BreakoutGeneric],
  ["Topos", TopoGeneric], ["Cajas", CajasGeneric],
] as const)("%s en modo clase no tiene problemas de accesibilidad", async (_name, Game) => {
  const { container } = render(<Game moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={exercise()} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  expect(await axe(container)).toHaveNoViolations();
});

test("Bloques en la clase: el lanzamiento apuntado envía el bloque elegido, correcto o no", async () => {
  vi.useFakeTimers();
  const data = exercise({ onResponse: vi.fn(async () => false) });
  render(<BreakoutGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  // Cinco bloques en una fila: la paleta empieza bajo el central (−2).
  key("ArrowLeft"); // bajo −3
  fireEvent.click(screen.getByRole("button", { name: "Lanzar la pelota" }));
  tick(2_000);
  await act(async () => {});
  expect(data.onResponse).toHaveBeenCalledExactlyOnceWith(-3);
  // La pelota vuelve a la paleta: se puede apuntar de nuevo.
  key("ArrowRight");
  key("ArrowUp");
  tick(2_000);
  await act(async () => {});
  expect(data.onResponse).toHaveBeenLastCalledWith(-2);
});

test("Topos: que un topo se esconda no cuenta; tocarlo envía su valor", async () => {
  vi.useFakeTimers();
  const data = exercise();
  render(<TopoGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  tick(100);
  expect(screen.getByRole("button", { name: "Topo con -4" })).toBeInTheDocument();
  tick(3_000); // se esconde sin que nadie lo toque
  expect(data.onResponse).not.toHaveBeenCalled();
  expect(screen.queryByText(/Vidas/)).not.toBeInTheDocument();
  for (let i = 0; i < 100 && !screen.queryByRole("button", { name: "Topo con -2" }); i++) tick(100);
  fireEvent.click(screen.getByRole("button", { name: "Topo con -2" }));
  await act(async () => {});
  expect(data.onResponse).toHaveBeenCalledExactlyOnceWith(-2);
  // Un agujero vacío no responde nada.
  fireEvent.click(screen.getAllByRole("button", { name: "Agujero vacío" })[0]);
  expect(data.onResponse).toHaveBeenCalledTimes(1);
});

test("Topos: en pausa no salen topos ni se puede responder", () => {
  vi.useFakeTimers();
  const data = exercise();
  const view = render(<TopoGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  view.rerender(<TopoGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={{ ...data, paused: true }} />);
  tick(3_000);
  expect(screen.queryByRole("button", { name: /Topo con/ })).not.toBeInTheDocument();
});

test("Cajas: nada se mueve solo; la caja que llega al camión envía su valor", async () => {
  vi.useFakeTimers();
  const data = exercise();
  const legacy = vi.fn();
  const view = render(<CajasGeneric moduleId="" soundOn={false} onAnswer={legacy} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  act(() => vi.advanceTimersByTime(60_000));
  expect(data.onResponse).not.toHaveBeenCalled();
  key("ArrowUp"); // (2,5) → (2,4)
  key("ArrowUp"); // empuja -2 a la fila 2
  key("ArrowUp"); // fila 1
  expect(data.onResponse).not.toHaveBeenCalled();
  key("ArrowUp"); // fila 0: el camión
  await act(async () => {});
  expect(data.onResponse).toHaveBeenCalledExactlyOnceWith(-2);
  view.rerender(<CajasGeneric moduleId="" soundOn={false} onAnswer={legacy} exercise={{ ...data, solved: true }} />);
  expect(screen.getByText("¡Caja entregada!")).toBeInTheDocument();
  expect(legacy).not.toHaveBeenCalled();
});

test("Cajas: una caja no empuja a otra y reiniciar las devuelve a su sitio", async () => {
  const data = exercise();
  const { container } = render(<CajasGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  const row = (y: number) => [...container.querySelectorAll("div.grid > div")].slice(y * 5, y * 5 + 5).map((c) => c.textContent);
  key("ArrowUp");
  key("ArrowUp"); // -2 sube a la fila 2; el jugador queda en (2,3)
  key("ArrowLeft"); // -3 no puede empujar a -4
  expect(row(3)).toEqual(["-4", "-3", "🧑", "-1", "0"]);
  fireEvent.click(screen.getByRole("button", { name: "Reiniciar cajas" }));
  expect(row(3)).toEqual(["-4", "-3", "-2", "-1", "0"]);
  expect(row(5)[2]).toBe("🧑");
  expect(data.onResponse).not.toHaveBeenCalled();
});
