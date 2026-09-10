"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getFirebase } from "@/lib/firebase";
import { ensureWorld, saveWorld, StaleWorldError } from "./worldRepository";
import type { GameWorld } from "../schema";

export type WorldSaveState = "idle" | "saving" | "saved" | "error";

/**
 * Carga el mundo del padre (creándolo vacío si hace falta) y expone `save()`
 * — capa fina sobre `worldRepository`, mismo patrón que `useLevelDoc`. A
 * diferencia del editor de nivel, el Editor de Mundo (Fase 17) no tiene
 * autosave ni recuperación de borrador local: es una superficie más chica y
 * de edición menos frecuente — un botón "Guardar" explícito alcanza.
 */
export function useWorldDoc(parentId: string | undefined) {
  const [world, setWorld] = useState<GameWorld | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<WorldSaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedResetTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore }) => ensureWorld(firestore, db, parentId, parentId))
      .then((doc) => {
        if (cancelled) return;
        setWorld(doc);
        setLoading(false);
      })
      .catch((err) => {
        console.error("No se pudo cargar el mundo", err);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [parentId]);

  useEffect(() => {
    return () => {
      if (savedResetTimer.current !== null) window.clearTimeout(savedResetTimer.current);
    };
  }, []);

  const save = useCallback(
    async (next: GameWorld): Promise<GameWorld> => {
      if (!parentId) throw new Error("No hay sesión de padre activa.");
      setSaveState("saving");
      setSaveError(null);
      try {
        const { db, firestore } = await getFirebase();
        const saved = await saveWorld(firestore, db, parentId, next);
        setWorld(saved);
        setSaveState("saved");
        savedResetTimer.current = window.setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 2000);
        return saved;
      } catch (err) {
        const message = err instanceof StaleWorldError ? err.message : err instanceof Error ? err.message : String(err);
        setSaveError(message);
        setSaveState("error");
        throw err;
      }
    },
    [parentId],
  );

  const reload = useCallback(async (): Promise<GameWorld | null> => {
    if (!parentId) return null;
    const { db, firestore } = await getFirebase();
    const fresh = await ensureWorld(firestore, db, parentId, parentId);
    setWorld(fresh);
    return fresh;
  }, [parentId]);

  return { world, loading, saveState, saveError, save, reload };
}
