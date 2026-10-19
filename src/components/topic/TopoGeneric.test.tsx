import { afterEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { TopoGeneric } from "./TopoGeneric";
import * as problemModule from "@/lib/problem";

vi.mock("@/lib/gameSound", () => ({ playSound: () => {} }));
vi.mock("@/lib/confetti", () => ({ triggerConfetti: () => {} }));
vi.mock("@/lib/curriculum", () => ({
  getModule: () => ({
    id: "test-module",
    generateProblem: () => ({ id: "p", difficulty: 1, kind: "test", prompt: "7 - 2", answer: 5, inputType: "integer" }),
  }),
}));
vi.mock("@/lib/problem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/problem")>();
  // Sin azar: los topos salen en este orden y en el primer agujero libre.
  return { ...actual, choiceSet: vi.fn(() => [5, 1, 2, 3, 4]), shuffle: <T,>(items: T[]) => [...items] };
});

/** En pasos cortos, cada uno con su render. */
function tick(ms: number) {
  for (let t = 0; t < ms; t += 50) act(() => { vi.advanceTimersByTime(50); });
}

async function waitMole(name: string) {
  for (let i = 0; i < 100 && !screen.queryByRole("button", { name }); i++) tick(100);
  return screen.getByRole("button", { name });
}

describe("TopoGeneric", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test("tocar el topo correcto suma un acierto; el incorrecto cuesta una vida", async () => {
    vi.useFakeTimers();
    const onAnswer = vi.fn(async () => 2);
    const { container } = render(<TopoGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText("¡Empezar!"));
    // El 1 sale segundo, antes de que el 5 se esconda.
    fireEvent.click(await waitMole("Topo con 1"));
    await act(async () => {});
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith(false);
    expect(container.textContent).toContain("Vidas: 2");
    fireEvent.click(await waitMole("Topo con 5"));
    await act(async () => {});
    expect(onAnswer).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  });

  test("en un nivel, dejar escapar el topo correcto cuesta una vida", async () => {
    vi.useFakeTimers();
    const onAnswer = vi.fn(async () => 0);
    const { container } = render(<TopoGeneric moduleId="test-module" soundOn={false} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText("¡Empezar!"));
    await waitMole("Topo con 5");
    for (let i = 0; i < 60 && onAnswer.mock.calls.length === 0; i++) {
      tick(100);
      await act(async () => {});
    }
    expect(onAnswer).toHaveBeenCalledWith(false);
    expect(container.textContent).toContain("Vidas: 2");
  });

  test("tres aciertos ganan la partida y registran la marca", async () => {
    vi.useFakeTimers();
    const onWin = vi.fn();
    const onGameOver = vi.fn();
    render(<TopoGeneric moduleId="test-module" soundOn={false} onAnswer={vi.fn(async () => 1)} onWin={onWin} onGameOver={onGameOver} />);
    fireEvent.click(screen.getByText("¡Empezar!"));
    for (let i = 0; i < 3; i++) {
      fireEvent.click(await waitMole("Topo con 5"));
      await act(async () => {});
    }
    expect(onWin).toHaveBeenCalledTimes(1);
    expect(onGameOver).toHaveBeenCalledWith(3);
    expect(screen.getByText("¡Atrapaste al topo!")).toBeInTheDocument();
    expect(problemModule.choiceSet).toHaveBeenCalled();
  });
});
