"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { Check, Gift, Medal, Star, X } from "lucide-react";
import { useFamily } from "@/components/family/FamilyProvider";
import { useChildDashboard, type RequestDoc } from "@/lib/family/useChildDashboard";
import { getFirebase } from "@/lib/firebase";
import { ChildSwitcher, EmptyState, SectionCard, SkeletonRows } from "@/components/family/ui";

export default function RecompensasPage() {
  const { parentId, selectedChild, selectedChildId, loadingChildren } = useFamily();
  const dashboard = useChildDashboard(parentId, selectedChildId);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  if (loadingChildren) {
    return (
      <p role="status" className="text-indigo-200">
        Cargando…
      </p>
    );
  }

  if (!selectedChild || !parentId || !selectedChildId) {
    return <p className="text-sm text-slate-400">Todavía no hay perfiles de hijos creados.</p>;
  }

  async function resolveRequest(request: RequestDoc, approve: boolean) {
    if (resolvingId || !parentId || !selectedChildId) return;
    setResolvingId(request.id);
    try {
      const {
        db,
        firestore: { addDoc, collection, doc, serverTimestamp, updateDoc },
      } = await getFirebase();
      if (approve) {
        await addDoc(collection(db, "parents", parentId, "children", selectedChildId, "starLedger"), {
          delta: -request.starsSpent,
          reason: "redemption",
          attemptId: null,
          createdAt: serverTimestamp(),
        });
      }
      await updateDoc(
        doc(db, "parents", parentId, "children", selectedChildId, "redemptionRequests", request.id),
        { status: approve ? "aprobado" : "rechazado", resolvedAt: serverTimestamp() },
      );
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Recompensas</h1>
          <p className="mt-1 text-sm text-slate-400">
            Las estrellas se ganan aprendiendo; en qué se convierten lo decide la familia.
          </p>
        </div>
        <ChildSwitcher />
      </header>

      <div className="family-panel flex items-center gap-4 rounded-2xl p-4 sm:p-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-300">
          <Star className="size-6" aria-hidden="true" />
        </span>
        <div>
          <p className="font-display text-2xl font-bold leading-none text-white">
            {dashboard.totalStars ?? "…"} <span className="text-base text-amber-300">★</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Estrellas de {selectedChild.name} · ganadas resolviendo problemas y misiones
          </p>
        </div>
      </div>

      <SectionCard title="Canjes pendientes" icon={<Gift className="size-4" aria-hidden="true" />}>
        {dashboard.loading ? (
          <SkeletonRows rows={2} />
        ) : dashboard.pendingRedemptions.length === 0 ? (
          <EmptyState
            icon={<Gift className="size-5" aria-hidden="true" />}
            title="Sin canjes pendientes"
            text={`Cuando ${selectedChild.name} pida un canje, aparecerá aquí para aprobarlo o rechazarlo.`}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {dashboard.pendingRedemptions.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3"
              >
                <span className="text-sm font-semibold text-amber-100">
                  {r.rewardLabel} · {r.starsSpent} ★
                </span>
                <div className="flex gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => resolveRequest(r, true)}
                    disabled={resolvingId === r.id}
                    aria-label={`Aprobar el canje de ${r.rewardLabel} por ${r.starsSpent} estrellas`}
                    className="inline-flex items-center gap-1 font-bold text-emerald-300 underline-offset-2 hover:underline disabled:opacity-40"
                  >
                    <Check className="size-4" aria-hidden="true" />
                    Aprobar
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveRequest(r, false)}
                    disabled={resolvingId === r.id}
                    aria-label={`Rechazar el canje de ${r.rewardLabel} por ${r.starsSpent} estrellas`}
                    className="inline-flex items-center gap-1 font-semibold text-slate-400 underline-offset-2 hover:underline disabled:opacity-40"
                  >
                    <X className="size-4" aria-hidden="true" />
                    Rechazar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Logros e insignias educativas" icon={<Medal className="size-4" aria-hidden="true" />}>
          <p className="mb-3 text-xs text-slate-400">
            Se ganan aprendiendo: misiones completadas y módulos dominados. No se compran.
          </p>
          {dashboard.loading ? (
            <SkeletonRows rows={3} />
          ) : (
            <ul className="grid grid-cols-2 gap-2.5">
              {dashboard.badges.map((b) => (
                <li
                  key={b.id}
                  className={`rounded-xl border p-3 ${
                    b.unlocked ? "border-amber-400/30 bg-amber-500/10" : "border-indigo-500/15 bg-slate-800/40"
                  }`}
                >
                  {b.image ? (
                    <Image src={b.image} alt="" aria-hidden="true" width={24} height={24} className="size-6" />
                  ) : (
                    <span aria-hidden="true" className="text-xl">
                      {b.emoji}
                    </span>
                  )}
                  <p className={`mt-2 text-sm font-bold leading-tight ${b.unlocked ? "text-amber-200" : "text-slate-500"}`}>
                    {b.label}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{b.description}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title={`Canjes de ${selectedChild.name}`} icon={<Gift className="size-4" aria-hidden="true" />}>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mb-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white"
            >
              Registrar solicitud de canje
            </button>
          )}
          {showForm && (
            <RedeemForm
              parentId={parentId}
              childId={selectedChildId}
              maxStars={dashboard.totalStars ?? 0}
              onDone={() => setShowForm(false)}
            />
          )}
          {dashboard.resolvedRedemptions.length === 0 ? (
            <EmptyState
              icon={<Gift className="size-5" aria-hidden="true" />}
              title="Sin canjes todavía"
              text={`Cuando se resuelva un canje de ${selectedChild.name}, aparecerá aquí.`}
            />
          ) : (
            <ul className="divide-y divide-indigo-500/15">
              {dashboard.resolvedRedemptions.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0 truncate text-sm font-semibold text-slate-100">{r.rewardLabel}</span>
                  <span className={r.status === "aprobado" ? "font-bold text-emerald-300" : "font-bold text-red-400"}>
                    {r.status === "aprobado" ? `Aprobado · −${r.starsSpent} ★` : "Rechazado"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function RedeemForm({
  parentId,
  childId,
  maxStars,
  onDone,
}: {
  parentId: string;
  childId: string;
  maxStars: number;
  onDone: () => void;
}) {
  const [rewardLabel, setRewardLabel] = useState("");
  const [starsSpent, setStarsSpent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const amount = parseInt(starsSpent, 10);
    if (!Number.isInteger(amount) || amount <= 0) {
      setError("Ingresa una cantidad válida de estrellas.");
      return;
    }
    if (!rewardLabel.trim()) {
      setError("Escribe qué se está canjeando.");
      return;
    }
    setSubmitting(true);
    try {
      const {
        db,
        firestore: { addDoc, collection, serverTimestamp },
      } = await getFirebase();
      await addDoc(collection(db, "parents", parentId, "children", childId, "redemptionRequests"), {
        starsSpent: amount,
        rewardLabel: rewardLabel.trim(),
        status: "pendiente",
        createdAt: serverTimestamp(),
        resolvedAt: null,
      });
      setRewardLabel("");
      setStarsSpent("");
      onDone();
    } catch {
      setError("No se pudo registrar el canje. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-3 rounded-2xl border border-indigo-500/20 bg-slate-900/50 p-4">
      <label className="flex flex-col gap-1 text-sm font-bold text-slate-200">
        ¿Qué se canjeó o se va a canjear?
        <input value={rewardLabel} onChange={(e) => setRewardLabel(e.target.value)} className="family-input" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-bold text-slate-200">
        ¿Cuántas estrellas? (tiene {maxStars} ★)
        <input
          inputMode="numeric"
          value={starsSpent}
          onChange={(e) => setStarsSpent(e.target.value.replace(/\D/g, ""))}
          className="family-input"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm font-bold text-red-400">
          {error}
        </p>
      )}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          Guardar
        </button>
        <button type="button" onClick={onDone} className="text-sm font-bold text-slate-400">
          Cancelar
        </button>
      </div>
    </form>
  );
}
