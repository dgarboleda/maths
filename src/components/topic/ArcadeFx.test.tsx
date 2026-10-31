import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useEffect, useRef } from "react";
import { ArcadeFinalScore, ArcadeFxLayer, ArcadeScoreBar, useArcadeFx, type ArcadeFx } from "./ArcadeFx";
import { readArcadeBest, resetArcadeBestCache } from "@/lib/minigames/arcadeScore";
import { readArcadeLevel, resetArcadeLevelCache, setArcadeCalm } from "@/lib/minigames/arcadeLevel";
import { createArcadeSession, type ArcadeSession } from "@/lib/minigames/lessonExercise";

const sounds: string[] = [];
vi.mock("@/lib/gameSound", () => ({ playSound: (type: string, enabled: boolean) => enabled && sounds.push(type) }));
const confetti = vi.fn();
vi.mock("@/lib/confetti", () => ({ triggerConfetti: (...args: unknown[]) => confetti(...args) }));

const current: { fx: ArcadeFx | null } = { fx: null };
function Capture({ value }: { value: ArcadeFx }) {
  useEffect(() => {
    current.fx = value;
  });
  return null;
}
function Harness({ solved = false, soundOn = true, session }: { solved?: boolean; soundOn?: boolean; session?: ArcadeSession }) {
  const cabinetRef = useRef<HTMLDivElement>(null);
  const fx = useArcadeFx({ game: "snake", soundOn, solved, cabinetRef, session });
  return (
    <div ref={cabinetRef}>
      <Capture value={fx} />
      <ArcadeScoreBar fx={fx} />
      <div style={{ position: "relative" }}><ArcadeFxLayer fx={fx} /></div>
      <ArcadeFxLayer fx={fx} scope="cabinet" />
      <ArcadeFinalScore fx={fx} />
    </div>
  );
}

/** Última versión del hook renderizada. */
const fx = new Proxy({} as ArcadeFx, { get: (_, key) => current.fx![key as keyof ArcadeFx] });

describe("useArcadeFx", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    resetArcadeBestCache();
    resetArcadeLevelCache();
    sounds.length = 0;
    confetti.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  test("suma puntos con combo, muestra efectos y los retira", () => {
    const { container } = render(<Harness />);
    act(() => fx.start());
    expect(container.querySelector(".arcade-banner")).toHaveTextContent("¡YA!");
    act(() => {
      for (let i = 0; i < 4; i++) fx.award(10, { x: 10, y: 10 });
    });
    // 10 + 10 + 10 con cadena 0–2, y 20 al llegar a ×2.
    expect(fx.score).toBe(50);
    expect(container.querySelector("[data-arcade-score]")).toHaveAttribute("data-arcade-score", "50");
    expect(screen.getAllByText("¡Combo ×2!").length).toBeGreaterThan(0);
    expect(sounds).toContain("combo");
    act(() => vi.advanceTimersByTime(1200));
    expect(container.querySelector(".arcade-pop, .arcade-banner")).toBeNull();
  });

  test("un fallo de reflejos corta la cadena sin restar puntos", () => {
    render(<Harness />);
    act(() => fx.start());
    act(() => {
      fx.award(10);
      fx.award(10);
      fx.oops({ x: 50, y: 50 });
    });
    expect(fx.score).toBe(20);
    expect(fx.combo).toBe(0);
    expect(sounds).toContain("crash");
  });

  test("ganar suma el bonus de meta y guarda el récord local", () => {
    render(<Harness />);
    act(() => fx.start());
    act(() => fx.award(100));
    act(() => fx.end(true));
    // 100 + 500 de meta + 300 «Sin daño».
    expect(fx.total).toBe(900);
    expect(fx.noDamageBonus).toBe(300);
    expect(fx.record).toBe(true);
    expect(readArcadeBest("snake")).toBe(900);
    expect(screen.getByText(/¡Nuevo récord!/)).toHaveTextContent("00900");
    expect(fx.levelUp).toBe(2);
    expect(readArcadeLevel("snake")).toBe(2);
  });

  test("en la clase celebra solo cuando el servidor resuelve el ejercicio", () => {
    const { rerender } = render(<Harness solved={false} />);
    act(() => fx.start());
    act(() => fx.award(40));
    expect(confetti).not.toHaveBeenCalled();
    rerender(<Harness solved />);
    expect(confetti).toHaveBeenCalledTimes(1);
    expect(sounds).toContain("fanfare");
    expect(fx.total).toBe(840);
    expect(readArcadeBest("snake")).toBe(840);
    expect(readArcadeLevel("snake")).toBe(2);
    expect(fx.levelUp).toBe(2);
  });

  test("respeta el sonido desactivado", () => {
    render(<Harness soundOn={false} />);
    act(() => {
      fx.start();
      fx.award(10);
      fx.oops();
    });
    expect(sounds).toEqual([]);
  });

  test("conserva los puntos al pasar a otra pregunta de la misma sesión", () => {
    const session = createArcadeSession();
    const first = render(<Harness session={session} />);
    act(() => fx.start());
    act(() => fx.award(40));
    first.rerender(<Harness session={session} solved />);
    expect(session.begin("snake")).toBe(840);
    first.unmount();
    render(<Harness session={session} />);
    act(() => fx.start());
    expect(fx.score).toBe(840);
    act(() => fx.award(10));
    expect(session.begin("snake")).toBe(850);
  });

  test("los choques restan corazones y quitan el bonus «Sin daño», sin terminar nada", () => {
    render(<Harness />);
    act(() => fx.start());
    act(() => {
      fx.award(100);
      fx.hit({ x: 50, y: 50 });
      fx.hit();
      fx.hit();
      fx.hit();
    });
    expect(fx.hearts).toBe(0);
    expect(fx.combo).toBe(0);
    expect(fx.score).toBe(100);
    act(() => fx.end(true));
    expect(fx.noDamageBonus).toBe(0);
    expect(fx.total).toBe(600);
    expect(screen.getByText("Medalla arcade:")).toBeInTheDocument();
    act(() => fx.start());
    expect(fx.hearts).toBe(3);
  });

  test("en modo tranquilo se juega en nivel 1 y el nivel no sube", () => {
    setArcadeCalm(true);
    render(<Harness />);
    act(() => fx.start());
    act(() => fx.end(true));
    expect(fx.level).toBe(1);
    expect(fx.levelUp).toBeNull();
    expect(readArcadeLevel("snake")).toBe(1);
  });
});
