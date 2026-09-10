import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorScreen from "./error";

describe("ErrorScreen", () => {
  test("muestra el mensaje y reintenta al pulsar el botón", async () => {
    const retry = vi.fn();
    render(<ErrorScreen error={new Error("boom")} retry={retry} />);

    expect(screen.getByRole("heading", { name: "Algo se rompió" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
