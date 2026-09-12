import { describe, expect, test } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BackgroundLayer } from "./BackgroundLayer";
import type { LevelBackground, LevelBackgroundLayer } from "@/lib/level/schema";

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

function mockLayer(overrides: Partial<LevelBackgroundLayer> = {}): LevelBackgroundLayer {
  return { id: "capa-1", src: "https://example.com/nube.webp", depth: 1.2, offsetY: 0, opacity: 1, scale: 100, loop: false, effect: "none", ...overrides };
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

  test("con scale 100 (default) la imagen de una capa cubre la escena entera (object-cover)", () => {
    const { container } = render(<BackgroundLayer background={mockBackground({ layers: [mockLayer({ scale: 100 })] })} />);
    const layerImg = container.querySelector('img[src="https://example.com/nube.webp"]') as HTMLElement;
    expect(layerImg).toHaveClass("object-cover", "w-full");
  });

  test("con scale menor a 100 la imagen de una capa se achica y centra en vez de cubrir todo", () => {
    const { container } = render(<BackgroundLayer background={mockBackground({ layers: [mockLayer({ scale: 25 })] })} />);
    const layerImg = container.querySelector('img[src="https://example.com/nube.webp"]') as HTMLElement;
    expect(layerImg).not.toHaveClass("object-cover");
    expect(layerImg.style.width).toBe("25%");
    expect(layerImg.style.left).toBe("50%");
  });
});
