import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { expect, it } from "vitest";
import type { CustomLesson } from "../../../../functions/src/customLessons/schema";
import { AssignmentFields } from "./AssignmentFields";

it("no convierte en pública una clase al quitar el último alumno", () => {
  const lesson: CustomLesson = { title: "Clase", topic: "", content: "", game: "write", published: false, updatedAt: 1, questions: [], assignedTo: ["a", "b"] };
  function Form() {
    const [draft, setDraft] = useState(lesson);
    return <AssignmentFields draft={draft} students={[{ id: "a", name: "Ana" }, { id: "b", name: "Luis" }]} lessons={[]} errors={[]} set={(patch) => setDraft((prev) => ({ ...prev, ...patch }))} />;
  }
  render(<Form />);
  fireEvent.click(screen.getByLabelText("Luis"));
  expect(screen.getByLabelText("Ana")).toBeChecked();
  expect(screen.getByLabelText("Ana")).toBeDisabled();
  expect(screen.getByLabelText("Todos los alumnos")).not.toBeChecked();
  fireEvent.click(screen.getByLabelText("Todos los alumnos"));
  expect(screen.getByLabelText("Todos los alumnos")).toBeChecked();
  fireEvent.click(screen.getByLabelText("Luis"));
  expect(screen.getByLabelText("Luis")).toBeChecked();
  expect(screen.getByLabelText("Ana")).not.toBeChecked();
});
