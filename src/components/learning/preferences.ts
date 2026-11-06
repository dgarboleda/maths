"use client";

import { useState, useSyncExternalStore } from "react";

/** Preferencia del alumno guardada en este navegador y compartida por todas
 *  las hojas de la página. Sin almacenamiento, dura mientras la página esté abierta. */
export function makePreference<T extends string>(key: string, values: readonly T[], fallbackValue: T) {
  const event = `maths:pref:${key}`;
  const read = (): T => {
    try {
      const v = localStorage.getItem(key);
      return values.includes(v as T) ? (v as T) : fallbackValue;
    } catch {
      return fallbackValue;
    }
  };
  const subscribe = (onChange: () => void) => {
    window.addEventListener(event, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(event, onChange);
      window.removeEventListener("storage", onChange);
    };
  };
  return function usePreference(): [T, (value: T) => void] {
    const [memory, setMemory] = useState<T | null>(null);
    const stored = useSyncExternalStore(subscribe, read, () => fallbackValue);
    return [
      memory ?? stored,
      (next) => {
        try {
          localStorage.setItem(key, next);
          setMemory(null);
        } catch {
          setMemory(next);
        }
        window.dispatchEvent(new Event(event));
      },
    ];
  };
}
