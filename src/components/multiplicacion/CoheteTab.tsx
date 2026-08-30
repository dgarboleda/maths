"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { playSound } from "@/lib/gameSound";
import { triggerConfetti } from "@/lib/confetti";

interface Question {
  f1: number;
  f2: number;
  answer: number;
  choices: number[];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildQuestion(): Question {
  const f1 = randInt(2, 10);
  const f2 = randInt(2, 10);
  const answer = f1 * f2;
  const choices = new Set<number>([answer]);
  while (choices.size < 4) {
    const wrong = answer + randInt(-8, 8);
    if (wrong > 0 && !choices.has(wrong)) choices.add(wrong);
  }
  return { f1, f2, answer, choices: [...choices].sort(() => Math.random() - 0.5) };
}

function questionKey(q: Question): string {
  return `${q.f1}x${q.f2}`;
}

// Bolsa de preguntas sin claves repetidas: se arma el vector completo de una
// vez y se consume en orden; cuando se agota, se arma una bolsa nueva.
const BAG_SIZE = 20;

function drawBag(): Question[] {
  const bag: Question[] = [];
  const seen = new Set<string>();
  const maxAttempts = BAG_SIZE * 60;
  let attempts = 0;
  while (bag.length < BAG_SIZE && attempts < maxAttempts) {
    const candidate = buildQuestion();
    const key = questionKey(candidate);
    if (!seen.has(key)) {
      seen.add(key);
      bag.push(candidate);
    }
    attempts++;
  }
  while (bag.length < BAG_SIZE) bag.push(buildQuestion());
  return bag;
}

const GOAL = 8;
const START_TIME = 30;

type Phase = "start" | "playing" | "over";

export function CoheteTab({
  soundOn,
  onAnswer,
}: {
  soundOn: boolean;
  onAnswer: (correct: boolean) => Promise<number>;
}) {
  const [phase, setPhase] = useState<Phase>("start");
  const [timer, setTimer] = useState(START_TIME);
  const timerRef = useRef(START_TIME);
  const [correctCount, setCorrectCount] = useState(0);
  const [starsThisRound, setStarsThisRound] = useState(0);
  const [bag, setBag] = useState<Question[]>(() => drawBag());
  const [win, setWin] = useState(false);
  const promptId = useId();

  const question = bag[0];

  function advance() {
    setBag((b) => {
      const rest = b.slice(1);
      return rest.length > 0 ? rest : drawBag();
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
    setBag(drawBag());
    setPhase("playing");
  }

  async function answer(value: number) {
    if (phase !== "playing") return;
    const correct = value === question.answer;
    const stars = await onAnswer(correct);

    if (correct) {
      playSound("correct", soundOn);
      const nextCount = correctCount + 1;
      setCorrectCount(nextCount);
      setStarsThisRound((s) => s + stars);
      if (nextCount >= GOAL) {
        endGame(true);
        return;
      }
      advance();
    } else {
      playSound("wrong", soundOn);
      setTimeLeft(timerRef.current - 3);
      if (timerRef.current <= 0) {
        endGame(false);
        return;
      }
    }
  }

  const progressPct = Math.min(100, (correctCount / GOAL) * 100);

  return (
    <div className="relative overflow-hidden rounded-3xl border-4 border-indigo-500 bg-slate-900 p-6 text-white shadow-2xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: "radial-gradient(white 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <h2 className="mb-2 bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-3xl font-extrabold text-transparent">
          <span aria-hidden="true">🚀 </span>Misión despegue galáctico
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
              <div id={promptId} className="mb-4 text-4xl font-black text-yellow-300 sm:text-5xl">
                {question.f1} × {question.f2} = ?
              </div>
              <div role="group" aria-labelledby={promptId} className="grid grid-cols-2 gap-3">
                {question.choices.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => answer(choice)}
                    className="rounded-xl border border-indigo-400 bg-indigo-800/90 py-3 text-2xl font-extrabold text-yellow-300 shadow-lg transition-colors hover:bg-indigo-700"
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {phase === "over" && (
          <div role="status" className="space-y-6 py-6">
            <div aria-hidden="true" className="text-6xl">
              {win ? "🚀🌕" : "🌟"}
            </div>
            <h3 className="text-3xl font-bold text-yellow-300">
              {win ? "¡Misión cumplida!" : "¡Buen intento!"}
            </h3>
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
              Jugar de nuevo <span aria-hidden="true">🔄</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
