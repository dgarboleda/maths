"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getFirebase } from "@/lib/firebase";
import { getLevel, saveLevel, StaleLevelError } from "./levelRepository";
import type { LevelDefinition } from "../schema";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Carga un nivel y expone `save()` con el estado de guardado que consume el
 * editor (Fase 4) — `saveState`/`saveError` son exactamente lo que
 * `EditorTopBar` necesita para pintar "Guardando… → Guardado ✓ → idle"
 * (docs/level-editor-plan.md §5.5). No conoce `localStorage`
 * (`draftCache.ts` es un módulo aparte) ni el reducer del editor: es una
 * capa fina sobre `levelRepository`, nada más.
 */
export function useLevelDoc(parentId: string | undefined, levelId: string) {
  const [level, setLevel] = useState<LevelDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedResetTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore }) => getLevel(firestore, db, parentId, levelId))
      .then((doc) => {
        if (cancelled) return;
        setLevel(doc);
        setLoading(false);
      })
      .catch((err) => {
        console.error("No se pudo cargar el nivel", err);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [parentId, levelId]);

  useEffect(() => {
    return () => {
      if (savedResetTimer.current !== null) window.clearTimeout(savedResetTimer.current);
    };
  }, []);

  const save = useCallback(
    async (next: LevelDefinition): Promise<LevelDefinition> => {
      if (!parentId) throw new Error("No hay sesión de padre activa.");
      setSaveState("saving");
      setSaveError(null);
      try {
        const { db, firestore } = await getFirebase();
        const saved = await saveLevel(firestore, db, parentId, levelId, next);
        setLevel(saved);
        setSaveState("saved");
        savedResetTimer.current = window.setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 2000);
        return saved;
      } catch (err) {
        const message = err instanceof StaleLevelError ? err.message : err instanceof Error ? err.message : String(err);
        setSaveError(message);
        setSaveState("error");
        throw err;
      }
    },
    [parentId, levelId],
  );

  /** Trae la versión viva más reciente sin pasar por `save()` — la usa el
   *  diálogo de conflicto de `StaleLevelError` (Fase 13, §10.4) para que
   *  "Recargar" muestre de verdad lo que hay en el servidor ahora, no lo que
   *  había al abrir el editor. */
  const reload = useCallback(async (): Promise<LevelDefinition | null> => {
    if (!parentId) return null;
    const { db, firestore } = await getFirebase();
    const fresh = await getLevel(firestore, db, parentId, levelId);
    setLevel(fresh);
    return fresh;
  }, [parentId, levelId]);

  return { level, loading, saveState, saveError, save, reload };
}
