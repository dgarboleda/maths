"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";

/**
 * Uso de la ayuda del foco, en `children/{id}/helpUsage/resumen`:
 * - `favorites`: claves de fórmulas guardadas en «Mi formulario».
 * - `opens`: veces que se consultó el formulario de cada clase.
 * - `topics`: clases abiertas desde el buscador de temas.
 * Lo escribe el propio perfil (las reglas validan forma y hora del servidor)
 * y lo lee la familia en el informe. No contiene respuestas ni texto libre.
 */
export interface HelpUsage {
  favorites: string[];
  opens: Record<string, number>;
  topics: Record<string, number>;
}
export const HELP_USAGE_DOC = "resumen";
export const MAX_FAVORITES = 60;
const EMPTY: HelpUsage = { favorites: [], opens: {}, topics: {} };

export function parseHelpUsage(data: Record<string, unknown> | undefined): HelpUsage {
  const counts = (value: unknown) => Object.fromEntries(Object.entries(value && typeof value === "object" ? value : {})
    .filter((entry): entry is [string, number] => typeof entry[1] === "number" && entry[1] > 0));
  return {
    favorites: Array.isArray(data?.favorites) ? data.favorites.filter((key): key is string => typeof key === "string") : [],
    opens: counts(data?.opens),
    topics: counts(data?.topics),
  };
}

/** Clases ordenadas por número de consultas (para el informe). */
export function topCounts(counts: Record<string, number>, limit = 5): [string, number][] {
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
}

async function write(parentId: string, childId: string, build: (fns: Awaited<ReturnType<typeof getFirebase>>["firestore"]) => Record<string, unknown>) {
  const { db, firestore } = await getFirebase();
  const ref = firestore.doc(db, "parents", parentId, "children", childId, "helpUsage", HELP_USAGE_DOC);
  await firestore.setDoc(ref, { ...build(firestore), updatedAt: firestore.serverTimestamp() }, { merge: true });
}

/**
 * Lee y actualiza el uso de la ayuda de un perfil. Sin sesión (o si falla la
 * red) sigue funcionando en memoria: la ayuda nunca se bloquea por guardar.
 */
export function useHelpUsage(childId: string) {
  const { parentId } = useAuth();
  const key = `${parentId ?? ""}/${childId}`;
  const [state, setState] = useState<{ key: string; usage: HelpUsage }>({ key: "", usage: EMPTY });
  const usage = state.key === key ? state.usage : EMPTY;

  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    getFirebase()
      .then(async ({ db, firestore }) => {
        const snap = await firestore.getDoc(firestore.doc(db, "parents", parentId, "children", childId, "helpUsage", HELP_USAGE_DOC));
        if (!cancelled) setState((current) => ({ key, usage: current.key === key ? current.usage : parseHelpUsage(snap.data()) }));
      })
      .catch(() => { /* Sin conexión: la ayuda sigue disponible sin «Mi formulario» remoto. */ });
    return () => { cancelled = true; };
  }, [parentId, childId, key]);

  const update = useCallback((change: (usage: HelpUsage) => HelpUsage) =>
    setState((current) => ({ key, usage: change(current.key === key ? current.usage : EMPTY) })), [key]);

  const toggleFavorite = useCallback((formulaKey: string) => {
    const saved = usage.favorites.includes(formulaKey);
    if (!saved && usage.favorites.length >= MAX_FAVORITES) return false;
    update((current) => ({ ...current, favorites: saved ? current.favorites.filter((k) => k !== formulaKey) : [...current.favorites, formulaKey] }));
    if (parentId) void write(parentId, childId, (fns) => ({ favorites: saved ? fns.arrayRemove(formulaKey) : fns.arrayUnion(formulaKey) })).catch(() => undefined);
    return true;
  }, [usage.favorites, update, parentId, childId]);

  const record = useCallback((field: "opens" | "topics", lessonId: string) => {
    update((current) => ({ ...current, [field]: { ...current[field], [lessonId]: (current[field][lessonId] ?? 0) + 1 } }));
    if (parentId) void write(parentId, childId, (fns) => ({ [field]: { [lessonId]: fns.increment(1) } })).catch(() => undefined);
  }, [update, parentId, childId]);

  return { usage, toggleFavorite, record };
}

/** Lectura única para el informe de la familia. */
export function useHelpUsageReport(parentId: string | undefined, childId: string) {
  const key = `${parentId ?? ""}/${childId}`;
  const [state, setState] = useState<{ key: string; usage: HelpUsage | null; error: string | null }>({ key: "", usage: null, error: null });
  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    getFirebase()
      .then(async ({ db, firestore }) => {
        const snap = await firestore.getDoc(firestore.doc(db, "parents", parentId, "children", childId, "helpUsage", HELP_USAGE_DOC));
        if (!cancelled) setState({ key, usage: parseHelpUsage(snap.data()), error: null });
      })
      .catch(() => { if (!cancelled) setState({ key, usage: null, error: "No pudimos cargar el uso de la ayuda." }); });
    return () => { cancelled = true; };
  }, [parentId, childId, key]);
  return state.key === key ? state : { key, usage: null, error: null };
}
