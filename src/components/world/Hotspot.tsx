"use client";

import Image from "next/image";
import { KIND_ICON, type InteractionKind } from "@/lib/world/scenes";
import { STATE_LABEL, type WorldState } from "@/lib/world/state";

const RING: Record<WorldState, string> = {
  bloqueado: "border-slate-600 bg-slate-800/80",
  disponible: "border-amber-300 bg-amber-500/20 shadow-[0_0_22px_rgba(251,191,36,0.45)] anim-breathe",
  activado: "border-cyan-300 bg-cyan-500/20 shadow-[0_0_22px_rgba(34,211,238,0.45)] anim-breathe",
  dominado: "border-emerald-300 bg-emerald-500/25 shadow-[0_0_22px_rgba(52,211,153,0.5)]",
};

const PLATE: Record<WorldState, string> = {
  bloqueado: "text-slate-400 ring-white/5",
  disponible: "text-amber-100 ring-amber-300/30",
  activado: "text-cyan-100 ring-cyan-300/30",
  dominado: "text-emerald-100 ring-emerald-300/30",
};

/**
 * Objeto interactivo del escenario: un botón real (foco, teclado y nombre
 * accesible) dibujado sobre la escena. Los bloqueados también se pueden
 * activar: abren la ficha que explica qué prerrequisito falta, en vez de ser
 * un elemento muerto. La posición la pone quien lo usa.
 */
export function Hotspot({
  kind,
  label,
  state,
  onSelect,
  pulse = false,
  nullThreat,
}: {
  kind: InteractionKind;
  label: string;
  state: WorldState;
  onSelect: () => void;
  /** Resalta el objeto de la misión activa. */
  pulse?: boolean;
  /** Decoración cosmética en estado bloqueado: qué Null lo mantiene corrompido. El candado real sigue siendo `state`, no esto. */
  nullThreat?: { label: string; art: string };
}) {
  const showThreat = state === "bloqueado" && nullThreat;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${label} — ${STATE_LABEL[state]}${showThreat ? ` (${nullThreat.label} vigila el acceso)` : ""}`}
      className="group relative block w-full focus:outline-none"
    >
      {showThreat && (
        <Image
          src={nullThreat.art}
          alt=""
          aria-hidden="true"
          width={24}
          height={24}
          className="absolute -right-1 -top-1 z-10 size-6 rounded-full border-2 border-slate-950 object-cover shadow-[0_0_8px_rgba(0,0,0,0.6)]"
        />
      )}
      {pulse && (
        <span
          aria-hidden="true"
          className="anim-guide world-text-glow pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 text-lg font-bold text-amber-300"
        >
          ▼
        </span>
      )}
      <span
        className={`world-scanlines mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-2 text-2xl transition-transform group-hover:scale-110 group-focus-visible:scale-110 group-focus-visible:ring-4 group-focus-visible:ring-white ${RING[state]} ${
          pulse ? "animate-[worldPulse_2.4s_ease-in-out_infinite]" : ""
        }`}
      >
        <span aria-hidden="true">{state === "bloqueado" ? "🔒" : KIND_ICON[kind]}</span>
      </span>
      <span
        aria-hidden="true"
        className={`mt-1.5 block rounded-lg bg-slate-950/90 px-1.5 py-1 text-center text-[11px] font-bold leading-tight ring-1 ${PLATE[state]}`}
      >
        {label}
      </span>
    </button>
  );
}
