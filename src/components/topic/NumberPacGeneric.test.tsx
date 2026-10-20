import { afterEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { NumberPacGeneric } from "./NumberPacGeneric";
import type { LessonExercise } from "@/lib/minigames/lessonExercise";
import * as problemModule from "@/lib/problem";

/**
 * Fase 39 (docs/plan-minijuegos-retro.md). `shuffle` se mockea como
 * identidad y `choiceSet` se controla por test — misma técnica que
 * `SnakeGeneric.test.tsx` — así `pickFreeCells` (recorre la grilla fila por
 * fila) coloca los pellets de forma determinística: la celda libre
 * inmediatamente adyacente al jugador siempre es una de las elegidas.
 *
 */
vi.mock("@/lib/gameSound", () => ({ playSound: () => {} }));
vi.mock("@/lib/confetti", () => ({ triggerConfetti: () => {} }));
vi.mock("@/lib/curriculum", () => ({
  getModule: () => ({
    id: "test-module",
    strandSlug: "aritmetica",
    difficulty: 1,
    label: "Prueba",
    emoji: "🔢",
    tier: 1,
    prerequisites: [],
    generateProblem: () => ({ id: "p", difficulty: 1, kind: "test", prompt: "6 - 1", answer: 5, inputType: "integer" }),
    ConceptComponent: () => null,
  }),
}));
vi.mock("@/lib/problem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/problem")>();
  return { ...actual, shuffle: (arr: unknown[]) => arr, choiceSet: vi.fn() };
});

async function fireKey(code: string) {
  await act(async () => { window.dispatchEvent(new KeyboardEvent("keydown", { code })); });
}

/** Espera al fantasma con pasos cortos y se detiene en el primer evento. */
async function advanceUntil(predicate: () => boolean, maxMs = 15000, stepMs = 100) {
  for (let elapsed = 0; elapsed < maxMs; elapsed += stepMs) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(stepMs);
    });
    if (predicate()) return;
  }
}

/** Todas las celdas candidatas valen la respuesta correcta. */
function mockAllCorrect() {
  vi.mocked(problemModule.choiceSet).mockImplementation((answer: number, _spread: number, count = 3) =>
    Array.from({ length: count }, () => answer),
  );
}

/** Ninguna celda candidata vale la respuesta correcta. */
function mockAllWrong() {
  vi.mocked(problemModule.choiceSet).mockImplementation((answer: number, _spread: number, count = 3) =>
    Array.from({ length: count }, (_, i) => answer + 100 + i),
  );
}

