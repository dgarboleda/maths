import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { axe } from "jest-axe";
import { LearningHelpProvider, useLearningHelpOpen } from "./LearningHelp";
import { ideasForText, type ScreenHelp } from "@/lib/learning/screenHelp";

const help: ScreenHelp = { id: "enteros:2", title: "Una idea, paso a paso", description: "Mira los símbolos de esta parte.", ideas: ideasForText("|−6| = 6") };
function PausedGame() { return <p>Juego {useLearningHelpOpen() ? "en pausa" : "activo"}</p>; }
function setup(overrides: Partial<Parameters<typeof LearningHelpProvider>[0]> = {}) {
  return <LearningHelpProvider childId="ana" help={help} {...overrides}><PausedGame /></LearningHelpProvider>;
}
beforeEach(() => localStorage.clear());

test("abre la explicación, pausa el juego, atrapa el foco y Escape vuelve al foco", async () => {
  const user = userEvent.setup();
  const view = render(setup());
  const trigger = screen.getByRole("button", { name: "Entender esta pantalla" });
  expect(screen.getByRole("button", { name: /Qué significa \|x\|/ })).toBeInTheDocument();
  await user.click(trigger);
  const dialog = screen.getByRole("dialog", { name: help.title });
  expect(dialog).toHaveFocus();
  expect(screen.getByText(/distancia de un número al cero/)).toBeInTheDocument();
  expect(screen.getByText("Juego en pausa")).toBeInTheDocument();
  const done = screen.getByRole("button", { name: "Entendido, seguir" });
  done.focus();
  await user.tab();
  expect(screen.getByRole("button", { name: "Cerrar explicación" })).toHaveFocus();
  expect(await axe(dialog)).toHaveNoViolations();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(screen.getByText("Juego activo")).toBeInTheDocument();
  expect(await axe(view.container)).toHaveNoViolations();
});

test("recuerda las explicaciones consultadas por perfil, incluso tras volver a montar", async () => {
  const user = userEvent.setup();
  const view = render(setup());
  await user.click(screen.getByRole("button", { name: /Qué significa \|x\|/ }));
  await user.click(screen.getByRole("button", { name: "Entendido, seguir" }));
  expect(screen.queryByRole("button", { name: /Qué significa \|x\|/ })).not.toBeInTheDocument();
  view.unmount();
  const next = render(setup());
  expect(screen.queryByRole("button", { name: /Qué significa \|x\|/ })).not.toBeInTheDocument();
  next.rerender(setup({ childId: "otro-perfil" }));
  expect(screen.getByRole("button", { name: /Qué significa \|x\|/ })).toBeInTheDocument();
});

test("si falla el guardado de la ayuda, no revela contenido ni marca el símbolo como consultado", async () => {
  const guard = vi.fn(async () => false);
  render(setup({ onOpen: guard }));
  fireEvent.click(screen.getByRole("button", { name: "Entender esta pantalla" }));
  await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  expect(guard).toHaveBeenCalledOnce();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(localStorage.getItem("maths:help:v1:ana")).toBeNull();
});

test("abrir rápido dos veces espera un único guardado y cambiar de actividad cierra la ayuda", async () => {
  let finish!: (saved: boolean) => void;
  const guard = vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve; }));
  const view = render(setup({ onOpen: guard }));
  const trigger = screen.getByRole("button", { name: "Entender esta pantalla" });
  fireEvent.click(trigger);
  fireEvent.click(trigger);
  expect(guard).toHaveBeenCalledOnce();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await act(async () => finish(true));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  view.rerender(setup({ help: { ...help, id: "otra-actividad" } }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("Juego activo")).toBeInTheDocument();
});

test("la ayuda funciona aunque el navegador bloquee el almacenamiento", async () => {
  const read = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Bloqueado"); });
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Bloqueado"); });
  try {
    render(setup());
    fireEvent.click(screen.getByRole("button", { name: "Entender esta pantalla" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar explicación" }));
    expect(screen.queryByRole("button", { name: /Qué significa \|x\|/ })).not.toBeInTheDocument();
  } finally { read.mockRestore(); write.mockRestore(); }
});

test("las definiciones cerradas conservan el aviso de símbolo nuevo hasta que se abren", async () => {
  const user = userEvent.setup();
  render(setup({ help: { ...help, ideas: ideasForText("|−6| = 6, √9 y π") } }));
  await user.click(screen.getByRole("button", { name: "Entender esta pantalla" }));
  expect(JSON.parse(localStorage.getItem("maths:help:v1:ana")!)).toEqual(["absolute"]);
  await user.click(screen.getByText("Raíz cuadrada", { selector: "summary" }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem("maths:help:v1:ana")!)).toEqual(["absolute", "root"]));
  await user.click(screen.getByRole("button", { name: "Entendido, seguir" }));
  expect(screen.getByRole("button", { name: /Qué significa π/ })).toBeInTheDocument();
});

test("confirma la ayuda de esa consulta y no avisa que se registrará otra al volver a abrir", async () => {
  const user = userEvent.setup();
  let finish!: (saved: boolean) => void;
  const guard = vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve; }));
  const view = render(setup({ onOpen: guard }));
  await user.click(screen.getByRole("button", { name: "Entender esta pantalla" }));
  view.rerender(setup()); // La respuesta del servidor ya confirmó la ayuda.
  await act(async () => finish(true));
  expect(screen.getByText(/Esta consulta cuenta como ayuda/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Entendido, seguir" }));
  await user.click(screen.getByRole("button", { name: "Entender esta pantalla" }));
  expect(screen.queryByText(/Esta consulta cuenta como ayuda/)).not.toBeInTheDocument();
  expect(guard).toHaveBeenCalledOnce();
});
