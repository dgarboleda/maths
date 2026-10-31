"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type RefObject } from "react";
import { playSound, type SoundType } from "@/lib/gameSound";
import { triggerConfetti } from "@/lib/confetti";
import { prefersReducedMotion } from "@/lib/motion";
import {
  comboMultiplier,
  formatScore,
  pointsFor,
  readArcadeBest,
  saveArcadeBest,
  SOLVE_BONUS,
  subscribeArcadeBest,
} from "@/lib/minigames/arcadeScore";
import type { ArcadeSession, PracticeGame } from "@/lib/minigames/lessonExercise";
import { arcadeMedal, MEDALS, raiseArcadeLevel, readArcadeLevel, subscribeArcadeLevel as subscribeLevel, useArcadeLevel } from "@/lib/minigames/arcadeLevel";

/**
 * Capa arcade común de los nueve minijuegos: marcador, combo, récord local,
 * textos flotantes, partículas, sacudida y efectos de sonido.
 *
 * Todo es presentación. Ninguna colisión, respuesta ni premio depende de un
 * efecto: los juegos llaman a esta capa después de decidir qué pasó. Con
 * «reducir movimiento» no hay partículas ni sacudida y los textos aparecen
 * sin desplazarse.
 */

export type FxTone = "good" | "bonus" | "bad" | "info";
type FxScope = "scene" | "cabinet";
export interface FxItem {
  id: number;
  kind: "pop" | "burst" | "banner";
  scope: FxScope;
  x: number;
  y: number;
  tone: FxTone;
  text?: string;
}

/** Posición en porcentaje del escenario donde se dibuja el efecto. */
export interface FxAt {
  x: number;
  y: number;
}

const LIFETIME = { pop: 850, burst: 650, banner: 1150 } as const;
export const MAX_HEARTS = 3;
/** Puntos por cerrar la partida sin perder ningún corazón. */
export const NO_DAMAGE_BONUS = 300;
const MAX_ITEMS = 14;
const CENTER: FxAt = { x: 50, y: 45 };

/** Centro de la celda (x, y) de una cuadrícula de `cols` × `rows`, en %. */
export function cellAt(x: number, y: number, cols: number, rows = cols): FxAt {
  return { x: ((x + 0.5) / cols) * 100, y: ((y + 0.5) / rows) * 100 };
}

interface ScoreOptions {
  /** Suma a la cadena del combo (por defecto, sí). */
  chain?: boolean;
  label?: string;
  tone?: FxTone;
  sound?: SoundType;
  /** Partículas en el punto (por defecto, sí). */
  burst?: boolean;
}

export interface ArcadeFx {
  items: FxItem[];
  score: number;
  combo: number;
  best: number | null;
  /** Puntos de la partida, con el bonus de meta si ya se cumplió. */
  total: number;
  record: boolean;
  /** Corazones de la partida (0–3). Solo cuestan puntos, nunca la respuesta. */
  hearts: number;
  /** Nivel con el que se juega (1 en modo tranquilo) y oleadas que suma. */
  level: number;
  boost: number;
  /** Nivel al que se subió al cerrar esta partida, si subió. */
  levelUp: number | null;
  /** Bonus «Sin daño» incluido en `total`. */
  noDamageBonus: number;
  /** Medalla arcade: 1 bronce, 2 plata, 3 oro. */
  medal: 1 | 2 | 3;
  start: (banner?: string) => void;
  award: (base: number, at?: FxAt, options?: ScoreOptions) => void;
  oops: (at?: FxAt, text?: string) => void;
  /** Choque con un peligro: como `oops` y además resta un corazón. */
  hit: (at?: FxAt, text?: string) => void;
  pop: (text: string, at?: FxAt, tone?: FxTone, scope?: FxScope) => void;
  banner: (text: string, tone?: FxTone) => void;
  burst: (at?: FxAt, tone?: FxTone) => void;
  shake: (strength?: number) => void;
  end: (won: boolean) => void;
}

