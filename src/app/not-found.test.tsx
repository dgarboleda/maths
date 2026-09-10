import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "./not-found";

describe("NotFound", () => {
  test("muestra el mensaje y un enlace al inicio", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { name: "Esta página no existe" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/");
  });
});
