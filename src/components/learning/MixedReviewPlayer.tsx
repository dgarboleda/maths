"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, BookOpen, Check, X } from "lucide-react";
import {
  errorFeedback,
  independent,
  initialMixedReview,
  initialProgress,
  isAnswerCorrect,
  LEARNING_UNITS,
  LESSONS,
  MIXED_REVIEW_MIN_LESSONS,
  MIXED_REVIEW_SIZE,
  mixedQuestions,
  mixedReviewId,
  unitForReviewId,
  type LearningAction,
  type MixedReviewState,
} from "@/lib/learning/domain";
import {
  useLearningAction,
  useLearningData,
} from "@/lib/learning/useLearningData";
import {
  LearningLoading,
  LearningLoadError,
  LearningShell,
  primaryButton,
  SaveNotice,
  secondaryButton,
} from "./LearningShell";
import { QuestionActivity } from "./LessonPlayer";
import { questionHelp } from "@/lib/learning/screenHelp";

/**
 * Repaso intercalado de una unidad: problemas de varias clases terminadas,
 * alternados, para practicar la decisión de qué idea usar (no solo cómo
 * aplicarla). Registra la primera respuesta y las pistas como en una
 * comprobación; el desarrollo se muestra al terminar la sesión.
 */
export function MixedReviewPlayer({
  childId,
  reviewId,
}: {
  childId: string;
  reviewId: string;
}) {
  const data = useLearningData(childId);
  const mutation = useLearningAction(data.parentId, childId);
  const unitId = unitForReviewId(reviewId);
  const unit = LEARNING_UNITS.find((u) => u.id === unitId);
  const saved = data.reviews[reviewId];
  const confirmed =
    mutation.confirmed?.lessonId === reviewId
      ? (mutation.confirmed.progress as MixedReviewState)
      : undefined;
  const state =
    confirmed && confirmed.revision > (saved?.revision ?? 0)
      ? confirmed
      : (saved ?? (unitId ? initialMixedReview(unitId) : undefined));
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [state?.stage, state?.index]);
  if (data.loading) return <LearningLoading />;
  if (data.error || !data.child)
    return (
      <LearningLoadError
        message={data.error ?? "No encontramos este perfil."}
      />
    );
  if (!unit || !state)
    return (
      <LearningLoadError message="Este repaso no está disponible. Vuelve a tu biblioteca para elegir otro." />
    );
  const run = (action: LearningAction) =>
    mutation.run(mixedReviewId(unit.id), state.revision, action);
  const lessons = LESSONS.filter((lesson) => lesson.unitId === unit.id);
  const completed = lessons.filter(
    (lesson) => data.progress[lesson.id]?.completedAt,
  );
  const session = mixedQuestions(state);
  const current = state.stage === "active" ? session[state.index] : undefined;
  const help = current ? questionHelp(current.lesson, current.question) : undefined;
  return (
    <LearningShell
      childId={childId}
      title={`Repaso mixto: ${unit.title}`}
      eyebrow="Decide qué idea usar en cada problema"
      help={help}
      helpDisabled={mutation.blocked}
      onHelpOpen={current && help && help.ideas.length > 0 && !state.responses[current.question.id]?.attempts && !state.responses[current.question.id]?.hintsUsed
        ? () => run({ kind: "hint", questionId: current.question.id }) : undefined}
    >
      <Link
        href={`/jugar/${childId}/aprende#unit-${unit.id}`}
        className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-cyan-200 underline underline-offset-4"
      >
        <BookOpen size={16} aria-hidden="true" />
        Volver a la unidad
      </Link>
      <div className="max-w-3xl space-y-5">
        <SaveNotice
          busy={mutation.busy}
          error={mutation.error}
          retry={mutation.retry}
        />
        <h2
          ref={heading}
          tabIndex={-1}
          className="text-lg font-bold text-cyan-200 outline-none"
        >
          {state.stage === "active"
            ? `Problema ${state.index + 1} de ${session.length}`
            : state.stage === "summary"
              ? "Resultado de la sesión"
              : "Antes de empezar"}
        </h2>
        {current ? (
          <QuestionActivity
            key={`${state.round}:${state.index}`}
            lesson={{
              ...current.lesson,
              review: session.map((item) => item.question),
            }}
            question={current.question}
            progress={{
              ...initialProgress(current.lesson),
              stage: "review",
              index: state.index,
            }}
            evidence={state.responses[current.question.id]}
            disabled={mutation.blocked}
            run={run}
          />
        ) : (
          <section className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-7">
            {state.stage === "summary" && state.lastResult && (
              <MixedSummary state={state} />
            )}
            <p className="leading-relaxed text-slate-300">
              Resolverás {MIXED_REVIEW_SIZE} problemas de tus clases terminadas
              de esta unidad, alternados. En cada uno, primero identifica qué
              idea necesitas. Se registra tu primera respuesta; puedes pedir
              pistas y el desarrollo se muestra al final.
            </p>
            <p className="text-sm text-slate-400">
              Clases que entran en la mezcla:{" "}
              {completed.length > 0
                ? completed.map((lesson) => lesson.title).join(" · ")
                : "todavía ninguna"}
              .
            </p>
            {completed.length < MIXED_REVIEW_MIN_LESSONS ? (
              <p className="rounded-xl bg-amber-950/30 p-4 text-sm text-amber-100">
                Termina al menos {MIXED_REVIEW_MIN_LESSONS} clases de esta
                unidad para mezclar sus problemas.
              </p>
            ) : (
              <button
                className={primaryButton}
                disabled={mutation.blocked}
                onClick={() => void run({ kind: "begin", stage: "review" })}
              >
                {state.round > 0 ? "Empezar otra sesión" : "Empezar el repaso mixto"}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            )}
            <p className="text-xs leading-relaxed text-slate-400">
              Superar una sesión exige al menos 5 de 6 respuestas autónomas.
              Cada sesión mezcla problemas distintos.
            </p>
          </section>
        )}
        {state.stage === "active" && (
          <Link
            href={`/jugar/${childId}/aprende#unit-${unit.id}`}
            className={`${secondaryButton} w-fit`}
          >
            Seguir más tarde
          </Link>
        )}
      </div>
    </LearningShell>
  );
}

