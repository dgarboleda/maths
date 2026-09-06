"use client";

import { useEffect, useRef } from "react";
import { saveDraft } from "@/lib/level/persistence/draftCache";
import type { LevelDefinition } from "@/lib/level/schema";

const AUTOSAVE_DEBOUNCE_MS = 1500;

/**
 * Autosave — docs/level-editor-plan.md §5.5. En cada cambio (`dirty`):
 * 1. Borrador a `localStorage`, siempre, instantáneo (`saveDraft`).
 * 2. Guardado real a Firestore, con debounce de 1500ms tras el último
 *    cambio — se pausa durante el Play Test (`paused`, Fase 11).
 *
 * `onAutosave` se guarda en un ref para no reiniciar el debounce si el
 * llamador no lo memoiza con `useCallback` — el propio `level`/`dirty` ya
 * son las dependencias correctas para saber CUÁNDO disparar.
 */
export function useAutosave(params: {
  levelId: string;
  level: LevelDefinition;
  dirty: boolean;
  paused: boolean;
  onAutosave: () => void;
}): void {
  const { levelId, level, dirty, paused } = params;
  const timerRef = useRef<number | null>(null);
  const onAutosaveRef = useRef(params.onAutosave);

  // Mantiene la referencia al último callback SIN leerla/escribirla durante
  // el render (regla `react-hooks/refs`): un efecto sin dependencias corre
  // después de cada render y la deja al día antes de que dispare el timeout.
  useEffect(() => {
    onAutosaveRef.current = params.onAutosave;
  });

  useEffect(() => {
    if (!dirty) return;
    saveDraft(levelId, level);
    if (paused) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => onAutosaveRef.current(), AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [levelId, level, dirty, paused]);
}
