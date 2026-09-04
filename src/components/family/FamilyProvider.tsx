"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile } from "@/lib/types";

export interface ChildDoc extends ChildProfile {
  id: string;
}

interface FamilyCtx {
  parentId: string | undefined;
  children: ChildDoc[];
  loadingChildren: boolean;
  selectedChildId: string | undefined;
  setSelectedChildId: (id: string) => void;
  selectedChild: ChildDoc | undefined;
}

const Ctx = createContext<FamilyCtx | null>(null);

/**
 * Selección de hijo compartida por toda la sección `/panel/*`: vive en el
 * layout, así que se conserva al moverse entre Resumen, Hijos, Progreso,
 * Recompensas y Ajustes — equivalente real a `family-context.tsx` del
 * prototipo, pero con la lista de hijos suscrita a Firestore en vez de un
 * mock.
 */
export function FamilyProvider({ children: content }: { children: ReactNode }) {
  const { user } = useAuth();
  const parentId = user?.uid;
  const [children, setChildren] = useState<ChildDoc[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [explicitSelectedId, setExplicitSelectedId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!parentId) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore: { collection, onSnapshot, orderBy, query } }) => {
        if (cancelled) return;
        const q = query(collection(db, "parents", parentId, "children"), orderBy("createdAt", "asc"));
        unsubscribe = onSnapshot(q, (snap) => {
          setChildren(snap.docs.map((d) => ({ id: d.id, ...(d.data() as ChildProfile) })));
          setLoadingChildren(false);
        });
      })
      .catch((err) => {
        console.error("No se pudo cargar la lista de hijos", err);
        setLoadingChildren(false);
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [parentId]);

  // El hijo seleccionado es el elegido explícitamente si sigue existiendo,
  // si no el primero de la lista — derivado en el render, sin efecto.
  const selectedChildId =
    explicitSelectedId && children.some((c) => c.id === explicitSelectedId)
      ? explicitSelectedId
      : children[0]?.id;

  const value = useMemo<FamilyCtx>(
    () => ({
      parentId,
      children,
      loadingChildren,
      selectedChildId,
      setSelectedChildId: setExplicitSelectedId,
      selectedChild: children.find((c) => c.id === selectedChildId),
    }),
    [parentId, children, loadingChildren, selectedChildId],
  );

  return <Ctx.Provider value={value}>{content}</Ctx.Provider>;
}

export function useFamily() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFamily debe usarse dentro de FamilyProvider");
  return ctx;
}
