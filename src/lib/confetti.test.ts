import { afterEach, describe, expect, test, vi } from "vitest";
import { triggerConfetti } from "./confetti";

/** Fase 31 (docs/plan-jugabilidad.md §5). jsdom no implementa un contexto
 *  2D real (sin el paquete `canvas`, `getContext` devuelve `null`), así que
 *  no se puede contar partículas acá — lo que sí se puede probar sin eso es
 *  el corte por `prefers-reduced-motion` (WCAG 2.3.3), que debe seguir
 *  cortando TODO antes de crear ningún canvas, para las tres intensidades. */
function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    media: "",
    addEventListener: () => {},
    removeEventListener: () => {},
  }) as unknown as typeof window.matchMedia;
}

describe("triggerConfetti", () => {
  afterEach(() => {
    document.querySelectorAll("canvas").forEach((c) => c.remove());
  });

  test.each(["small", "medium", "big"] as const)('con preferencia de reducir movimiento, "%s" no crea ningún canvas', (intensity) => {
    mockReducedMotion(true);
    triggerConfetti(intensity);
    expect(document.body.querySelector("canvas")).toBeNull();
  });

  test.each(["small", "medium", "big"] as const)('sin esa preferencia, "%s" no revienta y llega a pedir el canvas', (intensity) => {
    mockReducedMotion(false);
    const appendSpy = vi.spyOn(document.body, "appendChild");
    expect(() => triggerConfetti(intensity)).not.toThrow();
    expect(appendSpy).toHaveBeenCalled();
    appendSpy.mockRestore();
  });

  test('sin argumento, el default es "small" — mismo comportamiento de siempre', () => {
    mockReducedMotion(false);
    expect(() => triggerConfetti()).not.toThrow();
  });
});
