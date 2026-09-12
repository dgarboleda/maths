import { describe, expect, test, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useArrowKeys } from "./useArrowKeys";

function fireKey(code: string, opts: Partial<KeyboardEventInit> = {}) {
  window.dispatchEvent(new KeyboardEvent("keydown", { code, ...opts }));
}

describe("useArrowKeys", () => {
  test("dispara el handler de la dirección presionada", () => {
    const up = vi.fn();
    renderHook(() => useArrowKeys({ up }, { enabled: true }));
    fireKey("ArrowUp");
    expect(up).toHaveBeenCalledTimes(1);
  });

  test("WASD dispara el mismo handler direccional que las flechas", () => {
    const left = vi.fn();
    renderHook(() => useArrowKeys({ left }, { enabled: true }));
    fireKey("KeyA");
    expect(left).toHaveBeenCalledTimes(1);
  });

  test("ignora la auto-repetición del sistema operativo (e.repeat)", () => {
    const down = vi.fn();
    renderHook(() => useArrowKeys({ down }, { enabled: true }));
    fireKey("ArrowDown", { repeat: true });
    expect(down).not.toHaveBeenCalled();
  });

  test("no hace nada si enabled es false", () => {
    const right = vi.fn();
    renderHook(() => useArrowKeys({ right }, { enabled: false }));
    fireKey("ArrowRight");
    expect(right).not.toHaveBeenCalled();
  });

  test("deja de escuchar tras desmontar", () => {
    const action = vi.fn();
    const { unmount } = renderHook(() => useArrowKeys({ action }, { enabled: true }));
    unmount();
    fireKey("Space");
    expect(action).not.toHaveBeenCalled();
  });

  test("una tecla sin handler asignado no revienta", () => {
    renderHook(() => useArrowKeys({ up: vi.fn() }, { enabled: true }));
    expect(() => fireKey("ArrowDown")).not.toThrow();
  });
});
