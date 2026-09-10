import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JugarError from "./error";

vi.mock("next/navigation", () => ({
  useParams: () => ({ childId: "nino-1" }),
}));

describe("JugarError", () => {
  test("ofrece volver al mapa del hijo actual y reintentar", async () => {
    const retry = vi.fn();
    render(<JugarError error={new Error("boom")} retry={retry} />);

    expect(screen.getByRole("heading", { name: "¡Uy! Algo salió mal" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Volver al mapa" })).toHaveAttribute("href", "/jugar/nino-1/mapa");
    expect(screen.getByRole("link", { name: "Volver a perfiles" })).toHaveAttribute("href", "/perfiles");

    await userEvent.click(screen.getByRole("button", { name: "Intentar de nuevo" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
