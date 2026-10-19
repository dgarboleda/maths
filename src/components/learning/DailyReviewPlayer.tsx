"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, CalendarCheck, Check, X } from "lucide-react";
import {
  DAILY_ID,
  DAILY_INTERVALS,
  dailyDue,
  dailyEligible,
  dailyQuestions,
  errorFeedback,
  independent,
  initialDaily,
  initialProgress,
  isAnswerCorrect,
  LESSONS,
  limaDay,
  type DailyReviewState,
  type LearningAction,
} from "@/lib/learning/domain";
import {
  useLearningAction,
  useLearningData,
} from "@/lib/learning/useLearningData";
import { useLearningClock } from "@/lib/learning/useLearningClock";
import {
  LearningLoading,
  LearningLoadError,
  LearningShell,
  primaryButton,
  SaveNotice,
  secondaryButton,
} from "./LearningShell";
import { QuestionActivity } from "./LessonPlayer";

/**
 * Repaso espaciado diario: problemas breves de clases de distintas unidades,
 * elegidos por el servidor según cuándo toca volver a cada una. Acertar sin
 * ayuda aleja el próximo repaso (1, 3, 7, 14, 30 días); fallar lo acerca.
 */
export function DailyReviewPlayer({ childId }: { childId: string }) {
  const data = useLearningData(childId);
  const mutation = useLearningAction(data.parentId, childId);
  const now = useLearningClock();
  const saved = data.daily ?? initialDaily();
  const confirmed =
    mutation.confirmed?.lessonId === DAILY_ID
      ? (mutation.confirmed.progress as DailyReviewState)
      : undefined;
  const state = confirmed && confirmed.revision > saved.revision ? confirmed : saved;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [state.stage, state.index]);
  if (data.loading) return <LearningLoading />;
  if (data.error || !data.child)
    return <LearningLoadError message={data.error ?? "No encontramos este perfil."} />;
  const run = (action: LearningAction) => mutation.run(DAILY_ID, state.revision, action);
  const eligible = dailyEligible(data.progress, data.placement?.result?.mastered ?? []);
  const due = dailyDue(state, eligible, now);
  const session = dailyQuestions(state);
  const current = state.stage === "active" ? session[state.index] : undefined;
  const doneToday = state.rewardDay === limaDay(now);
  return (
    <LearningShell childId={childId} title="Repasar hoy" eyebrow="Repaso espaciado de todas tus clases">
      <div className="max-w-3xl space-y-5">
        <SaveNotice busy={mutation.busy} error={mutation.error} retry={mutation.retry} />
        <h2 ref={heading} tabIndex={-1} className="text-lg font-bold text-cyan-200 outline-none">
          {current
            ? `Problema ${state.index + 1} de ${session.length} · ${current.lesson.title}`
            : state.stage === "summary"
              ? "Resultado del repaso"
              : "Antes de empezar"}
        </h2>
        {current ? (
          <QuestionActivity
            key={`${state.sessions}:${state.index}`}
            lesson={{ ...current.lesson, review: session.map((item) => item.question) }}
            question={current.question}
            progress={{ ...initialProgress(current.lesson), stage: "review", index: state.index }}
            evidence={state.responses[current.question.id]}
            disabled={mutation.blocked}
            run={run}
          />
        ) : (
          <section className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-7">
            {state.stage === "summary" && state.lastResult && <DailySummary state={state} />}
            {eligible.length === 0 ? (
              <p className="rounded-xl bg-amber-950/30 p-4 text-sm text-amber-100">
                Termina tu primera clase (o la evaluación de ubicación) para tener algo que repasar.
              </p>
            ) : (
              <>
                <p className="leading-relaxed text-slate-300">
                  {due.length > 0
                    ? `Hoy tocan ${due.length} ${due.length === 1 ? "idea" : "ideas"} de tus clases. `
                    : "No tienes repasos vencidos: puedes adelantar uno. "}
                  Son hasta 6 problemas cortos de unidades distintas. Recordar sin ayuda hace que esa idea vuelva más tarde; si
                  te cuesta, vuelve pronto.
                </p>
                <button className={primaryButton} disabled={mutation.blocked}
                  onClick={() => void run({ kind: "begin", stage: "review" })}>
                  <CalendarCheck size={16} aria-hidden="true" />
                  {state.stage === "summary" || state.sessions > 0 ? "Hacer otro repaso" : "Empezar el repaso de hoy"}
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
                <p className="text-xs leading-relaxed text-slate-400">
                  {doneToday
                    ? "Ya ganaste las estrellas del repaso de hoy; repasar más sigue ayudando a recordar."
                    : "La primera sesión terminada del día da 2 estrellas."}
                </p>
              </>
            )}
          </section>
        )}
        {state.stage === "active" && (
          <Link href={`/jugar/${childId}`} className={`${secondaryButton} w-fit`}>
            Seguir más tarde
          </Link>
        )}
      </div>
    </LearningShell>
  );
}

function DailySummary({ state }: { state: DailyReviewState }) {
  const result = state.lastResult!;
  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-emerald-950/40 p-4 text-emerald-100">
        {result.correct} de {result.total} recordadas sin ayuda.{" "}
        {result.correct === result.total
          ? "Esas ideas volverán más adelante."
          : "Las que te costaron volverán pronto para afianzarlas."}
      </p>
      <ol className="space-y-3">
        {dailyQuestions(state).map(({ question, lesson }) => {
          const evidence = state.responses[question.id];
          const ok = independent(evidence);
          const correct = Boolean(evidence?.response && isAnswerCorrect(question, evidence.response));
          const box = state.schedule[lesson.id]?.box ?? 0;
          return (
            <li key={question.id} className="rounded-xl border border-slate-700 bg-slate-950 p-4">
              <p className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                {ok ? <Check size={14} className="text-emerald-300" aria-hidden="true" /> : <X size={14} className="text-amber-300" aria-hidden="true" />}
                {lesson.title} · vuelve en {DAILY_INTERVALS[box]} {DAILY_INTERVALS[box] === 1 ? "día" : "días"}
                <span className="sr-only">{ok ? "recordada sin ayuda" : correct ? "con ayuda" : "por revisar"}</span>
              </p>
              <p className="mt-2 font-semibold text-white">{question.prompt}</p>
              {!correct && evidence?.response && (
                <p className="mt-2 text-sm text-amber-100">{errorFeedback(question, evidence.response)}</p>
              )}
              <details className="mt-2 text-sm text-slate-300">
                <summary className="cursor-pointer font-semibold text-cyan-200">Ver el razonamiento</summary>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  {question.solution.map((step) => <li key={step}>{step}</li>)}
                </ol>
              </details>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-slate-400">
        Llevas {Object.keys(state.schedule).length} de {LESSONS.length} clases en tu repaso.
      </p>
    </div>
  );
}
