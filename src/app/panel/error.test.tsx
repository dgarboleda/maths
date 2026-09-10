import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PanelError from "./error";

describe("PanelError", () => {
  test("muestra el mensaje, reintenta y ofrece volver al panel", async () => {
    const retry = vi.fn();
    render(<PanelError error={new Error("boom")} retry={retry} />);

    expect(screen.getByRole("heading", { name: "Algo se rompió" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Volver al resumen" })).toHaveAttribute("href", "/panel");

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
