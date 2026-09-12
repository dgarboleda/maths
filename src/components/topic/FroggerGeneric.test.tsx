import { afterEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FroggerGeneric } from "./FroggerGeneric";
import * as problemModule from "@/lib/problem";

/**
 * Fase 37 (docs/plan-minijuegos-retro.md). `choiceSet` se controla por test
 * para que la ubicación de la respuesta correcta entre los `COLS` nenúfares
 * sea determinística. A diferencia de Snake, el movimiento del jugador es
 * inmediato por tecla (no atado a `useGameLoop`) — solo el obstáculo
 * necesita timers falsos.
 *
 * `fireKey` despacha el evento dentro de un `act()` ASÍNCRONO: el listener
 * de `useArrowKeys` cambia estado (fila/columna), y el efecto sin
 * dependencias de `useGameLoop` que sincroniza `onTickRef.current` con la
 * última versión de `onTick` necesita esa vuelta de microtareas para
 * vaciarse — con `act()` síncrono, un tick del bucle de juego disparado
 * justo después podía seguir viendo la fila/columna de ANTES de la tecla.
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
    generateProblem: () => ({ id: "p", difficulty: 1, kind: "test", prompt: "4 + 1", answer: 5, inputType: "integer" }),
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

/** Los 5 nenúfares valen la respuesta correcta — cualquier columna resuelve
 *  el estanque, sin depender de mover a la izquierda/derecha. */
function mockAllCorrect() {
  vi.mocked(problemModule.choiceSet).mockImplementation((answer: number, _spread: number, count = 3) =>
    Array.from({ length: count }, () => answer),
  );
}

/** Ningún nenúfar vale la respuesta correcta. */
function mockAllWrong() {
  vi.mocked(problemModule.choiceSet).mockImplementation((answer: number, _spread: number, count = 3) =>
    Array.from({ length: count }, (_, i) => answer + 100 + i),
  );
}

async function crossCheckpoint(expectedCount: number) {
  await fireKey("ArrowUp"); // entra al carril-obstáculo
  await fireKey("ArrowUp"); // entra al estanque, dispara la resolución
  await waitFor(() => expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(expectedCount)));
}

describe("FroggerGeneric", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("pantalla inicial: empezar muestra el estanque y el primer problema", () => {
    mockAllCorrect();
    render(<FroggerGeneric moduleId="test-module" soundOn={false} onAnswer={vi.fn(async () => 0)} />);
    fireEvent.click(screen.getByText("¡Empezar!"));
    expect(screen.getByText("4 + 1")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  test("pisar un nenúfar incorrecto retrocede una fila y no termina la partida", async () => {
    mockAllWrong();
    const onAnswer = vi.fn(async () => 0);
    const onWin = vi.fn();
    const { container } = render(<FroggerGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} onWin={onWin} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    await fireKey("ArrowUp");
    await fireKey("ArrowUp"); // llega al primer estanque, elige un nenúfar incorrecto
    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(false));

    expect(onWin).not.toHaveBeenCalled();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    // Sigue jugando: las vidas no se tocan por un nenúfar incorrecto.
    expect(container.textContent).toContain("Vidas: 3");
  });

  test("chocar contra el obstáculo cuesta una vida sin terminar la partida", async () => {
    vi.useFakeTimers();
    mockAllCorrect();
    const onAnswer = vi.fn(async () => 0);
    const { container } = render(<FroggerGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    await fireKey("ArrowUp"); // entra al carril-obstáculo (arranca centrado, igual que el obstáculo)
    // El obstáculo rebota entre los 5 carriles (2→3→4→3→2→...); sin mover al
    // jugador, alcanza su columna de nuevo al cabo de un ciclo completo —
    // determinístico, sin depender de alinear el jugador con un tick exacto.
    // Avances separados (no uno solo grande): cada llamada a
    // `advanceTimersByTimeAsync` dispara un solo frame de
    // `requestAnimationFrame` bajo timers falsos, así que hacen falta varias
    // llamadas para simular varios ticks del bucle de juego.
    for (let i = 0; i < 6; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
    }

    expect(container.textContent).toContain("Vidas: 2");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    vi.useRealTimers();
  });

  test("agotar las vidas termina la partida sin ganar", async () => {
    vi.useFakeTimers();
    mockAllCorrect();
    const onAnswer = vi.fn(async () => 0);
    const onWin = vi.fn();
    const onGameOver = vi.fn();
    render(<FroggerGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} onWin={onWin} onGameOver={onGameOver} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    for (let round = 0; round < 3; round++) {
      await fireKey("ArrowUp"); // vuelve a entrar centrado tras cada choque
      for (let i = 0; i < 6; i++) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(500);
        });
      }
    }

    expect(screen.getByText("¡Buen intento!")).toBeInTheDocument();
    expect(onWin).not.toHaveBeenCalled();
    expect(onGameOver).toHaveBeenCalledWith(0);
    expect(onAnswer).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  test("cruzar todos los estanques llama a onWin y onGameOver con los aciertos", async () => {
    mockAllCorrect();
    const onAnswer = vi.fn(async (correct: boolean) => (correct ? 5 : 0));
    const onWin = vi.fn();
    const onGameOver = vi.fn();
    render(<FroggerGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} onWin={onWin} onGameOver={onGameOver} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    await crossCheckpoint(1);
    await crossCheckpoint(2);
    // El tercer estanque gana la partida: `phase` pasa a "over" en el mismo
    // render que `correctCount` llega a 3, así que la barra de progreso
    // (que solo existe en la vista "playing") nunca llega a mostrar "3" —
    // se espera directamente la señal de victoria.
    await fireKey("ArrowUp");
    await fireKey("ArrowUp");
    await waitFor(() => expect(onWin).toHaveBeenCalledTimes(1));

    expect(onGameOver).toHaveBeenCalledWith(3);
    expect(onAnswer).toHaveBeenCalledTimes(3);
    for (const [correct] of onAnswer.mock.calls) {
      expect(correct).toBe(true);
    }
    expect(screen.getByText("¡Cruzaste el estanque!")).toBeInTheDocument();
  });
});
