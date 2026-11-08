import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { expect, test } from "vitest";
import type { LessonVisual } from "../../../../functions/src/customLessons/visuals";
import { VisualEditor } from "./VisualEditor";

function Editor() {
  const [visuals, setVisuals] = useState<LessonVisual[]>([]);
  return <VisualEditor visuals={visuals} onChange={setVisuals} />;
}

test("configura, prueba, reordena y elimina recursos", async () => {
  render(<Editor />);
  fireEvent.click(screen.getByRole("button", { name: "Añadir recurso interactivo" }));
  fireEvent.change(screen.getByLabelText("Mínimo"), { target: { value: "-4" } });
  fireEvent.change(screen.getByLabelText("Máximo"), { target: { value: "8" } });
  fireEvent.change(screen.getByLabelText("Valor inicial"), { target: { value: "2" } });
  fireEvent.click(screen.getByText("Probar este recurso"));
  expect(await screen.findByRole("img", { name: /de -4 a 8, valor seleccionado 2/ })).toBeInTheDocument();
  fireEvent.change(screen.getByRole("slider", { name: /Valor/ }), { target: { value: "5" } });
  expect(screen.getByRole("img", { name: /valor seleccionado 5/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Añadir recurso interactivo" }));
  const second = screen.getAllByRole("article")[1];
  fireEvent.change(within(second).getByLabelText("Modelo"), { target: { value: "probability" } });
  expect(within(second).getByLabelText("Título del recurso")).toHaveValue("Probabilidad");
  fireEvent.click(screen.getByRole("button", { name: "Subir recurso 2" }));
  expect(within(screen.getAllByRole("article")[0]).getByLabelText("Modelo")).toHaveValue("probability");
  fireEvent.click(screen.getByRole("button", { name: "Quitar recurso 1" }));
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByLabelText("Mínimo")).toHaveValue(-4);
  expect(screen.getByLabelText("Máximo")).toHaveValue(8);
  expect(screen.getByLabelText("Valor inicial")).toHaveValue(2);
});

test("un modelo de las clases integradas se puede explorar en la vista previa", async () => {
  render(<Editor />);
  fireEvent.click(screen.getByRole("button", { name: "Añadir recurso interactivo" }));
  fireEvent.change(screen.getByLabelText("Buscar modelo por tema o nombre"), { target: { value: "probabilidad" } });
  expect(screen.queryByRole("option", { name: "Fracciones", hidden: true })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Modelo"), { target: { value: "probability" } });
  fireEvent.click(screen.getByText("Probar este recurso"));
  const red = await screen.findByLabelText(/Fichas rojas/, {}, { timeout: 10000 });
  fireEvent.change(red, { target: { value: "5" } });
  expect(screen.getByRole("img", { name: "5 fichas rojas y 5 azules" })).toBeInTheDocument();
});
