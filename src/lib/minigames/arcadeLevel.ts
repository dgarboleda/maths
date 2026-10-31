"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { PracticeGame } from "./lessonExercise";

/**
 * Nivel arcade de cada minijuego, guardado en el dispositivo.
 *
 * Sube al resolver un ejercicio o ganar una partida y nunca baja. Solo cambia
 * el reto del juego (velocidades, peligros, rivales): no toca la pregunta, la
 * corrección ni los premios. El nivel 1 es el juego de siempre y «Modo
 * tranquilo» vuelve a él en todos los juegos mientras esté activo.
 */
export const MAX_LEVEL = 10;

const LEVEL_KEY = (game: string) => `numerario:arcade-level:${game}`;
const CALM_KEY = "numerario:arcade-calm";

let levels: Record<string, number> = {};
let calm: boolean | null = null;
const listeners = new Set<() => void>();
const notify = () => {
  for (const listener of listeners) listener();
};

function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento: el valor vale solo en esta pestaña.
  }
}

export function readArcadeLevel(game: string): number {
  if (game in levels) return levels[game];
  const parsed = Number(storageGet(LEVEL_KEY(game)));
  levels[game] = Number.isInteger(parsed) && parsed >= 1 ? Math.min(MAX_LEVEL, parsed) : 1;
  return levels[game];
}

export function readArcadeCalm(): boolean {
  if (calm === null) calm = storageGet(CALM_KEY) === "true";
  return calm;
}

export function setArcadeCalm(value: boolean) {
  calm = value;
  storageSet(CALM_KEY, String(value));
  notify();
}

/** Sube un nivel (sin pasar del máximo). En modo tranquilo no se sube. */
export function raiseArcadeLevel(game: string): number {
  const current = readArcadeLevel(game);
  if (readArcadeCalm() || current >= MAX_LEVEL) return current;
  levels[game] = current + 1;
  storageSet(LEVEL_KEY(game), String(levels[game]));
  notify();
  return levels[game];
}

export function setArcadeLevel(game: string, level: number) {
  levels[game] = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  storageSet(LEVEL_KEY(game), String(levels[game]));
  notify();
}

export function subscribeArcadeLevel(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Solo para pruebas: olvida la caché en memoria. */
export function resetArcadeLevelCache() {
  levels = {};
  calm = null;
}

/** Nivel con el que se juega: 1 en modo tranquilo. */
export function effectiveLevel(level: number, calmMode: boolean): number {
  return calmMode ? 1 : Math.max(1, Math.min(MAX_LEVEL, level));
}

/** Oleadas extra que suma el nivel a las curvas de cada juego. */
export const levelBoost = (effective: number) => Math.max(0, effective - 1);

/**
 * Novedades de cada juego por nivel, de menor a mayor. Los juegos activan
 * cada mecánica con `effective >= desde`; la ficha de inicio muestra la
 * última desbloqueada y la siguiente.
 */
export const LEVEL_FEATURES: Record<PracticeGame, readonly (readonly [number, string])[]> = {
  snake: [[2, "Rocas en el jardín"], [3, "Fruta reloj que frena la serpiente"], [5, "Más rocas y más velocidad"]],
  numberpac: [[2, "Fantasma más rápido"], [4, "Un segundo fantasma que embosca"], [6, "Escudo más corto"]],
  invaders: [[2, "Descenso más rápido"], [3, "Lluvia de meteoritos"], [6, "Meteoritos más frecuentes"]],
  runner: [[2, "Tramos más rápidos"], [3, "Obstáculos más rápidos"], [6, "Dos conos por tramo"]],
  frogger: [[2, "Cocodrilo más rápido"], [4, "Un segundo cocodrilo"], [7, "Cocodrilos todavía más rápidos"]],
  breakout: [[2, "Gema bonus en la pista"], [3, "Bloques en movimiento"], [6, "Bloques más rápidos"]],
  topos: [[2, "Topos más rápidos"], [3, "Topo bomba: no lo toques"], [5, "Hasta tres topos a la vez"]],
  cajas: [[2, "Par de pasos más exigente"], [4, "Almacenes más difíciles"]],
  cohete: [[2, "Maniobra más rápida"], [4, "Reloj más corto en el reto con tiempo"]],
};

/** Mecánicas desbloqueadas hasta `effective`, y la próxima. */
export function levelPerks(game: PracticeGame, effective: number) {
  const features = LEVEL_FEATURES[game];
  return {
    unlocked: features.filter(([from]) => effective >= from).map(([, text]) => text),
    next: features.find(([from]) => effective < from) ?? null,
  };
}

/** Medalla arcade de una partida (1 bronce, 2 plata, 3 oro): a más nivel,
 *  más puntos pide. Son medallas y no estrellas para no confundirlas con las
 *  estrellas de la app, que sí son un premio. */
export const MEDALS = ["", "Bronce", "Plata", "Oro"] as const;
export function arcadeMedal(total: number, level: number): 1 | 2 | 3 {
  const scale = 1 + (Math.max(1, level) - 1) * 0.15;
  if (total >= 1100 * scale) return 3;
  if (total >= 750 * scale) return 2;
  return 1;
}

/** Nivel del juego para la interfaz y las curvas de dificultad. */
export function useArcadeLevel(game: PracticeGame) {
  const level = useSyncExternalStore(subscribeArcadeLevel, () => readArcadeLevel(game), () => 1);
  const calmMode = useSyncExternalStore(subscribeArcadeLevel, readArcadeCalm, () => false);
  const toggleCalm = useCallback(() => setArcadeCalm(!readArcadeCalm()), []);
  const effective = effectiveLevel(level, calmMode);
  return { level, calm: calmMode, effective, boost: levelBoost(effective), toggleCalm };
}
