import { afterEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { InvadersGeneric } from "./InvadersGeneric";
import * as problemModule from "@/lib/problem";

/**
 * Fase 40 (docs/plan-minijuegos-retro.md). Disparar es inmediato por click/
 * tecla (no atado a `useGameLoop`, que acá solo mueve la oleada hacia
 * abajo) — la mayoría de los tests no necesita timers falsos en absoluto,
 * a diferencia de Frogger/Runner/Number Pac. Solo el caso "la oleada llega
 * abajo sin disparar" depende del bucle de juego.
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
    generateProblem: () => ({ id: "p", difficulty: 1, kind: "test", prompt: "7 - 2", answer: 5, inputType: "integer" }),
    ConceptComponent: () => null,
  }),
}));
vi.mock("@/lib/problem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/problem")>();
  return { ...actual, choiceSet: vi.fn() };
});

function shootButton() {
  // Dos botones calzan /Disparar/ (el de escritorio y el del HorizontalPad
  // táctil, ambos presentes en el DOM a la vez — jsdom no aplica el CSS
  // responsive que en un navegador real oculta uno de los dos); el de
  // escritorio tiene el texto exacto distinto.
  return screen.getByRole("button", { name: "Disparar (espacio)" });
}

async function shoot() {
  fireEvent.click(shootButton());
  await act(async () => {}); // deja resolver la promesa de onAnswer
}

/** Todas las columnas valen la respuesta correcta. */
function mockAllCorrect() {
  vi.mocked(problemModule.choiceSet).mockImplementation((answer: number, _spread: number, count = 3) =>
    Array.from({ length: count }, () => answer),
  );
}

/** Ninguna columna vale la respuesta correcta. */
function mockAllWrong() {
  vi.mocked(problemModule.choiceSet).mockImplementation((answer: number, _spread: number, count = 3) =>
    Array.from({ length: count }, (_, i) => answer + 100 + i),
  );
}

describe("InvadersGeneric", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test("pantalla inicial: empezar muestra la oleada y el primer problema", () => {
    mockAllCorrect();
    render(<InvadersGeneric moduleId="test-module" soundOn={false} onAnswer={vi.fn(async () => 0)} />);
    fireEvent.click(screen.getByText("¡Empezar!"));
    expect(screen.getByText("7 - 2")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  test("disparar la columna correcta (la nave arranca centrada) avanza de oleada sin perder vidas", async () => {
    mockAllCorrect();
    const onAnswer = vi.fn(async () => 5);
    const { container } = render(<InvadersGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    await shoot();

    expect(onAnswer).toHaveBeenCalledWith(true);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    expect(container.textContent).toContain("Vidas: 3");
  });

  test("disparar una columna incorrecta cuesta una vida sin terminar la partida", async () => {
    mockAllWrong();
    const onAnswer = vi.fn(async () => 0);
    const onWin = vi.fn();
    const { container } = render(<InvadersGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} onWin={onWin} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    await shoot();

    expect(onAnswer).toHaveBeenCalledWith(false);
    expect(onWin).not.toHaveBeenCalled();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(container.textContent).toContain("Vidas: 2");
  });

  test("dejar que la oleada llegue abajo sin disparar también cuenta como fallo", async () => {
    vi.useFakeTimers();
    mockAllCorrect(); // no importa: nunca se dispara
    const onAnswer = vi.fn(async () => 0);
    const onWin = vi.fn();
    const { container } = render(<InvadersGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} onWin={onWin} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    for (let i = 0; i < 30 && onAnswer.mock.calls.length === 0; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });
    }

    expect(onAnswer).toHaveBeenCalledWith(false);
    expect(onWin).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Vidas: 2");
  });

  test("agotar las vidas termina la partida sin ganar", async () => {
    mockAllWrong();
    const onAnswer = vi.fn(async () => 0);
    const onWin = vi.fn();
    const onGameOver = vi.fn();
    render(<InvadersGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} onWin={onWin} onGameOver={onGameOver} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    await shoot();
    await shoot();
    await shoot();

    expect(screen.getByText("¡Buen intento!")).toBeInTheDocument();
    expect(onWin).not.toHaveBeenCalled();
    expect(onGameOver).toHaveBeenCalledWith(0);
  });

  test("repeler las 3 oleadas llama a onWin y onGameOver con los aciertos", async () => {
    mockAllCorrect();
    const onAnswer = vi.fn(async (correct: boolean) => (correct ? 5 : 0));
    const onWin = vi.fn();
    const onGameOver = vi.fn();
    render(<InvadersGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} onWin={onWin} onGameOver={onGameOver} />);
    fireEvent.click(screen.getByText("¡Empezar!"));

    await shoot();
    await shoot();
    await shoot();

    expect(onWin).toHaveBeenCalledTimes(1);
    expect(onGameOver).toHaveBeenCalledWith(3);
    expect(onAnswer.mock.calls.every(([correct]) => correct === true)).toBe(true);
    expect(screen.getByText("¡Invasión repelida!")).toBeInTheDocument();
  });
});
