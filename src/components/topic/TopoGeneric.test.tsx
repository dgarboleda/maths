import { afterEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { TopoGeneric, topoPrompt } from "./TopoGeneric";
import type { LessonExercise } from "@/lib/minigames/lessonExercise";
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

describe("instrucción para elegir un topo", () => {
  test.each([
    ["Escribe 3/4 como decimal.", "Elige el topo que muestre 3/4 como decimal."],
    ["¿Qué fracción es mayor? Escribe la mayor.", "¿Qué fracción es mayor? Elige el topo que muestre la mayor."],
    ["Una compañera escribe 3/4. ¿Es correcto?", "Una compañera escribe 3/4. ¿Es correcto?"],
    ["¿Cuánto es 7 − 2?", "¿Cuánto es 7 − 2?"],
    ["Reduce 5x + 2x y escribe el coeficiente de x.", "Reduce 5x + 2x y elige el topo que muestre el coeficiente de x."],
    ["Escribe 0,5 como porcentaje. Introduce el número antes de %.", "Elige el topo que muestre 0,5 como porcentaje. Elige el topo que muestre el número antes de %."],
    ["Una compañera calcula y escribe 7. ¿Es correcto?", "Una compañera calcula y escribe 7. ¿Es correcto?"],
  ])("adapta solo instrucciones directas: %s", (prompt, expected) => {
    expect(topoPrompt(prompt)).toBe(expected);
  });

  test("en la clase muestra la instrucción adaptada y envía el valor original", async () => {
    vi.useFakeTimers();
    const onResponse = vi.fn(async () => true);
    const problem = { id: "decimal", difficulty: 1, kind: "lesson-practice", prompt: "Escribe 20% como decimal.", answer: 0.2, inputType: "decimal" as const, choices: [0.2, 0.1, 0.3, 0.4, 0.5] };
    const exercise: LessonExercise = { problem, solved: false, disabled: false, paused: false, timed: false, input: null, onResponse };
    render(<TopoGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={exercise} />);
    fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
    expect(screen.getByText("Elige el topo que muestre 20% como decimal.")).toBeInTheDocument();
    expect(problem.prompt).toBe("Escribe 20% como decimal.");
    fireEvent.click(await waitMole("Topo con 0,2"));
    await act(async () => {});
    expect(onResponse).toHaveBeenCalledExactlyOnceWith(0.2);
    vi.useRealTimers();
  });
});

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
