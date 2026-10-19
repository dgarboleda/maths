import { afterEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { CajasGeneric } from "./CajasGeneric";
import * as problemModule from "@/lib/problem";

vi.mock("@/lib/gameSound", () => ({ playSound: () => {} }));
vi.mock("@/lib/confetti", () => ({ triggerConfetti: () => {} }));
vi.mock("@/lib/curriculum", () => ({
  getModule: () => ({
    id: "test-module",
    generateProblem: () => ({ id: "p", difficulty: 1, kind: "test", prompt: "7 - 2", answer: 5, inputType: "integer" }),
  }),
}));
// La caja del centro (columna 2, debajo del jugador) es la correcta.
vi.mock("@/lib/problem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/problem")>();
  return { ...actual, choiceSet: vi.fn(() => [1, 2, 5, 3, 4]) };
});

function key(code: string) {
  act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { code })); });
}

async function deliver(column: number) {
  for (let col = 2; col !== column; col += Math.sign(column - col))
    key(column > col ? "ArrowRight" : "ArrowLeft"); // por la fila 5, libre
  for (let i = 0; i < 4; i++) key("ArrowUp");
  await act(async () => {});
}

describe("CajasGeneric", () => {
  afterEach(() => vi.clearAllMocks());

  test("entregar la caja correcta suma; una incorrecta cuesta una vida", async () => {
    const onAnswer = vi.fn(async () => 2);
    const { container } = render(<CajasGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText("¡Empezar!"));
    await deliver(2);
    expect(onAnswer).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    await deliver(0);
    expect(onAnswer).toHaveBeenLastCalledWith(false);
    expect(container.textContent).toContain("Vidas: 2");
  });

  test("las paredes y las otras cajas bloquean; moverse no cuenta como respuesta", () => {
    const onAnswer = vi.fn(async () => 0);
    render(<CajasGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText("¡Empezar!"));
    for (let i = 0; i < 10; i++) key("ArrowDown");
    for (let i = 0; i < 10; i++) key("ArrowRight");
    key("ArrowUp");
    key("ArrowUp"); // empuja la caja de la columna 4 a la fila 2
    key("ArrowLeft"); // la caja de la columna 3 no puede empujar a la de la 2
    expect(onAnswer).not.toHaveBeenCalled();
  });

  test("tres entregas correctas ganan la partida", async () => {
    const onWin = vi.fn();
    const onGameOver = vi.fn();
    render(<CajasGeneric moduleId="test-module" soundOn={false} onAnswer={vi.fn(async () => 1)} onWin={onWin} onGameOver={onGameOver} />);
    fireEvent.click(screen.getByText("¡Empezar!"));
    for (let i = 0; i < 3; i++) await deliver(2);
    expect(onWin).toHaveBeenCalledTimes(1);
    expect(onGameOver).toHaveBeenCalledWith(3);
    expect(screen.getByText("¡Caja entregada!")).toBeInTheDocument();
    expect(problemModule.choiceSet).toHaveBeenCalled();
  });
});
