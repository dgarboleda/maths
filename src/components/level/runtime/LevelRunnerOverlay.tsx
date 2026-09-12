"use client";

import { useEffect, useId, useRef, useState } from "react";
import { RunnerGeneric } from "@/components/topic/RunnerGeneric";
import { useDialogFocus } from "@/components/world/useDialogFocus";
import { getFirebase } from "@/lib/firebase";
import { getModule, missingPrerequisites } from "@/lib/curriculum";
import { recordModuleAttempt } from "@/lib/attemptRecorder";
import { awardMasteryBadges } from "@/lib/masteryRewards";
import { getRecord, recordIfBest, type PersonalRecord } from "@/lib/records";
import { PrerequisiteGate } from "./PrerequisiteGate";
import type { ChallengePlacement, LevelEntity } from "@/lib/level/schema";
import type { SkillProgress } from "@/lib/types";

/**
 * Actividad "runner" de un `ChallengePlacement` — Fase 38 (docs/plan-
 * minijuegos-retro.md), mismo patrón que `LevelFroggerOverlay.tsx` (Fase
 * 37): `RunnerGeneric` reporta con `onAnswer(correct) => Promise<estrellas>`,
 * acá se adapta al mismo `recordModuleAttempt` (o su sustituto de Play
 * Test/sandbox) que usa `PuzzleOverlay`.
 *
 * Ganar (cruzar todas las puertas) es el único desenlace que resuelve el
 * desafío del nivel (`onResolved`) — agotar las vidas deja el desafío sin
 * resolver, igual que cerrar una ficha sin responder.
 */
export function LevelRunnerOverlay({
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
  const liveProgressRef = useRef(progressBySkill);
  const totalStarsRef = useRef(0);
  const resolvedRef = useRef(false);
  const isSandbox = Boolean(recordAttempt);
  const [record, setRecord] = useState<PersonalRecord | null>(null);

  useEffect(() => {
    if (isSandbox || !mod) return;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore }) => getRecord(firestore, db, parentId, childId, "runner", mod.id))
      .then((r) => {
        if (!cancelled) setRecord(r);
      })
      .catch((err) => console.error("No se pudo cargar la marca de Autopista de resultados", err));
    return () => {
      cancelled = true;
    };
  }, [isSandbox, mod, parentId, childId]);

  function handleGameOver(correctCount: number) {
    if (isSandbox || !mod) return;
    getFirebase()
      .then(({ db, firestore }) => recordIfBest(firestore, db, parentId, childId, "runner", mod.id, correctCount, record))
      .then((next) => setRecord(next))
      .catch((err) => console.error("No se pudo guardar la marca de Autopista de resultados", err));
  }

  if (!mod) return null;

  const missing = missingPrerequisites(progressBySkill, mod.id);
  if (missing.length > 0) {
    return (
      <PrerequisiteGate
        mod={mod}
        entity={entity}
        childId={childId}
        missing={missing}
        titleId={titleId}
        dialogRef={dialogRef}
        onKeyDown={handleKeyDown}
        onClose={onClose}
      />
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
        <RunnerGeneric
          moduleId={mod.id}
          soundOn={soundOn}
          onAnswer={onAnswer}
          onWin={handleWin}
          bestScore={record?.best}
          onGameOver={handleGameOver}
        />
      </div>
    </div>
  );
}
