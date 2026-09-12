import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LayersToolbox } from "./LayersToolbox";
import { setLayersToolboxOpen } from "./layersToolboxStore";
import { emptyTestLevel, TestLevelEditorProvider } from "@/test/mocks/levelEditorHarness";

/**
 * Antes esta lógica vivía en `DepthPanel.tsx` — se movió a la caja de
 * herramientas flotante `LayersToolbox` (botón "Capas" en `EditorBottomBar`)
 * para dejar de competir por espacio con el resto del panel de propiedades
 * angosto (256px). Mismo reporte del usuario original ("no funciona el
 * efecto parallax ni las capas ni los efectos"): `addLayer()` ponía
 * `depth: 0.5` por defecto, y con `depth < 1` la capa se dibuja DETRÁS del
 * fondo principal (`BackgroundLayer.tsx`) — invisible con un fondo opaco de
 * punta a punta.
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

afterEach(() => {
  setLayersToolboxOpen(false);
});

describe("LayersToolbox — profundidad por defecto de una capa nueva", () => {
  test("una capa nueva se crea con profundidad > 1 (primer plano, visible sobre el fondo)", async () => {
    setLayersToolboxOpen(true);
    const user = userEvent.setup();
    render(
      <TestLevelEditorProvider level={emptyTestLevel()}>
        <LayersToolbox />
      </TestLevelEditorProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Añadir capa" }));

    const depthInput = screen.getByLabelText(/Profundidad/);
    expect(depthInput).toHaveValue(1.2);
    expect(screen.queryByText(/queda DETRÁS del fondo/)).not.toBeInTheDocument();
  });

  test("bajar la profundidad a menos de 1 muestra el aviso de que queda detrás del fondo", async () => {
    setLayersToolboxOpen(true);
    const user = userEvent.setup();
    render(
      <TestLevelEditorProvider level={emptyTestLevel()}>
        <LayersToolbox />
      </TestLevelEditorProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Añadir capa" }));
    const depthInput = screen.getByLabelText(/Profundidad/);
    await user.clear(depthInput);
    await user.type(depthInput, "0.5");

    expect(screen.getByText(/queda DETRÁS del fondo/)).toBeInTheDocument();
  });

  test("una capa nueva se crea con escala 100 (cubre toda la escena, como antes)", async () => {
    setLayersToolboxOpen(true);
    const user = userEvent.setup();
    render(
      <TestLevelEditorProvider level={emptyTestLevel()}>
        <LayersToolbox />
      </TestLevelEditorProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Añadir capa" }));

    expect(screen.getByLabelText(/Escala/)).toHaveValue(100);
  });
});

describe("LayersToolbox — contraer/expandir", () => {
  test("contraer una capa oculta sus campos; expandirla los vuelve a mostrar", async () => {
    setLayersToolboxOpen(true);
    const user = userEvent.setup();
    render(
      <TestLevelEditorProvider level={emptyTestLevel()}>
        <LayersToolbox />
      </TestLevelEditorProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Añadir capa" }));
    expect(screen.getByText("Efecto")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Contraer Capa 1" }));
    expect(screen.queryByText("Efecto")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Expandir Capa 1" }));
    expect(screen.getByText("Efecto")).toBeInTheDocument();
  });
});

describe("LayersToolbox — nombre de la capa", () => {
  test("el nombre editado reemplaza el 'Capa N' por defecto en el encabezado", async () => {
    setLayersToolboxOpen(true);
    const user = userEvent.setup();
    render(
      <TestLevelEditorProvider level={emptyTestLevel()}>
        <LayersToolbox />
      </TestLevelEditorProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Añadir capa" }));
    const nameInput = screen.getByLabelText("Nombre de la capa 1");
    await user.type(nameInput, "Nubes lejanas");

    expect(nameInput).toHaveValue("Nubes lejanas");
    expect(screen.getByRole("button", { name: "Contraer Nubes lejanas" })).toBeInTheDocument();
  });
});

describe("LayersToolbox — reordenar por arrastre", () => {
  test("arrastrar una capa sobre otra invierte su orden en la lista", async () => {
    setLayersToolboxOpen(true);
    const user = userEvent.setup();
    const { container } = render(
      <TestLevelEditorProvider level={emptyTestLevel()}>
        <LayersToolbox />
      </TestLevelEditorProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Añadir capa" }));
    await user.click(screen.getByRole("button", { name: "Añadir capa" }));
    await user.type(screen.getByLabelText("Nombre de la capa 1"), "Nube");
    await user.type(screen.getByLabelText("Nombre de la capa 2"), "Montaña");

    const cards = container.querySelectorAll('[draggable="true"]');
    const handles = container.querySelectorAll('[data-drag-handle="true"]');
    expect(cards).toHaveLength(2);
    expect(handles).toHaveLength(2);

    const dataTransfer = { effectAllowed: "", setData: vi.fn() };
    fireEvent.dragStart(handles[1], { dataTransfer }); // arranca desde "Montaña" (2da)
    fireEvent.dragOver(cards[0], { dataTransfer }); // la lleva sobre "Nube" (1ra)
    fireEvent.drop(cards[0], { dataTransfer });

    const names = screen.getAllByLabelText(/Nombre de la capa \d/).map((el) => (el as HTMLInputElement).value);
    expect(names).toEqual(["Montaña", "Nube"]);
  });
});

describe("LayersToolbox — mostrar/ocultar", () => {
  test("no renderiza nada mientras está cerrada", () => {
    setLayersToolboxOpen(false);
    render(
      <TestLevelEditorProvider level={emptyTestLevel()}>
        <LayersToolbox />
      </TestLevelEditorProvider>,
    );

    expect(screen.queryByRole("dialog", { name: "Capas de fondo" })).not.toBeInTheDocument();
  });

  test("se puede cerrar con el botón de la propia caja", async () => {
    setLayersToolboxOpen(true);
    const user = userEvent.setup();
    render(
      <TestLevelEditorProvider level={emptyTestLevel()}>
        <LayersToolbox />
      </TestLevelEditorProvider>,
    );

    expect(screen.getByRole("dialog", { name: "Capas de fondo" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cerrar caja de capas" }));
    expect(screen.queryByRole("dialog", { name: "Capas de fondo" })).not.toBeInTheDocument();
  });
});
