"use client";

import { useEffect, useState } from "react";
import { getFirebase } from "@/lib/firebase";
import type { EvidenceEvent } from "./domain";

/** Cuántos eventos recientes se analizan: alcanza para semanas de uso sin
 *  descargar todo el historial en cada visita al informe. */
export const EVIDENCE_WINDOW = 400;

/** Lee una vez los eventos de aprendizaje recientes del perfil (lectura
 *  permitida a la familia y al propio perfil; nadie puede escribirlos). */
export function useLearningEvidence(parentId: string | undefined, childId: string) {
  const [state, setState] = useState<{
    key: string;
    events: EvidenceEvent[] | null;
    error: string | null;
  }>({ key: "", events: null, error: null });
  const key = `${parentId ?? ""}/${childId}`;
  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    getFirebase()
      .then(async ({ db, firestore: { collection, getDocs, limit, orderBy, query } }) => {
        const snap = await getDocs(
          query(
            collection(db, "parents", parentId, "children", childId, "learningEvidence"),
            orderBy("createdAt", "desc"),
            limit(EVIDENCE_WINDOW),
          ),
        );
        if (cancelled) return;
        setState({
          key,
          error: null,
          events: snap.docs.map((d) => {
            const data = d.data();
            return {
              lessonId: data.lessonId,
              action: data.action ?? { kind: "unknown" },
              outcome: data.outcome,
              at: data.createdAt?.toMillis?.() ?? 0,
            };
          }),
        });
      })
      .catch(() => {
        if (!cancelled)
          setState({ key, events: null, error: "No pudimos cargar el detalle de las respuestas." });
      });
    return () => {
      cancelled = true;
    };
  }, [parentId, childId, key]);
  return state.key === key ? state : { key, events: null, error: null };
}
