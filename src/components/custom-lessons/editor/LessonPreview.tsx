import { MathText } from "@/components/MathText";
import type { CustomLesson } from "../../../../functions/src/customLessons/schema";
import { InlineText, RichText } from "../RichText";

/** La clase tal como la verá el alumno. */
export function LessonPreview({ lesson }: { lesson: CustomLesson }) {
  return (
    <details className="rounded-lg border border-slate-600 p-3">
      <summary className="cursor-pointer">Vista previa (como la verá el alumno)</summary>
      <div className="mt-3 space-y-4">
        <RichText text={lesson.content} />
        {lesson.questions.map((q, i) => (
          <div key={q.id} className="space-y-1">
            <p className="font-bold">{i + 1}. <InlineText text={q.prompt} /></p>
            <ul className="flex flex-wrap gap-2">
              {q.options.map((option, n) => (
                <li key={n} className={`rounded border px-2 py-1 ${n === q.answer ? "border-emerald-400" : "border-slate-500"}`}><MathText text={option} /></li>
              ))}
            </ul>
            {q.explanation && <p className="text-sm text-slate-300"><InlineText text={q.explanation} /></p>}
          </div>
        ))}
      </div>
    </details>
  );
}
