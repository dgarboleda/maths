"use client";

import { useId } from "react";
import { Sparkles } from "lucide-react";
import { useDialogFocus } from "./useDialogFocus";

/**
 * Celebración al completar una misión de un nivel del Level Editor — Fase
 * 31 (docs/plan-jugabilidad.md §5). Inspirada en `QuestOverlays.
 * RewardOverlay` (Ciudad Central legacy, `QuestScene.tsx` — que no se
 * toca), pero un componente propio: ese otro está cerrado sobre `Quest` y
 * sus premisas fijas; acá no hay más que el título de la misión que
 * `LevelRuntime` ya conoce por `activeMission`, sin ningún concepto propio
 * de "próxima misión" del mundo legacy.
 */
export function MissionRewardOverlay({
  missionTitle,
  nextMissionTitle,
  onClose,
}: {
  missionTitle: string;
  /** La misión que sigue activa tras esta — `null`/`undefined` si no hay
   *  ninguna más en el nivel. */
  nextMissionTitle?: string | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const { dialogRef, handleKeyDown } = useDialogFocus(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="anim-rise world-quest-panel relative w-full max-w-lg rounded-3xl p-5 focus:outline-none sm:p-6"
      >
        <p className="font-display text-[11px] uppercase tracking-[0.22em] text-amber-300">Misión completada</p>
        <h2 id={titleId} className="font-display text-xl font-bold text-slate-50 sm:text-2xl">
          {missionTitle}
        </h2>
        <p className="mt-3 flex items-start gap-2 text-[15px] leading-relaxed text-slate-200">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-amber-300" aria-hidden="true" />
          ¡Lo lograste! El AXIA vuelve a fluir por esta parte del mundo.
        </p>
        {nextMissionTitle && (
          <p className="mt-4 rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-slate-400">Siguiente destino: {nextMissionTitle}…</p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 font-display font-bold text-white"
        >
          ¡Genial!
        </button>
      </div>
    </div>
  );
}
