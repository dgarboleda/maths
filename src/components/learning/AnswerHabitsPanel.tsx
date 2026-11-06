"use client";

import Link from "next/link";
import { useLearningEvidence } from "@/lib/learning/useLearningEvidence";
import { answerHabits } from "@/lib/learning/habits";
import type { LearningProgress } from "@/lib/learning/domain";

/** Avisos para la familia: clases terminadas sin superar la comprobación y
 *  respuestas apresuradas. Ayudan a acompañar, no son una nota. */
export function AnswerHabitsPanel({
  parentId,
  childId,
  childName,
  progress,
  now,
}: {
  parentId: string | undefined;
  childId: string;
  childName: string;
  progress: Record<string, LearningProgress | undefined>;
  now: number;
}) {
  const { events, error } = useLearningEvidence(parentId, childId);
  if (error) return <p role="alert" className="text-sm text-amber-200">{error}</p>;
  if (!events) return <p role="status" className="text-sm text-slate-300">Revisando cómo responde…</p>;
  const { unproven, answers, rushed } = answerHabits(progress, events, now);
  const share = answers ? Math.round((rushed / answers) * 100) : 0;
  return (
    <section aria-labelledby="habitos-respuesta" className="space-y-3">
      <h3 id="habitos-respuesta" className="font-semibold text-white">Cómo responde</h3>
      {answers === 0 ? (
        <p className="text-sm text-slate-300">Todavía no hay respuestas esta semana.</p>
      ) : (
        <p className={`rounded-xl p-3 text-sm ${share >= 20 ? "bg-amber-950/40 text-amber-100" : "bg-slate-950 text-slate-300"}`}>
          {rushed === 0
            ? `Esta semana ${childName} se tomó su tiempo en las ${answers} respuestas.`
            : `Esta semana ${rushed} de ${answers} respuestas (${share} %) llegaron antes de poder leer la pregunta. No cuentan como hechas sin ayuda ni dan las estrellas de la comprobación.`}
          {share >= 20 && " Conviene acompañarle y pedirle que explique en voz alta cómo lo pensó."}
        </p>
      )}
      {unproven.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-slate-300">
            {unproven.length === 1 ? "Una clase terminada" : `${unproven.length} clases terminadas`} sin superar la
            comprobación: avanzó hasta el final, pero todavía no demostró lo aprendido.
          </p>
          <ul className="flex flex-wrap gap-2">
            {unproven.slice(0, 8).map((l) => (
              <li key={l.lessonId}>
                <Link href={`/jugar/${childId}/aprende/${l.lessonId}?modo=practice`}
                  className="inline-flex min-h-11 items-center rounded-lg border border-slate-600 px-3 text-sm font-semibold text-cyan-200 underline underline-offset-4">
                  {l.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
