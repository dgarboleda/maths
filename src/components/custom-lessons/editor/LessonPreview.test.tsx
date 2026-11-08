import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { LessonPreview } from "./LessonPreview";

test("la vista previa completa permite usar los recursos y solo los monta al abrirse", async () => {
  render(<LessonPreview lesson={{ title: "Enteros", topic: "Números", content: "Explora", game: "write", published: false, updatedAt: 1, questions: [], visuals: [{ id: "linea", kind: "custom-number-line", title: "Recta propia", description: "", min: -4, max: 8, initial: 2 }] }} />);
  expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("Vista previa (como la verá el alumno)"));
  const slider = await screen.findByRole("slider", { name: /Valor/ });
  fireEvent.change(slider, { target: { value: "3" } });
  expect(screen.getByRole("img", { name: /valor seleccionado 3/ })).toBeInTheDocument();
});
