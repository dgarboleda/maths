import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import type { MissionProgress } from "@/lib/level/runtime/state";

/**
 * HUD del runtime — nombre del nivel/salida arriba, y (Fase 12, §9.5, patrón
 * de `QuestScene.tsx:499-514`) la barra de objetivo actual abajo, si el
 * nivel tiene una misión en curso. `mission`/`onOpenMission` vienen ya
 * resueltos por `LevelRuntime` (misma fuente que abre `LevelMissionOverlay`)
 * — este componente solo pinta, no deriva nada.
 */
export function LevelHud({
  levelName,
  childId,
  onExit,
  mission,
  onOpenMission,
}: {
  levelName: string;
  childId: string;
  /** Play Test (Fase 11): reemplaza la navegación real a `/jugar/{childId}`
   *  por volver al modo edición — el Play Test nunca debe sacar al padre-
   *  autor de la pantalla del editor. */
  onExit?: () => void;
  /** Misión activa (primera incompleta) — `null` si el nivel no tiene
   *  ninguna o ya se completaron todas: la barra no se pinta en ese caso. */
  mission: MissionProgress | null;
  onOpenMission: () => void;
}) {
  const badgeClassName =
    "world-hud-panel pointer-events-auto flex min-h-11 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-100 transition-transform hover:scale-[1.02]";

  const currentObjective = mission?.objectives.find((o) => !o.done);

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-start p-2 sm:p-3">
        {onExit ? (
          <button type="button" onClick={onExit} className={badgeClassName}>
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
            {levelName}
          </button>
        ) : (
          <Link href={`/jugar/${childId}`} className={badgeClassName}>
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
            {levelName}
          </Link>
        )}
      </div>

      {mission && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end p-2 sm:p-3">
          <button
            type="button"
            onClick={onOpenMission}
            aria-label="Abrir registro de misión"
            className="pointer-events-auto flex min-h-11 max-w-[min(88vw,24rem)] items-center gap-2.5 rounded-full world-hud-panel px-3 py-1.5 text-left transition-transform hover:scale-[1.02]"
          >
            <Zap className="size-4 shrink-0 text-amber-300" aria-hidden="true" />
            <span className="min-w-0" aria-hidden="true">
              <span className="block font-display text-[9px] uppercase tracking-[0.22em] text-slate-400">
                {mission.mission.title.toUpperCase()} · {mission.doneCount}/{mission.total}
              </span>
              <span className="block truncate text-[13px] font-semibold text-slate-100">
                {currentObjective?.label ?? "Misión completada"}
              </span>
            </span>
          </button>
        </div>
      )}
    </>
  );
}
