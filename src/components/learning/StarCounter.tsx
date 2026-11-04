"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { useTotalStars } from "@/lib/useTotalStars";

const StarsDialog = dynamic(() => import("./StarsDialog"));

/** Estrellas siempre visibles en la cabecera; al ganar, muestra «+N». */
export function StarCounter({ childId }: { childId: string }) {
  const { parentId } = useAuth();
  const stars = useTotalStars(parentId, childId);
  const [open, setOpen] = useState(false);
  const [gain, setGain] = useState<{ base: number | null; amount: number }>({ base: null, amount: 0 });
  const trigger = useRef<HTMLButtonElement>(null);
  // Diferencia con el último saldo visto: se anuncia y se muestra un momento.
  if (stars !== null && gain.base !== stars) setGain({ base: stars, amount: gain.base !== null && stars > gain.base ? stars - gain.base : 0 });
  useEffect(() => {
    if (!gain.amount) return;
    const timer = setTimeout(() => setGain((g) => ({ ...g, amount: 0 })), 4000);
    return () => clearTimeout(timer);
  }, [gain.amount, gain.base]);
  if (!parentId) return null;
  return (
    <>
      <button ref={trigger} type="button" onClick={() => setOpen(true)}
        className="relative inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300/40 bg-amber-300/10 px-3 text-sm font-bold text-amber-200 hover:bg-amber-300/20">
        <span aria-hidden="true">⭐</span>
        {/* El nombre accesible sale del propio texto: «Mis estrellas: 12». */}
        <span className="sr-only">Mis estrellas: </span>
        <span className="tabular-nums">{stars ?? "…"}</span>
        {gain.amount > 0 && (
          <span aria-hidden="true" className="anim-pop absolute -right-2 -top-3 rounded-full bg-emerald-300 px-2 py-0.5 text-xs font-bold text-slate-950">+{gain.amount}</span>
        )}
      </button>
      <span aria-live="polite" className="sr-only">{gain.amount > 0 ? `¡Ganaste ${gain.amount} estrellas! Ahora tienes ${stars}.` : ""}</span>
      {open && <StarsDialog childId={childId} available={stars} onClose={() => { setOpen(false); trigger.current?.focus(); }} />}
    </>
  );
}
