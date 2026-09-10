import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LevelEditorError from "./error";

describe("LevelEditorError", () => {
  test("dice que el borrador local sigue guardado y reintenta", async () => {
    const retry = vi.fn();
    render(<LevelEditorError error={new Error("boom")} retry={retry} />);

    expect(screen.getByRole("heading", { name: "El editor tuvo un problema" })).toBeVisible();
    expect(screen.getByText(/sigue guardado en este navegador/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Volver a la lista de niveles" })).toHaveAttribute(
      "href",
      "/panel/editor",
    );

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
