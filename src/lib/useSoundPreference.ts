"use client";

import { useCallback, useSyncExternalStore } from "react";
import { playSound } from "@/lib/gameSound";

const STORAGE_KEY = "numerario:sonido";

/*
 * Preferencia de efectos de sonido: una sola para toda la app y recordada
 * entre sesiones. Antes cada página tenía su propio `useState`, así que
 * apagar el sonido se deshacía al navegar a otro tema.
 *
 * Se guarda en un store externo mínimo y se lee con useSyncExternalStore: el
 * servidor siempre renderiza el valor por defecto (activado) y el cliente
 * toma el guardado, sin desajustes de hidratación ni setState en un efecto.
 */
let cached: boolean | null = null;
const listeners = new Set<() => void>();

function readPreference(): boolean {
  if (cached !== null) return cached;
  try {
    cached = window.localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    // localStorage puede estar bloqueado (modo privado): se usa el default.
    cached = true;
  }
  return cached;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setPreference(value: boolean) {
  cached = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Sin persistencia: la preferencia vale solo para esta pestaña.
  }
  for (const listener of listeners) listener();
}

export function useSoundPreference(): [boolean, () => void] {
  const soundOn = useSyncExternalStore(subscribe, readPreference, () => true);

  const toggle = useCallback(() => {
    const next = !readPreference();
    setPreference(next);
    if (next) playSound("click", true);
  }, []);

  return [soundOn, toggle];
}
