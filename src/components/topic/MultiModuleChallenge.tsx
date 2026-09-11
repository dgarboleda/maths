"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ModuleDef } from "@/lib/curriculum";
import { isCorrectAnswer, type Problem } from "@/lib/problem";
import type { SkillProgress } from "@/lib/types";
import { recordModuleAttempt } from "@/lib/attemptRecorder";
import { QuestionWidget } from "@/components/topic/QuestionWidget";
import { playSound } from "@/lib/gameSound";
import { triggerConfetti } from "@/lib/confetti";

export interface MultiModuleChallengeTheme {
  icon: string;
  title: string;
  tagline: string;
  closingMessage: string;
}

/**
 * Envoltorio narrativo reutilizable para presentar varios módulos existentes
 * en fila (eventos especiales, Boss Challenge). Cada reto sigue siendo un
 * módulo real: la pregunta la genera `mod.generateProblem()` y el intento se
 * guarda con `attemptRecorder.ts` — exactamente la misma secuencia de
 * Firestore que ya usa la pestaña Práctica normal. Este componente no
 * escribe `masteredAt` directamente ni conoce insignias: solo reporta cada
 * resultado a quien lo use, vía `onStepResolved`, para que la pantalla que
 * envuelve (evento, boss) agregue su propia capa narrativa (un dígito, una
 * pista descartada...) sin duplicar lógica de progreso.
 */
