"use client";

import { ArcadeIntro, ArcadeSprite } from "./ArcadeArt";
import { ArcadeFinalScore, ArcadeFxLayer, ArcadeScoreBar, useArcadeFx } from "./ArcadeFx";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { QuestionWidget } from "./QuestionWidget";
import {
  generateUniqueBatch,
  isCorrectAnswer,
  type Problem,
} from "@/lib/problem";
import { getModule } from "@/lib/curriculum";
import { playSound } from "@/lib/gameSound";
import { triggerConfetti } from "@/lib/confetti";
import type { LessonExercise } from "@/lib/minigames/lessonExercise";

const GOAL = 8;
const START_TIME = 30;
// Tamaño de la "bolsa": se arma un vector de preguntas sin firmas repetidas,
// se consume en orden, y cuando se agota se arma una bolsa nueva. Así nunca
// se repite nada mientras queden preguntas distintas por mostrar.
const BAG_SIZE = 20;
const ANSWER_POINTS = 100;

type Phase = "start" | "playing" | "over";

function drawBag(generateProblem: () => Problem): Problem[] {
  return generateUniqueBatch(generateProblem, BAG_SIZE);
}

export function CoheteGeneric({
  moduleId,
  soundOn,
  onAnswer,
  onWin,
  bestScore,
  onGameOver,
  exercise,
}: {
  moduleId: string;
  soundOn: boolean;
  onAnswer: (correct: boolean) => Promise<number>;
  onWin?: () => void;
  /** Fase 35 (docs/plan-jugabilidad.md §9) — la mejor marca guardada
   *  (respuestas acertadas en una carrera), para mostrar "Tu marca" y "¡Nueva
   *  marca!". `undefined`/`null` = sin marca todavía (nunca se trata como
   *  0: un 0 sería una marca real). El llamador decide si persistirla. */
  bestScore?: number | null;
  /** Se llama al terminar la carrera (ganada o no) con las respuestas
   *  acertadas — el llamador decide si eso mejora la marca guardada. */
  onGameOver?: (correctCount: number) => void;
  exercise?: LessonExercise;
}) {
  const generateProblem = () =>
    exercise?.problem ?? getModule(moduleId)!.generateProblem();
  const [phase, setPhase] = useState<Phase>("start");
  const [timer, setTimer] = useState(START_TIME);
  const timerRef = useRef(START_TIME);
  const [correctCount, setCorrectCount] = useState(0);
  const correctCountRef = useRef(0);
  const [bestAtStart, setBestAtStart] = useState<number | null>(null);
  const sessionBestRef = useRef<number | null>(null);
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const roundRef = useRef(0);
  const playingRef = useRef(false);
  const [starsThisRound, setStarsThisRound] = useState(0);
  const [bag, setBag] = useState<Problem[]>(() =>
    exercise ? [exercise.problem] : drawBag(generateProblem),
  );
  const [win, setWin] = useState(false);
  const promptId = useId();
  const cabinetRef = useRef<HTMLDivElement>(null);
  const fx = useArcadeFx({ game: "cohete", soundOn, solved: exercise?.solved, cabinetRef });
  // El reloj depende de `endGame`: se lee el cierre arcade desde una ref para
  // no reiniciar el intervalo en cada render de efectos.
  const fxEndRef = useRef(fx.end);
  useEffect(() => {
    fxEndRef.current = fx.end;
  });

  const problem = exercise?.problem ?? bag[0];
  const goal = exercise ? 1 : GOAL;
  const shownCount = exercise ? Number(exercise.solved) : correctCount;
  const shownPhase = exercise?.solved ? "over" : phase;
  const shownWin = exercise ? exercise.solved : win;
  const lessonMode = Boolean(exercise);
  const timerRunning =
    !exercise || (exercise.timed && !exercise.paused && !exercise.disabled);

  function advance() {
    setBag((b) => {
      const rest = b.slice(1);
      return rest.length > 0 ? rest : drawBag(generateProblem);
    });
  }

  const endGame = useCallback(
    (didWin: boolean) => {
      if (!playingRef.current) return;
      playingRef.current = false;
      sessionBestRef.current = Math.max(
        sessionBestRef.current ?? 0,
        correctCountRef.current,
      );
      setWin(didWin);
      setPhase("over");
      fxEndRef.current(didWin);
      playSound(didWin ? "fanfare" : "fail", soundOn);
      onGameOver?.(correctCountRef.current);
      if (didWin) {
        triggerConfetti("medium"); // Fase 31: cohete ganado
        onWin?.();
      }
    },
    [soundOn, onWin, onGameOver],
  );

  function setTimeLeft(seconds: number) {
    timerRef.current = Math.max(0, seconds);
    setTimer(timerRef.current);
  }

  // El reloj vive en un efecto atado a la fase y termina la partida desde el
  // callback del intervalo. Antes llamaba a endGame() dentro del actualizador
  // de setTimer, es decir efectos (sonido, confeti, cambio de fase) dentro de
  // una función que React puede volver a ejecutar: en modo estricto la
  // partida terminaba dos veces.
  useEffect(() => {
    if (shownPhase !== "playing" || !timerRunning) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      setTimeLeft(timerRef.current - 1);
      if (timerRef.current <= 0) endGame(false);
    }, 1000);
    return () => clearInterval(id);
  }, [shownPhase, timerRunning, endGame, lessonMode]);

  function start() {
    playSound("click", soundOn);
    setTimeLeft(START_TIME);
    setCorrectCount(0);
    correctCountRef.current = 0;
    const previousBest = Math.max(
      bestScore ?? -1,
      sessionBestRef.current ?? -1,
    );
    setBestAtStart(previousBest < 0 ? null : previousBest);
    roundRef.current += 1;
    playingRef.current = true;
    submittingRef.current = false;
    setSubmitting(false);
    setStarsThisRound(0);
    setBag(exercise ? [exercise.problem] : drawBag(generateProblem));
    setPhase("playing");
    fx.start("¡Despegue!");
  }

  async function submit(given: number) {
    if (!playingRef.current || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    const round = roundRef.current;
    try {
      const correct = isCorrectAnswer(problem, given);
      const stars = await onAnswer(correct);
      if (!playingRef.current || round !== roundRef.current) return;

      if (correct) {
        playSound("correct", soundOn);
        const next = correctCountRef.current + 1;
        fx.award(ANSWER_POINTS, { x: 10 + (next / GOAL) * 80, y: 40 }, { label: `+${ANSWER_POINTS} ¡Impulso!`, sound: "whoosh" });
        correctCountRef.current = next;
        setCorrectCount(next);
        setStarsThisRound((s) => s + stars);
        if (next >= GOAL) {
          endGame(true);
          return;
        }
      } else {
        playSound("wrong", soundOn);
        fx.oops({ x: 50, y: 40 }, "−3 s");
        setTimeLeft(timerRef.current - 3);
        if (timerRef.current <= 0) {
          endGame(false);
          return;
        }
      }
      advance();
    } finally {
      if (round === roundRef.current) {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  }

  const progressPct = Math.min(100, (shownCount / goal) * 100);

  return (
    <div ref={cabinetRef} data-game="cohete" data-paused={Boolean(exercise?.paused || exercise?.disabled)} className="arcade-cabinet relative overflow-hidden rounded-3xl border-4 border-indigo-500 bg-slate-900 p-3 sm:p-6 text-white shadow-2xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: "radial-gradient(white 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <ArcadeFxLayer fx={fx} scope="cabinet" />
      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <h2 className="mb-2 bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-3xl font-extrabold text-transparent">
          🚀 Misión despegue galáctico
        </h2>
        <p className="mb-6 text-sm text-indigo-200">
          {exercise
            ? "Resuelve el ejercicio de tu clase para impulsar el cohete. Puedes parar y pedir ayuda."
            : "¡Responde rápido para impulsar tu cohete antes de que se acabe el combustible!"}
        </p>

        {shownPhase === "start" && (
          <div className="space-y-6 py-8">
            <ArcadeIntro game="cohete" />
            <button
              type="button"
              onClick={start}
              disabled={exercise?.disabled || exercise?.paused}
              className="arcade-start-pulse rounded-2xl border-2 border-white bg-gradient-to-r from-green-400 to-emerald-600 px-10 py-4 text-2xl font-extrabold text-slate-900 shadow-lg transition-transform hover:scale-105"
            >
              ¡Iniciar misión!
            </button>
            <p className="text-xs text-indigo-300">
              Responde correctamente para llegar a la Luna 🌕
            </p>
          </div>
        )}

        {shownPhase === "playing" && (
          <div className="space-y-6">
            <div
              role="progressbar"
              aria-label="Avance del cohete"
              aria-valuemin={0}
              aria-valuemax={goal}
              aria-valuenow={shownCount}
              aria-valuetext={`${shownCount} de ${goal} respuestas correctas`}
              className="arcade-scene arcade-flight relative flex h-36 items-end justify-between overflow-hidden rounded-2xl border border-indigo-400/60 p-3"
            >
              <span aria-hidden="true" className="z-10 flex flex-col items-center gap-1 text-xs text-sky-100"><ArcadeSprite kind="earth" className="size-12" />Tierra</span>
              <div
                aria-hidden="true"
                className="absolute bottom-12 left-10 right-10 h-16"
              >
                <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="absolute inset-0 size-full"><path d="M0 29 Q50 -20 100 29" fill="none" stroke="#a5b4fc" strokeWidth=".6" strokeDasharray="2 2" /></svg>
                <div className="absolute -translate-x-1/2 transition-all duration-500 motion-reduce:transition-none" style={{ left: `${progressPct}%`, bottom: `${Math.sin(progressPct / 100 * Math.PI) * 45}%`, transform: `translateX(-50%) rotate(${progressPct * 1.2}deg)` }}><ArcadeSprite kind="rocket" className="size-12" /><span className="arcade-trail absolute left-1/2 top-full -mt-2 block h-4 w-3 -translate-x-1/2 rounded-b-full bg-gradient-to-b from-yellow-200 via-orange-400 to-transparent" /></div>
              </div>
              <span aria-hidden="true" className="absolute inset-x-0 top-2 text-xs font-bold tracking-widest text-indigo-200">{progressPct === 0 ? "Listo para despegar" : progressPct < 70 ? "En órbita" : "Aproximación lunar"}</span>
              <span aria-hidden="true" className="z-10 flex flex-col items-center gap-1 text-xs text-indigo-100"><ArcadeSprite kind="moon" className="size-12" />Luna</span>
              <ArcadeFxLayer fx={fx} />
            </div>
            <ArcadeScoreBar fx={fx} />

            <div className="flex items-center justify-between rounded-xl border border-indigo-700 bg-indigo-950/80 p-3">
              <div className="flex items-center gap-2">
                <span>
                  <span aria-hidden="true">⏱️ </span>Tiempo:
                </span>
                {/* Sin región viva: anunciar cada segundo taparía el enunciado. */}
                <span
                  aria-live="off"
                  className="font-mono text-2xl font-bold text-yellow-400"
                >
                  {exercise && !exercise.timed ? "Sin límite" : `${timer}s`}
                </span>
              </div>
              {!exercise && <div className="flex items-center gap-2">
                <span>
                  <span aria-hidden="true">⭐ </span>Estrellas:
                </span>
                <span className="font-mono text-2xl font-bold text-green-400">
                  {starsThisRound}
                </span>
              </div>}
            </div>

            <div className="rounded-2xl border-2 border-indigo-400 bg-indigo-900/90 p-6 shadow-inner">
              {problem.flavor && (
                <p
                  aria-hidden="true"
                  className="mb-1 text-sm italic text-indigo-300"
                >
                  {problem.flavor}
                </p>
              )}
              {!exercise && <div
                id={promptId}
                className="mb-4 text-3xl font-black text-yellow-300 sm:text-4xl"
              >
                {problem.prompt}
              </div>}
              {exercise ? exercise.input : <QuestionWidget
                key={problem.id}
                problem={problem}
                disabled={submitting}
                onSubmit={submit}
                promptId={promptId}
              />}
            </div>
          </div>
        )}

        {shownPhase === "over" && (
          <div role="status" className="space-y-6 py-6">
            <div aria-hidden="true" className="arcade-win text-6xl">
              {shownWin ? "🚀🌕" : "🌟"}
            </div>
            <h3 className="text-3xl font-bold text-yellow-300">
              {shownWin ? "¡Misión cumplida!" : "¡Buen intento!"}
            </h3>
            <p className="text-indigo-200">
              {shownWin
                ? "¡Tu cohete llegó con éxito a la Luna!"
                : "¡Casi llegas a las estrellas!"}
            </p>
            <div className="mx-auto max-w-xs space-y-2 rounded-xl border border-indigo-700 bg-indigo-950 p-4 text-left">
              <div className="flex justify-between">
                <span>Respuestas acertadas:</span>
                <strong className="text-green-400">{shownCount}</strong>
              </div>
              <ArcadeFinalScore fx={fx} />
              {!exercise && <div className="flex justify-between">
                <span>Estrellas ganadas:</span>
                <strong className="text-yellow-400">+{starsThisRound} ★</strong>
              </div>}
              {bestAtStart != null && (
                <div className="flex justify-between border-t border-indigo-800 pt-2">
                  <span>Tu marca:</span>
                  <strong className="text-orange-300">
                    {correctCount > bestAtStart ? (
                      <>¡Nueva marca! 🏅 {correctCount}</>
                    ) : (
                      bestAtStart
                    )}
                  </strong>
                </div>
              )}
            </div>
            {(!exercise || !exercise.solved) && <button
              type="button"
              onClick={start}
              disabled={exercise?.disabled || exercise?.paused}
              className="rounded-xl bg-purple-600 px-8 py-3 font-bold text-white hover:bg-purple-500"
            >
              Jugar de nuevo 🔄
            </button>}
            {exercise && !exercise.solved && (
              <p className="text-sm text-indigo-200">
                El tiempo de la partida terminó. Tu aprendizaje no pierde puntos;
                puedes reintentar o desactivar el reloj.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
