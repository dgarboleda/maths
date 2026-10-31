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
import { mazeNeighbors, mazeKey, type MazeCell } from "@/lib/minigames/maze";

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

test.each([FroggerGeneric, CoheteGeneric, SnakeGeneric, RunnerGeneric, NumberPacGeneric, InvadersGeneric, BreakoutGeneric, TopoGeneric, CajasGeneric])("los controles de la clase aparecen dentro del tablero", (Game) => {
  const { container } = render(<Game moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={exercise({ controls: <button>Control de prueba</button> })} />);
  expect(container.querySelector("[data-game]")).toContainElement(screen.getByRole("button", { name: "Control de prueba" }));
});

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

test("Estanque: una práctica de varias preguntas mantiene dos saltos visibles por ronda", async () => {
  vi.useFakeTimers();
  const data = exercise({ rounds: 5 });
  render(<FroggerGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  key("ArrowUp");
  tick(250);
  key("ArrowUp");
  await act(async () => {});
  expect(data.onResponse).toHaveBeenCalledExactlyOnceWith(-2);
});

test("Estanque: los nenúfares rotan en la orilla y se congelan al pausar", () => {
  vi.useFakeTimers();
  const data = exercise({ round: 1, rounds: 5 });
  const view = render(<FroggerGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  const values = () => [...view.container.querySelectorAll("[data-lily]")].map((node) => node.textContent);
  const before = values();
  key("ArrowRight");
  tick(4_200);
  const after = values();
  expect(after).not.toEqual(before);
  expect(after).toEqual([...before.slice(1), before[0]]);
  view.rerender(<FroggerGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={{ ...data, paused: true }} />);
  tick(5_000);
  expect(values()).toEqual(after);
  expect(data.onResponse).not.toHaveBeenCalled();
});

test("Estanque: empezar reanuda una partida pausada sin enviar respuestas", () => {
  const onResume = vi.fn(() => true);
  const data = exercise({ paused: true, onResume });
  const view = render(<FroggerGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  expect(onResume).toHaveBeenCalledOnce();
  expect(data.onResponse).not.toHaveBeenCalled();
  expect(view.container.querySelector("[data-board]")).toBeInTheDocument();
});

test("Estanque: empezar no reanuda mientras se guarda", () => {
  const onResume = vi.fn(() => true);
  const data = exercise({ paused: true, disabled: true, onResume });
  render(<FroggerGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  expect(screen.getByRole("button", { name: "¡Empezar!" })).toBeDisabled();
  expect(onResume).not.toHaveBeenCalled();
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

test("Cohete: la maniobra orbital da puntos sin registrar respuestas de matemáticas", () => {
  vi.useFakeTimers();
  const data = exercise();
  render(<CoheteGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Iniciar misión!" }));
  fireEvent.click(screen.getByRole("button", { name: "Iniciar maniobra" }));
  fireEvent.click(screen.getByRole("button", { name: "Ruta 1" }));
  tick(2_200);
  expect(data.onResponse).not.toHaveBeenCalled();
  expect(screen.getByText(/Meteorito esquivado/)).toBeInTheDocument();
  expect(screen.getByText("Respuesta de la clase")).toBeInTheDocument();
});


function key(code: string) {
  act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { code })); });
}
/** En pasos cortos, cada uno con su render: los juegos leen estado de React. */
function tick(ms: number) {
  for (let t = 0; t < ms; t += 50) act(() => { vi.advanceTimersByTime(50); });
}
// Opciones de la clase en orden: [-4, -3, -2, -1, 0]; la respuesta es -2.

test("Invasión desplaza respuestas independientes y la pausa congela su descenso", () => {
  vi.useFakeTimers();
  const data = exercise();
  const view = render(<InvadersGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  expect(screen.getAllByRole("button", { name: /Apuntar a/ })).toHaveLength(1);
  const first = screen.getByRole("button", { name: "Apuntar a −4" });
  const initialY = Number(first.getAttribute("data-invader-y"));
  tick(800);
  expect(screen.getAllByRole("button", { name: /Apuntar a/ })).toHaveLength(2);
  const movingY = Number(first.getAttribute("data-invader-y"));
  expect(movingY).toBeGreaterThan(initialY);
  view.rerender(<InvadersGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={{ ...data, paused: true }} />);
  tick(4_000);
  expect(screen.getAllByRole("button", { name: /Apuntar a/ })).toHaveLength(2);
  expect(Number(first.getAttribute("data-invader-y"))).toBe(movingY);
  view.rerender(<InvadersGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  tick(2_500);
  expect(screen.getAllByRole("button", { name: /Apuntar a/ })).toHaveLength(5);
  expect(data.onResponse).not.toHaveBeenCalled();
});

test("Invasión: solo los errores matemáticos guardados reducen el escudo", () => {
  const data = exercise();
  const view = render(<InvadersGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  expect(screen.getByText("Escudo: 3/3")).toBeInTheDocument();
  view.rerender(<InvadersGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={{ ...data, failedAttempts: 1 }} />);
  expect(screen.getByText("Escudo: 2/3")).toBeInTheDocument();
  view.rerender(<InvadersGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={{ ...data, failedAttempts: 3 }} />);
  expect(screen.getByText("Escudo: 3/3 · velocidad reducida")).toBeInTheDocument();
  expect(data.onResponse).not.toHaveBeenCalled();
});

test("Invasión: esquivar una respuesta da puntos sin registrar una elección", () => {
  vi.useFakeTimers();
  const data = exercise();
  const { container } = render(<InvadersGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  tick(7_500); // la primera nave cruza por la columna 0; la nave está en la 2
  expect(screen.getByText("Escudo: 3/3")).toBeInTheDocument();
  expect(Number(container.querySelector("[data-arcade-score]")?.getAttribute("data-arcade-score"))).toBeGreaterThanOrEqual(15);
  expect(data.onResponse).not.toHaveBeenCalled();
});

test("Invasión permite leer la siguiente pregunta antes de iniciar", () => {
  const data = exercise({ round: 1, paused: true });
  const view = render(<InvadersGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  expect(screen.getByRole("button", { name: "¡Empezar!" })).toBeDisabled();
  view.rerender(<InvadersGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={{ ...data, paused: false }} />);
  expect(screen.getByRole("button", { name: "¡Empezar!" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  expect(screen.getByText(data.problem.prompt)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "¡Empezar!" })).not.toBeInTheDocument();
  expect(data.onResponse).not.toHaveBeenCalled();
});

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

test("Serpiente: cada acierto anterior aumenta su longitud sin ocupar una respuesta", () => {
  const data = exercise({ round: 2, rounds: 5 });
  const { container } = render(<SnakeGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  expect(container.querySelector("[data-snake-board]")).toHaveAttribute("data-length", "5");
  expect(data.onResponse).not.toHaveBeenCalled();
});

test("Carrera: leer no activa el reloj; la primera flecha da la salida y el turbo acorta la espera", async () => {
  vi.useFakeTimers();
  const data = exercise();
  render(<RunnerGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  expect(screen.getByText("Elige tu carril")).toBeInTheDocument();
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

test("Carrera: chocar con un obstáculo reinicia el tramo sin enviar respuesta", () => {
  vi.useFakeTimers();
  const data = exercise({ round: 1, rounds: 5 });
  render(<RunnerGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  expect(screen.getByRole("button", { name: /Carril 2:.*obstáculo antes de la puerta/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Carril 2:/ }));
  tick(1_200);
  expect(data.onResponse).not.toHaveBeenCalled();
  expect(screen.getByText(REFLEX_MISS)).toBeInTheDocument();
  expect(screen.getByText("Elige tu carril")).toBeInTheDocument();
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

test("Invasión: recibir un impacto no responde; disparar envía la columna apuntada", async () => {
  vi.useFakeTimers();
  const data = exercise();
  render(<InvadersGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  tick(9_000);
  expect(screen.getByText(REFLEX_MISS)).toBeInTheDocument();
  expect(screen.getByText("Escudo: 2/3")).toBeInTheDocument();
  expect(data.onResponse).not.toHaveBeenCalled();
  tick(2_000); // la alternativa vuelve a aparecer desde arriba
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

test("Bloques: las rondas posteriores alternan alturas sin ocultar alternativas", () => {
  const data = exercise({ round: 1, rounds: 5 });
  render(<BreakoutGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  const blocks = screen.getAllByRole("button", { name: /Apuntar al bloque/ });
  expect(blocks).toHaveLength(5);
  expect(new Set(blocks.map((block) => block.style.top)).size).toBe(2);
  expect(data.onResponse).not.toHaveBeenCalled();
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
  const { container } = render(<BreakoutGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  expect(container.querySelectorAll("[data-barrier]")).toHaveLength(5);
  // Cinco bloques en una fila: la paleta empieza bajo el central (−2).
  key("ArrowLeft"); // bajo −3
  fireEvent.click(screen.getByRole("button", { name: "Lanzar la pelota" }));
  tick(2_000);
  await act(async () => {});
  expect(data.onResponse).not.toHaveBeenCalled();
  expect(container.querySelectorAll("[data-barrier]")).toHaveLength(4);
  fireEvent.click(screen.getByRole("button", { name: "Lanzar la pelota" }));
  tick(2_000);
  await act(async () => {});
  expect(data.onResponse).toHaveBeenCalledExactlyOnceWith(-3);
  // La pelota vuelve a la paleta: se puede apuntar de nuevo.
  key("ArrowRight");
  key("ArrowUp");
  tick(2_000);
  await act(async () => {});
  expect(data.onResponse).toHaveBeenCalledTimes(1);
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
  tick(2_000); // primero se rompe la barrera, sin enviar respuesta
  expect(data.onResponse).not.toHaveBeenCalled();
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
  tick(3_000);
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
  expect(board).toHaveAttribute("data-obstacle-next", "2");
  expect(board).toHaveAttribute("data-frog-lane", "orilla");
  expect(data.onResponse).not.toHaveBeenCalled();
});

test("Topos: que un topo se esconda no cuenta; tocarlo envía su valor", async () => {
  vi.useFakeTimers();
  const data = exercise();
  render(<TopoGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  tick(100);
  expect(screen.getByRole("button", { name: "Topo con −4" })).toBeInTheDocument();
  tick(3_000); // se esconde sin que nadie lo toque
  expect(data.onResponse).not.toHaveBeenCalled();
  expect(screen.queryByText(/Vidas/)).not.toBeInTheDocument();
  for (let i = 0; i < 100 && !screen.queryByRole("button", { name: "Topo con −2" }); i++) tick(100);
  fireEvent.click(screen.getByRole("button", { name: "Topo con −2" }));
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

test("Serpiente: varios giros antes de avanzar no provocan una vuelta contra el cuerpo", () => {
  vi.useFakeTimers();
  const data = exercise();
  const view = render(<SnakeGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  const board = view.container.querySelector("[data-snake-board]")!;
  key("ArrowUp"); key("ArrowLeft");
  tick(500);
  expect(board).toHaveAttribute("data-head-x", "3");
  expect(board).toHaveAttribute("data-head-y", "3");
  key("ArrowLeft");
  tick(450);
  expect(board).toHaveAttribute("data-head-x", "2");
  expect(board).toHaveAttribute("data-head-y", "3");
  expect(data.onResponse).not.toHaveBeenCalled();
  expect(screen.queryByText(REFLEX_MISS)).not.toBeInTheDocument();
});

test("Invasión: tocar un blanco solo apunta y el disparo conserva su valor hasta guardarse", async () => {
  vi.useFakeTimers();
  let finish!: (saved: boolean) => void;
  const data = exercise({ onResponse: vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve; })) });
  render(<InvadersGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  expect(screen.queryByRole("button", { name: "Apuntar a 0" })).not.toBeInTheDocument();
  tick(3_000);
  const target = screen.getByRole("button", { name: "Apuntar a −4" });
  fireEvent.click(target);
  tick(200);
  expect(target).toHaveAttribute("aria-pressed", "true");
  expect(data.onResponse).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Disparar (espacio)" }));
  fireEvent.click(screen.getByRole("button", { name: "Apuntar a 0" }));
  tick(500);
  expect(data.onResponse).toHaveBeenCalledExactlyOnceWith(-4);
  expect(target).toBeDisabled();
  key("Space"); tick(2_000);
  expect(data.onResponse).toHaveBeenCalledTimes(1);
  await act(async () => { finish(false); });
  expect(target).toBeEnabled();
});

test("Carrera: tocar carriles permite cambiar de elección antes de cruzar", async () => {
  vi.useFakeTimers();
  const data = exercise();
  render(<RunnerGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  fireEvent.click(screen.getByRole("button", { name: "Carril 4: −1" }));
  tick(500);
  expect(data.onResponse).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Carril 3: −2" }));
  fireEvent.click(screen.getByRole("button", { name: /Turbo · cruzar/ }));
  tick(750);
  await act(async () => {});
  expect(data.onResponse).toHaveBeenCalledExactlyOnceWith(-2);
});

test("Bloques: tocar un bloque no lanza; el rebote entrega la elección fijada", async () => {
  vi.useFakeTimers();
  const data = exercise();
  render(<BreakoutGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  const target = screen.getByRole("button", { name: "Apuntar al bloque −4" });
  fireEvent.click(target);
  fireEvent.click(screen.getByRole("button", { name: "Rebote ←" }));
  tick(2_000);
  expect(target).toHaveAttribute("aria-pressed", "true");
  expect(data.onResponse).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Lanzar la pelota" }));
  expect(target).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Apuntar al bloque 0" }));
  tick(2_000);
  await act(async () => {});
  expect(data.onResponse).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Lanzar la pelota" }));
  tick(2_000);
  await act(async () => {});
  expect(data.onResponse).toHaveBeenCalledExactlyOnceWith(-4);
});

test("Topos sin prisas: no caducan, las tandas cubren las opciones y pausarlas no responde", async () => {
  vi.useFakeTimers();
  const data = exercise();
  const view = render(<TopoGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  fireEvent.click(screen.getByRole("button", { name: "Sin prisas" }));
  const first = screen.getAllByRole("button", { name: /Topo con/ }).map((button) => button.getAttribute("aria-label"));
  act(() => { vi.advanceTimersByTime(60_000); });
  expect(screen.getAllByRole("button", { name: /Topo con/ }).map((button) => button.getAttribute("aria-label"))).toEqual(first);
  view.rerender(<TopoGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={{ ...data, paused: true }} />);
  expect(screen.getByRole("button", { name: "Siguiente tanda" })).toBeDisabled();
  expect(data.onResponse).not.toHaveBeenCalled();
  view.rerender(<TopoGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "Siguiente tanda" }));
  const target = screen.getByRole("button", { name: "Topo con −2" });
  expect(data.onResponse).not.toHaveBeenCalled();
  fireEvent.click(target);
  await act(async () => {});
  expect(data.onResponse).toHaveBeenCalledExactlyOnceWith(-2);
});

test("Laberinto: el escudo se puede recoger sin responder y conserva su duración en pausa", () => {
  vi.useFakeTimers();
  const data = exercise();
  const view = render(<NumberPacGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  const board = view.container.querySelector("[data-numberpac-board]")!;
  expect(board.querySelectorAll('[data-wall="true"]')).toHaveLength(4);
  const power = board.querySelector("[data-power]")!;
  const target = { x: Number(power.getAttribute("data-cell-x")), y: Number(power.getAttribute("data-cell-y")) };
  const numbers = new Set([...board.querySelectorAll("[data-value]")].map((node) => `${node.getAttribute("data-cell-x")},${node.getAttribute("data-cell-y")}`));
  numbers.add(`${board.getAttribute("data-ghost-x")},${board.getAttribute("data-ghost-y")}`);
  const seen = new Set(["0,0"]);
  const pending: { cell: MazeCell; path: MazeCell[] }[] = [{ cell: { x: 0, y: 0 }, path: [] }];
  let route: MazeCell[] | undefined;
  while (pending.length) {
    const next = pending.shift()!;
    if (mazeKey(next.cell) === mazeKey(target)) { route = next.path; break; }
    for (const cell of mazeNeighbors(next.cell)) if (!seen.has(mazeKey(cell)) && !numbers.has(mazeKey(cell))) {
      seen.add(mazeKey(cell)); pending.push({ cell, path: [...next.path, cell] });
    }
  }
  expect(route).toBeDefined();
  let position = { x: 0, y: 0 };
  for (const cell of route!) {
    key(cell.x > position.x ? "ArrowRight" : cell.x < position.x ? "ArrowLeft" : cell.y > position.y ? "ArrowDown" : "ArrowUp");
    expect(board).toHaveAttribute("data-player-x", String(cell.x));
    expect(board).toHaveAttribute("data-player-y", String(cell.y));
    position = cell;
  }
  expect(board).toHaveAttribute("data-shield", "true");
  expect(screen.getByText(/Escudo · 4s/)).toBeInTheDocument();
  expect(data.onResponse).not.toHaveBeenCalled();
  view.rerender(<NumberPacGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={{ ...data, paused: true }} />);
  tick(8_000);
  expect(screen.getByText(/Escudo · 4s/)).toBeInTheDocument();
  view.rerender(<NumberPacGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  tick(4_500);
  expect(board).toHaveAttribute("data-shield", "false");
  expect(data.onResponse).not.toHaveBeenCalled();
});

test("Laberinto: las paredes bloquean al personaje sin registrar una respuesta", () => {
  const data = exercise();
  const view = render(<NumberPacGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  const board = view.container.querySelector("[data-numberpac-board]")!;
  key("ArrowDown"); key("ArrowRight");
  expect(board).toHaveAttribute("data-player-x", "0");
  expect(board).toHaveAttribute("data-player-y", "1");
  expect(screen.getByText("Hay una pared. Busca otro camino.")).toBeInTheDocument();
  expect(data.onResponse).not.toHaveBeenCalled();
});

test("Cajas: ver zonas de atasco ayuda a planear sin cambiar la respuesta ni el tablero", () => {
  const data = exercise();
  const view = render(<CajasGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  const board = view.container.querySelector("[data-sokoban-board]")!;
  const boxes = [...board.querySelectorAll("[data-box-id]")].map((node) => node.textContent);
  fireEvent.click(screen.getByRole("button", { name: "Ver atascos" }));
  expect(board.querySelectorAll("[data-dead-square]").length).toBeGreaterThan(0);
  expect(board.querySelector('[data-goal="true"]')).not.toHaveAttribute("data-dead-square");
  expect([...board.querySelectorAll("[data-box-id]")].map((node) => node.textContent)).toEqual(boxes);
  expect(data.onResponse).not.toHaveBeenCalled();
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
