import { afterEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { BreakoutGeneric } from "./BreakoutGeneric";
import * as problemModule from "@/lib/problem";

/**
 * Fase 41 (docs/plan-minijuegos-retro.md). La física de colisión en sí
 * (rebotes, solapamiento) ya está probada por separado y sin timers en
 * `breakoutPhysics.test.ts` — acá solo se prueba el cableado del juego
 * (vidas, puntaje, victoria/derrota), con timers falsos y `advanceUntil`
 * (mismo patrón que `NumberPacGeneric.test.tsx`): con física continua real,
 * no es viable calcular a mano cuántos ticks hacen falta para que la
 * pelota recorra una distancia — se corta apenas ocurre el evento que el
 * test espera.
 *
 * La pelota y la paleta arrancan alineadas en la misma columna con
 * velocidad horizontal cero (`vx=0`, nunca cambia): sin mover la paleta,
 * la pelota rebota en línea recta entre la paleta y el bloque de esa
 * columna, indefinidamente — determinístico, sin depender de puntería.
 * Mover la paleta (flechas) la saca de esa columna a propósito para el
 * test de "la pelota cae".
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
    generateProblem: () => ({ id: "p", difficulty: 1, kind: "test", prompt: "3 + 3", answer: 6, inputType: "integer" }),
    ConceptComponent: () => null,
  }),
}));
vi.mock("@/lib/problem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/problem")>();
  return { ...actual, choiceSet: vi.fn() };
});

async function fireKey(code: string) {
  await act(async () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code }));
  });
}

/** Avanza en pasos chicos y corta apenas `predicate()` da `true` — con
 *  física continua no es viable calcular a mano cuánto tiempo hace falta
 *  para que la pelota recorra una distancia. */
async function advanceUntil(predicate: () => boolean, maxMs = 25000, stepMs = 200) {
  for (let elapsed = 0; elapsed < maxMs; elapsed += stepMs) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(stepMs);
    });
    if (predicate()) return;
  }
}

/** Los 8 bloques valen la respuesta correcta. */
function mockAllCorrect() {
  vi.mocked(problemModule.choiceSet).mockImplementation((answer: number, _spread: number, count = 3) =>
    Array.from({ length: count }, () => answer),
  );
}

/** Ningún bloque vale la respuesta correcta. */
function mockAllWrong() {
  vi.mocked(problemModule.choiceSet).mockImplementation((answer: number, _spread: number, count = 3) =>
    Array.from({ length: count }, (_, i) => answer + 100 + i),
  );
}

describe("BreakoutGeneric", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test("pantalla inicial: empezar muestra la grilla y el primer problema", () => {
    mockAllCorrect();
    render(<BreakoutGeneric moduleId="test-module" soundOn={false} onAnswer={vi.fn(async () => 0)} />);
    fireEvent.click(screen.getByText("¡Empezar!"));
    expect(screen.getByText("3 + 3")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  test("romper el bloque correcto avanza de ronda sin perder vidas", async () => {
    vi.useFakeTimers();
    mockAllCorrect();
    const onAnswer = vi.fn(async () => 5);
    const { container } = render(<BreakoutGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    await advanceUntil(() => onAnswer.mock.calls.length >= 1);

    expect(onAnswer).toHaveBeenCalledWith(true);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    expect(container.textContent).toContain("Vidas: 3");
  });

  test("romper un bloque incorrecto no cuesta una vida ni termina la partida", async () => {
    vi.useFakeTimers();
    mockAllWrong();
    const onAnswer = vi.fn(async () => 0);
    const onWin = vi.fn();
    const { container } = render(<BreakoutGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} onWin={onWin} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    await advanceUntil(() => onAnswer.mock.calls.length >= 1);

    expect(onAnswer).toHaveBeenCalledWith(false);
    expect(onWin).not.toHaveBeenCalled();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    // Fidelidad del género: el bloque desaparece, pero sin penalización.
    expect(container.textContent).toContain("Vidas: 3");
  });

  test("dejar caer la pelota detrás de la paleta cuesta una vida sin terminar la partida", async () => {
    vi.useFakeTimers();
    mockAllWrong();
    const onWin = vi.fn();
    const { container } = render(<BreakoutGeneric moduleId="test-module" soundOn={false} onAnswer={vi.fn(async () => 0)} onWin={onWin} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    // Saca la paleta de la columna donde arranca la pelota (vx=0: nunca
    // cambia de columna) antes de que la pelota complete su primer rebote
    // de vuelta hacia abajo.
    for (let i = 0; i < 5; i++) await fireKey("ArrowRight");

    await advanceUntil(() => !container.textContent?.includes("Vidas: 3"));

    expect(onWin).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Vidas: 2");
  });

  test("agotar las vidas termina la partida sin ganar", async () => {
    vi.useFakeTimers();
    mockAllWrong();
    const onWin = vi.fn();
    const onGameOver = vi.fn();
    render(<BreakoutGeneric moduleId="test-module" soundOn={false} onAnswer={vi.fn(async () => 0)} onWin={onWin} onGameOver={onGameOver} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    for (let i = 0; i < 5; i++) await fireKey("ArrowRight"); // paleta lejos de la columna de la pelota

    await advanceUntil(() => onGameOver.mock.calls.length > 0);

    expect(screen.getByText("¡Buen intento!")).toBeInTheDocument();
    expect(onWin).not.toHaveBeenCalled();
    expect(onGameOver).toHaveBeenCalledWith(0);
  });

  test("romper 3 bloques correctos llama a onWin y onGameOver con los aciertos", async () => {
    vi.useFakeTimers();
    mockAllCorrect();
    const onAnswer = vi.fn(async (correct: boolean) => (correct ? 5 : 0));
    const onWin = vi.fn();
    const onGameOver = vi.fn();
    render(<BreakoutGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} onWin={onWin} onGameOver={onGameOver} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    // Sin mover la paleta: la pelota rebota sola entre la paleta y el bloque
    // de su columna, siempre correcto bajo este mock, indefinidamente.
    await advanceUntil(() => onWin.mock.calls.length > 0);

    expect(onWin).toHaveBeenCalledTimes(1);
    expect(onGameOver).toHaveBeenCalledWith(3);
    expect(onAnswer.mock.calls.every(([correct]) => correct === true)).toBe(true);
    expect(screen.getByText("¡Muro derribado!")).toBeInTheDocument();
  });
});
