import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { hasVisualTutor, VisualTutor } from "./VisualTutor";

describe("tutor visual", () => {
  it("muestra una pista y permite avanzar solo al responder correctamente", () => {
    render(<VisualTutor lessonId="suma-resta-columnas" />);
    fireEvent.click(screen.getByRole("button", { name: "12" }));
    expect(screen.getByText(/Cuenta desde ocho/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continuar actividad" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "13" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar actividad" }));
    expect(screen.getByText(/Una decena representa diez unidades/)).toBeInTheDocument();
  });
  it("conserva la alternativa de texto cuando falla el audio", () => {
    const { container } = render(<VisualTutor lessonId="fracciones-suma-resta" />);
    fireEvent.error(container.querySelector("audio")!);
    expect(screen.getByRole("status")).toHaveTextContent("La voz no está disponible");
    expect(screen.getByText(/Dos reservas del mismo tamaño/)).toBeInTheDocument();
  });
  it("no activa el tutor en clases sin contenido", () => {
    expect(hasVisualTutor("division-larga")).toBe(false);
  });
});
