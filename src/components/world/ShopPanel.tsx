"use client";

import { useState, type FormEvent } from "react";
import { getFirebase } from "@/lib/firebase";
import type { RedemptionRequest } from "@/lib/types";
import { WorldDialog } from "./WorldDialog";

const STATUS_LABEL: Record<RedemptionRequest["status"], string> = {
  pendiente: "Esperando aprobación",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

export interface RequestDoc extends RedemptionRequest {
  id: string;
}

/**
 * La tienda de la ciudad: es el sistema de canjes de siempre
 * (`redemptionRequests`), presentado como un lugar del mundo. No hay moneda
 * nueva — se gastan las estrellas reales de `starLedger`.
 */
export function ShopPanel({
  parentId,
  childId,
  maxStars,
  requests,
  onClose,
}: {
  parentId: string;
  childId: string;
  maxStars: number;
  requests: RequestDoc[];
  onClose: () => void;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <WorldDialog icon="🏪" title="Tienda de la ciudad" subtitle={`Tienes ${maxStars} ★`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm italic text-slate-300">
          —Aquí no se paga con monedas: se paga con lo que aprendiste. Dime qué quieres y lo hablo con tu familia.
        </p>

        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            disabled={!maxStars}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            Pedir canje
          </button>
        )}

        {showForm && (
          <RedeemForm
            parentId={parentId}
            childId={childId}
            maxStars={maxStars}
            onDone={() => setShowForm(false)}
          />
        )}

        {requests.length > 0 && (
          <ul className="flex flex-col gap-2">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-indigo-500/20 bg-slate-950/50 px-3 py-2 text-sm"
              >
                <span className="text-slate-200">
                  {r.rewardLabel} · {r.starsSpent} <span aria-hidden="true">★</span>
                  <span className="sr-only">estrellas</span>
                </span>
                <span
                  className={
                    r.status === "aprobado"
                      ? "font-bold text-emerald-400"
                      : r.status === "rechazado"
                        ? "font-bold text-red-400"
                        : "font-bold text-slate-400"
                  }
                >
                  {STATUS_LABEL[r.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </WorldDialog>
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
    if (amount > maxStars) {
      setError(`Solo tienes ${maxStars} ★ disponibles.`);
      return;
    }
    if (!rewardLabel.trim()) {
      setError("Dile a tu papá o mamá qué quieres canjear.");
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
      onDone();
    } catch {
      setError("No se pudo enviar la solicitud. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-indigo-500/30 bg-slate-950/60 p-4"
    >
      <label className="flex flex-col gap-1 text-sm font-bold text-indigo-200">
        ¿Qué quieres canjear?
        <input
          value={rewardLabel}
          onChange={(e) => setRewardLabel(e.target.value)}
          placeholder="Ej. 800 Robux"
          className="rounded-xl border-2 border-indigo-500/30 bg-slate-900 px-3 py-2 font-normal text-slate-100 placeholder:text-slate-500 focus:border-violet-400"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-bold text-indigo-200">
        ¿Cuántas estrellas? (tienes {maxStars} ★)
        <input
          inputMode="numeric"
          value={starsSpent}
          onChange={(e) => setStarsSpent(e.target.value.replace(/\D/g, ""))}
          className="rounded-xl border-2 border-indigo-500/30 bg-slate-900 px-3 py-2 font-normal text-slate-100 focus:border-violet-400"
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
          Enviar
        </button>
        <button type="button" onClick={onDone} className="text-sm font-bold text-slate-400">
          Cancelar
        </button>
      </div>
    </form>
  );
}
