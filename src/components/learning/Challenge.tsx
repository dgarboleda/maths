"use client";

import { useState } from "react";

/**
 * Reto sobre la gráfica: una meta que se comprueba sola al mover los
 * controles. Es exploración: no da estrellas ni cuenta como respuesta.
 */
export function Challenge({ goals }: { goals: { text: string; met: boolean; hint?: string }[] }) {
  const [index, setIndex] = useState(0);
  const goal = goals[index % goals.length];
  return (
    <div className={`rounded-xl border p-3 ${goal.met ? "border-emerald-300/60 bg-emerald-950/40" : "border-amber-300/40 bg-amber-950/20"}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-amber-200">Reto {index % goals.length + 1} de {goals.length}</p>
      <p className="mt-1 font-semibold text-white">{goal.text}</p>
      <p aria-live="polite" className={`mt-1 text-sm ${goal.met ? "text-emerald-200" : "text-slate-300"}`}>
        {goal.met ? "¡Conseguido! Explica por qué funciona." : goal.hint ?? "Predice el valor que hace falta y compruébalo moviendo los controles."}
      </p>
      {goals.length > 1 && (
        <button type="button" onClick={() => setIndex((i) => i + 1)}
          className="mt-2 min-h-11 rounded-lg border border-slate-600 px-3 text-sm font-semibold text-slate-100">
          Otro reto
        </button>
      )}
    </div>
  );
}
