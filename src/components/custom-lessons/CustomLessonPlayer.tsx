"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { LearningShell } from "@/components/learning/LearningShell";
import { LessonArcade } from "@/components/learning/LessonArcade";
import { MathText } from "@/components/MathText";
import { InlineText, RichText } from "./RichText";
import { InteractiveVisual } from "./InteractiveVisual";
import type { PublicQuestion } from "../../../functions/src/customLessons/schema";
import { hasNextOpen, type Feedback } from "./player/sessionState";
import { useCustomLessonSession } from "./player/useCustomLessonSession";

const buttonClass = "rounded-lg bg-violet-700 px-4 py-3";

function FeedbackText({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) return <p aria-live="polite" />;
  if (feedback.kind === "error") return <p aria-live="polite" role="alert">{feedback.text}</p>;
  if (feedback.kind === "correct") return <p aria-live="polite">¡Correcto!{feedback.explanation && <> <InlineText text={feedback.explanation} /></>}</p>;
  return (
    <div aria-live="polite" className="space-y-1">
      <p>Inténtalo de nuevo.{feedback.comment && <> <InlineText text={feedback.comment} /></>}</p>
      {feedback.hint && <p className="text-cyan-200">Pista: <InlineText text={feedback.hint} /></p>}
    </div>
  );
}

function NumericAnswer({ disabled, onAnswer }: { disabled: boolean; onAnswer: (value: string) => Promise<boolean> }) {
  const [value, setValue] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    if (!(await onAnswer(value.trim()))) setValue("");
  }
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => void submit(e)}>
      <input aria-label="Tu respuesta" inputMode="decimal" autoComplete="off" className="rounded-lg border border-violet-400 bg-slate-900 px-4 py-3" value={value} disabled={disabled} onChange={(e) => setValue(e.target.value)} />
      <button type="submit" disabled={disabled || !value.trim()} className={`${buttonClass} disabled:opacity-60`}>Comprobar</button>
    </form>
  );
}

/** Una clase creada por la familia: contenido, preguntas (corregidas en el servidor) y final. */
export function CustomLessonPlayer({ childId, lessonId }: { childId: string; lessonId: string }) {
  const { parentId } = useAuth();
  const { state, answer, start, next } = useCustomLessonSession(parentId, childId, lessonId);
  const { lesson, phase, index, order, solved, busy, feedback } = state;
  const back = <Link className="text-cyan-200 underline" href={`/jugar/${childId}/aprende`}>Volver a mis clases</Link>;
  if (state.status === "loading") return <p role="status">Cargando clase…</p>;
  if (state.status === "missing" || !lesson) return <p role="alert">Esta clase no está disponible.</p>;
  if (state.status === "locked") {
    return <LearningShell childId={childId} title={lesson.title} eyebrow={lesson.topic}><div className="space-y-4">{back}<p role="status">Primero termina la clase anterior de este tema para desbloquear esta.</p></div></LearningShell>;
  }
  const question: PublicQuestion | undefined = lesson.questions[index];
  const disabled = busy || solved;
  const options = question?.kind === "choice" && (
    <div className="flex flex-wrap gap-2">
      {order.map((original) => (
        <button key={original} disabled={disabled} className="rounded-lg border border-violet-400 px-4 py-3 disabled:opacity-60" onClick={() => void answer(original)}>
          <MathText text={question.options[original]} />
        </button>
      ))}
    </div>
  );
  let body;
  if (phase === "intro") {
    body = (
      <>
        {state.notice && <p role="status" className="text-amber-200">{state.notice}</p>}
        <RichText text={lesson.content} />
        {lesson.visuals?.map((visual) => <InteractiveVisual key={visual.id} visual={visual} />)}
        <button className={buttonClass} onClick={start}>Empezar preguntas</button>
      </>
    );
  } else if (phase === "finished" || !question) {
    body = (
      <div className="space-y-4">
        <p role="status" className="text-xl font-bold">¡Terminaste la clase!{state.stars > 0 && ` Has ganado ${state.stars} estrellas.`}</p>
        <Link className="inline-flex rounded-lg bg-violet-700 px-4 py-3 font-bold text-white" href={`/jugar/${childId}/aprende`}>Elegir otra clase</Link>
      </div>
    );
  } else {
    body = (
      <>
        <p>Pregunta {index + 1} de {lesson.questions.length}</p>
        {question.kind === "numeric" ? (
          <div className="space-y-3">
            <h2 className="text-xl font-bold"><InlineText text={question.prompt} /></h2>
            <NumericAnswer key={question.id} disabled={disabled} onAnswer={answer} />
          </div>
        ) : lesson.game === "write" ? (
          <div className="space-y-3"><h2 className="text-xl font-bold"><InlineText text={question.prompt} /></h2>{options}</div>
        ) : (
          <LessonArcade
            key={question.id}
            mode={lesson.game}
            onTogglePause={() => {}}
            showPause={false}
            exercise={{
              // El juego envía la posición original de la opción; la respuesta correcta no está en el navegador.
              problem: { id: question.id, difficulty: 1, kind: "lesson-practice", prompt: question.prompt, answer: -1, choices: order, choiceLabels: order.map((i) => question.options[i]), inputType: "choice" },
              solved, disabled: busy, paused: false, timed: false, input: options, onResponse: (value) => answer(value),
            }}
          />
        )}
        <FeedbackText feedback={feedback} />
        {solved && <button className={buttonClass} onClick={next}>{hasNextOpen(state) ? "Siguiente pregunta" : "Terminar clase"}</button>}
      </>
    );
  }
  return <LearningShell childId={childId} title={lesson.title} eyebrow={lesson.topic}><div className="space-y-5">{back}{body}</div></LearningShell>;
}
