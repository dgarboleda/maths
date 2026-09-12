import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SnakeGeneric } from "./SnakeGeneric";
import * as problemModule from "@/lib/problem";

/**
 * Fase 36 (docs/plan-minijuegos-retro.md). `shuffle` se mockea como
 * identidad y `choiceSet` se controla por test: así la ubicación de cada
 * celda de la grilla (armada con `pickFreeCells`, que recorre la grilla en
 * orden fila por fila) es 100% determinística — sin esto, cada partida
 * quedaría en una grilla distinta y no se podría guiar la serpiente con una
 * secuencia de teclas fija.
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
    generateProblem: () => ({ id: "p", difficulty: 1, kind: "test", prompt: "2 + 3", answer: 5, inputType: "integer" }),
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

/** Todas las celdas candidatas valen la respuesta correcta — cualquiera que
 *  la serpiente coma cuenta como acierto. Usado para probar la ruta de
 *  "ganar" sin depender de apuntar a una celda exacta. */
function mockAllCorrect() {
  vi.mocked(problemModule.choiceSet).mockImplementation((answer: number, _spread: number, count = 3) =>
    Array.from({ length: count }, () => answer),
  );
}

/** Ninguna celda candidata vale la respuesta correcta — cualquiera que la
 *  serpiente coma cuenta como fallo. */
function mockAllWrong() {
  vi.mocked(problemModule.choiceSet).mockImplementation((answer: number, _spread: number, count = 3) =>
    Array.from({ length: count }, (_, i) => answer + 100 + i),
  );
}

describe("SnakeGeneric", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test("pantalla inicial: empezar muestra la grilla y el primer problema", async () => {
    mockAllCorrect();
    render(<SnakeGeneric moduleId="test-module" soundOn={false} onAnswer={vi.fn(async () => 0)} />);
    fireEvent.click(screen.getByText("¡Empezar!"));
    expect(screen.getByText("2 + 3")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  test("comer una celda incorrecta no termina la partida ni cuenta como acierto", async () => {
    mockAllWrong();
    const onAnswer = vi.fn(async () => 0);
    const onWin = vi.fn();
    render(<SnakeGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} onWin={onWin} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    fireKey("ArrowUp");
    // 4 ticks: la cabeza va de (3,4) a (3,0), donde siempre hay una celda
    // candidata (todas incorrectas bajo este mock).
    for (let i = 0; i < 4; i++) {
      await vi.advanceTimersByTimeAsync(500);
    }

    expect(onAnswer).toHaveBeenCalledWith(false);
    expect(onWin).not.toHaveBeenCalled();
    // La partida sigue: todavía se ve la grilla, no la pantalla de fin.
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  test("chocar contra el borde sin haber comido nada termina la partida sin ganar", async () => {
    mockAllWrong(); // la fila 4 (por donde viaja sin girar) no tiene candidatas igual
    const onAnswer = vi.fn(async () => 0);
    const onWin = vi.fn();
    const onGameOver = vi.fn();
    render(<SnakeGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} onWin={onWin} onGameOver={onGameOver} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    // Dirección inicial es hacia la derecha; sin girar, en 5 ticks choca contra el borde (x pasa de 3 a 8).
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(500);
    }

    expect(screen.getByText("¡Buen intento!")).toBeInTheDocument();
    expect(onWin).not.toHaveBeenCalled();
    expect(onGameOver).toHaveBeenCalledWith(0);
    expect(onAnswer).not.toHaveBeenCalled();
  });

  test("ganar la partida llama a onWin y onGameOver con las respuestas acertadas", async () => {
    mockAllCorrect();
    const onAnswer = vi.fn(async (correct: boolean) => (correct ? 5 : 0));
    const onWin = vi.fn();
    const onGameOver = vi.fn();
    render(<SnakeGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} onWin={onWin} onGameOver={onGameOver} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    // Sube por la columna x=3 hasta la fila 0 (1 acierto), después se mueve
    // a la derecha comiendo una celda por tick hasta llegar a x=7 (4 aciertos
    // más) — con GOAL=5, la quinta captura gana la partida. Determinístico
    // porque `pickFreeCells` recorre la grilla en orden y siempre incluye la
    // celda libre inmediatamente adyacente a la cabeza.
    fireKey("ArrowUp");
    for (let i = 0; i < 4; i++) {
      await vi.advanceTimersByTimeAsync(500);
    }
    fireKey("ArrowRight");
    for (let i = 0; i < 4; i++) {
      await vi.advanceTimersByTimeAsync(500);
    }

    expect(onWin).toHaveBeenCalledTimes(1);
    expect(onGameOver).toHaveBeenCalledWith(5);
    expect(onAnswer).toHaveBeenCalledTimes(5);
    for (const [correct] of onAnswer.mock.calls) {
      expect(correct).toBe(true);
    }
    expect(screen.getByText("¡Lograste la meta!")).toBeInTheDocument();
  });

  test("sin presionar ninguna tecla, la serpiente sigue de largo sin romper nada", async () => {
    mockAllCorrect();
    const onAnswer = vi.fn(async () => 0);
    render(<SnakeGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText("¡Empezar!"));
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(500);
  });
});
