import { describe, expect, test } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BackgroundLayer } from "./BackgroundLayer";
import type { LevelBackground } from "@/lib/level/schema";

function mockBackground(overrides: Partial<LevelBackground> = {}): LevelBackground {
  return {
    src: "https://example.com/fondo.webp",
    alt: "Ciudad",
    width: 1024,
    height: 768,
    projection: "flat",
    layers: [],
    filters: [],
    ...overrides,
  };
}

describe("BackgroundLayer", () => {
  test("muestra la imagen mientras carga bien", () => {
    render(<BackgroundLayer background={mockBackground()} />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "https://example.com/fondo.webp");
  });

  test("si la imagen falla al cargar (p. ej. se borró), muestra un aviso en vez del icono roto del navegador", () => {
    render(<BackgroundLayer background={mockBackground()} />);
    fireEvent.error(screen.getByRole("img"));

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("Imagen de fondo no disponible")).toBeInTheDocument();
  });
});
