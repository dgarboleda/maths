"use client";

import { WorldDialog } from "@/components/world/WorldDialog";
import type { MissionProgress } from "@/lib/level/runtime/state";

/**
 * Registro de la misión activa — docs/level-editor-plan.md §9.5/§17 Fase 12,
 * con el lenguaje visual de `QuestOverlays.MissionOverlay` (objetivos
 * numerados, hecho/actual/pendiente) pero sobre el `WorldDialog` genérico
 * que ya reutiliza `LevelDialogOverlay` — no las secciones específicas de
 * Ciudad Central (otras zonas, tienda, boss), que no existen en un
 * `LevelMission` genérico.
 */
export function LevelMissionOverlay({ progress, onClose }: { progress: MissionProgress; onClose: () => void }) {
  const currentId = progress.objectives.find((o) => !o.done)?.id;

  return (
    <WorldDialog icon="🎯" title={progress.mission.title} subtitle={`${progress.doneCount}/${progress.total} objetivos`} onClose={onClose}>
      <p className="text-slate-200">{progress.mission.premise}</p>

      <ol className="mt-4 space-y-2">
        {progress.objectives.map((o, i) => {
          const current = o.id === currentId;
          return (
            <li
              key={o.id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                current ? "border-amber-400/50 bg-amber-400/10" : "border-white/10 bg-slate-900/50"
              }`}
            >
              <span
                aria-hidden="true"
                className={`grid size-7 shrink-0 place-items-center rounded-full border text-xs font-bold ${
                  o.done
                    ? "border-emerald-400 bg-emerald-500 text-white"
                    : current
                      ? "border-amber-300 text-amber-200"
                      : "border-white/20 text-slate-400"
                }`}
              >
                {o.done ? "✓" : i + 1}
              </span>
              <span className={`min-w-0 flex-1 text-slate-100 ${o.done ? "text-slate-400 line-through" : ""}`}>{o.label}</span>
              {current && (
                <span className="shrink-0 rounded-full bg-amber-400/20 px-2 py-0.5 font-display text-[9px] font-bold uppercase tracking-[0.18em] text-amber-200">
                  En curso
                </span>
              )}
              <span className="sr-only">{o.done ? "completado" : current ? "objetivo actual" : "pendiente"}</span>
            </li>
          );
        })}
      </ol>

      {progress.complete && (
        <p role="status" className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-950/40 px-3 py-2 text-sm font-bold text-emerald-200">
          ¡Misión completada!
        </p>
      )}
    </WorldDialog>
  );
}
