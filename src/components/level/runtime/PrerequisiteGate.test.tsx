import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { PrerequisiteGate } from "./PrerequisiteGate";
import type { ModuleDef } from "@/lib/curriculum";

function mockModule(id: string, label: string): ModuleDef {
  return {
    id,
    strandSlug: "aritmetica",
    difficulty: 1,
    label,
    emoji: "🔢",
    tier: 1,
    prerequisites: [],
    generateProblem: () => ({ id: "p1", difficulty: 1, kind: "test", prompt: "1+1", answer: 2, inputType: "integer" }),
    ConceptComponent: () => null,
  };
}

describe("PrerequisiteGate", () => {
  test("lista los módulos faltantes y enlaza a entrenar el primero", () => {
    const missing = [mockModule("aritmetica-d1", "Sumas básicas"), mockModule("aritmetica-d2", "Restas básicas")];
    render(
      <PrerequisiteGate
        mod={mockModule("aritmetica-d3", "Multiplicación")}
        entity={undefined}
        childId="hijo-1"
        missing={missing}
        titleId="titulo-1"
        dialogRef={createRef()}
        onKeyDown={() => {}}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText("Sumas básicas")).toBeInTheDocument();
    expect(screen.getByText("Restas básicas")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ir a entrenar Sumas básicas/ })).toBeInTheDocument();
  });

  test('"Salir" llama a onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <PrerequisiteGate
        mod={mockModule("aritmetica-d3", "Multiplicación")}
        entity={undefined}
        childId="hijo-1"
        missing={[mockModule("aritmetica-d1", "Sumas básicas")]}
        titleId="titulo-1"
        dialogRef={createRef()}
        onKeyDown={() => {}}
        onClose={onClose}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Salir" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
