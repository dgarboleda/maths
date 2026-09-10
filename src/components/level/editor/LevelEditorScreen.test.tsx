import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { getEntityType, createEntityDefaults } from "@/lib/level/entities";
import type { LevelEntity } from "@/lib/level/schema";
import { LevelEditorScreen } from "./LevelEditorScreen";
import { emptyTestLevel, TestLevelEditorProvider } from "@/test/mocks/levelEditorHarness";

/**
 * Detalles de UI del editor (deshacer/rehacer, atajos de teclado,
 * recuperación de borrador, panel de propiedades) — antes en
 * `e2e/editor.spec.ts` sobre un navegador real + Firestore; acá se
 * ejercitan sobre el `editorReducer` real (ver `levelEditorHarness.tsx`)
 * sin Firebase, porque ninguno de estos comportamientos depende de la red.
 * El recorrido de autoría completo por UI (crear nivel, dibujar, vincular
 * un desafío real, guardar, Play Test) sigue en `e2e/` como uno de los
 * recorridos núcleo.
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

function palanca(id: string, x: number, y: number): LevelEntity {
  const typeDef = getEntityType("palanca");
  return { id, type: "palanca", name: `Palanca ${id}`, position: { x, y }, ...createEntityDefaults(typeDef) };
}

describe("LevelEditorScreen — atajos de teclado y deshacer/rehacer (§5.6/§17 Fase 13, K8)", () => {
  test("w/b/v seleccionan herramienta y marcan aria-pressed en el botón correspondiente", async () => {
    const user = userEvent.setup();
    render(
      <TestLevelEditorProvider level={emptyTestLevel()}>
        <LevelEditorScreen />
      </TestLevelEditorProvider>,
    );

    await user.keyboard("w");
    expect(screen.getByRole("button", { name: "Área transitable" })).toHaveAttribute("aria-pressed", "true");

    await user.keyboard("{Escape}");
    await user.keyboard("b");
    expect(screen.getByRole("button", { name: "Zona prohibida" })).toHaveAttribute("aria-pressed", "true");

    await user.keyboard("{Escape}");
    await user.keyboard("v");
    expect(screen.getByRole("button", { name: "Área transitable" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Zona prohibida" })).toHaveAttribute("aria-pressed", "false");
  });

  test("Ctrl+D duplica la entidad seleccionada, y Ctrl+Z deshace la duplicación", async () => {
    const user = userEvent.setup();
    const level = { ...emptyTestLevel(), entities: [palanca("e1", 30, 30), palanca("e2", 70, 70)] };
    render(
      <TestLevelEditorProvider level={level}>
        <LevelEditorScreen />
      </TestLevelEditorProvider>,
    );

    const palancas = () => screen.getAllByRole("button", { name: /^Palanca e\d/ });
    expect(palancas()).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Palanca e2 — Abajo" }));
    await user.keyboard("{Control>}d{/Control}");
    expect(palancas()).toHaveLength(3);

    await user.keyboard("{Control>}z{/Control}");
    expect(palancas()).toHaveLength(2);
  });

  test("Tab recorre las entidades sin foco previo, y las flechas mueven la seleccionada (0.5%, 0.1% con Shift)", async () => {
    const user = userEvent.setup();
    const level = { ...emptyTestLevel(), entities: [palanca("e1", 30, 30), palanca("e2", 70, 70)] };
    render(
      <TestLevelEditorProvider level={level}>
        <LevelEditorScreen />
      </TestLevelEditorProvider>,
    );

    document.body.focus();
    await user.keyboard("{Tab}");
    const primera = screen.getByRole("button", { name: "Palanca e1 — Abajo" });
    expect(primera).toHaveClass("editor-selected");

    expect(primera).toHaveStyle({ left: "30%" });
    await user.keyboard("{ArrowRight}");
    expect(primera).toHaveStyle({ left: "30.5%" });

    await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
    expect(primera).toHaveStyle({ left: "30.6%" });
  });
});

describe("LevelEditorScreen — deshacer/rehacer sobre el nombre del nivel", () => {
  test("Ctrl+Z/Ctrl+Shift+Z deshacen y rehacen un cambio de nombre", async () => {
    const user = userEvent.setup();
    render(
      <TestLevelEditorProvider level={{ ...emptyTestLevel(), name: "Nivel original" }}>
        <LevelEditorScreen />
      </TestLevelEditorProvider>,
    );

    await user.clear(screen.getByLabelText("Nombre del nivel"));
    await user.type(screen.getByLabelText("Nombre del nivel"), "Nivel renombrado");
    await user.tab(); // blur: commitName solo aplica el cambio al perder foco
    expect(screen.getByLabelText("Nombre del nivel")).toHaveValue("Nivel renombrado");

    // El input se remonta con `key={state.level.name}` en cada cambio real
    // (EditorTopBar.tsx) — hay que volver a buscarlo después de cada
    // deshacer/rehacer, no reusar la referencia anterior.
    await user.keyboard("{Control>}z{/Control}");
    expect(screen.getByLabelText("Nombre del nivel")).toHaveValue("Nivel original");

    await user.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
    expect(screen.getByLabelText("Nombre del nivel")).toHaveValue("Nivel renombrado");
  });
});

describe("LevelEditorScreen — recuperación de borrador local", () => {
  test("ofrece Recuperar/Descartar cuando hay un borrador pendiente, y dispara el callback correspondiente", async () => {
    const user = userEvent.setup();
    const onApplyDraftRecovery = vi.fn();
    const onDismissDraftRecovery = vi.fn();
    render(
      <TestLevelEditorProvider
        level={emptyTestLevel()}
        draftRecovery={{ savedAt: Date.now(), level: emptyTestLevel() }}
        onApplyDraftRecovery={onApplyDraftRecovery}
        onDismissDraftRecovery={onDismissDraftRecovery}
      >
        <LevelEditorScreen />
      </TestLevelEditorProvider>,
    );

    expect(screen.getByText("Hay cambios locales sin guardar más recientes que el servidor.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Recuperar" }));
    expect(onApplyDraftRecovery).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Descartar" }));
    expect(onDismissDraftRecovery).toHaveBeenCalledOnce();
  });

  test("sin borrador pendiente, no se muestra ningún aviso", () => {
    render(
      <TestLevelEditorProvider level={emptyTestLevel()}>
        <LevelEditorScreen />
      </TestLevelEditorProvider>,
    );
    expect(screen.queryByText("Hay cambios locales")).not.toBeInTheDocument();
  });
});

describe("LevelEditorScreen — extensibilidad (criterio A10)", () => {
  test("el tipo de entidad de prueba 'palanca' aparece en el toolbox y su panel de propiedades es el genérico, sin switch", async () => {
    const user = userEvent.setup();
    const level = { ...emptyTestLevel(), entities: [palanca("e1", 50, 50)] };
    render(
      <TestLevelEditorProvider level={level}>
        <LevelEditorScreen />
      </TestLevelEditorProvider>,
    );

    // El botón del toolbox para colocar una palanca nueva — se genera solo
    // desde `listEntityTypes()`, sin tocar `EditorToolbox.tsx`.
    expect(screen.getByRole("button", { name: "Palanca" })).toBeVisible();

    const entidad = screen.getByRole("button", { name: "Palanca e1 — Abajo" });
    expect(entidad).toHaveAttribute("data-state", "abajo");
    await user.click(entidad);

    expect(screen.getByRole("heading", { name: "Palanca", level: 2 })).toBeVisible();
    expect(screen.getByLabelText("Etiqueta")).toHaveValue("Palanca");
  });
});

describe("LevelEditorScreen — accesibilidad (WCAG 2.1 A/AA)", () => {
  test("editor vacío, sin ninguna entidad seleccionada", async () => {
    const { container } = render(
      <TestLevelEditorProvider level={emptyTestLevel()}>
        <LevelEditorScreen />
      </TestLevelEditorProvider>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  test("panel de propiedades abierto, con una entidad seleccionada", async () => {
    const user = userEvent.setup();
    const level = { ...emptyTestLevel(), entities: [palanca("e1", 50, 50)] };
    const { container } = render(
      <TestLevelEditorProvider level={level}>
        <LevelEditorScreen />
      </TestLevelEditorProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Palanca e1 — Abajo" }));
    expect(screen.getByRole("heading", { name: "Palanca", level: 2 })).toBeVisible();
    expect(await axe(container)).toHaveNoViolations();
  });
});
