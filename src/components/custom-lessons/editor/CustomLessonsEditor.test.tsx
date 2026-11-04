import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LessonEntry } from "./groupLessons";
import { CustomLessonsEditor } from "./CustomLessonsEditor";

const save = vi.fn(async (id: string | null) => id ?? "nueva");
const remove = vi.fn(async () => {});
const reorder = vi.fn(async () => {});
let items: LessonEntry[] = [];
vi.mock("./useCustomLessons", () => ({ useCustomLessons: () => ({ items, loadError: false, save, remove, reorder }) }));

const published: LessonEntry = { id: "c1", title: "Sumas", topic: "Números", content: "Sumar une.", game: "write", published: true, updatedAt: 10, contentVersion: 5, order: 0, questions: [{ id: "q1", prompt: "¿2 + 2?", answer: 1, options: ["3", "4"], explanation: "" }] };
const draft: LessonEntry = { ...published, id: "c2", title: "Restas", published: false, order: 1 };

beforeEach(() => {
  items = [published, draft];
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { cb(0); return 0; });
});
afterEach(() => { vi.clearAllMocks(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const openLesson = (name: RegExp) => fireEvent.click(screen.getByRole("button", { name }));

describe("editor de clases personalizadas", () => {
  it("agrupa por tema y guarda una clase publicada sin despublicarla", async () => {
    render(<CustomLessonsEditor parentId="p1" />);
    const topic = screen.getByRole("region", { name: "Tema Números" });
    expect(within(topic).getAllByRole("listitem")).toHaveLength(2);
    openLesson(/^Sumas · Publicada/);
    fireEvent.change(screen.getByLabelText("Título de la clase"), { target: { value: "Sumas fáciles" } });
    expect(screen.getByText(/Cambios sin guardar/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar borrador" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith("c1", expect.objectContaining({ title: "Sumas fáciles", published: true, contentVersion: 5 })));
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it("retirar una clase pide confirmación y la pasa a borrador", async () => {
    render(<CustomLessonsEditor parentId="p1" />);
    openLesson(/^Sumas · Publicada/);
    fireEvent.click(screen.getByRole("button", { name: "Retirar de los alumnos" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith("c1", expect.objectContaining({ published: false })));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("dejarán de ver"));
  });

  it("avisa antes de reiniciar el progreso al cambiar la respuesta correcta", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    render(<CustomLessonsEditor parentId="p1" />);
    openLesson(/^Sumas · Publicada/);
    fireEvent.click(screen.getByLabelText("La respuesta 1 es la correcta"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("empezará de cero"));
    expect(save).not.toHaveBeenCalled();
  });

  it("muestra los errores de cada pregunta al publicar", () => {
    render(<CustomLessonsEditor parentId="p1" />);
    openLesson(/^Restas · Borrador/);
    fireEvent.change(screen.getByLabelText("Minijuego"), { target: { value: "cohete" } });
    fireEvent.click(screen.getByRole("button", { name: "Publicar para alumnos" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Pregunta 1: Los minijuegos necesitan 5 respuestas (hay 2).");
    expect(screen.getByText("2/5 para el minijuego")).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });

  it("pide confirmación antes de descartar cambios", () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    render(<CustomLessonsEditor parentId="p1" />);
    openLesson(/^Sumas · Publicada/);
    fireEvent.change(screen.getByLabelText("Título de la clase"), { target: { value: "Otro" } });
    openLesson(/^Restas · Borrador/);
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("cambios sin guardar"));
    expect(screen.getByLabelText("Título de la clase")).toHaveValue("Otro");
  });

  it("mueve una respuesta junto con su marca de correcta", () => {
    render(<CustomLessonsEditor parentId="p1" />);
    openLesson(/^Sumas · Publicada/);
    fireEvent.click(screen.getByRole("button", { name: "Subir respuesta 2" }));
    expect(screen.getByLabelText("Respuesta 1")).toHaveValue("4");
    expect(screen.getByLabelText("La respuesta 1 es la correcta")).toBeChecked();
  });

  it("crea una clase en un tema existente, reordena y elimina", async () => {
    render(<CustomLessonsEditor parentId="p1" />);
    fireEvent.click(screen.getByRole("button", { name: "+ Clase en Números" }));
    expect(screen.getByLabelText("Tema")).toHaveValue("Números");
    fireEvent.click(screen.getByRole("button", { name: "Bajar Sumas" }));
    await waitFor(() => expect(reorder).toHaveBeenCalledWith(["c2", "c1"]));
    openLesson(/^Restas · Borrador/);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar clase" }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith("c2"));
  });
});
