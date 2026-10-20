import { afterEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { CajasGeneric } from "./CajasGeneric";
import * as problemModule from "@/lib/problem";
import { SOKOBAN_SOLUTIONS } from "@/test/sokobanSolutions";

vi.mock("@/lib/gameSound", () => ({ playSound: () => {} }));
vi.mock("@/lib/confetti", () => ({ triggerConfetti: () => {} }));
vi.mock("@/lib/curriculum", () => ({
  getModule: () => ({
    id: "test-module",
    generateProblem: () => ({ id: "p", difficulty: 1, kind: "test", prompt: "7 - 2", answer: 5, inputType: "integer" }),
  }),
}));
// La tercera opción es la correcta, independientemente del almacén.
vi.mock("@/lib/problem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/problem")>();
  return { ...actual, choiceSet: vi.fn(() => [1, 2, 5, 3, 4]) };
});

function key(code: string) {
  act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { code })); });
}

async function deliver(column: number) {
  const board = document.querySelector("[data-sokoban-board]")!;
  const route = SOKOBAN_SOLUTIONS[board.getAttribute("data-warehouse")!][column];
  const codes: Record<string, string> = { U: "ArrowUp", D: "ArrowDown", L: "ArrowLeft", R: "ArrowRight" };
  for (const direction of route) key(codes[direction]);
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

  test("deshacer restaura posiciones y contadores; reiniciar conserva las opciones", () => {
    const onAnswer = vi.fn(async () => 0);
    render(<CajasGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText("¡Empezar!"));
    const board = document.querySelector("[data-sokoban-board]")!;
    const before = board.innerHTML;
    expect(screen.getByRole("button", { name: "Deshacer" })).toBeDisabled();
    key("ArrowLeft");
    expect(board).toHaveAttribute("data-player-x", "2");
    expect(screen.getByText(/Pasos: 1/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(board).toHaveAttribute("data-player-x", "3");
    expect(board.innerHTML).toBe(before);
    expect(screen.getByText(/Pasos: 0/)).toBeInTheDocument();
    key("ArrowRight");
    fireEvent.keyDown(screen.getByText("7 - 2"), { key: "z", code: "KeyZ" });
    expect(board.innerHTML).toBe(before);
    key("ArrowRight");
    fireEvent.click(screen.getByRole("button", { name: "Reiniciar cajas" }));
    expect(board.innerHTML).toBe(before);
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

  test("Z funciona con el foco fuera del juego y respeta escritura y atajos", () => {
    const onAnswer = vi.fn(async () => 0);
    const { unmount } = render(<div>
      <button type="button">Control externo</button>
      <input aria-label="Notas" />
      <div contentEditable suppressContentEditableWarning><span>Texto editable</span></div>
      <CajasGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} />
    </div>);
    fireEvent.click(screen.getByText("¡Empezar!"));
    const board = document.querySelector("[data-sokoban-board]")!;
    key("ArrowRight");
    const external = screen.getByRole("button", { name: "Control externo" });
    external.focus();
    for (const modifier of ["ctrlKey", "metaKey", "altKey", "repeat", "isComposing"]) {
      fireEvent.keyDown(external, { code: "KeyZ", [modifier]: true });
      expect(board).toHaveAttribute("data-player-x", "4");
    }
    fireEvent.keyDown(screen.getByLabelText("Notas"), { code: "KeyZ" });
    fireEvent.keyDown(screen.getByText("Texto editable"), { code: "KeyZ" });
    expect(board).toHaveAttribute("data-player-x", "4");
    fireEvent.keyDown(external, { code: "KeyZ" });
    expect(board).toHaveAttribute("data-player-x", "3");
    expect(onAnswer).not.toHaveBeenCalled();
    unmount();
    const event = new KeyboardEvent("keydown", { code: "KeyZ", cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
