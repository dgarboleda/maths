import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { getAdventure } from "@/lib/learning/core";
import { AdventureVisual } from "./AdventureVisual";

test("el esquema de la feria refleja el plan editado", () => {
  const adventure = getAdventure("feria-energia")!;
  const { rerender } = render(<AdventureVisual adventure={adventure} values={["6", "4"]} />);
  expect(screen.getByText("Producción: 2 × 6 + 5 × 4 = 32 kW")).toBeInTheDocument();
  rerender(<AdventureVisual adventure={adventure} values={["7", "4"]} />);
  expect(screen.getByText("Producción: 2 × 7 + 5 × 4 = 34 kW")).toBeInTheDocument();
  rerender(<AdventureVisual adventure={adventure} values={["", "4"]} />);
  expect(screen.getByText(/Escribe números enteros dentro/)).toBeInTheDocument();
});

test("el plano del dron identifica la estación propuesta", () => {
  render(<AdventureVisual adventure={getAdventure("ruta-dron")!} values={["6", "4"]} />);
  expect(screen.getByRole("img", { name: /estación propuesta en 6, 4/ })).toBeInTheDocument();
});


test("el esquema de alertas no presenta como correcto un reparto equivocado", () => {
  render(<AdventureVisual adventure={getAdventure("alerta-meteorologica")!} values={["3", "75"]} />);
  expect(screen.getByText("Tu reparto de días lluviosos: 15 con alerta + 3 sin alerta = 18; el total real es 20")).toBeInTheDocument();
});
