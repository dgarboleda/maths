"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { getFirebase } from "@/lib/firebase";
import { moduleHref, missingPrerequisites, type ModuleDef } from "@/lib/curriculum";
import { isCorrectAnswer, type Problem } from "@/lib/problem";
import type { SkillProgress } from "@/lib/types";
import { recordModuleAttempt } from "@/lib/attemptRecorder";
import { awardMasteryBadges } from "@/lib/masteryRewards";
import { QuestionWidget } from "@/components/topic/QuestionWidget";
import { playSound } from "@/lib/gameSound";
import { triggerConfetti } from "@/lib/confetti";
import { KIND_ICON, type Interactable } from "@/lib/world/scenes";
import { useDialogFocus } from "./useDialogFocus";

const KIND_HEADLINE: Record<Interactable["kind"], string> = {
  terminal: "TERMINAL BLOQUEADA",
  puerta: "CERRADURA ACTIVA",
  objeto: "CIERRE NUMÉRICO",
  npc: "TE PIDEN AYUDA",
  mecanismo: "MECANISMO DETENIDO",
};

const KIND_ACTION: Record<Interactable["kind"], string> = {
  terminal: "Introduce el código",
  puerta: "Marca la combinación",
  objeto: "Ajusta el cierre",
  npc: "Responde",
  mecanismo: "Calibra el mecanismo",
};

/**
 * Ficha de interacción con un objeto del mundo. El problema NO se inventa
 * aquí: sale de `mod.generateProblem()`, el intento se guarda con
 * `recordModuleAttempt` (mismo camino de Firestore que la pestaña Práctica) y
 * las insignias las otorga la misma regla de siempre. Lo único propio de esta
 * pantalla es el marco narrativo y la consecuencia visual.
 */
