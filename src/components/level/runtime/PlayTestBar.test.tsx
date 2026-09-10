import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlayTestBar } from "./PlayTestBar";

describe("PlayTestBar", () => {
  test("con un solo hijo: nombra al hijo, sin selector", () => {
    render(<PlayTestBar childId="nino-1" childName="Sofía" onReset={vi.fn()} onExit={vi.fn()} />);
    expect(screen.getByText("como Sofía")).toBeVisible();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  test("con más de un hijo: el selector cambia de hijo y remonta (llama a onReset)", async () => {
    const onSelectChild = vi.fn();
    const onReset = vi.fn();
    render(
      <PlayTestBar
        childId="nino-1"
        childName="Sofía"
        otherChildren={[{ id: "nino-2", name: "Tomás" }]}
        onSelectChild={onSelectChild}
        onReset={onReset}
        onExit={vi.fn()}
      />,
    );
    const select = screen.getByRole("combobox", { name: "Probar como" });
    await userEvent.selectOptions(select, "Tomás");
    expect(onSelectChild).toHaveBeenCalledWith("nino-2");
  });

  test("Reset y Salir invocan sus callbacks", async () => {
    const onReset = vi.fn();
    const onExit = vi.fn();
    render(<PlayTestBar childId="nino-1" childName="Sofía" onReset={onReset} onExit={onExit} />);
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    await userEvent.click(screen.getByRole("button", { name: "Salir" }));
    expect(onReset).toHaveBeenCalledOnce();
    expect(onExit).toHaveBeenCalledOnce();
  });
});
