import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { CoheteGeneric } from "./CoheteGeneric";

vi.mock("@/lib/gameSound", () => ({ playSound: vi.fn() }));
vi.mock("@/lib/confetti", () => ({ triggerConfetti: vi.fn() }));
vi.mock("@/lib/curriculum", () => ({
  getModule: () => ({
    generateProblem: () => ({
      id: crypto.randomUUID(),
      kind: "test",
      prompt: "1 + 0",
      answer: 1,
      inputType: "integer",
    }),
  }),
}));
vi.mock("./QuestionWidget", () => ({
  QuestionWidget: ({ onSubmit }: { onSubmit: (value: number) => void }) => (
    <button onClick={() => onSubmit(1)}>Responder</button>
  ),
}));
afterEach(() => vi.useRealTimers());

async function win() {
  for (let i = 0; i < 8; i++)
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Responder" }));
    });
}
test("guarda los ocho aciertos reales y compara con la marca de antes de comenzar", async () => {
  vi.useFakeTimers();
  const onGameOver = vi.fn();
  function Host() {
    const [best, setBest] = useState<number | null>(null);
    return (
      <CoheteGeneric
        moduleId="test"
        soundOn={false}
        onAnswer={async () => 1}
        bestScore={best}
        onGameOver={(score) => {
          onGameOver(score);
          /* La escritura remota todavía no se resolvió al reiniciar. */ if (
            score === 0
          )
            setBest(8);
        }}
      />
    );
  }
  render(<Host />);
  fireEvent.click(screen.getByRole("button", { name: "¡Iniciar misión!" }));
  await win();
  expect(onGameOver).toHaveBeenLastCalledWith(8);
  expect(screen.getByText("¡Misión cumplida!")).toBeInTheDocument();
  expect(screen.queryByText("Tu marca:")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Jugar de nuevo 🔄" }));
  act(() => vi.advanceTimersByTime(30_000));
  expect(onGameOver).toHaveBeenLastCalledWith(0);
  expect(screen.getByText("Tu marca:").parentElement).toHaveTextContent("8");
  expect(screen.queryByText(/Nueva marca/)).not.toBeInTheDocument();
});
test("una actualización de la marca guardada durante la carrera no modifica la referencia de comparación", async () => {
  const props = { moduleId: "test", soundOn: false, onAnswer: async () => 1 };
  const view = render(<CoheteGeneric {...props} bestScore={5} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Iniciar misión!" }));
  view.rerender(<CoheteGeneric {...props} bestScore={8} />);
  await win();
  expect(screen.getByText(/Nueva marca/)).toHaveTextContent("8");
});

test("no registra dos veces una respuesta mientras se está guardando", async () => {
  let finish!: (stars: number) => void;
  const onAnswer = vi.fn(
    () =>
      new Promise<number>((resolve) => {
        finish = resolve;
      }),
  );
  render(<CoheteGeneric moduleId="test" soundOn={false} onAnswer={onAnswer} />);
  fireEvent.click(screen.getByRole("button", { name: "¡Iniciar misión!" }));
  fireEvent.click(screen.getByRole("button", { name: "Responder" }));
  fireEvent.click(screen.getByRole("button", { name: "Responder" }));
  expect(onAnswer).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish(1);
  });
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
});

test("una respuesta pendiente de una carrera terminada no avanza la siguiente", async () => {
  vi.useFakeTimers();
  let finish!: (stars: number) => void;
  const onGameOver = vi.fn();
  render(
    <CoheteGeneric
      moduleId="test"
      soundOn={false}
      onAnswer={() =>
        new Promise<number>((resolve) => {
          finish = resolve;
        })
      }
      onGameOver={onGameOver}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "¡Iniciar misión!" }));
  fireEvent.click(screen.getByRole("button", { name: "Responder" }));
  act(() => vi.advanceTimersByTime(30_000));
  expect(onGameOver).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Jugar de nuevo 🔄" }));
  await act(async () => {
    finish(1);
  });
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
});
