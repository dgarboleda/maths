"use client";

import { useEffect, useId, useRef, useState } from "react";
import { QuestionWidget } from "./QuestionWidget";
import { generateUniqueBatch, isCorrectAnswer, type Problem } from "@/lib/problem";
import { getModule } from "@/lib/curriculum";
import { playSound } from "@/lib/gameSound";
import { triggerConfetti } from "@/lib/confetti";

const ROUND_LENGTH = 10;

export function PracticeRoundGeneric({
  moduleId,
  soundOn,
  onAnswer,
}: {
  moduleId: string;
  soundOn: boolean;
  onAnswer: (correct: boolean) => void;
}) {
  const mod = getModule(moduleId)!;

  // El vector completo de la ronda se arma de una sola vez, con firmas
  // (categoría + parámetros) sin repetir — no se genera pregunta a pregunta.
  const [questions, setQuestions] = useState<Problem[]>(() =>
    generateUniqueBatch(mod.generateProblem, ROUND_LENGTH),
  );
  const [questionNumber, setQuestionNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<{ correct: boolean; answer: number } | null>(null);
  const [finished, setFinished] = useState(false);
  const promptId = useId();
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  const problem = questions[questionNumber - 1];

  // Al contestar desaparece el control de respuesta: sin esto el foco del
  // teclado volvería al principio del documento en vez de quedar en
  // "Siguiente", que es lo único que se puede hacer a continuación.
  useEffect(() => {
    if (feedback) nextButtonRef.current?.focus();
  }, [feedback]);

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
    setQuestions(generateUniqueBatch(mod.generateProblem, ROUND_LENGTH));
    setQuestionNumber(1);
    setScore(0);
    setFeedback(null);
    setFinished(false);
  }

  const progressPct = ((questionNumber - 1) / ROUND_LENGTH) * 100;

  if (finished) {
    return (
      <div
        role="status"
        className="mx-auto max-w-xl space-y-2 rounded-2xl border-2 border-green-400 bg-green-100 p-6 text-center text-green-900"
      >
        <div className="text-3xl">
          <span aria-hidden="true">🏆 </span>¡Práctica completada!
        </div>
        <p className="font-bold">Obtuviste {score} puntos en esta ronda.</p>
        <button type="button" onClick={restart} className="mt-2 rounded-xl bg-green-600 px-6 py-2 font-bold text-white">
          Practicar otra vez
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-3xl border-2 border-purple-200 bg-gradient-to-b from-purple-50 to-pink-50 p-6 text-center shadow-inner sm:p-8">
      <div
        role="progressbar"
        aria-label="Avance de la ronda"
        aria-valuemin={0}
        aria-valuemax={ROUND_LENGTH}
        aria-valuenow={questionNumber - 1}
        aria-valuetext={`Pregunta ${questionNumber} de ${ROUND_LENGTH}`}
        className="h-3 w-full overflow-hidden rounded-full bg-purple-200"
      >
        <div
          className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-sm font-bold text-purple-700">
        <span>
          Pregunta {questionNumber} de {ROUND_LENGTH}
        </span>
        <span>
          Puntos: <span className="text-green-700">{score}</span>
        </span>
      </div>

      <p id={promptId} className="text-2xl font-extrabold text-purple-900 sm:text-3xl">
        {problem.prompt}
      </p>

      {!feedback && <QuestionWidget problem={problem} onSubmit={submit} promptId={promptId} />}

      <div role="status" aria-live="polite">
        {feedback && (
          <div className="space-y-3">
            {feedback.correct ? (
              <p className="text-lg font-bold text-emerald-700">¡Correcto! 🎉</p>
            ) : (
              <p className="text-lg font-bold text-slate-700">Casi — la respuesta era {feedback.answer}</p>
            )}
            <button
              ref={nextButtonRef}
              type="button"
              onClick={next}
              className="rounded-2xl bg-purple-600 px-6 py-2 font-bold text-white"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
