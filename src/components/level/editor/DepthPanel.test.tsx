import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DepthPanel } from "./DepthPanel";
import { emptyTestLevel, TestLevelEditorProvider } from "@/test/mocks/levelEditorHarness";

/**
 * Reporte del usuario ("no funciona el efecto parallax ni las capas ni los
 * efectos"): `addLayer()` ponía `depth: 0.5` por defecto, y con `depth < 1`
 * la capa se dibuja DETRÁS del fondo principal (`BackgroundLayer.tsx`) — con
 * el fondo opaco de punta a punta que tiene casi cualquier nivel, la capa
 * queda invisible. Cubre solo eso: el valor por defecto de una capa nueva y
 * el aviso cuando el autor elige `depth < 1` a propósito.
 */
vi.mock("./LevelEditorProvider", async () => {
  const harness = await import("@/test/mocks/levelEditorHarness");
  return { LevelEditorProvider: harness.TestLevelEditorProvider, useLevelEditor: harness.useTestLevelEditor };
});

vi.mock("@/components/family/FamilyProvider", () => ({
  useFamily: () => ({
    parentId: "padre-de-prueba",
    children: [],
    loadingChildren: false,
    selectedChildId: undefined,
    setSelectedChildId: () => {},
    selectedChild: undefined,
  }),
}));

describe("DepthPanel — profundidad por defecto de una capa nueva", () => {
  test("una capa nueva se crea con profundidad > 1 (primer plano, visible sobre el fondo)", async () => {
    const user = userEvent.setup();
    render(
      <TestLevelEditorProvider level={emptyTestLevel()}>
        <DepthPanel />
      </TestLevelEditorProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Añadir capa" }));

    const depthInput = screen.getByLabelText(/Profundidad/);
    expect(depthInput).toHaveValue(1.2);
    expect(screen.queryByText(/queda DETRÁS del fondo/)).not.toBeInTheDocument();
  });

  test("bajar la profundidad a menos de 1 muestra el aviso de que queda detrás del fondo", async () => {
    const user = userEvent.setup();
    render(
      <TestLevelEditorProvider level={emptyTestLevel()}>
        <DepthPanel />
      </TestLevelEditorProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Añadir capa" }));
    const depthInput = screen.getByLabelText(/Profundidad/);
    await user.clear(depthInput);
    await user.type(depthInput, "0.5");

    expect(screen.getByText(/queda DETRÁS del fondo/)).toBeInTheDocument();
  });

  test("una capa nueva se crea con escala 100 (cubre toda la escena, como antes)", async () => {
    const user = userEvent.setup();
    render(
      <TestLevelEditorProvider level={emptyTestLevel()}>
        <DepthPanel />
      </TestLevelEditorProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Añadir capa" }));

    expect(screen.getByLabelText(/Escala/)).toHaveValue(100);
  });
});
