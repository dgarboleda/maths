import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomLesson } from "../../../../functions/src/customLessons/schema";
import { LessonConflictError } from "../api";
import type { LessonEntry } from "./groupLessons";
import { CustomLessonsEditor } from "./CustomLessonsEditor";

const save = vi.fn(async (id: string | null, lesson: CustomLesson) => ({ id: id ?? "nueva", lesson: { ...lesson, updatedAt: 1000 } }));
const remove = vi.fn(async () => {});
const reorder = vi.fn(async () => {});
let items: LessonEntry[] = [];
vi.mock("./useCustomLessons", () => ({ useCustomLessons: () => ({ items, loadError: false, save, remove, reorder }) }));
vi.mock("./LessonStatsPanel", () => ({ LessonStatsPanel: () => null }));

const published: LessonEntry = { id: "c1", title: "Sumas", topic: "Números", content: "Sumar une.", game: "write", published: true, updatedAt: 10, contentVersion: 5, order: 0, questions: [{ id: "q1", prompt: "¿2 + 2?", answer: 1, options: ["3", "4"], explanation: "" }] };
const draft: LessonEntry = { ...published, id: "c2", title: "Restas", published: false, order: 1 };
const students = [{ id: "s1", name: "Sofía" }, { id: "s2", name: "Leo" }];

beforeEach(() => {
  items = [published, draft];
  localStorage.clear();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { cb(0); return 0; });
});
afterEach(() => { vi.clearAllMocks(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

const openLesson = (name: RegExp) => fireEvent.click(screen.getByRole("button", { name }));

describe("editor de clases personalizadas", () => {
  it("agrupa por tema y guarda una clase publicada sin despublicarla, con la versión que se abrió", async () => {
    render(<CustomLessonsEditor parentId="p1" />);
    const topic = screen.getByRole("region", { name: "Tema Números" });
    expect(within(topic).getAllByRole("listitem")).toHaveLength(2);
    openLesson(/^Sumas · Publicada/);
    fireEvent.change(screen.getByLabelText("Título de la clase"), { target: { value: "Sumas fáciles" } });
    expect(screen.getByText(/Cambios sin guardar/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar borrador" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith("c1", expect.objectContaining({ title: "Sumas fáciles", published: true, contentVersion: 5 }), "keep", 10));
    expect(window.confirm).not.toHaveBeenCalled();
    expect(await screen.findByText(/Los alumnos ya ven la nueva versión/)).toBeInTheDocument();
  });

  it("retirar una clase pide confirmación y la pasa a borrador", async () => {
    render(<CustomLessonsEditor parentId="p1" />);
    openLesson(/^Sumas · Publicada/);
    fireEvent.click(screen.getByRole("button", { name: "Retirar de los alumnos" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith("c1", expect.objectContaining({ published: false }), "unpublish", 10));
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

  it("completa con distractores numéricos para el minijuego", () => {
    render(<CustomLessonsEditor parentId="p1" />);
    openLesson(/^Restas · Borrador/);
    fireEvent.change(screen.getByLabelText("Minijuego"), { target: { value: "cohete" } });
    fireEvent.click(screen.getByRole("button", { name: "Completar con distractores" }));
    const values = [1, 2, 3, 4, 5].map((i) => (screen.getByLabelText(`Respuesta ${i}`) as HTMLInputElement).value);
    expect(values).toContain("4");
    expect(new Set(values).size).toBe(5);
    expect(screen.getByText("5/5 para el minijuego")).toBeInTheDocument();
    expect(screen.getByLabelText(`La respuesta ${values.indexOf("4") + 1} es la correcta`)).toBeChecked();
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
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("progreso de los alumnos"));
  });

  it("si otro dispositivo guardó antes, deja elegir entre sobrescribir y recargar", async () => {
    save.mockRejectedValueOnce(new LessonConflictError(20));
    render(<CustomLessonsEditor parentId="p1" />);
    openLesson(/^Sumas · Publicada/);
    fireEvent.change(screen.getByLabelText("Título de la clase"), { target: { value: "Mía" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("otro dispositivo"));
    expect(save).toHaveBeenLastCalledWith("c1", expect.objectContaining({ title: "Mía" }), "keep", 20);

    save.mockRejectedValueOnce(new LessonConflictError(30));
    vi.mocked(window.confirm).mockReturnValue(false);
    fireEvent.change(screen.getByLabelText("Título de la clase"), { target: { value: "Otra vez" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByText("Se cargó la versión guardada.")).toBeInTheDocument();
    expect(screen.getByLabelText("Título de la clase")).toHaveValue("Sumas");
  });

  it("recupera los cambios sin guardar de una visita anterior", async () => {
    const { unmount } = render(<CustomLessonsEditor parentId="p1" />);
    openLesson(/^Restas · Borrador/);
    fireEvent.change(screen.getByLabelText("Título de la clase"), { target: { value: "Restas llevando" } });
    await waitFor(() => expect(localStorage.getItem("customLessonDraft:p1:c2")).toContain("Restas llevando"), { timeout: 2000 });
    unmount();
    render(<CustomLessonsEditor parentId="p1" />);
    openLesson(/^Restas · Borrador/);
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("¿Recuperarlos?"));
    expect(screen.getByLabelText("Título de la clase")).toHaveValue("Restas llevando");
    expect(screen.getByText(/Cambios sin guardar/)).toBeInTheDocument();
  });

  it("parte de una plantilla, añade una pregunta numérica y asigna alumnos y fechas", async () => {
    render(<CustomLessonsEditor parentId="p1" students={students} />);
    fireEvent.change(screen.getByLabelText("Empezar desde una plantilla"), { target: { value: "calculo-mental" } });
    expect(screen.getByLabelText("Título de la clase")).toHaveValue("Multiplicar por 10, 100 y 1000");
    fireEvent.click(screen.getByRole("button", { name: "Añadir pregunta numérica" }));
    const last = screen.getAllByRole("group", { name: /^Pregunta \d+$/ }).at(-1)!;
    fireEvent.change(within(last).getByLabelText("Enunciado"), { target: { value: "¿Cuánto es 1/2 + 1/4?" } });
    fireEvent.change(within(last).getByLabelText("Respuesta correcta"), { target: { value: "3/4" } });
    fireEvent.click(screen.getByLabelText("Leo"));
    fireEvent.change(screen.getByLabelText("Entregar antes de (opcional)"), { target: { value: "2030-01-15" } });
    fireEvent.click(screen.getByRole("button", { name: "Publicar para alumnos" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(null, expect.objectContaining({
      published: true, assignedTo: ["s2"], dueAt: new Date(2030, 0, 15, 23, 59, 59, 999).getTime(),
      questions: expect.arrayContaining([expect.objectContaining({ kind: "numeric", value: "3/4" })]),
    }), "publish", null));
  });

  it("duplica la clase como borrador nuevo", () => {
    render(<CustomLessonsEditor parentId="p1" />);
    openLesson(/^Sumas · Publicada/);
    fireEvent.click(screen.getByRole("button", { name: "Duplicar clase" }));
    expect(screen.getByLabelText("Título de la clase")).toHaveValue("Sumas (copia)");
    expect(screen.getByText(/^Clase nueva/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publicar para alumnos" })).toBeInTheDocument();
  });
});
