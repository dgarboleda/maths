"use client";

import { DoorClosed, Lock, MessageCircle, Settings, Terminal as TerminalIcon } from "lucide-react";
import type { CiudadCentralHotspot, CiudadCentralHotspotKind, HotspotState } from "@/lib/world/questScene";

const ICONS: Record<CiudadCentralHotspotKind, React.ComponentType<{ className?: string }>> = {
  npc: MessageCircle,
  terminal: TerminalIcon,
  mecanismo: Settings,
  puerta: DoorClosed,
  barrera: Lock,
};

const STATE_TEXT: Record<HotspotState, string> = {
  activo: "Disponible",
  resuelto: "Completado",
  bloqueado: "",
};

/**
 * Punto de interés de Ciudad Central: un halo de luz posicionado en % dentro
 * de la escena, con reacción al acercarse — puerto de `Hotspot.tsx` del
 * prototipo. Distinto del `Hotspot.tsx` genérico de `ZoneScene` (ese usa el
 * modelo de 4 estados de mastery); aquí el estado es la secuencia de 3 pasos
 * de la misión (`activo`/`resuelto`/`bloqueado`), así que se mantiene aparte
 * en vez de forzar un solo componente para dos modelos distintos.
 */
export function QuestHotspot({
  data,
  state,
  reacting,
  onSelect,
}: {
  data: CiudadCentralHotspot;
  state: HotspotState;
  reacting: boolean;
  onSelect: (h: CiudadCentralHotspot) => void;
}) {
  const Icon = state === "resuelto" ? undefined : ICONS[data.kind];
  const statusText = state === "bloqueado" ? data.lockedNote : STATE_TEXT[state];

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(data);
      }}
      aria-label={`${data.label} — ${statusText}`}
      style={{ left: `${data.x}%`, top: `${data.y}%` }}
      className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 focus-visible:z-30"
    >
      <span className="relative grid size-11 place-items-center">
        {reacting && (
          <>
            <span aria-hidden="true" className="anim-burst absolute -inset-3 rounded-full border-2 border-cyan-400" />
            <span aria-hidden="true" className="anim-burst absolute -inset-1 rounded-full bg-cyan-400/50" />
          </>
        )}

        {state === "activo" && (
          <span
            aria-hidden="true"
            className="animate-[worldPulse_2.4s_ease-in-out_infinite] absolute -inset-1.5 rounded-full bg-cyan-400/30 blur-[6px]"
          />
        )}

        <span
          className={`relative grid place-items-center rounded-full border-2 transition-transform duration-200 group-hover:scale-125 group-focus-visible:scale-125 group-focus-visible:ring-4 group-focus-visible:ring-white ${
            state === "activo"
              ? "anim-idle size-6 border-cyan-300 bg-violet-600/90 text-white world-ring-glow"
              : state === "resuelto"
                ? "size-5 border-emerald-400/70 bg-emerald-500/90 text-white"
                : "size-5 border-slate-500/50 bg-slate-800/70 text-slate-400 opacity-80"
          } ${reacting ? "scale-125 border-cyan-400" : ""}`}
        >
          {state === "resuelto" ? (
            <span aria-hidden="true" className="text-xs">
              ✓
            </span>
          ) : state === "bloqueado" ? (
            <Lock className="size-2.5" aria-hidden="true" />
          ) : (
            Icon && <Icon className="size-3.5" aria-hidden="true" />
          )}
        </span>
      </span>

      <span
        aria-hidden="true"
        className={`world-hud-panel pointer-events-none absolute bottom-full left-1/2 mb-1.5 block -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 ${
          state === "bloqueado" ? "text-slate-400" : "text-slate-100"
        }`}
      >
        {data.label}
        {statusText && <span className="ml-1 font-normal text-slate-400">· {statusText}</span>}
      </span>
    </button>
  );
}
