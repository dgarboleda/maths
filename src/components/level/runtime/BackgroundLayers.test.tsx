import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import { BackgroundLayers, WeatherEffects } from "./BackgroundLayers";
import type { LevelBackgroundLayer } from "@/lib/level/schema";

/**
 * Reporte del usuario ("se ven los límites rectangulares [del efecto]... al
 * caminar y salir del marco"): el efecto de clima de una capa vivía dentro
 * de la misma caja paneada por parallax que su imagen — con `depth` != 1
 * quedaba desalineada del viewport al panear la cámara. Ahora `WeatherEffects`
 * es un componente aparte, anclado al viewport (`inset-0`), independiente de
 * `sceneBox`/`pose`. Cubre solo eso: que la imagen y el efecto de una capa
 * ya no comparten caja, y que `WeatherEffects` no depende de la posición del
 * jugador para decidir qué pintar.
 */
const sceneBox = { left: -200, top: -50, width: 2000, height: 1200 };

function layer(overrides: Partial<LevelBackgroundLayer> = {}): LevelBackgroundLayer {
  return { id: "capa-1", src: "", depth: 0.5, offsetY: 0, opacity: 1, scale: 100, loop: false, effect: "none", ...overrides };
}

describe("BackgroundLayers", () => {
  test("no pinta nada para una capa sin imagen (solo efecto)", () => {
    const { container } = render(<BackgroundLayers layers={[layer({ effect: "rain" })]} sceneBox={sceneBox} pose={{ x: 50, y: 50, facing: "right" }} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("pinta la imagen de una capa con src, paneada según su profundidad", () => {
    const { container } = render(<BackgroundLayers layers={[layer({ src: "https://example.com/nube.webp" })]} sceneBox={sceneBox} pose={{ x: 50, y: 50, facing: "right" }} />);
    expect(container.querySelector("img")).toHaveAttribute("src", "https://example.com/nube.webp");
  });

  test("con scale 100 (default) la imagen cubre la caja entera (object-cover)", () => {
    const { container } = render(<BackgroundLayers layers={[layer({ src: "https://example.com/nube.webp", scale: 100 })]} sceneBox={sceneBox} pose={{ x: 50, y: 50, facing: "right" }} />);
    expect(container.querySelector("img")).toHaveClass("object-cover", "w-full");
  });

  test("con scale menor a 100 (reporte: 'la nube cubre toda la imagen, ¿se puede cambiar su tamaño?') la imagen se achica y centra en vez de cubrir todo", () => {
    const { container } = render(<BackgroundLayers layers={[layer({ src: "https://example.com/nube.webp", scale: 30 })]} sceneBox={sceneBox} pose={{ x: 50, y: 50, facing: "right" }} />);
    const img = container.querySelector("img") as HTMLElement;
    expect(img).not.toHaveClass("object-cover");
    expect(img.style.width).toBe("30%");
    expect(img.style.left).toBe("50%");
  });
});

describe("WeatherEffects — ancladas al viewport, no al mundo paneado", () => {
  test("no pinta nada si ninguna capa tiene efecto", () => {
    const { container } = render(<WeatherEffects layers={[layer({ src: "https://example.com/nube.webp" })]} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("pinta el efecto de una capa que lo tiene, sin depender de sceneBox/pose", () => {
    const { container } = render(<WeatherEffects layers={[layer({ effect: "rain" })]} />);
    expect(container.querySelector(".anim-rain")).toBeInTheDocument();
  });

  test("pinta un efecto por cada capa activa, aunque no tengan imagen", () => {
    const { container } = render(<WeatherEffects layers={[layer({ id: "a", effect: "fog" }), layer({ id: "b", effect: "snow" })]} />);
    expect(container.querySelector(".anim-fog-layer")).toBeInTheDocument();
    expect(container.querySelector(".anim-snow")).toBeInTheDocument();
  });
});
