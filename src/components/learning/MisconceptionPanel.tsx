"use client";

import Link from "next/link";
import { getLesson, summarizeMisconceptions } from "@/lib/learning/domain";
import { useLearningEvidence, EVIDENCE_WINDOW } from "@/lib/learning/useLearningEvidence";

const date = (ms: number) =>
  new Date(ms).toLocaleDateString("es-PE", { day: "numeric", month: "short" });

/** Errores previstos que el estudiante repite, con la explicación que vio y
 *  si después resolvió bien la misma tarea. Es diagnóstico, no una nota. */
export function MisconceptionPanel({
  parentId,
  childId,
  childName,
}: {
  parentId: string | undefined;
  childId: string;
  childName: string;
}) {
  const { events, error } = useLearningEvidence(parentId, childId);
  if (error) return <p role="alert" className="text-sm text-amber-200">{error}</p>;
  if (!events)
    return <p role="status" className="text-sm text-slate-300">Analizando las respuestas…</p>;
  const { misconceptions, unexpected } = summarizeMisconceptions(events, getLesson);
  const pending = misconceptions.filter((m) => !m.resolved);
  const totalUnexpected = Object.values(unexpected).reduce((a, b) => a + b, 0);
  return (
    <section aria-labelledby="errores-frecuentes" className="space-y-3">
      <h3 id="errores-frecuentes" className="font-semibold text-white">
        Errores frecuentes
      </h3>
      {misconceptions.length === 0 ? (
        <p className="text-sm text-slate-300">
          Todavía no hay errores previstos repetidos en las respuestas de {childName}.
        </p>
      ) : (
        <>
          <p className="text-sm text-slate-300">
            {pending.length > 0
              ? `${pending.length} ${pending.length === 1 ? "idea necesita" : "ideas necesitan"} atención. Cada tarjeta muestra la explicación que vio ${childName} al equivocarse.`
              : `Los errores registrados se corrigieron después: ${childName} resolvió bien la misma tarea al primer intento.`}
          </p>
          <ul className="space-y-3">
            {misconceptions.slice(0, 8).map((m) => {
              const lesson = getLesson(m.lessonId);
              return (
                <li key={`${m.lessonId}:${m.text}`}
                  className={`rounded-xl border p-4 ${m.resolved ? "border-slate-700 bg-slate-950" : "border-amber-300/30 bg-amber-950/20"}`}>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    {lesson?.title} · {m.count} {m.count === 1 ? "vez" : "veces"} · última {date(m.lastAt)}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {m.prompt} <span className="text-slate-400">Respondió:</span>{" "}
                    <strong className="text-white">{m.response}</strong>
                  </p>
                  <p className="mt-2 text-sm text-slate-100">{m.text}</p>
                  <p className={`mt-2 text-xs font-semibold ${m.resolved ? "text-emerald-200" : "text-amber-200"}`}>
                    {m.resolved ? "Superado: después resolvió bien la misma tarea." : "Persiste: conviene practicar esta idea."}
                  </p>
                  {!m.resolved && lesson && (
                    <Link href={`/jugar/${childId}/aprende/${lesson.id}?modo=practice`}
                      className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-cyan-200 underline underline-offset-4">
                      Practicar {lesson.title}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {totalUnexpected > 0 && (
        <p className="text-xs text-slate-400">
          Además hubo {totalUnexpected} respuestas incorrectas que no coinciden con un error previsto (distracciones,
          cálculos o ideas que el contenido todavía no anticipa).
        </p>
      )}
      <p className="text-xs text-slate-400">
        Se analizan las últimas {EVIDENCE_WINDOW} acciones registradas.
      </p>
    </section>
  );
}
