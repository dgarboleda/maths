"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { QuestionWidget } from "./QuestionWidget";
import { generateUniqueBatch, isCorrectAnswer, type Problem } from "@/lib/problem";
import { getStrand, type StrandDef } from "@/lib/strands";
import { playSound } from "@/lib/gameSound";
import { triggerConfetti } from "@/lib/confetti";

const GOAL = 8;
const START_TIME = 30;
// Tamaño de la "bolsa": se arma un vector de preguntas sin firmas repetidas,
// se consume en orden, y cuando se agota se arma una bolsa nueva. Así nunca
// se repite nada mientras queden preguntas distintas por mostrar.
const BAG_SIZE = 20;

type Phase = "start" | "playing" | "over";

function drawBag(strand: StrandDef, difficulty: number): Problem[] {
  return generateUniqueBatch(() => strand.generateProblem(difficulty), BAG_SIZE);
}

export function CoheteGeneric({
  strandSlug,
  difficulty,
  soundOn,
  onAnswer,
}: {
  strandSlug: string;
  difficulty: number;
  soundOn: boolean;
  onAnswer: (correct: boolean) => Promise<number>;
}) {
  const strand = getStrand(strandSlug)!;
  const [phase, setPhase] = useState<Phase>("start");
  const [timer, setTimer] = useState(START_TIME);
  const timerRef = useRef(START_TIME);
  const [correctCount, setCorrectCount] = useState(0);
  const [starsThisRound, setStarsThisRound] = useState(0);
  const [bag, setBag] = useState<Problem[]>(() => drawBag(strand, difficulty));
  const [win, setWin] = useState(false);
  const promptId = useId();

  const problem = bag[0];

  function advance() {
    setBag((b) => {
      const rest = b.slice(1);
      return rest.length > 0 ? rest : drawBag(strand, difficulty);
    });
  }

  const endGame = useCallback(
    (didWin: boolean) => {
      setWin(didWin);
      setPhase("over");
      playSound("fanfare", soundOn);
      if (didWin) triggerConfetti();
    },
    [soundOn],
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
    if (phase !== "playing") return;
    const id = setInterval(() => {
      setTimeLeft(timerRef.current - 1);
      if (timerRef.current <= 0) endGame(false);
    }, 1000);
    return () => clearInterval(id);
  }, [phase, endGame]);

  function start() {
    playSound("click", soundOn);
    setTimeLeft(START_TIME);
    setCorrectCount(0);
    setStarsThisRound(0);
    setBag(drawBag(strand, difficulty));
    setPhase("playing");
  }

  async function submit(given: number) {
    if (phase !== "playing") return;
    const correct = isCorrectAnswer(problem, given);
    const stars = await onAnswer(correct);

    if (correct) {
      playSound("correct", soundOn);
      const next = correctCount + 1;
      setCorrectCount(next);
      setStarsThisRound((s) => s + stars);
      if (next >= GOAL) {
        endGame(true);
        return;
      }
    } else {
      playSound("wrong", soundOn);
      setTimeLeft(timerRef.current - 3);
      if (timerRef.current <= 0) {
        endGame(false);
        return;
      }
    }
    advance();
  }

  const progressPct = Math.min(100, (correctCount / GOAL) * 100);

  return (
    <div className="relative overflow-hidden rounded-3xl border-4 border-indigo-500 bg-slate-900 p-6 text-white shadow-2xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{ backgroundImage: "radial-gradient(white 1px, transparent 0)", backgroundSize: "24px 24px" }}
      />

      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <h2 className="mb-2 bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-3xl font-extrabold text-transparent">
          🚀 Misión despegue galáctico
        </h2>
        <p className="mb-6 text-sm text-indigo-200">
          ¡Responde rápido para impulsar tu cohete antes de que se acabe el combustible!
        </p>

        {phase === "start" && (
          <div className="space-y-6 py-8">
            <div aria-hidden="true" className="animate-bounce text-6xl">
              🚀
            </div>
            <button
              type="button"
              onClick={start}
              className="rounded-2xl border-2 border-white bg-gradient-to-r from-green-400 to-emerald-600 px-10 py-4 text-2xl font-extrabold text-slate-900 shadow-lg transition-transform hover:scale-105"
            >
              ¡Iniciar misión!
            </button>
            <p className="text-xs text-indigo-300">Responde correctamente para llegar a la Luna 🌕</p>
          </div>
        )}

        {phase === "playing" && (
          <div className="space-y-6">
            <div
              role="progressbar"
              aria-label="Avance del cohete"
              aria-valuemin={0}
              aria-valuemax={GOAL}
              aria-valuenow={correctCount}
              aria-valuetext={`${correctCount} de ${GOAL} respuestas correctas`}
              className="relative flex h-28 items-center justify-between overflow-hidden rounded-2xl border border-indigo-500/40 bg-slate-800/80 p-4 px-6"
            >
              <span aria-hidden="true" className="z-10 text-3xl">
                🌍
              </span>
              <div aria-hidden="true" className="absolute left-10 right-10 flex items-center">
                <div
                  className="text-4xl transition-all duration-500"
                  style={{ transform: `translateX(${progressPct * 3.4}px)` }}
                >
                  🚀
                </div>
              </div>
              <span aria-hidden="true" className="z-10 text-3xl">
                🌕
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-indigo-700 bg-indigo-950/80 p-3">
              <div className="flex items-center gap-2">
                <span>
                  <span aria-hidden="true">⏱️ </span>Tiempo:
                </span>
                {/* Sin región viva: anunciar cada segundo taparía el enunciado. */}
                <span aria-live="off" className="font-mono text-2xl font-bold text-yellow-400">
                  {timer}s
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>
                  <span aria-hidden="true">⭐ </span>Estrellas:
                </span>
                <span className="font-mono text-2xl font-bold text-green-400">{starsThisRound}</span>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-indigo-400 bg-indigo-900/90 p-6 shadow-inner">
              <div id={promptId} className="mb-4 text-3xl font-black text-yellow-300 sm:text-4xl">
                {problem.prompt}
              </div>
              <QuestionWidget problem={problem} onSubmit={submit} promptId={promptId} />
            </div>
          </div>
        )}

        {phase === "over" && (
          <div role="status" className="space-y-6 py-6">
            <div aria-hidden="true" className="text-6xl">
              {win ? "🚀🌕" : "🌟"}
            </div>
            <h3 className="text-3xl font-bold text-yellow-300">{win ? "¡Misión cumplida!" : "¡Buen intento!"}</h3>
            <p className="text-indigo-200">
              {win ? "¡Tu cohete llegó con éxito a la Luna!" : "¡Casi llegas a las estrellas!"}
            </p>
            <div className="mx-auto max-w-xs space-y-2 rounded-xl border border-indigo-700 bg-indigo-950 p-4 text-left">
              <div className="flex justify-between">
                <span>Respuestas acertadas:</span>
                <strong className="text-green-400">{correctCount}</strong>
              </div>
              <div className="flex justify-between">
                <span>Estrellas ganadas:</span>
                <strong className="text-yellow-400">+{starsThisRound} ★</strong>
              </div>
            </div>
            <button type="button" onClick={start} className="rounded-xl bg-purple-600 px-8 py-3 font-bold text-white hover:bg-purple-500">
              Jugar de nuevo 🔄
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
