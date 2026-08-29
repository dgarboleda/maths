"use client";

import { useState } from "react";
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

function buildQuestion(table: number): Question {
  const f1 = table === 0 ? randInt(1, 10) : table;
  const f2 = randInt(1, 10);
  const answer = f1 * f2;
  const choices = new Set<number>([answer]);
  while (choices.size < 4) {
    const wrong = answer + randInt(-6, 6) * (Math.random() > 0.5 ? 1 : 2);
    if (wrong > 0 && !choices.has(wrong)) choices.add(wrong);
  }
  return { f1, f2, answer, choices: [...choices].sort(() => Math.random() - 0.5) };
}

function questionKey(q: Question): string {
  return `${q.f1}x${q.f2}`;
}

const QUESTIONS_PER_ROUND = 10;

/**
 * Arma el vector completo de la ronda de una sola vez, sin claves (tabla ×
 * factor) repetidas, en vez de generar pregunta a pregunta y comparar contra
 * un historial. Si la tabla tiene menos combinaciones que preguntas en la
 * ronda, completa el resto permitiendo repetidos — no hay forma de evitarlo.
 */
function buildRound(table: number): Question[] {
  const round: Question[] = [];
  const seen = new Set<string>();
  const maxAttempts = QUESTIONS_PER_ROUND * 60;
  let attempts = 0;
  while (round.length < QUESTIONS_PER_ROUND && attempts < maxAttempts) {
    const candidate = buildQuestion(table);
    const key = questionKey(candidate);
    if (!seen.has(key)) {
      seen.add(key);
      round.push(candidate);
    }
    attempts++;
  }
  while (round.length < QUESTIONS_PER_ROUND) round.push(buildQuestion(table));
  return round;
}