function MixedSummary({ state }: { state: MixedReviewState }) {
  const result = state.lastResult!;
  return (
    <div className="space-y-4">
      <p
        className={`rounded-xl p-4 ${result.passed ? "bg-emerald-950/50 text-emerald-100" : "bg-amber-950/40 text-amber-100"}`}
      >
        {result.correct} de {result.total} respuestas autónomas.{" "}
        {result.passed
          ? "Sesión superada: reconoces qué idea usar aunque los problemas aparezcan mezclados."
          : "Revisa los problemas marcados: anota qué pista te habría ayudado a reconocer la idea."}
      </p>
      <ol className="space-y-3">
        {mixedQuestions(state).map(({ question, lesson }) => {
          const evidence = state.responses[question.id];
          const ok = independent(evidence);
          const correct = Boolean(
            evidence?.response && isAnswerCorrect(question, evidence.response),
          );
          return (
            <li
              key={question.id}
              className="rounded-xl border border-slate-700 bg-slate-950 p-4"
            >
              <p className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                {ok ? (
                  <Check size={14} className="text-emerald-300" aria-hidden="true" />
                ) : (
                  <X size={14} className="text-amber-300" aria-hidden="true" />
                )}
                {lesson.title}
                <span className="sr-only">
                  {ok ? "autónoma" : correct ? "con ayuda" : "por revisar"}
                </span>
              </p>
              <p className="mt-2 font-semibold text-white">{question.prompt}</p>
              {!correct && evidence?.response && (
                <p className="mt-2 text-sm text-amber-100">
                  {errorFeedback(question, evidence.response)}
                </p>
              )}
              <details className="mt-2 text-sm text-slate-300">
                <summary className="cursor-pointer font-semibold text-cyan-200">
                  Ver el razonamiento
                </summary>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  {question.solution.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </details>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