export function MultiModuleChallenge({
  childId,
  modules,
  theme,
  soundOn,
  lives,
  onDefeat,
  onVictory,
  onStepResolved,
}: {
  childId: string;
  modules: ModuleDef[];
  theme: MultiModuleChallengeTheme;
  soundOn?: boolean;
  /** Fase 34 (docs/plan-jugabilidad.md §8) — `undefined` (el default de
   *  siempre): sin vidas, no se puede perder, igual que antes de esta fase.
   *  Con un número, cada fallo resta una; a cero, pantalla de derrota con
   *  "volver a intentar" en vez de seguir a la siguiente pregunta. */
  lives?: number;
  /** Se agotaron las vidas — el evento/boss decide la consecuencia (sonido
   *  "fail", por ejemplo); `MultiModuleChallenge` ya se encarga de la
   *  pantalla de derrota y el reintento por su cuenta. */
  onDefeat?: () => void;
  /** Se respondieron todos los retos sin agotar las vidas — nunca se llama
   *  si `lives` está definido y se llegó a 0 antes de terminar. Con
   *  `lives` sin definir (el evento actual) se llama siempre al terminar,
   *  igual que "terminó" hasta ahora. */
  onVictory?: () => void;
  onStepResolved?: (index: number, correct: boolean, problem: Problem) => void;
}) {
  const { user, parentId } = useAuth();
  const promptId = useId();
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
  const [loaded, setLoaded] = useState(false);
  const [index, setIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [starsEarned, setStarsEarned] = useState(0);
  const [feedbackByIndex, setFeedbackByIndex] = useState<Record<number, boolean>>({});
  const [livesLeft, setLivesLeft] = useState(lives ?? Infinity);
  const [defeated, setDefeated] = useState(false);

  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    (async () => {
      const {
        db,
        firestore: { collection, getDocs },
      } = await getFirebase();
      if (cancelled) return;
      const snap = await getDocs(collection(db, "parents", parentId, "children", childId, "skillsProgress"));
      if (cancelled) return;
      const map: Record<string, SkillProgress> = {};
      snap.forEach((d) => (map[d.id] = d.data() as SkillProgress));
      setProgressBySkill(map);
      setLoaded(true);
    })().catch((err) => console.error("No se pudo cargar el progreso", err));
    return () => {
      cancelled = true;
    };
  }, [parentId, childId]);

  const mod = modules[index];
  // Un problema nuevo por módulo/índice, sin re-generar en cada render: solo
  // cambia cuando cambia `mod` (avanzar de reto o reintentar desde el 0),
  // nunca al recibir feedback.
  const problem = useMemo(() => (mod ? mod.generateProblem() : null), [mod]);
  const feedback = index in feedbackByIndex ? { correct: feedbackByIndex[index] } : null;
  const finished = index >= modules.length;

  // Fase 34: `onVictory` se dispara una vez por transición real a
  // "terminado" — nunca al montar (el ref arranca en `false`, mismo `mod`
  // que `finished` en ese primer render), mismo criterio que las
  // detecciones de transición de LevelRuntime.tsx (Fase 29/31).
  const wasFinishedRef = useRef(false);
  useEffect(() => {
    if (finished && !wasFinishedRef.current) onVictory?.();
    wasFinishedRef.current = finished;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  function restart() {
    setIndex(0);
    setStreak(0);
    setStarsEarned(0);
    setFeedbackByIndex({});
    setLivesLeft(lives ?? Infinity);
    setDefeated(false);
  }

  if (!user || !parentId || !loaded) {
    return (
      <p role="status" className="text-center text-slate-300">
        Cargando…
      </p>
    );
  }

  if (defeated) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <span aria-hidden="true" className="text-4xl">
          💀
        </span>
        <p className="text-lg font-bold text-red-300">Te quedaste sin vidas.</p>
        {starsEarned > 0 && (
          <p className="text-sm font-bold text-amber-300">
            +{starsEarned} <span aria-hidden="true">★</span>
            <span className="sr-only">estrellas</span>
          </p>
        )}
        <button
          type="button"
          onClick={restart}
          className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white"
        >
          Volver a intentar
        </button>
      </div>
    );
  }

  if (finished || !mod || !problem) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <span aria-hidden="true" className="text-4xl">
          {theme.icon}
        </span>
        <p className="text-lg font-bold text-emerald-200">{theme.closingMessage}</p>
        {starsEarned > 0 && (
          <p className="text-sm font-bold text-amber-300">
            +{starsEarned} <span aria-hidden="true">★</span>
            <span className="sr-only">estrellas</span>
          </p>
        )}
      </div>
    );
  }

  async function submit(given: number) {
    if (!parentId || !problem) return;
    const correct = isCorrectAnswer(problem, given);
    const { db, firestore } = await getFirebase();
    const result = await recordModuleAttempt(
      firestore,
      db,
      parentId,
      childId,
      mod,
      progressBySkill[mod.id],
      correct,
      streak,
    );
    setProgressBySkill((prev) => ({ ...prev, [mod.id]: result.updatedProgress }));
    setFeedbackByIndex((prev) => ({ ...prev, [index]: correct }));
    playSound(correct ? "correct" : "wrong", Boolean(soundOn));
    if (correct) {
      triggerConfetti();
      setStreak((s) => s + 1);
      setStarsEarned((s) => s + result.stars);
    } else {
      setStreak(0);
      // Fase 34 (docs/plan-jugabilidad.md §8): con `lives` definido, un
      // fallo resta una — a cero, pantalla de derrota en vez de seguir con
      // la pregunta siguiente. Sin `lives` (el evento actual), `livesLeft`
      // parte de `Infinity` y nunca llega a 0: comportamiento idéntico al
      // de siempre.
      if (lives !== undefined) {
        const remaining = livesLeft - 1;
        setLivesLeft(remaining);
        if (remaining <= 0) {
          setDefeated(true);
          onDefeat?.();
        }
      }
    }
    onStepResolved?.(index, correct, problem);
  }

  function next() {
    setIndex((i) => i + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-indigo-300">
          {theme.title} · {index + 1}/{modules.length}
        </p>
        <p className="text-sm text-slate-400">{theme.tagline}</p>
        {lives !== undefined && (
          <p role="status" aria-label={`${livesLeft} de ${lives} vidas`} className="mt-1 text-lg">
            <span aria-hidden="true">{Array.from({ length: lives }, (_, i) => (i < livesLeft ? "❤️" : "🖤")).join(" ")}</span>
          </p>
        )}
      </div>

      <p id={promptId} className="text-center text-xl font-extrabold text-slate-100">
        {problem.prompt}
      </p>

      {!feedback && <QuestionWidget problem={problem} onSubmit={submit} promptId={promptId} />}

      <div role="status" aria-live="polite">
        {feedback && (
          <div className="flex flex-col items-center gap-3">
            <p className={feedback.correct ? "font-bold text-emerald-300" : "font-bold text-red-300"}>
              {feedback.correct ? "¡Correcto! 🎉" : `La respuesta era ${problem.answer}.`}
            </p>
            <button
              type="button"
              onClick={next}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-500"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
