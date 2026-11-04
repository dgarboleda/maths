"use client";

import { useEffect, useState } from "react";
import { getFirebase } from "@/lib/firebase";
import { ledgerTotals } from "./starPlan";

/** Totales del libro de estrellas de un perfil, en vivo (familia o el propio perfil). */
export function useStarLedger(parentId: string | undefined, childId: string | undefined) {
  const key = parentId && childId ? `${parentId}/${childId}` : "";
  const [state, setState] = useState<{ key: string; totals: { earned: number; spent: number } | null; error: boolean }>({ key: "", totals: null, error: false });
  useEffect(() => {
    if (!parentId || !childId) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    getFirebase().then(({ db, firestore }) => {
      if (cancelled) return;
      unsubscribe = firestore.onSnapshot(
        firestore.collection(db, "parents", parentId, "children", childId, "starLedger"),
        (snap) => { if (!cancelled) setState({ key, totals: ledgerTotals(snap.docs.map((d) => Number(d.data().delta))), error: false }); },
        () => { if (!cancelled) setState({ key, totals: null, error: true }); },
      );
    }).catch(() => { if (!cancelled) setState({ key, totals: null, error: true }); });
    return () => { cancelled = true; unsubscribe?.(); };
  }, [parentId, childId, key]);
  return state.key === key ? state : { key, totals: null, error: false };
}

export interface RewardOption { id: string; label: string; stars: number }

/** Tabla de canje acordada por la familia (`parents/{id}/rewardCatalog`). */
export function useRewardCatalog(parentId: string | undefined) {
  const [state, setState] = useState<{ key: string; items: RewardOption[] | null; error: boolean }>({ key: "", items: null, error: false });
  const key = parentId ?? "";
  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    getFirebase().then(({ db, firestore }) => {
      if (cancelled) return;
      unsubscribe = firestore.onSnapshot(
        firestore.query(firestore.collection(db, "parents", parentId, "rewardCatalog"), firestore.orderBy("stars", "asc")),
        (snap) => {
          if (cancelled) return;
          const items = snap.docs.flatMap((d) => {
            const { label, stars } = d.data();
            return typeof label === "string" && Number.isInteger(stars) ? [{ id: d.id, label, stars: stars as number }] : [];
          });
          setState({ key, items, error: false });
        },
        () => { if (!cancelled) setState({ key, items: null, error: true }); },
      );
    }).catch(() => { if (!cancelled) setState({ key, items: null, error: true }); });
    return () => { cancelled = true; unsubscribe?.(); };
  }, [parentId, key]);
  return state.key === key ? state : { key, items: null, error: false };
}
