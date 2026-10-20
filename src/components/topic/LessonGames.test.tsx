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
import { SOKOBAN_SOLUTIONS } from "@/test/sokobanSolutions";
import { warehouseFor } from "@/lib/minigames/sokoban";

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
  tick(250);
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
  tick(900);
  expect(screen.queryByText(FROGGER_MISS)).not.toBeInTheDocument();
  tick(900 * 2);
  expect(screen.getByText(FROGGER_MISS)).toBeInTheDocument();
  // La rana vuelve a la orilla, debajo del carril: no queda sobre un nenúfar.
  expect(view.container.querySelector("[data-board]")).toHaveAttribute("data-frog-lane", "orilla");
  expect(data.onResponse).not.toHaveBeenCalled();
  tick(900); // el cocodrilo deja libre la columna central
  key("ArrowUp");
  tick(250);
  key("ArrowUp");
  await act(async () => {});
  expect(data.onResponse).toHaveBeenCalledTimes(1);
  tick(250);
  key("ArrowUp");
  tick(250);
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

test("Carrera: leer no activa el reloj; la primera flecha da la salida y el turbo acorta la espera", async () => {
  vi.useFakeTimers();
  const data = exercise();
  render(<RunnerGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  expect(screen.getByText("Elige un carril con las flechas")).toBeInTheDocument();
  tick(2600);
  expect(screen.queryByText(REFLEX_MISS)).not.toBeInTheDocument();
  expect(data.onResponse).not.toHaveBeenCalled();
  key("ArrowDown"); // fuera → carril 0
  key("ArrowDown");
  key("ArrowDown"); // carril 2, donde está -2
  key("Space");
  tick(750);
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
  // El paso a (1,0), donde está -4, es inmediato.
  await act(async () => {});
  expect(data.onResponse).toHaveBeenCalledExactlyOnceWith(-4);
  expect(screen.queryByText(/Vidas/)).not.toBeInTheDocument();
});

test("Invasión: aterrizar no cuenta; disparar envía la columna apuntada", async () => {
  vi.useFakeTimers();
  const data = exercise();
  render(<InvadersGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  tick(5_000);
  expect(data.onResponse).not.toHaveBeenCalled();
  key("ArrowLeft");
  key("ArrowRight");
  tick(900 * 5);
  expect(screen.getByText(REFLEX_MISS)).toBeInTheDocument();
  expect(data.onResponse).not.toHaveBeenCalled();
  key("Space"); // columna central: -2
  expect(data.onResponse).not.toHaveBeenCalled();
  tick(400);
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

test.each([FroggerGeneric, InvadersGeneric, RunnerGeneric, BreakoutGeneric])("al empezar, el foco pasa al enunciado para leer y jugar con el teclado", (Game) => {
  const data = exercise();
  render(<Game moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  expect(screen.getByText(data.problem.prompt)).toHaveFocus();
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

test.each(["Rebote ←", "Rebote →"])("Bloques: %s conserva el destino al pausar y no permite doble lanzamiento", async (style) => {
  vi.useFakeTimers();
  const data = exercise({ onResponse: vi.fn(async () => false) });
  const view = render(<BreakoutGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  key("ArrowLeft"); // apunta a −3, una respuesta incorrecta deliberada
  fireEvent.click(screen.getByRole("button", { name: style }));
  key("Space");
  key("Space");
  tick(150);
  view.rerender(<BreakoutGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={{ ...data, paused: true }} />);
  tick(5_000);
  expect(data.onResponse).not.toHaveBeenCalled();
  view.rerender(<BreakoutGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  key("ArrowRight"); // la paleta no cambia de destino durante el vuelo
  tick(2_000);
  await act(async () => {});
  expect(data.onResponse).toHaveBeenCalledExactlyOnceWith(-3);
});

test("Invasión: la pausa congela un disparo y varias pulsaciones solo envían la columna original", async () => {
  vi.useFakeTimers();
  const data = exercise();
  const view = render(<InvadersGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  key("Space");
  key("Space");
  tick(150);
  view.rerender(<InvadersGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={{ ...data, paused: true }} />);
  key("ArrowRight");
  tick(5_000);
  expect(data.onResponse).not.toHaveBeenCalled();
  view.rerender(<InvadersGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  tick(400);
  await act(async () => {});
  expect(data.onResponse).toHaveBeenCalledExactlyOnceWith(-2);
});

test("Bloques: espacio sobre un selector de tiro permite su activación nativa sin lanzar", () => {
  vi.useFakeTimers();
  const data = exercise();
  const view = render(<BreakoutGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  const button = screen.getByRole("button", { name: "Rebote →" });
  fireEvent.keyDown(button, { key: " ", code: "Space" });
  tick(2_000);
  expect(view.container.querySelector("[data-breakout-board]")).toHaveAttribute("data-held", "true");
  expect(data.onResponse).not.toHaveBeenCalled();
  fireEvent.click(button); // Activación que el navegador produce al soltar espacio.
  expect(button).toHaveAttribute("aria-pressed", "true");
});

test("Estanque: un salto no se puede repetir durante el vuelo y el cocodrilo sigue mientras esperas en la orilla", () => {
  vi.useFakeTimers();
  const data = exercise();
  const view = render(<FroggerGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  const board = view.container.querySelector("[data-board]")!;
  key("ArrowLeft");
  key("ArrowLeft");
  expect(board).toHaveAttribute("data-frog-col", "1");
  tick(1_000);
  expect(board).toHaveAttribute("data-obstacle-col", "3");
  expect(board).toHaveAttribute("data-frog-lane", "orilla");
  expect(data.onResponse).not.toHaveBeenCalled();
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
  const route = SOKOBAN_SOLUTIONS[warehouseFor(data.problem.id).id][2];
  const codes: Record<string, string> = { U: "ArrowUp", D: "ArrowDown", L: "ArrowLeft", R: "ArrowRight" };
  for (const direction of route.slice(0, -1)) key(codes[direction]);
  expect(data.onResponse).not.toHaveBeenCalled();
  key(codes[route.at(-1)!]);
  await act(async () => {});
  expect(data.onResponse).toHaveBeenCalledExactlyOnceWith(-2);
  view.rerender(<CajasGeneric moduleId="" soundOn={false} onAnswer={legacy} exercise={{ ...data, solved: true }} />);
  expect(screen.getByText("¡Caja entregada!")).toBeInTheDocument();
  expect(legacy).not.toHaveBeenCalled();
});

test("Cajas: pausa y guardado bloquean movimientos, deshacer y reinicio", async () => {
  const data = exercise();
  let finish!: (saved: boolean) => void;
  data.onResponse = vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve; }));
  const view = render(<CajasGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  const board = view.container.querySelector("[data-sokoban-board]")!;
  const snapshot = () => ({ player: [board.getAttribute("data-player-x"), board.getAttribute("data-player-y")], boxes: [...board.querySelectorAll("[data-box-id]")].map((box) => [box.getAttribute("data-box-id"), box.getAttribute("data-x"), box.getAttribute("data-y"), box.textContent]) });
  const before = snapshot();
  view.rerender(<CajasGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={{ ...data, paused: true }} />);
  key("ArrowLeft");
  expect(snapshot()).toEqual(before);
  expect(screen.getByRole("button", { name: "Reiniciar cajas" })).toBeDisabled();
  expect(data.onResponse).not.toHaveBeenCalled();
  view.rerender(<CajasGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  const route = SOKOBAN_SOLUTIONS[warehouseFor(data.problem.id).id][0];
  const codes: Record<string, string> = { U: "ArrowUp", D: "ArrowDown", L: "ArrowLeft", R: "ArrowRight" };
  for (const direction of route) key(codes[direction]);
  expect(data.onResponse).toHaveBeenCalledExactlyOnceWith(-4);
  const delivered = snapshot();
  key("ArrowDown");
  key("KeyZ");
  fireEvent.click(screen.getByRole("button", { name: "Reiniciar cajas" }));
  expect(snapshot()).toEqual(delivered);
  expect(screen.getByRole("button", { name: "Deshacer" })).toBeDisabled();
  await act(async () => { finish(false); });
  expect(snapshot()).toEqual(before);
  expect(data.onResponse).toHaveBeenCalledTimes(1);
});
