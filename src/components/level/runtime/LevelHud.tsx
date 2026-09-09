import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Barra superior mínima del runtime — solo nombre del nivel y salida. La
 * barra de objetivo/misión real (docs/level-editor-plan.md §9.5, patrón de
 * `QuestScene.tsx:499-514`) es Fase 12; hasta entonces esto es lo único
 * que necesita el entregable de Fase 9 (jugar y moverse).
 */
export function LevelHud({
  levelName,
  childId,
  onExit,
}: {
  levelName: string;
  childId: string;
  /** Play Test (Fase 11): reemplaza la navegación real a `/jugar/{childId}`
   *  por volver al modo edición — el Play Test nunca debe sacar al padre-
   *  autor de la pantalla del editor. */
  onExit?: () => void;
}) {
  const badgeClassName =
    "world-hud-panel pointer-events-auto flex min-h-11 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-100 transition-transform hover:scale-[1.02]";

  return (
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
  );
}
