import { describe, expect, test, vi } from "vitest";
import { fireEvent, renderHook } from "@testing-library/react";
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

  test("no captura escritura, modificadores ni la activación nativa de botones", () => {
    const action = vi.fn(), left = vi.fn();
    renderHook(() => useArrowKeys({ action, left }, { enabled: true }));
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    const child = document.createElement("span");
    editable.append(child);
    document.body.append(editable);
    const button = document.createElement("button");
    document.body.append(button);
    fireEvent.keyDown(child, { code: "KeyA" });
    fireKey("KeyA", { ctrlKey: true });
    fireKey("KeyA", { metaKey: true });
    fireKey("KeyA", { altKey: true });
    fireKey("KeyA", { isComposing: true });
    fireEvent.keyDown(button, { code: "Space" });
    expect(left).not.toHaveBeenCalled();
    expect(action).not.toHaveBeenCalled();
    fireKey("Space");
    expect(action).toHaveBeenCalledTimes(1);
    editable.remove(); button.remove();
  });
});
