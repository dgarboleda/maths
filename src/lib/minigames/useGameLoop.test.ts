import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGameLoop } from "./useGameLoop";

/**
 * Fase 36 (docs/plan-minijuegos-retro.md) — bucle de juego compartido por
 * los minijuegos arcade. Se prueba con timers falsos: `requestAnimationFrame`
 * está entre los timers que `vi.useFakeTimers()` reemplaza por defecto.
 */
describe("useGameLoop", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("no llama a onTick mientras running es false", () => {
    const onTick = vi.fn();
    renderHook(() => useGameLoop(onTick, { running: false }));
    vi.advanceTimersByTime(200);
    expect(onTick).not.toHaveBeenCalled();
  });

  test("llama a onTick en frames sucesivos mientras running es true", () => {
    const onTick = vi.fn();
    renderHook(() => useGameLoop(onTick, { running: true }));
    vi.advanceTimersByTime(200);
    expect(onTick.mock.calls.length).toBeGreaterThan(0);
    for (const [dtMs] of onTick.mock.calls) {
      expect(dtMs).toBeGreaterThanOrEqual(0);
    }
  });

  test("deja de llamar a onTick tras desmontar", () => {
    const onTick = vi.fn();
    const { unmount } = renderHook(() => useGameLoop(onTick, { running: true }));
    vi.advanceTimersByTime(50);
    const callsBeforeUnmount = onTick.mock.calls.length;
    unmount();
    vi.advanceTimersByTime(200);
    expect(onTick.mock.calls.length).toBe(callsBeforeUnmount);
  });

  test("deja de llamar a onTick si running pasa a false", () => {
    const onTick = vi.fn();
    const { rerender } = renderHook(({ running }) => useGameLoop(onTick, { running }), {
      initialProps: { running: true },
    });
    vi.advanceTimersByTime(50);
    const callsWhileRunning = onTick.mock.calls.length;
    rerender({ running: false });
    vi.advanceTimersByTime(200);
    expect(onTick.mock.calls.length).toBe(callsWhileRunning);
  });
});
