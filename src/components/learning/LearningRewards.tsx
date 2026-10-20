"use client";

import { useEffect, useState } from "react";
import { getFirebase } from "@/lib/firebase";
import { ShopPanel, type RequestDoc } from "@/components/world/ShopPanel";
import { WorldDialog } from "@/components/world/WorldDialog";

/** Reutiliza los canjes existentes; solo consulta sus datos al abrirse. */
export default function LearningRewards({ parentId, childId, stars, onClose }: { parentId: string; childId: string; stars: number; onClose: () => void }) {
  const [requests, setRequests] = useState<RequestDoc[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    getFirebase().then(({ db, firestore: { collection, onSnapshot, orderBy, query } }) => {
      if (cancelled) return;
      unsubscribe = onSnapshot(query(collection(db, "parents", parentId, "children", childId, "redemptionRequests"), orderBy("createdAt", "desc")),
        (snap) => { if (!cancelled) setRequests(snap.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as RequestDoc)); },
        () => { if (!cancelled) setError(true); });
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; unsubscribe?.(); };
  }, [parentId, childId]);
  if (error || !requests) return <WorldDialog icon="⭐" title="Mis estrellas y premios" onClose={onClose}><p role={error ? "alert" : "status"}>{error ? "No pudimos cargar tus canjes. Cierra esta ventana e inténtalo de nuevo." : "Cargando tus canjes…"}</p></WorldDialog>;
  return <ShopPanel parentId={parentId} childId={childId} maxStars={stars} requests={requests} onClose={onClose} learningMode />;
}
