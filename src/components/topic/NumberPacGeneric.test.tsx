import { afterEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { NumberPacGeneric } from "./NumberPacGeneric";
import * as problemModule from "@/lib/problem";

/**
 * Fase 39 (docs/plan-minijuegos-retro.md). `shuffle` se mockea como
 * identidad y `choiceSet` se controla por test — misma técnica que
 * `SnakeGeneric.test.tsx` — así `pickFreeCells` (recorre la grilla fila por
 * fila) coloca los pellets de forma determinística: la celda libre
 * inmediatamente adyacente al jugador siempre es una de las elegidas.
 *
 * El cambio de dirección acá es un `ref` (`dirRef`), no estado — igual que
 * en `SnakeGeneric` — así que, a diferencia de `FroggerGeneric`/
 * `RunnerGeneric`, un `keydown` sobre `window` NO necesita `act()`
 * asíncrono para surtir efecto en el próximo tick.
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

function fireKey(code: string) {
  window.dispatchEvent(new KeyboardEvent("keydown", { code }));
}

/** Avanza el tiempo falso en varias llamadas separadas — cada llamada a
 *  `advanceTimersByTimeAsync` dispara un solo frame de
 *  `requestAnimationFrame` bajo timers falsos (lección de Fase 37/38). */
async function advanceMs(totalMs: number, stepMs = 500) {
  for (let elapsed = 0; elapsed < totalMs; elapsed += stepMs) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(stepMs);
    });
  }
}

/**
 * Avanza en pasos chicos y corta apenas `predicate()` da `true` — evita
 * pasarse de largo cuando no se puede predecir con precisión cuántos ticks
 * (del jugador y del fantasma, que corren a ritmos distintos) caben en una
 * ventana fija: con un jugador/fantasma moviéndose de forma continua,
 * "cuánto tiempo hace falta para exactamente un evento" no es fácil de
 * acertar a mano — cortar en cuanto ocurre sí lo es.
 */
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

    fireKey("ArrowRight"); // la celda (1,0), adyacente al jugador, siempre es un pellet
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

    // El fantasma arranca en la esquina opuesta y rebota solo en su propia
    // fila (columna variable, fila fija) — bajar hasta esa fila en la misma
    // columna de partida (x=0) no cruza ningún pellet (todos aparecen en la
    // fila 0 en la primera ronda), y tarde o temprano el fantasma pasa por
    // x=0 en su rebote. Se corta apenas ocurre la primera colisión: el
    // jugador y el fantasma se mueven a ritmos distintos y no es predecible
    // a mano cuántos ticks de cada uno caben en una ventana fija.
    fireKey("ArrowDown");
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

    fireKey("ArrowRight");
    await advanceMs(10000);

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

    fireKey("ArrowRight");
    await advanceMs(10000);

    expect(onWin).toHaveBeenCalledTimes(1);
    expect(onGameOver).toHaveBeenCalledWith(3);
    expect(onAnswer.mock.calls.every(([correct]) => correct === true)).toBe(true);
    expect(screen.getByText("¡Laberinto resuelto!")).toBeInTheDocument();
  });
});
