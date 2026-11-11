"use client";

import { useState, type FormEvent } from "react";
import { Star, Trash2 } from "lucide-react";
import { getFirebase } from "@/lib/firebase";
import { useLearningData } from "@/lib/learning/useLearningData";
import { starPlan } from "@/lib/learning/starPlan";
import { ADVENTURE_EXPERT_STARS, ADVENTURE_STARS, LESSON_STARS_MAX } from "@/lib/learning/core";
import { useRewardCatalog, useStarLedger, type RewardOption } from "@/lib/learning/useStars";
import { useTotalStars } from "@/lib/useTotalStars";
import { StarBreakdown } from "@/components/learning/StarBreakdown";
import { SectionCard } from "./ui";

/** Estrellas de un hijo: disponibles, ganadas, canjeadas y por ganar, por sección. */
export function useChildStars(parentId: string | undefined, childId: string) {
  const data = useLearningData(childId);
  const ledger = useStarLedger(parentId, childId);
  const available = useTotalStars(parentId, childId || undefined);
  const plan = starPlan({ progress: data.progress, reviews: data.reviews, adventures: data.adventures, ledger: ledger.totals });
  // Sin documento de saldo todavía (perfil nuevo), el historial da el mismo número.
  const fallback = ledger.totals ? ledger.totals.earned - ledger.totals.spent : null;
  return { plan, available: available ?? fallback, loading: data.loading || (!ledger.totals && !ledger.error), error: ledger.error };
}

export function ChildStarsCard({ parentId, childId, childName }: { parentId: string | undefined; childId: string; childName: string }) {
  const { plan, available, loading, error } = useChildStars(parentId, childId);
  return (
    <SectionCard title={`Estrellas de ${childName}`} icon={<Star className="size-4" aria-hidden="true" />}>
      {error && <p role="alert" className="mb-2 text-sm text-amber-200">No pudimos cargar el historial de estrellas; las ganadas y canjeadas pueden no estar al día.</p>}
      {loading ? <p role="status" className="text-sm text-slate-400">Cargando…</p> : <StarBreakdown plan={plan} available={available} who={childName} />}
    </SectionCard>
  );
}

/** Fila del resumen familiar: un hijo por fila. */
function FamilyRow({ parentId, childId, name }: { parentId: string; childId: string; name: string }) {
  const { plan, available } = useChildStars(parentId, childId);
  return (
    <tr className="border-t border-indigo-500/15">
      <th scope="row" className="py-2 pr-2 text-left font-semibold text-slate-100">{name}</th>
      <td className="py-2 text-right font-bold tabular-nums text-amber-300">{available ?? "…"}</td>
      <td className="py-2 text-right tabular-nums text-emerald-300">{plan.earned ?? "…"}</td>
      <td className="py-2 text-right tabular-nums text-violet-300">{plan.spent ?? "…"}</td>
      <td className="py-2 text-right tabular-nums text-slate-300">{plan.remaining}</td>
    </tr>
  );
}

export function FamilyStarsSummary({ parentId, kids }: { parentId: string; kids: { id: string; name: string }[] }) {
  if (kids.length < 2) return null;
  return (
    <SectionCard title="Estrellas de la familia" icon={<Star className="size-4" aria-hidden="true" />}>
      <table className="w-full text-sm">
        <caption className="sr-only">Estrellas por hijo</caption>
        <thead>
          <tr className="text-xs text-slate-400">
            <th scope="col" className="py-1 text-left">Hijo</th>
            <th scope="col" className="py-1 text-right">Disponibles</th>
            <th scope="col" className="py-1 text-right">Ganadas</th>
            <th scope="col" className="py-1 text-right">Canjeadas</th>
            <th scope="col" className="py-1 text-right">Por ganar</th>
          </tr>
        </thead>
        <tbody>{kids.map((k) => <FamilyRow key={k.id} parentId={parentId} childId={k.id} name={k.name} />)}</tbody>
      </table>
      <p className="mt-2 text-xs text-slate-400">«Por ganar» cuenta clases, repasos mixtos y aventuras pendientes; el repaso diario suma 2 más al día.</p>
    </SectionCard>
  );
}

/**
 * Tabla de canje que acuerda la familia con sus hijos: qué premio vale
 * cuántas estrellas. La ven los hijos en «Mis estrellas» y pueden pedirlo
 * cuando les alcanza.
 */
export function RewardCatalogEditor({ parentId, available, possible, childName }: { parentId: string; available: number | null; possible: number; childName: string }) {
  const catalog = useRewardCatalog(parentId);
  const [label, setLabel] = useState("");
  const [stars, setStars] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function add(event: FormEvent) {
    event.preventDefault();
    const amount = Number.parseInt(stars, 10);
    if (!label.trim()) return setError("Escribe el premio.");
    if (!Number.isInteger(amount) || amount <= 0) return setError("Indica cuántas estrellas vale (un número mayor que 0).");
    setBusy(true);
    setError(null);
    try {
      const { db, firestore } = await getFirebase();
      await firestore.addDoc(firestore.collection(db, "parents", parentId, "rewardCatalog"), { label: label.trim().slice(0, 80), stars: amount, createdAt: firestore.serverTimestamp() });
      setLabel("");
      setStars("");
    } catch {
      setError("No se pudo guardar el premio. Intenta de nuevo.");
    } finally { setBusy(false); }
  }
  async function remove(item: RewardOption) {
    const { db, firestore } = await getFirebase();
    await firestore.deleteDoc(firestore.doc(db, "parents", parentId, "rewardCatalog", item.id)).catch(() => setError("No se pudo quitar el premio."));
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">
        Acordad juntos cuánto vale cada premio. Como referencia, una clase da hasta {LESSON_STARS_MAX} ⭐ (terminarla, superar su comprobación sin ayuda y su repaso) y una aventura entre {ADVENTURE_STARS.basica} y {ADVENTURE_STARS.avanzada} ⭐ según su dificultad, más {ADVENTURE_EXPERT_STARS.basica}–{ADVENTURE_EXPERT_STARS.avanzada} ⭐ por su reto experto. Las estrellas ya ganadas se conservan; en total quedan {possible} ⭐ posibles en clases, repasos y aventuras.
      </p>
      {catalog.items && catalog.items.length > 0 && (
        <ul className="divide-y divide-indigo-500/15">
          {catalog.items.map((item) => {
            const missing = Math.max(0, item.stars - (available ?? 0));
            return (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-sm text-slate-100">{item.label} · <strong className="text-amber-300">{item.stars} ★</strong></span>
                <span className="flex items-center gap-3 text-xs">
                  <span className={missing ? "text-slate-400" : "font-bold text-emerald-300"}>{missing ? `A ${childName} le faltan ${missing}` : `${childName} ya puede canjearlo`}</span>
                  <button type="button" onClick={() => void remove(item)} aria-label={`Quitar ${item.label}`}
                    className="grid min-h-11 min-w-11 place-items-center rounded-lg text-slate-400 hover:text-red-300"><Trash2 className="size-4" aria-hidden="true" /></button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={(e) => void add(e)} className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-bold text-slate-200">
          Premio
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Por ejemplo, elegir la película" maxLength={80} className="family-input" />
        </label>
        <label className="flex w-28 flex-col gap-1 text-sm font-bold text-slate-200">
          Estrellas
          <input value={stars} onChange={(e) => setStars(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className="family-input" />
        </label>
        <button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-amber-400 px-4 text-sm font-bold text-slate-950 disabled:opacity-50">Añadir</button>
      </form>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
