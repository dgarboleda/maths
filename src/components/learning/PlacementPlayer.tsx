"use client";

import Link from "next/link";
import { MathText } from "@/components/MathText";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Compass, SkipForward } from "lucide-react";
import {
  getLesson,
  initialPlacement,
  LEARNING_UNITS,
  LESSONS,
  PERU_COMPETENCIES,
  peruGradeLabel,
  peruLevel,
  placementCurrent,
  PLACEMENT_ID,
  recommendedLesson,
  type PeruCompetency,
  type PeruGrade,
  type PlacementResult,
  type PlacementState,
  type Question,
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

/**
 * Evaluación de ubicación: dos preguntas en fracciones y una en otras clases, sin pistas ni
 * correcciones durante la prueba. Avanza dentro de cada unidad mientras la
 * respuesta es correcta; el primer fallo indica dónde empezar esa unidad.
 */
export function PlacementPlayer({ childId }: { childId: string }) {
  const data = useLearningData(childId);
  const mutation = useLearningAction(data.parentId, childId);
  const confirmed =
    mutation.confirmed?.lessonId === PLACEMENT_ID
      ? (mutation.confirmed.progress as PlacementState)
      : undefined;
  const saved = data.placement ?? initialPlacement();
  const state = confirmed && confirmed.revision > saved.revision ? confirmed : saved;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [state.stage, state.items.length]);
  if (data.loading) return <LearningLoading />;
  if (data.error || !data.child)
    return <LearningLoadError message={data.error ?? "No encontramos este perfil."} />;
  const current = placementCurrent(state);
  const begin = () => void mutation.run(PLACEMENT_ID, state.revision, { kind: "begin" });
  return (
    <LearningShell childId={childId} title="Encuentra tu punto de partida" eyebrow="Evaluación de ubicación">
      <div className="max-w-3xl space-y-5">
        <SaveNotice busy={mutation.busy} error={mutation.error} retry={mutation.retry} />
        <h2 ref={heading} tabIndex={-1} className="text-lg font-bold text-cyan-200 outline-none">
          {current
            ? `Pregunta ${state.items.length} · ${LEARNING_UNITS.find((u) => u.id === current.lesson.unitId)?.title}`
            : state.stage === "done"
              ? "Tu punto de partida"
              : "Antes de empezar"}
        </h2>
        {current ? (
          <PlacementQuestion
            key={current.question.id}
            question={current.question}
            disabled={mutation.blocked}
            onAnswer={(response) =>
              void mutation.run(PLACEMENT_ID, state.revision, {
                kind: "answer",
                questionId: current.question.id,
                response,
              })
            }
            onSkip={() =>
              void mutation.run(PLACEMENT_ID, state.revision, {
                kind: "skip",
                questionId: current.question.id,
              })
            }
          />
        ) : state.stage === "done" && state.result ? (
          <PlacementSummary childId={childId} result={state.result} completed={new Set(
            LESSONS.filter((l) => data.progress[l.id]?.completedAt).map((l) => l.id),
          )} onRetry={begin} disabled={mutation.blocked} />
        ) : (
          <section className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-7">
            <p className="leading-relaxed text-slate-300">
              Responderás una pregunta por clase y, en fracciones, una segunda pregunta si aciertas la primera. Mientras aciertes, avanzas a la clase
              siguiente; cuando una no te salga, pasamos a la próxima unidad. Así sabrás qué clases puedes
              considerar opcionales y dónde empezar en cada tema. Es una recomendación que puedes cambiar.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
              <li>No hay pistas ni correcciones durante la prueba: responde lo que sabes hoy.</li>
              <li>Si no sabes cómo resolver una pregunta, elige «Todavía no lo sé»: no es un error, es información.</li>
              <li>Dura entre {LEARNING_UNITS.length} y {LESSONS.length + LESSONS.filter((l) => l.unitId === "fracciones").length} preguntas. No da estrellas ni marca clases como terminadas.</li>
            </ul>
            <button className={primaryButton} disabled={mutation.blocked} onClick={begin}>
              {state.attempts > 0 ? "Empezar de nuevo" : "Empezar la evaluación"}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </section>
        )}
        {current && (
          <Link href={`/jugar/${childId}/aprende`} className={`${secondaryButton} w-fit`}>
            Seguir más tarde
          </Link>
        )}
      </div>
    </LearningShell>
  );
}

