"use client";

import { useState } from "react";
import { getFirebase } from "@/lib/firebase";
import { useLearningData } from "@/lib/learning/useLearningData";
import { starPlan } from "@/lib/learning/starPlan";
import { useRewardCatalog, useStarLedger } from "@/lib/learning/useStars";
import { WorldDialog } from "@/components/world/WorldDialog";
import { StarBreakdown } from "./StarBreakdown";

/** «Mis estrellas»: cuántas tengo, de dónde vienen, cuántas quedan y la tabla de canje de mi familia. */
export default function StarsDialog({ childId, available, onClose }: { childId: string; available: number | null; onClose: () => void }) {
  const data = useLearningData(childId);
  const ledger = useStarLedger(data.parentId, childId);
  const catalog = useRewardCatalog(data.parentId);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const plan = starPlan({ progress: data.progress, reviews: data.reviews, adventures: data.adventures, ledger: ledger.totals });
  async function request(label: string, stars: number) {
    if (!data.parentId) return;
    setError(false);
    try {
      const { db, firestore } = await getFirebase();
      await firestore.addDoc(firestore.collection(db, "parents", data.parentId, "children", childId, "redemptionRequests"), {
        starsSpent: stars, rewardLabel: label, status: "pendiente", createdAt: firestore.serverTimestamp(), resolvedAt: null,
      });
      setSent(label);
    } catch { setError(true); }
  }
  return (
    <WorldDialog icon="⭐" title="Mis estrellas" subtitle={available === null ? undefined : `Tienes ${available} estrellas`} onClose={onClose}>
      <div className="space-y-5">
        {data.loading ? <p role="status">Cargando tus estrellas…</p> : <StarBreakdown plan={plan} available={available} />}
        <section aria-labelledby="tabla-canje" className="space-y-2">
          <h3 id="tabla-canje" className="font-bold text-amber-200">Premios acordados con tu familia</h3>
          {catalog.items === null ? <p className="text-sm text-slate-300">{catalog.error ? "No pudimos cargar los premios." : "Cargando…"}</p>
            : catalog.items.length === 0 ? <p className="text-sm text-slate-300">Tu familia todavía no ha puesto premios. Pídeles que acuerden contigo cuántas estrellas vale cada uno.</p>
              : (
                <ul className="space-y-2">
                  {catalog.items.map((item) => {
                    const missing = Math.max(0, item.stars - (available ?? 0));
                    return (
                      <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300/25 bg-slate-950/60 px-3 py-2">
                        <span className="text-sm text-slate-100">{item.label} · <strong className="text-amber-300">{item.stars} ⭐</strong></span>
                        {missing > 0
                          ? <span className="text-xs text-slate-300">Te faltan {missing}</span>
                          : <button type="button" disabled={sent === item.label} onClick={() => void request(item.label, item.stars)}
                            className="min-h-11 rounded-lg bg-amber-300 px-3 text-sm font-bold text-slate-950 disabled:opacity-50">{sent === item.label ? "Pedido" : "Pedir"}</button>}
                      </li>
                    );
                  })}
                </ul>
              )}
          <p aria-live="polite" className="text-sm">
            {error ? <span className="text-rose-300">No se pudo enviar el pedido. Inténtalo de nuevo.</span>
              : sent ? <span className="text-emerald-300">Pedido enviado: tu familia lo aprobará o lo hablará contigo.</span> : null}
          </p>
        </section>
      </div>
    </WorldDialog>
  );
}