describe("NumberPacGeneric", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test("pantalla inicial: empezar muestra el laberinto y el primer problema", () => {
    mockAllCorrect();
    render(<NumberPacGeneric moduleId="test-module" soundOn={false} onAnswer={vi.fn(async () => 0)} />);
    fireEvent.click(screen.getByText("¡Empezar!"));
    expect(screen.getByText("6 - 1")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  test("comer un pellet incorrecto cuesta una vida sin terminar la partida", async () => {
    vi.useFakeTimers();
    mockAllWrong();
    const onAnswer = vi.fn(async () => 0);
    const onWin = vi.fn();
    const { container } = render(<NumberPacGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} onWin={onWin} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    await fireKey("ArrowRight"); // la celda (1,0), adyacente al jugador, siempre es un pellet
    await advanceUntil(() => onAnswer.mock.calls.length >= 1);

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(false);
    expect(onWin).not.toHaveBeenCalled();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    // Perdió exactamente una vida (se cortó apenas se registró el fallo), no las 3.
    expect(container.textContent).toContain("Vidas: 2");
  });

  test("chocar contra el fantasma cuesta una vida sin terminar la partida", async () => {
    vi.useFakeTimers();
    mockAllCorrect();
    const onAnswer = vi.fn(async () => 0);
    const onWin = vi.fn();
    const { container } = render(<NumberPacGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} onWin={onWin} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    // Baja por la columna libre, sin recoger números, y espera a la patrulla.
    for (let i = 0; i < 4; i++) await fireKey("ArrowDown");
    await advanceUntil(() => !container.textContent?.includes("Vidas: 3"));

    expect(onWin).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Vidas: 2");
  });

  test("agotar las vidas termina la partida sin ganar", async () => {
    vi.useFakeTimers();
    mockAllWrong();
    const onAnswer = vi.fn(async () => 0);
    const onWin = vi.fn();
    const onGameOver = vi.fn();
    render(<NumberPacGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} onWin={onWin} onGameOver={onGameOver} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    for (let i = 0; i < 3; i++) await fireKey("ArrowRight");

    expect(screen.getByText("¡Buen intento!")).toBeInTheDocument();
    expect(onWin).not.toHaveBeenCalled();
    expect(onGameOver).toHaveBeenCalledWith(0);
  });

  test("acertar todos los pellets llama a onWin y onGameOver con los aciertos", async () => {
    vi.useFakeTimers();
    mockAllCorrect();
    const onAnswer = vi.fn(async (correct: boolean) => (correct ? 5 : 0));
    const onWin = vi.fn();
    const onGameOver = vi.fn();
    render(<NumberPacGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} onWin={onWin} onGameOver={onGameOver} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    for (let i = 0; i < 3; i++) await fireKey("ArrowRight");

    expect(onWin).toHaveBeenCalledTimes(1);
    expect(onGameOver).toHaveBeenCalledWith(3);
    expect(onAnswer.mock.calls.every(([correct]) => correct === true)).toBe(true);
    expect(screen.getByText("¡Laberinto resuelto!")).toBeInTheDocument();
  });
  test("una flecha mueve exactamente un casillero y el personaje no avanza solo", async () => {
    vi.useFakeTimers();
    mockAllCorrect();
    const { container } = render(<NumberPacGeneric moduleId="test-module" soundOn={false} onAnswer={vi.fn(async () => 0)} />);
    fireEvent.click(screen.getByText("¡Empezar!"));
    const board = container.querySelector("[data-numberpac-board]")!;
    await fireKey("ArrowDown");
    expect(board).toHaveAttribute("data-player-y", "1");
    await advanceUntil(() => false, 1000, 100);
    expect(board).toHaveAttribute("data-player-y", "1");
    await fireKey("ArrowDown");
    expect(board).toHaveAttribute("data-player-y", "2");
  });

  test("el fantasma espera un paso válido y después patrulla otras filas", async () => {
    vi.useFakeTimers();
    mockAllCorrect();
    const { container } = render(<NumberPacGeneric moduleId="test-module" soundOn={false} onAnswer={vi.fn(async () => 0)} />);
    fireEvent.click(screen.getByText("¡Empezar!"));
    const board = container.querySelector("[data-numberpac-board]")!;
    await advanceUntil(() => false, 3000, 100);
    expect(board).toHaveAttribute("data-ghost-x", "4");
    expect(board).toHaveAttribute("data-ghost-y", "4");
    await fireKey("ArrowLeft"); // la pared no es un primer paso
    await advanceUntil(() => false, 1000, 100);
    expect(board).toHaveAttribute("data-ghost-x", "4");
    await fireKey("ArrowDown");
    await advanceUntil(() => board.getAttribute("data-ghost-y") !== "4");
    expect(board).toHaveAttribute("data-ghost-y", "3");
    expect(board).toHaveAttribute("data-ghost-x", "0");
  });

  test("pisar un número envía ese valor una sola vez, también con varios toques rápidos", async () => {
    vi.useFakeTimers();
    const onResponse = vi.fn(() => new Promise<boolean>(() => {}));
    const exercise: LessonExercise = {
      problem: { id: "q", kind: "lesson-practice", prompt: "De −5 a 3, ¿cuánto subió?", answer: 8, difficulty: 1, inputType: "integer", choices: [8, 7, 9, 10, 2] },
      onResponse, solved: false, paused: false, disabled: false, timed: false, input: null,
    };
    const { container } = render(<NumberPacGeneric moduleId="test-module" soundOn={false} onAnswer={vi.fn(async () => 0)} exercise={exercise} />);
    fireEvent.click(screen.getByText("¡Empezar!"));
    const tile = container.querySelector('[data-cell-x="1"][data-cell-y="0"]')!;
    expect(tile).toHaveTextContent("8");
    await fireKey("ArrowRight");
    await fireKey("ArrowRight");
    expect(onResponse).toHaveBeenCalledExactlyOnceWith(8);
    const board = container.querySelector("[data-numberpac-board]")!;
    expect(board).toHaveAttribute("data-player-x", "1");
    expect(tile).toHaveTextContent("🟡");
    await advanceUntil(() => false, 2000, 100);
    expect(onResponse).toHaveBeenCalledTimes(1);
  });

  test("mantener un botón táctil no duplica el paso ni la respuesta", async () => {
    vi.useFakeTimers();
    mockAllCorrect();
    const onAnswer = vi.fn(async () => 0);
    const { container } = render(<NumberPacGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText("¡Empezar!"));
    const right = screen.getByRole("button", { name: "Mover a la derecha" });
    await act(async () => { fireEvent.pointerDown(right); });
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith(true);
    await advanceUntil(() => false, 1000, 100);
    fireEvent.pointerUp(right);
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(container.querySelector("[data-numberpac-board]")).toHaveAttribute("data-player-x", "1");
  });

});