/** `cabinetRef` es la máquina que se sacude; la crea el juego. */
export function useArcadeFx({ game, soundOn, solved = false, cabinetRef, session }: {
  game: PracticeGame;
  soundOn: boolean;
  solved?: boolean;
  cabinetRef: RefObject<HTMLDivElement | null>;
  session?: ArcadeSession;
}): ArcadeFx {
  const [items, setItems] = useState<FxItem[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [won, setWon] = useState(false);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const heartsRef = useRef(MAX_HEARTS);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [solvedLevelUp, setSolvedLevelUp] = useState<number | null>(null);
  const { effective: level, boost } = useArcadeLevel(game);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const seq = useRef(0);
  const timers = useRef(new Set<number>());
  const [bestAtStart, setBestAtStart] = useState<number | null>(null);
  const soundRef = useRef(soundOn);
  const best = useSyncExternalStore(subscribeArcadeBest, () => readArcadeBest(game), () => null);

  useEffect(() => {
    soundRef.current = soundOn;
  });

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) window.clearTimeout(timer);
      pending.clear();
    };
  }, []);

  // Clase: el servidor decide cuándo el ejercicio queda resuelto. Al pasar a
  // resuelto se celebra y se guarda el récord, sin estado nuevo en el efecto.
  const solvedBefore = useRef(solved);
  useEffect(() => {
    if (solved && !solvedBefore.current) {
      playSound("fanfare", soundRef.current);
      triggerConfetti("medium");
      const final = scoreRef.current + SOLVE_BONUS + (heartsRef.current === MAX_HEARTS ? NO_DAMAGE_BONUS : 0);
      saveArcadeBest(game, final);
      session?.update(game, final);
      raiseArcadeLevel(game);
    }
    solvedBefore.current = solved;
  }, [solved, game, session]);

  function push(item: Omit<FxItem, "id">) {
    const id = ++seq.current;
    setItems((list) => [...list.slice(-(MAX_ITEMS - 1)), { ...item, id }]);
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      setItems((list) => list.filter((entry) => entry.id !== id));
    }, LIFETIME[item.kind]);
    timers.current.add(timer);
  }

  function burst(at: FxAt = CENTER, tone: FxTone = "good") {
    if (prefersReducedMotion()) return;
    push({ kind: "burst", scope: "scene", x: at.x, y: at.y, tone });
  }

  function pop(text: string, at: FxAt = CENTER, tone: FxTone = "good", scope: FxScope = "scene") {
    push({ kind: "pop", scope, x: at.x, y: at.y, tone, text });
  }

  function banner(text: string, tone: FxTone = "info") {
    push({ kind: "banner", scope: "cabinet", x: 50, y: 40, tone, text });
  }

  function shake(strength = 6) {
    const el = cabinetRef.current;
    if (!el || prefersReducedMotion() || typeof el.animate !== "function") return;
    const s = strength;
    el.animate(
      [
        { transform: "translate(0, 0)" },
        { transform: `translate(${-s}px, ${s / 2}px)` },
        { transform: `translate(${s}px, ${-s / 2}px)` },
        { transform: `translate(${-s / 2}px, ${s / 3}px)` },
        { transform: "translate(0, 0)" },
      ],
      { duration: 280, easing: "ease-out" },
    );
  }

  function start(text = "¡YA!") {
    for (const timer of timers.current) window.clearTimeout(timer);
    timers.current.clear();
    setBestAtStart(readArcadeBest(game));
    scoreRef.current = session?.begin(game) ?? 0;
    comboRef.current = 0;
    setScore(scoreRef.current);
    setCombo(0);
    setWon(false);
    heartsRef.current = MAX_HEARTS;
    setHearts(MAX_HEARTS);
    setLevelUp(null);
    setSolvedLevelUp(readArcadeLevel(game));
    setItems([]);
    banner(text);
    playSound("whoosh", soundRef.current);
  }

  function award(base: number, at: FxAt = CENTER, options: ScoreOptions = {}) {
    const { chain = true, label, tone = "good", sound = "coin", burst: withBurst = true } = options;
    const before = comboMultiplier(comboRef.current);
    const gained = pointsFor(base, comboRef.current);
    if (chain) comboRef.current += 1;
    scoreRef.current += gained;
    session?.update(game, scoreRef.current);
    setScore(scoreRef.current);
    setCombo(comboRef.current);
    pop(label ?? `+${gained}`, at, tone);
    if (withBurst) burst(at, tone);
    const after = comboMultiplier(comboRef.current);
    if (after > before) {
      banner(`¡Combo ×${after}!`, "bonus");
      playSound("combo", soundRef.current);
    } else {
      playSound(sound, soundRef.current);
    }
  }

  function oops(at?: FxAt, text = "¡Uy!") {
    comboRef.current = 0;
    setCombo(0);
    if (at) pop(text, at, "bad");
    shake();
    playSound("crash", soundRef.current);
  }

  function hit(at?: FxAt, text = "¡Auch!") {
    heartsRef.current = Math.max(0, heartsRef.current - 1);
    setHearts(heartsRef.current);
    oops(at, text);
  }

  function end(didWin: boolean) {
    setWon(didWin);
    const bonus = didWin ? SOLVE_BONUS + (heartsRef.current === MAX_HEARTS ? NO_DAMAGE_BONUS : 0) : 0;
    saveArcadeBest(game, scoreRef.current + bonus);
    if (didWin) {
      const before = readArcadeLevel(game);
      const after = raiseArcadeLevel(game);
      if (after > before) {
        setLevelUp(after);
        banner(`¡Nivel ${after}!`, "bonus");
      }
    }
  }

  const closed = won || solved;
  const noDamageBonus = closed && hearts === MAX_HEARTS ? NO_DAMAGE_BONUS : 0;
  const total = score + (closed ? SOLVE_BONUS : 0) + noDamageBonus;
  // Clase: el nivel guardado sube al resolverse; se compara con el de inicio.
  const stored = useSyncExternalStore(subscribeLevel, () => readArcadeLevel(game), () => 1);
  const lessonLevelUp = solved && solvedLevelUp !== null && stored > solvedLevelUp ? stored : null;
  const record = total > 0 && total > (bestAtStart ?? 0);
  return {
    items, score, combo, best, total, record, hearts, level, boost, levelUp: levelUp ?? lessonLevelUp, noDamageBonus,
    medal: arcadeMedal(total, level),
    start, award, oops, hit, pop, banner, burst, shake, end,
  };
}

