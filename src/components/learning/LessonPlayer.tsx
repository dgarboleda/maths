"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, BookOpen, Lightbulb } from "lucide-react";
import {
  currentEvidence,
  currentQuestion,
  errorFeedback,
  getLesson,
  parseNumber,
  initialProgress,
  learningStatus,
  LESSONS,
  ADVENTURES,
  questionsFor,
  STAGE_LABELS,
  type LearningAction,
  type LearningProgress,
  type Lesson,
  type Question,
  type ResponseEvidence,
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
import { LearningVisual } from "./LearningVisual";
import {
  lessonProblem,
  pickPracticeGame,
  type LessonExercise,
} from "@/lib/minigames/lessonExercise";

const LessonArcade = dynamic(
  () => import("./LessonArcade").then((module) => module.LessonArcade),
  { ssr: false, loading: () => <p role="status">Preparando la partida…</p> },
);

type RequestedStage = "practice" | "review" | null;
export function LessonPlayer({
  childId,
  lessonId,
  requestedStage = null,
}: {
  childId: string;
  lessonId: string;
  requestedStage?: RequestedStage;
}) {
  const data = useLearningData(childId);
  const now = useLearningClock();
  const mutation = useLearningAction(data.parentId, childId);
  const [launched, setLaunched] = useState(false);
  const lesson = getLesson(lessonId);
  const saved = data.progress[lessonId];
  const confirmed =
    mutation.confirmed?.lessonId === lessonId
      ? (mutation.confirmed.progress as LearningProgress)
      : undefined;
  const progress =
    confirmed && confirmed.revision > (saved?.revision ?? 0)
      ? confirmed
      : (saved ?? (lesson ? initialProgress(lesson) : undefined));
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [progress?.stage, progress?.index]);
  if (data.loading) return <LearningLoading />;
  if (data.error || !data.child)
    return (
      <LearningLoadError
        message={data.error ?? "No encontramos este perfil."}
      />
    );
  if (!lesson || !progress)
    return (
      <LearningLoadError message="Esta clase no está disponible. Vuelve a tu biblioteca para elegir otra." />
    );
  const run = (action: LearningAction) =>
    mutation.run(lesson.id, progress.revision, action);
  const question = currentQuestion(lesson, progress);
  const evidence = currentEvidence(lesson, progress);
  const requestedAvailable =
    requestedStage !== "review" ||
    (progress.reviewDueAt !== null && progress.reviewDueAt <= now);
  return (
    <LearningShell
      childId={childId}
      title={lesson.title}
      eyebrow="Una idea que puedes comprender y usar"
    >
      <Link
        href={`/jugar/${childId}/aprende`}
        className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-cyan-200 underline underline-offset-4"
      >
        <BookOpen size={16} aria-hidden="true" />
        Todas las clases
      </Link>
      <p className="max-w-3xl leading-relaxed text-slate-300">
        Al terminar podrás:{" "}
        {lesson.objective.charAt(0).toLowerCase() + lesson.objective.slice(1)}
      </p>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-cyan-100">
        {lesson.purpose}
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0">
          <SaveNotice
            busy={mutation.busy}
            error={mutation.error}
            retry={mutation.retry}
          />
          {requestedStage && !launched ? (
            <section className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="text-xl font-bold">
                {requestedStage === "practice"
                  ? "Practica esta idea a tu ritmo"
                  : "Recupera lo aprendido"}
              </h2>
              <p className="text-slate-300">
                {requestedStage === "practice"
                  ? "Las pistas y los desarrollos están disponibles. Esta práctica no sustituye la comprobación autónoma."
                  : requestedAvailable
                    ? "Resolverás problemas diferentes después de varios días, para comprobar qué recuerdas."
                    : "El repaso diferido aún no está disponible. Puedes seguir practicando y volver en la fecha indicada."}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  className={primaryButton}
                  disabled={mutation.blocked || !requestedAvailable}
                  onClick={async () => {
                    if (await run({ kind: "begin", stage: requestedStage }))
                      setLaunched(true);
                  }}
                >
                  Comenzar{" "}
                  {requestedStage === "practice" ? "práctica" : "repaso"}
                </button>
                <button
                  type="button"
                  className={secondaryButton}
                  disabled={mutation.blocked}
                  onClick={() => setLaunched(true)}
                >
                  Continuar mi clase
                </button>
              </div>
            </section>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2
                  ref={heading}
                  tabIndex={-1}
                  className="text-lg font-bold text-cyan-200 outline-none"
                >
                  {STAGE_LABELS[progress.stage]}
                </h2>
                <span className="text-xs text-slate-400">
                  {learningStatus(progress)}
                </span>
              </div>
              {progress.stage === "class" && (
                <section className="space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-7">
                  <p className="text-xs text-slate-400">
                    Idea {progress.index + 1} de {lesson.sections.length}
                  </p>
                  <h3 className="text-2xl font-bold">
                    {lesson.sections[progress.index].title}
                  </h3>
                  {lesson.sections[progress.index].paragraphs.map(
                    (paragraph) => (
                      <p
                        key={paragraph}
                        className="max-w-prose text-pretty leading-relaxed text-slate-200"
                      >
                        {paragraph}
                      </p>
                    ),
                  )}
                  <p className="overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-cyan-200">
                    {lesson.sections[progress.index].formula}
                  </p>
                  <LearningVisual key={lesson.visual} kind={lesson.visual} />
                  <button
                    disabled={mutation.blocked}
                    onClick={() => void run({ kind: "next" })}
                    className={primaryButton}
                  >
                    {progress.index + 1 < lesson.sections.length
                      ? "Continuar la explicación"
                      : "Ver cómo se resuelve"}
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </section>
              )}
              {progress.stage === "examples" && (
                <section className="space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-7">
                  <p className="text-xs text-slate-400">
                    Ejemplo {progress.index + 1} de {lesson.examples.length}
                  </p>
                  <h3 className="text-xl font-bold">
                    {lesson.examples[progress.index].prompt}
                  </h3>
                  <ol className="space-y-3">
                    {lesson.examples[progress.index].steps.map(
                      (step, index) => (
                        <li
                          key={step.math}
                          className="rounded-xl border border-slate-700 bg-slate-950 p-4"
                        >
                          <p className="text-xs font-bold uppercase text-cyan-200">
                            Paso {index + 1}
                          </p>
                          <p className="mt-2 overflow-x-auto font-mono text-lg font-semibold">
                            {step.math}
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-slate-300">
                            <strong>Por qué:</strong> {step.why}
                          </p>
                        </li>
                      ),
                    )}
                  </ol>
                  <p className="rounded-xl bg-emerald-950/40 p-4 text-emerald-100">
                    {lesson.examples[progress.index].conclusion}
                  </p>
                  <button
                    disabled={mutation.blocked}
                    onClick={() => void run({ kind: "next" })}
                    className={primaryButton}
                  >
                    {progress.index + 1 < lesson.examples.length
                      ? "Otro ejemplo razonado"
                      : "Ahora, hazlo con ayuda"}
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </section>
              )}
              {question && (
                <QuestionActivity
                  key={`${lesson.id}:${progress.stage}:${progress.checkForm}:${progress.index}`}
                  lesson={lesson}
                  question={question}
                  progress={progress}
                  evidence={evidence}
                  disabled={mutation.blocked}
                  run={run}
                />
              )}
              {progress.stage === "summary" && (
                <LessonSummary
                  childId={childId}
                  lesson={lesson}
                  progress={progress}
                  now={now}
                  run={run}
                  disabled={mutation.blocked}
                />
              )}
            </>
          )}
        </div>
        <aside className="space-y-5 self-start lg:sticky lg:top-6">
          <section
            aria-label="Herramientas de la clase"
            className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-4"
          >
            <h2 className="font-bold">Tu recorrido</h2>
            <p className="text-sm text-slate-300">
              Puedes volver a la explicación o demostrar lo que ya sabes.
            </p>
            {(
              ["class", "examples", "guided", "practice", "check"] as const
            ).map((stage, index) => (
              <button
                key={stage}
                type="button"
                disabled={mutation.blocked}
                aria-current={progress.stage === stage ? "step" : undefined}
                onClick={async () => {
                  if (await run({ kind: "begin", stage })) setLaunched(true);
                }}
                className={`${progress.stage === stage ? primaryButton : secondaryButton} w-full justify-start text-left`}
              >
                <span
                  aria-hidden="true"
                  className="mr-1 font-mono text-xs"
                >
                  0{index + 1}
                </span>
                {STAGE_LABELS[stage]}
                {stage === "check" ? " lo que sé" : ""}
              </button>
            ))}
            <p className="text-xs leading-relaxed text-slate-400">
              La comprobación registra la primera respuesta de cada problema.
              Las ayudas siguen disponibles y se distinguen del trabajo
              autónomo.
            </p>
          </section>
          {lesson.prerequisites.length > 0 && (
            <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
              <h2 className="font-bold">Si necesitas las bases</h2>
              <ul className="mt-3 space-y-3">
                {lesson.prerequisites.map((id) => (
                  <li key={id}>
                    <Link
                      className="text-sm text-cyan-200 underline underline-offset-4"
                      href={`/jugar/${childId}/aprende/${id}`}
                    >
                      {getLesson(id)?.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!["check", "review"].includes(progress.stage) && (
            <details className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
              <summary className="flex min-h-11 cursor-pointer items-center font-bold">
                Palabras de esta clase
              </summary>
              <dl className="mt-4 space-y-3">
                {lesson.vocabulary.map((word) => (
                  <div key={word.term}>
                    <dt className="text-sm font-bold text-cyan-200">
                      {word.term}
                    </dt>
                    <dd className="mt-1 text-sm text-slate-300">
                      {word.meaning}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </aside>
      </div>
    </LearningShell>
  );
}

export function QuestionActivity({
  lesson,
  question,
  progress,
  evidence,
  disabled,
  run,
}: {
  lesson: Lesson;
  question: Question;
  progress: LearningProgress;
  evidence?: ResponseEvidence;
  disabled: boolean;
  run: (action: LearningAction) => Promise<boolean>;
}) {
  const [response, setResponse] = useState(evidence?.response ?? "");
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [acknowledgedAttempts, setAcknowledgedAttempts] = useState(0);
  const [timed, setTimed] = useState(false);
  // El componente se monta por ejercicio (key), así que el sorteo es estable
  // mientras dura la pregunta y cambia en la siguiente.
  const [game] = useState(pickPracticeGame);
  // Vía accesible: quien no pueda o no quiera jugar responde por escrito.
  const [writing, setWriting] = useState(false);
  const problem = useMemo(() => lessonProblem(question), [question]);
  const arcade = progress.stage === "practice" && !writing && problem !== null;
  const errorPaused = Boolean(evidence && !evidence.correct && evidence.attempts > acknowledgedAttempts);
  const paused = manuallyPaused || errorPaused;
  const assessment = ["diagnostic", "check", "review"].includes(progress.stage);
  const silentCheck = ["check", "review"].includes(progress.stage);
  const locked = Boolean(
    evidence?.correct ||
      evidence?.revealed ||
      (assessment && evidence && evidence.attempts > 0),
  );
  const showSolution =
    evidence?.revealed || (!silentCheck && evidence?.correct);
  const canNext = assessment
    ? Boolean(evidence && evidence.attempts > 0)
    : Boolean(evidence?.correct || evidence?.revealed);
  const answerForm = (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (disabled || locked || (arcade && paused)) return;
        if (question.format !== "choice" && parseNumber(response) === null) {
          setFormatError(
            "Escribe un número o una fracción válida, como 3/4. El denominador debe ser distinto de cero.",
          );
          return;
        }
        setFormatError(null);
        void run({ kind: "answer", questionId: question.id, response });
      }}
      className="space-y-4"
    >
      <fieldset disabled={disabled || locked || (arcade && paused)} className="space-y-4">
        <legend className="mb-4 text-xl font-bold leading-relaxed text-white">
          {question.prompt}
        </legend>
        {question.choices ? (
          <div className="space-y-2">
            {question.choices.map((option) => (
              <label
                key={option.id}
                className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3 ${response === option.id ? "border-cyan-300 bg-cyan-950/50" : "border-slate-600 bg-slate-950"}`}
              >
                <input
                  type="radio"
                  name={`answer-${question.id}`}
                  value={option.id}
                  checked={response === option.id}
                  onChange={() => setResponse(option.id)}
                  className="mt-1 accent-cyan-300"
                />
                <span className="text-sm leading-relaxed">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <div>
            <label
              htmlFor={`response-${question.id}`}
              className="mb-2 block text-sm text-slate-300"
            >
              Tu respuesta{question.unit ? ` (${question.unit})` : ""}
            </label>
            <input
              id={`response-${question.id}`}
              autoComplete="off"
              value={response}
              onChange={(e) => {
                setResponse(e.target.value);
                setFormatError(null);
              }}
              aria-invalid={formatError !== null}
              maxLength={64}
              aria-describedby={`format-${question.id}`}
              className="min-h-12 w-full rounded-xl border border-slate-500 bg-slate-950 px-4 text-lg text-white focus:border-cyan-300 focus:outline-2 focus:outline-cyan-300"
            />
            <p
              id={`format-${question.id}`}
              className="mt-2 text-xs text-slate-400"
            >
              Acepta números, decimales con coma o punto y fracciones como
              3/4.
            </p>
          </div>
        )}
      </fieldset>
      {formatError && (
        <p role="alert" className="text-sm text-amber-200">
          {formatError}
        </p>
      )}
      {!locked && (
        <button
          className={primaryButton}
          disabled={disabled || (arcade && paused) || !response.trim()}
          type="submit"
        >
          {assessment ? "Registrar mi respuesta" : "Comprobar mi respuesta"}
        </button>
      )}
    </form>
  );
  const exercise: LessonExercise | null = problem ? {
    problem,
    solved: Boolean(evidence?.correct),
    disabled: disabled || locked,
    paused,
    timed,
    input: answerForm,
    onResponse: (value) => {
      setResponse(String(value));
      return run({ kind: "answer", questionId: question.id, response: String(value) });
    },
  } : null;
  return (
    <section className="space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-7">
      <p className="text-xs text-slate-400">
        Actividad {progress.index + 1} de{" "}
        {questionsFor(lesson, progress).length} ·{" "}
        {question.intent === "concept"
          ? "Comprender"
          : question.intent === "transfer"
            ? "Usar en otra situación"
            : question.format === "step"
              ? "Completar un paso"
              : "Resolver"}
      </p>
      {progress.stage === "practice" && problem && writing && (
        <button
          type="button"
          className="min-h-11 text-sm font-bold text-cyan-200 underline"
          disabled={disabled}
          onClick={() => setWriting(false)}
        >
          Volver al juego
        </button>
      )}
      {progress.stage === "diagnostic" && (
        <div className="rounded-xl bg-cyan-950/40 p-4 text-sm text-cyan-100">
          <p>
            Son tres preguntas para encontrar un buen punto de partida. No
            otorgan dominio de un tema. Puedes ir directamente a la explicación.
          </p>
          <button
            className="mt-2 min-h-11 font-bold underline"
            disabled={disabled}
            onClick={() => void run({ kind: "begin", stage: "class" })}
          >
            Ir a la clase
          </button>
        </div>
      )}
      {progress.stage === "application" && (
        <p className="rounded-xl bg-indigo-950/50 p-4 text-sm text-indigo-100">
          Tu decisión en la ciudad: aplica lo que aprendiste. Puedes consultar
          las ayudas para completar el recorrido.
        </p>
      )}
      {progress.stage === "guided" && (
        <p className="rounded-xl bg-cyan-950/40 p-4 text-sm text-cyan-100">
          <strong>Vamos paso a paso.</strong> {question.hints[0]}
        </p>
      )}
      {arcade && exercise ? (
        <div className="space-y-4">
          {!canNext && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className={secondaryButton}
                disabled={disabled}
                onClick={() => {
                  if (paused) {
                    setManuallyPaused(false);
                    setAcknowledgedAttempts(evidence?.attempts ?? 0);
                  } else setManuallyPaused(true);
                }}
              >
                {paused ? "Reanudar partida" : "Pausar partida"}
              </button>
              {game === "cohete" && (
                <label className="flex min-h-11 items-center gap-2 text-sm text-slate-200">
                  <input type="checkbox" checked={timed} disabled={disabled}
                    onChange={(event) => setTimed(event.target.checked)} />
                  Reto con tiempo (opcional)
                </label>
              )}
            </div>
          )}
          {paused && !canNext && (
            <p role="status" className="rounded-xl bg-cyan-950/50 p-4 text-cyan-100">
              {errorPaused
                ? "La partida está en pausa. Revisa la ayuda o pide una pista; después reanuda para intentar el mismo ejercicio."
                : "Partida en pausa. Puedes pensar o consultar las ayudas antes de continuar."}
            </p>
          )}
          <LessonArcade mode={game} exercise={exercise} />
          <button
            type="button"
            className="min-h-11 text-sm font-bold text-cyan-200 underline"
            disabled={disabled}
            onClick={() => {
              setWriting(true);
              setManuallyPaused(false);
            }}
          >
            Prefiero escribir la respuesta
          </button>
        </div>
      ) : answerForm}
      <div aria-live="polite" aria-atomic="true">
        {evidence &&
          evidence.attempts > 0 &&
          (silentCheck ? (
            <p className="rounded-xl bg-slate-800 p-4 text-slate-200">
              Respuesta registrada. Al terminar podrás revisar el razonamiento y
              las ayudas que necesitaste.
            </p>
          ) : evidence.correct ? (
            <p className="rounded-xl bg-emerald-950/50 p-4 text-emerald-100">
              Tu respuesta es correcta. Revisa por qué funciona.
            </p>
          ) : (
            <div className="space-y-2 rounded-xl bg-amber-950/40 p-4 text-amber-100">
              <p>{errorFeedback(question, evidence.response ?? "")}</p>
              {evidence.attempts >= 2 && (
                <p className="text-sm">
                  Puedes volver a la clase o revisar el desarrollo. Después
                  habrá otra oportunidad de practicar.
                </p>
              )}
            </div>
          ))}
        {Boolean(evidence?.hintsUsed) && (
          <p className="mt-3 rounded-xl border border-cyan-300/30 bg-cyan-950/40 p-4 text-sm text-cyan-100">
            <Lightbulb className="mb-2" size={18} aria-hidden="true" />
            {question.hints[(evidence?.hintsUsed ?? 1) - 1]}
          </p>
        )}
      </div>
      {showSolution && (
        <div className="rounded-xl border border-slate-600 bg-slate-950 p-4">
          <h3 className="font-bold text-cyan-200">El razonamiento</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-200">
            {question.solution.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}
      {!locked && (
        <div className="flex flex-wrap gap-2">
          <button
            className={secondaryButton}
            disabled={disabled || (evidence?.hintsUsed ?? 0) >= 3}
            type="button"
            onClick={() => void run({ kind: "hint", questionId: question.id })}
          >
            <Lightbulb size={16} aria-hidden="true" />
            {evidence?.hintsUsed
              ? `Otra pista (${evidence.hintsUsed}/3)`
              : "Pedir una pista"}
          </button>
          {!assessment && (
            <button
              type="button"
              className={secondaryButton}
              disabled={disabled}
              onClick={() =>
                void run({ kind: "reveal", questionId: question.id })
              }
            >
              <BookOpen size={16} aria-hidden="true" />
              Ver el desarrollo
            </button>
          )}
        </div>
      )}
      {canNext && (
        <button
          disabled={disabled}
          className={primaryButton}
          onClick={() => void run({ kind: "next" })}
        >
          {progress.index + 1 < questionsFor(lesson, progress).length
            ? "Siguiente actividad"
            : progress.stage === "check"
              ? "Ver mi comprobación y aplicar"
              : "Continuar"}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      )}
      <div className="border-t border-slate-700 pt-4">
        <button
          type="button"
          disabled={disabled}
          aria-expanded={explanationOpen}
          className="min-h-11 text-sm font-bold text-cyan-200 underline"
          onClick={async () => {
            if (
              !explanationOpen &&
              assessment &&
              !locked &&
              !evidence?.hintsUsed &&
              !(await run({ kind: "hint", questionId: question.id }))
            )
              return;
            setExplanationOpen((open) => !open);
          }}
        >
          Consultar la explicación sin salir
        </button>
        {explanationOpen && (
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-300">
            {lesson.sections.map((section) => (
              <div key={section.title}>
                <p className="font-bold text-white">{section.title}</p>
                <p>{section.paragraphs[0]}</p>
                <p className="mt-2 font-mono text-cyan-200">
                  {section.formula}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function LessonSummary({
  childId,
  lesson,
  progress,
  now,
  run,
  disabled,
}: {
  childId: string;
  lesson: Lesson;
  progress: LearningProgress;
  now: number;
  run: (action: LearningAction) => Promise<boolean>;
  disabled: boolean;
}) {
  const next = LESSONS[LESSONS.findIndex((item) => item.id === lesson.id) + 1];
  const adventure = ADVENTURES.find((item) => item.lessonIds.at(-1) === lesson.id);
  const result =
    progress.lastReview &&
    progress.lastReview.at >= (progress.lastCheck?.at ?? 0)
      ? progress.lastReview
      : progress.lastCheck;
  const questions =
    progress.lastReview && result === progress.lastReview
      ? lesson.review
      : lesson.checks[progress.checkForm];
  const stage = result === progress.lastReview ? "review" : "check";
  return (
    <section className="space-y-5 rounded-2xl border border-cyan-300/30 bg-slate-900 p-5 sm:p-7">
      <p className="text-sm font-bold text-cyan-200">
        {learningStatus(progress)}
      </p>
      <h3 className="text-2xl font-bold">
        Una idea más para transformar la ciudad
      </h3>
      <p className="leading-relaxed text-slate-200">{lesson.outcome}</p>
      {result && (
        <div className="rounded-xl border border-slate-600 bg-slate-950 p-4">
          <p className="font-bold">
            {result.correct} de {result.total} respuestas autónomas en{" "}
            {stage === "review" ? "el repaso" : "la última comprobación"}
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {result.passed
              ? "También resolviste una tarea conceptual y una aplicación en otra situación."
              : "Sigue practicando con las explicaciones. Las respuestas con pistas y las correcciones muestran aprendizaje con apoyo."}
          </p>
        </div>
      )}
      {progress.reviewDueAt && (
        <p className="text-sm text-slate-300">
          Próximo repaso:{" "}
          {new Date(progress.reviewDueAt).toLocaleDateString("es", {
            day: "numeric",
            month: "long",
          })}
          . Servirá para comprobar qué recuerdas con preguntas diferentes.
        </p>
      )}
      {result && (
        <details className="rounded-xl border border-slate-700 p-4">
          <summary className="cursor-pointer font-bold">
            Revisar mis respuestas y sus desarrollos
          </summary>
          <ol className="mt-4 space-y-4">
            {questions.map((q) => {
              const e = progress.responses[`${stage}:${q.id}`];
              return (
                <li
                  key={q.id}
                  className="border-t border-slate-700 pt-3 text-sm"
                >
                  <p className="font-bold">{q.prompt}</p>
                  <p className="mt-2 text-slate-400">
                    {e?.firstCorrect && !e.hintsUsed && !e.revealed
                      ? "Resuelta de forma autónoma"
                      : "Para seguir trabajando con apoyo"}
                  </p>
                  <p className="mt-2 leading-relaxed text-slate-200">
                    {q.explanation}
                  </p>
                </li>
              );
            })}
          </ol>
        </details>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          className={secondaryButton}
          disabled={disabled}
          onClick={() =>
            void run({
              kind: "begin",
              stage: progress.needsSupport ? "guided" : "practice",
            })
          }
        >
          Seguir practicando
        </button>
        <button
          className={secondaryButton}
          disabled={disabled}
          onClick={() => void run({ kind: "begin", stage: "check" })}
        >
          Otra comprobación
        </button>
        {progress.reviewDueAt !== null && progress.reviewDueAt <= now && (
          <button
            className={primaryButton}
            disabled={disabled}
            onClick={() => void run({ kind: "begin", stage: "review" })}
          >
            Comprobar qué recuerdo
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-3 border-t border-slate-700 pt-5">
        {adventure && (
          <Link
            className={primaryButton}
            href={`/jugar/${childId}/aventura/${adventure.id}`}
          >
            Jugar {adventure.title}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
        {next && (
          <Link
            className={secondaryButton}
            href={`/jugar/${childId}/aprende/${next.id}`}
          >
            Siguiente clase: {next.title}
          </Link>
        )}
        <Link className={secondaryButton} href={`/jugar/${childId}`}>
          Volver a mi espacio
        </Link>
      </div>
    </section>
  );
}
