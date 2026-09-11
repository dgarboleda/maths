"use client";

import { useId, useRef } from "react";
import Link from "next/link";
import { CoheteGeneric } from "@/components/topic/CoheteGeneric";
import { useDialogFocus } from "@/components/world/useDialogFocus";
import { getFirebase } from "@/lib/firebase";
import { getModule, missingPrerequisites, moduleHref } from "@/lib/curriculum";
import { recordModuleAttempt } from "@/lib/attemptRecorder";
import { awardMasteryBadges } from "@/lib/masteryRewards";
import type { ChallengePlacement, LevelEntity } from "@/lib/level/schema";
import type { SkillProgress } from "@/lib/types";

/**
 * Actividad "cohete" de un `ChallengePlacement` — Fase 33 (docs/plan-
 * jugabilidad.md §7). `CoheteGeneric` reporta con `onAnswer(correct) =>
 * Promise<estrellas>`, un contrato distinto al de `PuzzleOverlay`
 * (`recordAttempt`/`awardBadges` inyectados) — acá se adapta uno al otro:
 * cada respuesta de la carrera pasa por el MISMO `recordModuleAttempt` (o su
 * sustituto de Play Test/sandbox, la prop de siempre) que ya usa
 * `PuzzleOverlay`, así que el intento se guarda exactamente donde se
 * guardaría jugando la ficha normal — y el sandbox del Play Test lo
 * intercepta igual de bien: es el mismo mecanismo, no uno nuevo.
 *
 * A diferencia de `PuzzleOverlay`, ganar la carrera es el único desenlace
 * que resuelve el desafío del nivel (`onResolved`) — perder por tiempo dejar
 * la carrera sin resolver, exactamente como cerrar una ficha sin responder:
 * `CoheteGeneric` ya ofrece "Jugar de nuevo" por su cuenta.
 */
export function LevelCoheteOverlay({
  placement,
  entity,
  parentId,
  childId,
  progressBySkill,
  streak,
  repeatsToday,
  soundOn,
  onClose,
  onResolved,
  recordAttempt,
  awardBadges,
}: {
  placement: ChallengePlacement;
  entity: LevelEntity | undefined;
  parentId: string;
  childId: string;
  progressBySkill: Record<string, SkillProgress>;
  streak: number;
  repeatsToday?: number;
  soundOn: boolean;
  onClose: () => void;
  onResolved: (result: { moduleId: string; updated: SkillProgress; correct: boolean; stars: number }) => void;
  recordAttempt?: typeof recordModuleAttempt;
  awardBadges?: typeof awardMasteryBadges;
}) {
  const titleId = useId();
  const { dialogRef, handleKeyDown } = useDialogFocus(onClose);
  const mod = getModule(placement.moduleId);
  // Progreso "vivo" de este módulo durante la carrera: cada `onAnswer` lo
  // actualiza — sin esto, un acierto a mitad de carrera nunca vería el
  // acierto anterior y `wasMastered`/streak de mastery.ts quedarían mal
  // calculados a partir del segundo intento.
  const liveProgressRef = useRef(progressBySkill);
  const totalStarsRef = useRef(0);
  const resolvedRef = useRef(false);

  if (!mod) return null;

  const missing = missingPrerequisites(progressBySkill, mod.id);
  if (missing.length > 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:items-center sm:p-6">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="world-terminal-panel world-scanlines w-full max-w-lg space-y-4 rounded-3xl border-2 border-cyan-400/40 p-5 focus:outline-none sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id={titleId} className="font-display text-lg font-bold text-cyan-200">
              {entity?.name ?? mod.label}
            </h2>
            <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-3 py-1.5 text-sm font-bold text-slate-300 hover:bg-slate-700">
              Salir
            </button>
          </div>
          <p className="text-slate-300">El sistema no te reconoce todavía. Necesitas dominar antes:</p>
          <ul className="flex flex-col gap-1">
            {missing.map((m) => (
              <li key={m.id} className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-bold text-slate-200">
                <span aria-hidden="true">🔧 </span>
                {m.label}
              </li>
            ))}
          </ul>
          <Link href={moduleHref(childId, missing[0])} className="inline-block rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white">
            Ir a entrenar {missing[0].label}
          </Link>
        </div>
      </div>
    );
  }

  async function onAnswer(correct: boolean): Promise<number> {
    const { db, firestore } = await getFirebase();
    const outcome = await (recordAttempt ?? recordModuleAttempt)(
      firestore,
      db,
      parentId,
      childId,
      mod!,
      liveProgressRef.current[mod!.id],
      correct,
      streak,
      0,
      repeatsToday,
    );
    liveProgressRef.current = { ...liveProgressRef.current, [mod!.id]: outcome.updatedProgress };
    totalStarsRef.current += outcome.stars;
    const mastered = !outcome.wasMastered && outcome.updatedProgress.masteredAt !== null;
    if (mastered) {
      await (awardBadges ?? awardMasteryBadges)(firestore, db, parentId, childId, mod!, liveProgressRef.current);
    }
    return outcome.stars;
  }

  function handleWin() {
    // `CoheteGeneric` puede volver a llamar `onWin` si el jugador reinicia
    // y gana de nuevo dentro de la misma sesión de overlay — el desafío del
    // nivel solo se resuelve una vez.
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onResolved({ moduleId: mod!.id, updated: liveProgressRef.current[mod!.id], correct: true, stars: totalStarsRef.current });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={entity?.name ?? mod.label}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="max-h-full w-full max-w-lg overflow-y-auto focus:outline-none"
      >
        <div className="mb-2 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-3 py-1.5 text-sm font-bold text-slate-300 hover:bg-slate-700">
            Salir
          </button>
        </div>
        <CoheteGeneric moduleId={mod.id} soundOn={soundOn} onAnswer={onAnswer} onWin={handleWin} />
      </div>
    </div>
  );
}