const PARTICLES = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2 + 0.3;
  const distance = 26 + (i % 3) * 12;
  return { dx: Math.cos(angle) * distance, dy: Math.sin(angle) * distance };
});

/** Efectos del escenario (`scene`) o de toda la máquina (`cabinet`). Es un
 *  `span` para no contar como casilla en los tableros de cuadrícula. El
 *  contenedor debe tener `position: relative`. */
export function ArcadeFxLayer({ fx, scope = "scene" }: { fx: ArcadeFx; scope?: FxScope }) {
  const shown = fx.items.filter((item) => item.scope === scope);
  return (
    <span aria-hidden="true" data-arcade-fx={scope} className={`arcade-fx-layer ${scope === "cabinet" ? "arcade-fx-cabinet" : ""}`}>
      {shown.map((item) =>
        item.kind === "burst" ? (
          <span key={item.id} className={`arcade-burst arcade-tone-${item.tone}`} style={{ left: `${item.x}%`, top: `${item.y}%` }}>
            {PARTICLES.map((p, i) => (
              <i key={i} className="arcade-particle" style={{ "--dx": `${p.dx}px`, "--dy": `${p.dy}px` } as CSSProperties} />
            ))}
          </span>
        ) : (
          <span
            key={item.id}
            className={`${item.kind === "banner" ? "arcade-banner" : "arcade-pop"} arcade-tone-${item.tone}`}
            style={{ left: `${item.x}%`, top: `${item.y}%` }}
          >
            {item.text}
          </span>
        ),
      )}
    </span>
  );
}

/** Marcador arcade. Decorativo para lectores de pantalla durante la partida;
 *  el total se anuncia en la pantalla final. */
export function ArcadeScoreBar({ fx }: { fx: ArcadeFx }) {
  const mult = comboMultiplier(fx.combo);
  return (
    <div aria-hidden="true" data-arcade-score={fx.score} className="arcade-hud flex items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-xs font-black tracking-widest">
      <span>
        PUNTOS <span className="arcade-hud-value">{formatScore(fx.score)}</span>
      </span>
      <span key={mult} className={`arcade-combo ${mult > 1 ? "arcade-combo-on" : ""}`}>
        {mult > 1 ? `COMBO ×${mult}` : fx.combo > 0 ? `CADENA ${fx.combo}` : "·"}
      </span>
      <span className="arcade-hearts" data-hearts={fx.hearts} data-level={fx.level}>
        NV {fx.level} <span className="arcade-heart-row">{Array.from({ length: MAX_HEARTS }, (_, i) => (i < fx.hearts ? "♥" : "♡")).join("")}</span>
      </span>
      <span>
        RÉCORD <span className="arcade-hud-value">{formatScore(Math.max(fx.best ?? 0, fx.score))}</span>
      </span>
    </div>
  );
}

/** Puntos finales de la partida, para la pantalla de cierre. */
export function ArcadeFinalScore({ fx }: { fx: ArcadeFx }) {
  return (
    <>
      <div data-arcade-total={fx.total} className="flex justify-between border-t border-white/15 pt-2">
        <span>Puntos arcade:</span>
        <strong className="arcade-hud-value text-yellow-200">
          {fx.record ? <>¡Nuevo récord! {formatScore(fx.total)}</> : formatScore(fx.total)}
        </strong>
      </div>
      <div className="flex justify-between">
        <span>Medalla arcade:</span>
        <strong data-arcade-medal={fx.medal} className={`arcade-medal arcade-medal-${fx.medal}`}>
          <span aria-hidden="true">{["", "🥉", "🥈", "🥇"][fx.medal]} </span>{MEDALS[fx.medal]}
        </strong>
      </div>
      {fx.noDamageBonus > 0 && <p className="text-sm font-bold text-emerald-200">Sin daño: +{fx.noDamageBonus}</p>}
      {fx.levelUp && <p className="arcade-win text-sm font-black text-fuchsia-200">¡Subes al nivel {fx.levelUp} de este juego!</p>}
    </>
  );
}
