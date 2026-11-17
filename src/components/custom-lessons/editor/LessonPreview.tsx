import { useState } from "react";
import { MathText } from "@/components/MathText";
import { isNumeric, type CustomLesson } from "../../../../functions/src/customLessons/schema";
import { InlineText, RichText } from "../RichText";
import { InteractiveVisual } from "../InteractiveVisual";

/** La clase tal como la verá el alumno, con la solución, la pista y los comentarios marcados. */
export function LessonPreview({ lesson }: { lesson: CustomLesson }) {
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-900">Vista previa (como la verá el alumno)</summary>
      {open && <div className="mt-3 space-y-4 text-slate-800">
        <RichText text={lesson.content} />
        {lesson.visuals?.map((visual) => <InteractiveVisual key={visual.id} visual={visual} />)}
        {lesson.questions.map((q, i) => (
          <div key={q.id} className="space-y-1.5 rounded-xl border border-slate-200/80 bg-white p-3">
            <p className="font-semibold text-slate-900">{i + 1}. <InlineText text={q.prompt} /></p>
            {isNumeric(q) ? (
              <p className="text-sm text-slate-700">Escribe un número · solución <span className="rounded border border-emerald-200 bg-emerald-50 px-2 font-medium text-emerald-700"><MathText text={q.value || "—"} /></span>{q.tolerance ? ` (±${q.tolerance})` : ""}</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {q.options.map((option, n) => (
                  <li key={n} title={q.optionFeedback?.[n] || undefined} className={`rounded-lg border px-2.5 py-1 text-sm ${n === q.answer ? "border-emerald-300 bg-emerald-50 font-medium text-emerald-800" : "border-slate-200 bg-white text-slate-700"}`}><MathText text={option} /></li>
                ))}
              </ul>
            )}
            {q.hint && <p className="text-sm text-indigo-700">Pista: <InlineText text={q.hint} /></p>}
            {q.explanation && <p className="text-sm text-slate-600"><InlineText text={q.explanation} /></p>}
          </div>
        ))}
      </div>}
    </details>
  );
}