export function PuzzleOverlay({
  parentId,
  childId,
  interactable,
  mod,
  progressBySkill,
  streak,
  soundOn,
  onClose,
  onResolved,
  recordAttempt,
  onStars,
  awardBadges,
}: {
  parentId: string;
  childId: string;
  interactable: Interactable;
  mod: ModuleDef;
  progressBySkill: Record<string, SkillProgress>;
  streak: number;
  soundOn: boolean;
  onClose: () => void;
  onResolved: (moduleId: string, updated: SkillProgress, correct: boolean) => void;
  /** Sustituye a `recordModuleAttempt` — usado por el runtime del Level
   *  Editor (Fase 10) para reutilizar este componente byte a byte sin
   *  bifurcarlo. Ninguna llamada existente pasa esta prop, así que el
   *  comportamiento por defecto no cambia. */
  recordAttempt?: typeof recordModuleAttempt;
  /** Notifica las estrellas ganadas tras guardar — no-op por defecto; el
   *  runtime del nivel lo usa para GENERATE_AXIA (Fase 12). */
  onStars?: (stars: number) => void;
  /** Sustituye a `awardMasteryBadges` — usado por el Play Test (Fase 11)
   *  para que dominar un módulo durante una sesión de prueba no otorgue una
   *  insignia real. Ninguna llamada existente pasa esta prop. */
  awardBadges?: typeof awardMasteryBadges;
}) {
  const titleId = useId();
  const promptId = useId();
  const { dialogRef, handleKeyDown } = useDialogFocus(onClose);
  const [problem] = useState<Problem>(() => mod.generateProblem());
  const [hintLevel, setHintLevel] = useState(0);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{
    correct: boolean;
    stars: number;
    mastered: boolean;
  } | null>(null);

  const missing = missingPrerequisites(progressBySkill, mod.id);
  const locked = missing.length > 0;
  const isCore = interactable.kind === "mecanismo" || interactable.kind === "puerta";

  async function submit(given: number) {
    if (saving || result) return;
    setSaving(true);
    const correct = isCorrectAnswer(problem, given);
    try {
      const { db, firestore } = await getFirebase();
      const outcome = await (recordAttempt ?? recordModuleAttempt)(
        firestore,
        db,
        parentId,
        childId,
        mod,
        progressBySkill[mod.id],
        correct,
        streak,
        hintLevel,
      );
      const mastered = !outcome.wasMastered && outcome.updatedProgress.masteredAt !== null;
      if (mastered) {
        await (awardBadges ?? awardMasteryBadges)(firestore, db, parentId, childId, mod, {
          ...progressBySkill,
          [mod.id]: outcome.updatedProgress,
        });
      }
      onResolved(mod.id, outcome.updatedProgress, correct);
      onStars?.(outcome.stars);
      setResult({ correct, stars: outcome.stars, mastered });
    } catch (err) {
      console.error("No se pudo guardar el intento", err);
      setResult({ correct, stars: 0, mastered: false });
    } finally {
      setSaving(false);
    }
    playSound(correct ? "correct" : "wrong", soundOn);
    if (correct) triggerConfetti();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`anim-rise world-scanlines max-h-full w-full max-w-lg overflow-y-auto rounded-3xl border-2 focus:outline-none ${
          isCore ? "world-core-panel border-amber-400/40" : "world-terminal-panel border-cyan-400/40"
        } ${result && !result.correct ? "anim-shake" : ""}`}
      >
        <div
          className={`flex items-start justify-between gap-3 border-b-2 bg-gradient-to-r from-slate-900/80 to-slate-800/60 px-5 py-4 ${
            isCore ? "border-amber-400/25" : "border-cyan-400/25"
          }`}
        >
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="text-3xl">
              {locked ? "🔒" : KIND_ICON[interactable.kind]}
            </span>
            <div>
              <h2 id={titleId} className={`font-display text-lg font-bold ${isCore ? "text-amber-200" : "text-cyan-200"}`}>
                {interactable.label}
              </h2>
              <p
                className={`font-mono text-[11px] uppercase tracking-[0.2em] ${isCore ? "text-amber-400/80" : "text-cyan-400/80"}`}
              >
                {locked ? "ACCESO DENEGADO" : KIND_HEADLINE[interactable.kind]}
                {!locked && (
                  <span aria-hidden="true" className="anim-blink ml-1">
                    ▮
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-3 py-1.5 text-sm font-bold text-slate-300 hover:bg-slate-700"
          >
            Salir
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {locked ? (
            <>
              <p className="text-slate-300">
                El sistema no te reconoce todavía. Necesitas dominar antes:
              </p>
              <ul className="flex flex-col gap-1">
                {missing.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-bold text-slate-200"
                  >
                    <span aria-hidden="true">🔧 </span>
                    {m.label}
                  </li>
                ))}
              </ul>
              <Link
                href={moduleHref(childId, missing[0])}
                className="inline-block rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white"
              >
                Ir a entrenar {missing[0].label}
              </Link>
            </>
          ) : (
            <>
              <p
                className={`rounded-2xl border px-4 py-3 text-sm italic ${
                  isCore ? "border-amber-400/20 bg-slate-950/70 text-amber-100" : "border-cyan-400/20 bg-slate-950/70 text-cyan-100"
                }`}
              >
                {result?.correct ? interactable.reward : interactable.clue}
              </p>

              {!result && (
                <div className={`world-screen-glass overflow-hidden rounded-2xl p-4 ${isCore ? "is-core" : ""}`}>
                  <p className={`font-mono text-[11px] uppercase tracking-[0.2em] ${isCore ? "text-amber-400/90" : "text-cyan-400/90"}`}>
                    {KIND_ACTION[interactable.kind]}
                  </p>
                  {problem.flavor && (
                    <p aria-hidden="true" className="mt-2 text-sm italic text-violet-300">
                      {problem.flavor}
                    </p>
                  )}
                  <p id={promptId} className="mt-2 text-xl font-extrabold text-slate-50 sm:text-2xl">
                    {problem.prompt}
                  </p>

                  {problem.hints && (
                    <div className="mt-3 space-y-2">
                      <div role="status" aria-live="polite">
                        {hintLevel > 0 && (
                          <p className="rounded-xl border border-amber-400/30 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
                            <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
                              Diagnóstico ·{" "}
                            </span>
                            {problem.hints[hintLevel - 1]}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={hintLevel >= 3}
                        onClick={() => setHintLevel((n) => Math.min(n + 1, 3))}
                        className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-slate-700 disabled:opacity-40"
                      >
                        {hintLevel === 0
                          ? "Ejecutar diagnóstico"
                          : hintLevel >= 3
                            ? "Sin más pistas"
                            : `Diagnóstico ${hintLevel + 1}`}
                      </button>
                    </div>
                  )}

                  <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/60 p-4">
                    <QuestionWidget problem={problem} onSubmit={submit} promptId={promptId} disabled={saving} />
                  </div>
                </div>
              )}

              <div role="status" aria-live="polite">
                {result && (
                  <div className="anim-rise space-y-3">
                    {result.correct ? (
                      <>
                        <p className="font-mono text-lg font-bold text-emerald-300">
                          ✓ CÓDIGO ACEPTADO: {problem.answer}
                        </p>
                        {result.stars > 0 && (
                          <p className="text-sm font-bold text-amber-300">
                            +{result.stars} <span aria-hidden="true">★</span>
                            <span className="sr-only">estrellas</span>
                          </p>
                        )}
                        {result.mastered && (
                          <p className="rounded-2xl border-2 border-emerald-400/50 bg-emerald-950/50 px-4 py-3 font-bold text-emerald-100">
                            <span aria-hidden="true">🏆 </span>Habilidad dominada: {mod.label}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="font-mono text-lg font-bold text-red-300">
                        ✗ CÓDIGO RECHAZADO — era {problem.answer}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white"
                      >
                        Seguir explorando
                      </button>
                      <Link
                        href={moduleHref(childId, mod)}
                        className="text-sm font-bold text-cyan-300 underline underline-offset-2"
                      >
                        Entrenar {mod.label}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
