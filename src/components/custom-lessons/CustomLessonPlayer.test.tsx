import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { publicLesson } from "../../../functions/src/customLessons/schema";
import { initialSession, sessionReducer, type SessionState } from "./player/sessionState";
import { CustomLessonPlayer } from "./CustomLessonPlayer";

const answer = vi.fn(async () => false);
let state: SessionState = initialSession;
vi.mock("@/lib/AuthProvider", () => ({ useAuth: () => ({ parentId: "p1" }) }));
vi.mock("@/components/learning/LearningShell", () => ({ LearningShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/learning/LessonArcade", () => ({ LessonArcade: () => null }));
vi.mock("./player/useCustomLessonSession", () => ({ useCustomLessonSession: () => ({ state, answer, start: vi.fn(), next: vi.fn() }) }));

const lesson = publicLesson({ title: "Sumas", topic: "Números", content: "Contenido", game: "write", published: true, updatedAt: 1, questions: [
  { id: "q1", kind: "choice", prompt: "¿2 + 2?", answer: 1, options: ["3", "4", "5"], explanation: "" },
  { id: "q2", kind: "numeric", prompt: "¿1/2 en decimal?", value: "0,5", explanation: "" },
] });
const at = (index: number): SessionState => {
  const loaded = sessionReducer(initialSession, { type: "loaded", lesson, completed: index ? ["q1"] : [], locked: false });
  return sessionReducer(loaded, { type: "start", random: () => 0 });
};

beforeEach(() => { answer.mockClear(); });

describe("reproductor de clases personalizadas", () => {
  it("muestra las opciones barajadas y envía la posición original", () => {
    state = at(0);
    render(<CustomLessonPlayer childId="c1" lessonId="l1" />);
    const buttons = screen.getAllByRole("button").filter((b) => ["3", "4", "5"].includes(b.textContent ?? ""));
    expect(buttons.map((b) => b.textContent)).toEqual(["4", "5", "3"]);
    fireEvent.click(buttons[0]);
    expect(answer).toHaveBeenCalledWith(1);
  });
  it("responde con un número escrito y muestra comentario y pista al fallar", async () => {
    state = at(1);
    const { rerender } = render(<CustomLessonPlayer childId="c1" lessonId="l1" />);
    fireEvent.change(screen.getByLabelText("Tu respuesta"), { target: { value: "1/2" } });
    fireEvent.click(screen.getByRole("button", { name: "Comprobar" }));
    await waitFor(() => expect(answer).toHaveBeenCalledWith("1/2"));
    state = sessionReducer(state, { type: "answering" });
    state = sessionReducer(state, { type: "answered", version: lesson.version, questionId: "q2", correct: false, explanation: "", comment: "Escríbelo con coma.", hint: "Divide 1 entre 2.", stars: 0 });
    rerender(<CustomLessonPlayer childId="c1" lessonId="l1" />);
    expect(screen.getByText(/Escríbelo con coma/)).toBeInTheDocument();
    expect(screen.getByText(/Pista:/)).toHaveTextContent("Divide 1 entre 2.");
  });
  it("indica cuándo hay que terminar antes otra clase", () => {
    state = sessionReducer(initialSession, { type: "loaded", lesson, completed: [], locked: true });
    render(<CustomLessonPlayer childId="c1" lessonId="l1" />);
    expect(screen.getByRole("status")).toHaveTextContent("Primero termina la clase anterior");
  });
});
