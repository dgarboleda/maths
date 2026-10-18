import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { FroggerGeneric } from "./FroggerGeneric";
import { CoheteGeneric } from "./CoheteGeneric";
import type { LessonExercise } from "@/lib/minigames/lessonExercise";

vi.mock("@/lib/curriculum", () => ({ getModule: () => { throw new Error("La clase no usa generadores antiguos"); } }));
vi.mock("@/lib/gameSound", () => ({ playSound: vi.fn() }));
vi.mock("@/lib/confetti", () => ({ triggerConfetti: vi.fn() }));
afterEach(() => vi.useRealTimers());

function exercise(overrides: Partial<LessonExercise> = {}): LessonExercise {
  return {
    problem: { id: "p-2", difficulty: 1, kind: "lesson-practice", prompt: "¿Qué valor de x mantiene la igualdad x + 3 = 1?", answer: -2, inputType: "decimal", choices: [-4, -3, -2, -1, 0] },
    solved: false, disabled: false, paused: false, timed: false,
    input: <button>Respuesta de la clase</button>,
    onResponse: vi.fn(async () => true),
    ...overrides,
  };
}

test("Frogger envía el valor elegido una sola vez y solo celebra al recibir el resultado guardado", async () => {
  let complete!: (saved: boolean) => void;
  const onResponse = vi.fn(() => new Promise<boolean>((resolve) => { complete = resolve; }));
  const data = exercise({ onResponse });
  const legacy = vi.fn();
  const view = render(<FroggerGeneric moduleId="" soundOn={false} onAnswer={legacy} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  const choice = screen.getByRole("button", { name: "Saltar al nenúfar -2" });
  fireEvent.click(choice);
  fireEvent.click(choice);
  expect(onResponse).toHaveBeenCalledExactlyOnceWith(-2);
  expect(screen.queryByText("¡Cruzaste el estanque!")).not.toBeInTheDocument();
  await act(async () => { complete(true); });
  view.rerender(<FroggerGeneric moduleId="" soundOn={false} onAnswer={legacy} exercise={{ ...data, solved: true, disabled: true }} />);
  expect(screen.getByText("¡Cruzaste el estanque!")).toBeInTheDocument();
  expect(legacy).not.toHaveBeenCalled();
  expect(screen.queryByText(/Estrellas/)).not.toBeInTheDocument();
});

test("Frogger pausa las respuestas y una escritura fallida permite reintentar la misma pregunta", async () => {
  const data = exercise({ paused: true, onResponse: vi.fn(async () => false) });
  const view = render(<FroggerGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={data} />);
  expect(screen.getByRole("button", { name: "¡Empezar!" })).toBeDisabled();
  view.rerender(<FroggerGeneric moduleId="" soundOn={false} onAnswer={vi.fn()} exercise={{ ...data, paused: false }} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Empezar!" }));
  const button = screen.getByRole("button", { name: "Saltar al nenúfar -2" });
  fireEvent.click(button);
  await waitFor(() => expect(data.onResponse).toHaveBeenCalledTimes(1));
  fireEvent.click(button);
  await waitFor(() => expect(data.onResponse).toHaveBeenCalledTimes(2));
  expect(screen.getByText(data.problem.prompt)).toBeInTheDocument();
});

test("Cohete empieza sin límite; pausar o guardar detiene el reloj opcional sin fabricar errores", () => {
  vi.useFakeTimers();
  const legacy = vi.fn();
  const data = exercise();
  const view = render(<CoheteGeneric moduleId="" soundOn={false} onAnswer={legacy} exercise={data} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Iniciar misión!" }));
  act(() => vi.advanceTimersByTime(40_000));
  expect(screen.getByText("Sin límite")).toBeInTheDocument();
  view.rerender(<CoheteGeneric moduleId="" soundOn={false} onAnswer={legacy} exercise={{ ...data, timed: true }} />);
  act(() => vi.advanceTimersByTime(5_000));
  expect(screen.getByText("25s")).toBeInTheDocument();
  for (const freeze of [{ paused: true }, { disabled: true }]) {
    view.rerender(<CoheteGeneric moduleId="" soundOn={false} onAnswer={legacy} exercise={{ ...data, timed: true, ...freeze }} />);
    act(() => vi.advanceTimersByTime(40_000));
    expect(screen.getByText("25s")).toBeInTheDocument();
  }
  view.rerender(<CoheteGeneric moduleId="" soundOn={false} onAnswer={legacy} exercise={{ ...data, timed: true }} />);
  act(() => vi.advanceTimersByTime(25_000));
  expect(screen.getByText("¡Buen intento!")).toBeInTheDocument();
  expect(legacy).not.toHaveBeenCalled();
  expect(data.onResponse).not.toHaveBeenCalled();
  expect(screen.queryByText(/Estrellas/)).not.toBeInTheDocument();
});
