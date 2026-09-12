import { afterEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { RunnerGeneric } from "./RunnerGeneric";
import * as problemModule from "@/lib/problem";

/**
 * Fase 38 (docs/plan-minijuegos-retro.md). `choiceSet` se controla por test
 * para que el carril correcto sea determinístico. Mismas dos lecciones de
 * `FroggerGeneric.test.tsx`: (1) un `keydown` despachado sobre `window` que
 * cambia estado de React necesita un `act()` ASÍNCRONO para que el efecto
 * sin dependencias de `useGameLoop` (sincroniza `onTickRef.current`) se
 * vacíe antes del próximo tick; (2) con timers falsos, cada llamada a
 * `vi.advanceTimersByTimeAsync` dispara un solo frame de
 * `requestAnimationFrame` — para cruzar la cuenta regresiva de una puerta
 * hacen falta varias llamadas seguidas, no un único salto grande.
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
    generateProblem: () => ({ id: "p", difficulty: 1, kind: "test", prompt: "3 + 2", answer: 5, inputType: "integer" }),
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

/** Avanza el tiempo lo suficiente para cruzar una puerta (la cuenta
 *  regresiva más larga posible es 2500ms en la oleada 0). */
async function advanceOneGate() {
  for (let i = 0; i < 8; i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
  }
}

/** Los 3 carriles valen la respuesta correcta — cualquiera cruza la puerta,
 *  sin depender de la posición del jugador. */
function mockAllCorrect() {
  vi.mocked(problemModule.choiceSet).mockImplementation((answer: number, _spread: number, count = 3) =>
    Array.from({ length: count }, () => answer),
  );
}

/** Ningún carril vale la respuesta correcta. */
function mockAllWrong() {
  vi.mocked(problemModule.choiceSet).mockImplementation((answer: number, _spread: number, count = 3) =>
    Array.from({ length: count }, (_, i) => answer + 100 + i),
  );
}

/** Solo el carril central (índice 1, donde arranca el jugador) es correcto. */
function mockCenterLaneCorrect() {
  vi.mocked(problemModule.choiceSet).mockImplementation((answer: number) => [answer + 100, answer, answer + 100]);
}

describe("RunnerGeneric", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("pantalla inicial: empezar muestra la puerta y el primer problema", () => {
    mockAllCorrect();
    render(<RunnerGeneric moduleId="test-module" soundOn={false} onAnswer={vi.fn(async () => 0)} />);
    fireEvent.click(screen.getByText("¡Empezar!"));
    expect(screen.getByText("3 + 2")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  test("cruzar en el carril correcto (el central, por defecto) avanza de ronda sin perder vidas", async () => {
    vi.useFakeTimers();
    mockCenterLaneCorrect();
    const onAnswer = vi.fn(async () => 5);
    const { container } = render(<RunnerGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    await advanceOneGate();

    // Sin `waitFor`: bajo timers falsos, su sondeo interno usa `setTimeout`
    // también falso y nunca se cumpliría solo — el estado ya está asentado
    // tras los `act()` de `advanceOneGate`.
    expect(onAnswer).toHaveBeenCalledWith(true);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    expect(container.textContent).toContain("Vidas: 3");
    vi.useRealTimers();
  });

  test("cruzar en un carril incorrecto cuesta una vida sin terminar la partida", async () => {
    vi.useFakeTimers();
    mockCenterLaneCorrect();
    const onAnswer = vi.fn(async () => 0);
    const onWin = vi.fn();
    const { container } = render(<RunnerGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} onWin={onWin} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    await fireKey("ArrowDown"); // sale del carril central (correcto) al 2 (incorrecto)
    await advanceOneGate();

    expect(onAnswer).toHaveBeenCalledWith(false);
    expect(onWin).not.toHaveBeenCalled();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(container.textContent).toContain("Vidas: 2");
    vi.useRealTimers();
  });

  test("agotar las vidas termina la partida sin ganar", async () => {
    vi.useFakeTimers();
    mockAllWrong();
    const onAnswer = vi.fn(async () => 0);
    const onWin = vi.fn();
    const onGameOver = vi.fn();
    render(<RunnerGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} onWin={onWin} onGameOver={onGameOver} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    for (let i = 0; i < 3; i++) {
      await advanceOneGate();
    }

    expect(screen.getByText("¡Buen intento!")).toBeInTheDocument();
    expect(onWin).not.toHaveBeenCalled();
    expect(onGameOver).toHaveBeenCalledWith(0);
    vi.useRealTimers();
  });

  test("cruzar todas las puertas llama a onWin y onGameOver con los aciertos", async () => {
    vi.useFakeTimers();
    mockAllCorrect();
    const onAnswer = vi.fn(async (correct: boolean) => (correct ? 5 : 0));
    const onWin = vi.fn();
    const onGameOver = vi.fn();
    render(<RunnerGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} onWin={onWin} onGameOver={onGameOver} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    for (let i = 0; i < 3; i++) {
      await advanceOneGate();
    }

    expect(onWin).toHaveBeenCalledTimes(1);
    expect(onGameOver).toHaveBeenCalledWith(3);
    expect(onAnswer).toHaveBeenCalledTimes(3);
    for (const [correct] of onAnswer.mock.calls) {
      expect(correct).toBe(true);
    }
    expect(screen.getByText("¡Llegaste a la meta!")).toBeInTheDocument();
    vi.useRealTimers();
  });
});
