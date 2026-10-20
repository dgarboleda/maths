import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { useArcadeFocus } from "./useArcadeFocus";

function Host({ playing, paused }: { playing: boolean; paused: boolean }) {
  const ref = useArcadeFocus(playing, paused);
  return <><button type="button">Control externo</button><p ref={ref} tabIndex={-1}>Pregunta del juego</p></>;
}

test("empezar y reanudar muestran la pregunta; pausar y los otros renders no roban el foco", () => {
  const scroll = vi.fn();
  const view = render(<Host playing={false} paused={false} />);
  const prompt = screen.getByText("Pregunta del juego");
  prompt.scrollIntoView = scroll;
  expect(scroll).not.toHaveBeenCalled();
  view.rerender(<Host playing paused={false} />);
  expect(prompt).toHaveFocus();
  expect(scroll).toHaveBeenCalledTimes(1);
  const external = screen.getByRole("button");
  fireEvent.focus(external); external.focus();
  view.rerender(<Host playing paused={false} />);
  expect(external).toHaveFocus();
  view.rerender(<Host playing paused />);
  expect(external).toHaveFocus();
  expect(scroll).toHaveBeenCalledTimes(1);
  view.rerender(<Host playing paused={false} />);
  expect(prompt).toHaveFocus();
  expect(scroll).toHaveBeenCalledTimes(2);
});