export function PracticaTab({
  soundOn,
  onAnswer,
}: {
  soundOn: boolean;
  onAnswer: (correct: boolean) => void;
}) {
  const [table, setTable] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [questions, setQuestions] = useState<Question[]>(() => buildRound(0));
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [showHint, setShowHint] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [keypadInput, setKeypadInput] = useState("");
  const [finished, setFinished] = useState(false);

  const question = questions[questionNumber - 1];

  function selectTable(t: number) {
    playSound("click", soundOn);
    setTable(t);
    setQuestionNumber(1);
    setScore(0);
    setFinished(false);
    setQuestions(buildRound(t));
    setSelected(null);
    setStatus("idle");
    setShowHint(false);
    setKeypadInput("");
  }

  function submit(value: number) {
    if (status === "correct") return;
    const correct = value === question.answer;
    setSelected(value);
    onAnswer(correct);

    if (correct) {
      playSound("correct", soundOn);
      setStatus("correct");
      setScore((s) => s + 10);
      triggerConfetti();
      setTimeout(() => {
        if (questionNumber < QUESTIONS_PER_ROUND) {
          setQuestionNumber((n) => n + 1);
          setSelected(null);
          setStatus("idle");
          setShowHint(false);
          setKeypadInput("");
        } else {
          playSound("fanfare", soundOn);
          triggerConfetti();
          setFinished(true);
        }
      }, 900);
    } else {
      playSound("wrong", soundOn);
      setStatus("wrong");
      setTimeout(() => setStatus("idle"), 500);
    }
  }

  function keypadSubmit() {
    if (!keypadInput) return;
    submit(parseInt(keypadInput, 10));
  }

  const progressPct = ((questionNumber - 1) / QUESTIONS_PER_ROUND) * 100;

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-center font-bold text-slate-700">Elige una tabla para practicar:</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => selectTable(0)}
            className={`rounded-xl border-2 px-3 py-1.5 text-xs font-bold sm:text-sm ${
              table === 0
                ? "border-purple-700 bg-purple-600 text-white"
                : "border-purple-200 bg-purple-100 text-purple-700 hover:bg-purple-200"
            }`}
          >
            🎲 Mezclado
          </button>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => selectTable(n)}
              className={`rounded-xl border-2 px-3 py-1.5 text-xs font-bold sm:text-sm ${
                table === n
                  ? "border-purple-700 bg-purple-600 text-white"
                  : "border-purple-200 bg-white text-purple-700 hover:bg-purple-100"
              }`}
            >
              Tabla {n}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mx-auto max-w-xl rounded-3xl border-2 border-purple-200 bg-gradient-to-b from-purple-50 to-pink-50 p-6 text-center shadow-inner sm:p-8">
        {finished ? (
          <div className="space-y-2 rounded-2xl border-2 border-green-400 bg-green-100 p-4 text-green-900">
            <div className="text-3xl">🏆 ¡Práctica completada!</div>
            <p className="font-bold">Obtuviste {score} puntos en esta ronda.</p>
            <button
              onClick={() => selectTable(table)}
              className="mt-2 rounded-xl bg-green-600 px-6 py-2 font-bold text-white"
            >
              Practicar otra vez
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 h-3 w-full overflow-hidden rounded-full bg-purple-200">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="mb-2 flex items-center justify-between text-sm font-bold text-purple-600">
              <span>
                Pregunta {questionNumber} de {QUESTIONS_PER_ROUND}
              </span>
              <span>
                Puntos: <span className="text-green-600">{score}</span>
              </span>
            </div>

            <div className="my-6 flex items-center justify-center gap-3 text-5xl font-black tracking-wider text-purple-900 sm:text-6xl">
              <span>{question.f1}</span>
              <span className="text-pink-500">×</span>
              <span>{question.f2}</span>
              <span className="text-slate-400">=</span>
              <span className="inline-block min-h-[60px] w-20 border-b-4 border-purple-600 text-center text-purple-600 sm:w-24">
                {selected ?? "?"}
              </span>
            </div>

            <button
              onClick={() => setShowHint((v) => !v)}
              className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-purple-600 underline hover:text-purple-800 sm:text-sm"
            >
              🔍 ¿Necesitas una pista visual?
            </button>
            {showHint && (
              <div className="mb-6 flex max-h-36 flex-wrap justify-center gap-1 overflow-y-auto rounded-xl border border-purple-200 bg-white p-3">
                {Array.from({ length: question.f1 }, (_, i) => (
                  <div key={i} className="m-1 flex items-center gap-1 rounded-lg border border-purple-300 bg-purple-100 p-1.5">
                    {Array.from({ length: question.f2 }, (_, j) => (
                      <span key={j} className="text-xs">
                        ⭐
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4">
              {question.choices.map((choice) => {
                const isSelected = selected === choice;
                const color =
                  isSelected && status === "correct"
                    ? "bg-green-500 text-white border-green-600"
                    : isSelected && status === "wrong"
                      ? "animate-bounce bg-red-400 text-white border-red-500"
                      : "bg-white text-purple-900 border-purple-300 hover:bg-purple-100";
                return (
                  <button
                    key={choice}
                    onClick={() => submit(choice)}
                    className={`rounded-2xl border-2 py-3 text-2xl font-extrabold shadow-md transition-colors ${color}`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 border-t border-purple-200 pt-4">
              <button
                onClick={() => setShowKeypad((v) => !v)}
                className="text-xs font-bold text-slate-500 hover:text-purple-600"
              >
                ⌨️ O escribe el resultado directamente
              </button>
              {showKeypad && (
                <div className="mx-auto mt-3 max-w-xs">
                  <div className="grid grid-cols-3 gap-2">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
                      <button
                        key={n}
                        onClick={() => setKeypadInput((v) => (v.length < 3 ? v + n : v))}
                        className="rounded-xl border bg-white p-3 text-xl font-bold text-purple-800"
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      onClick={() => setKeypadInput("")}
                      className="rounded-xl bg-red-100 p-3 text-sm font-bold text-red-600"
                    >
                      Borrar
                    </button>
                    <button
                      onClick={() => setKeypadInput((v) => (v.length < 3 ? v + "0" : v))}
                      className="rounded-xl border bg-white p-3 text-xl font-bold text-purple-800"
                    >
                      0
                    </button>
                    <button
                      onClick={keypadSubmit}
                      className="rounded-xl bg-green-500 p-3 text-sm font-bold text-white"
                    >
                      OK ✔️
                    </button>
                  </div>
                  {keypadInput && (
                    <p className="mt-2 text-sm text-slate-500">Escribiste: {keypadInput}</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
