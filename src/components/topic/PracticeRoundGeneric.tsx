"use client";

import { useState } from "react";
import { QuestionWidget } from "./QuestionWidget";
import { generateUniqueBatch, isCorrectAnswer, type Problem } from "@/lib/problem";
import { getStrand } from "@/lib/strands";
import { playSound } from "@/lib/gameSound";
import { triggerConfetti } from "@/lib/confetti";

const ROUND_LENGTH = 10;

export function PracticeRoundGeneric({
  strandSlug,
  difficulty,
  soundOn,
  onAnswer,
}: {
  strandSlug: string;
  difficulty: number;
  soundOn: boolean;
  onAnswer: (correct: boolean) => void;
}) {
  const strand = getStrand(strandSlug)!;

  // El vector completo de la ronda se arma de una sola vez, con firmas
  // (categoría + parámetros) sin repetir — no se genera pregunta a pregunta.
  const [questions, setQuestions] = useState<Problem[]>(() =>
    generateUniqueBatch(() => strand.generateProblem(difficulty), ROUND_LENGTH),
  );
  const [questionNumber, setQuestionNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<{ correct: boolean; answer: number } | null>(null);
  const [finished, setFinished] = useState(false);

  const problem = questions[questionNumber - 1];

  function submit(given: number) {
    const correct = isCorrectAnswer(problem, given);
    onAnswer(correct);
    setFeedback({ correct, answer: problem.answer });
    if (correct) {
      playSound("correct", soundOn);
      setScore((s) => s + 10);
      triggerConfetti();
    } else {
      playSound("wrong", soundOn);
    }
  }

  function next() {
    if (questionNumber >= ROUND_LENGTH) {
      playSound("fanfare", soundOn);
      triggerConfetti();
      setFinished(true);
      return;
    }
    setQuestionNumber((n) => n + 1);
    setFeedback(null);
  }

  function restart() {
    playSound("click", soundOn);
    setQuestions(generateUniqueBatch(() => strand.generateProblem(difficulty), ROUND_LENGTH));
    setQuestionNumber(1);
    setScore(0);
    setFeedback(null);
    setFinished(false);
  }

  const progressPct = ((questionNumber - 1) / ROUND_LENGTH) * 100;

  if (finished) {
    return (
      <div className="mx-auto max-w-xl space-y-2 rounded-2xl border-2 border-green-400 bg-green-100 p-6 text-center text-green-900">
        <div className="text-3xl">🏆 ¡Práctica completada!</div>
        <p className="font-bold">Obtuviste {score} puntos en esta ronda.</p>
        <button onClick={restart} className="mt-2 rounded-xl bg-green-600 px-6 py-2 font-bold text-white">
          Practicar otra vez
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-3xl border-2 border-purple-200 bg-gradient-to-b from-purple-50 to-pink-50 p-6 text-center shadow-inner sm:p-8">
      <div className="h-3 w-full overflow-hidden rounded-full bg-purple-200">
        <div
          className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-sm font-bold text-purple-600">
        <span>
          Pregunta {questionNumber} de {ROUND_LENGTH}
        </span>
        <span>
          Puntos: <span className="text-green-600">{score}</span>
        </span>
      </div>

      <p className="text-2xl font-extrabold text-purple-900 sm:text-3xl">{problem.prompt}</p>

      {!feedback && <QuestionWidget problem={problem} onSubmit={submit} />}

      {feedback && (
        <div className="space-y-3">
          {feedback.correct ? (
            <p className="text-lg font-bold text-emerald-600">¡Correcto! 🎉</p>
          ) : (
            <p className="text-lg font-bold text-slate-600">Casi — la respuesta era {feedback.answer}</p>
          )}
          <button onClick={next} className="rounded-2xl bg-purple-600 px-6 py-2 font-bold text-white">
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