function PlacementQuestion({
  question,
  disabled,
  onAnswer,
  onSkip,
}: {
  question: Question;
  disabled: boolean;
  onAnswer: (response: string) => void;
  onSkip: () => void;
}) {
  const [response, setResponse] = useState("");
  return (
    <form
      className="space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-7"
      onSubmit={(e) => {
        e.preventDefault();
        if (response.trim()) onAnswer(response.trim());
      }}
    >
      <p className="text-lg font-semibold leading-relaxed text-white"><MathText text={question.prompt} /></p>
      {question.choices ? (
        <fieldset className="space-y-2" disabled={disabled}>
          <legend className="sr-only">Elige una respuesta</legend>
          {question.choices.map((choice) => (
            <label key={choice.id}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 has-[:checked]:border-cyan-300">
              <input type="radio" name="placement" value={choice.id} checked={response === choice.id}
                onChange={() => setResponse(choice.id)} className="accent-cyan-300" />
              <MathText text={choice.label} />
            </label>
          ))}
        </fieldset>
      ) : (
        <label className="block text-sm font-semibold text-slate-200">
          Tu respuesta{question.unit ? ` (${question.unit})` : ""}
          <input value={response} onChange={(e) => setResponse(e.target.value)} disabled={disabled}
            inputMode="decimal" autoComplete="off"
            className="mt-2 block min-h-11 w-full max-w-xs rounded-xl border border-slate-600 bg-slate-950 px-4 font-mono text-lg text-cyan-100" />
        </label>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" className={primaryButton} disabled={disabled || !response.trim()}>
          <Check size={16} aria-hidden="true" />
          Responder
        </button>
        <button type="button" className={secondaryButton} disabled={disabled} onClick={onSkip}>
          <SkipForward size={16} aria-hidden="true" />
          Todavía no lo sé
        </button>
      </div>
    </form>
  );
}

function PlacementSummary({
  childId,
  result,
  completed,
  onRetry,
  disabled,
}: {
  childId: string;
  result: PlacementResult;
  completed: Set<string>;
  onRetry: () => void;
  disabled: boolean;
}) {
  const mastered = new Set(result.mastered);
  const next = recommendedLesson(completed, result);
  const known = new Set([...mastered, ...completed]);
  return (
    <section className="space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-7">
      <p className="rounded-xl bg-emerald-950/40 p-4 text-emerald-100">
        Respondiste {result.answered} preguntas.{" "}
        {result.mastered.length > 0
          ? `La prueba sugiere que ${result.mastered.length} de ${LESSONS.length} clases podrían ser opcionales. Puedes abrirlas cuando quieras.`
          : "Empieza por las primeras clases de cada unidad: allí está tu punto de partida."}
      </p>
      {next && (
        <Link href={`/jugar/${childId}/aprende/${next.id}`} className={primaryButton}>
          <Compass size={16} aria-hidden="true" />
          Empezar por: {next.title}
        </Link>
      )}
      <table className="w-full text-left text-sm">
        <caption className="mb-2 text-left font-semibold text-white">Dónde empezar en cada unidad</caption>
        <thead>
          <tr className="border-b border-slate-600 text-slate-300">
            <th className="p-2">Unidad</th>
            <th className="p-2">Empieza en</th>
          </tr>
        </thead>
        <tbody>
          {LEARNING_UNITS.map((unit) => {
            const start = result.start[unit.id];
            return (
              <tr key={unit.id} className="border-b border-slate-800">
                <th scope="row" className="p-2 font-semibold text-white">{unit.title}</th>
                <td className="p-2 text-slate-300">
                  {start ? getLesson(start)?.title : "Sin inicio recomendado; puedes revisar las clases"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <table className="w-full text-left text-sm">
        <caption className="mb-2 text-left font-semibold text-white">
          Referencia: Currículo Nacional de Perú (orientativo)
        </caption>
        <thead>
          <tr className="border-b border-slate-600 text-slate-300">
            <th className="p-2">Competencia</th>
            <th className="p-2">Completo hasta</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(PERU_COMPETENCIES) as PeruCompetency[]).map((competency) => {
            const level = peruLevel(competency, known);
            return (
              <tr key={competency} className="border-b border-slate-800">
                <th scope="row" className="p-2 font-semibold text-white">{PERU_COMPETENCIES[competency]}</th>
                <td className="p-2 text-slate-300">
                  {level ? peruGradeLabel(level as PeruGrade) : "En camino a 1.° de secundaria"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs leading-relaxed text-slate-400">
        La ubicación es una estimación rápida, no una confirmación de dominio ni una nota. La correspondencia con los grados del
        CNEB es orientativa y está pendiente de validación docente; no sustituye la evaluación del colegio.
      </p>
      <button className={secondaryButton} disabled={disabled} onClick={onRetry}>
        Repetir la evaluación
      </button>
    </section>
  );
}
