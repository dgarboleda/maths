"use client";

import {
  ADVENTURES,
  dailyStrength,
  getLesson,
  LEARNING_UNITS,
  learningStatus,
  LESSONS,
  mixedReviewId,
} from "@/lib/learning/domain";
import { useLearningData } from "@/lib/learning/useLearningData";
import { learningSummary } from "@/lib/learning/summary";
import { useLearningClock } from "@/lib/learning/useLearningClock";
import { MisconceptionPanel } from "./MisconceptionPanel";
import { AnswerHabitsPanel } from "./AnswerHabitsPanel";

export function LearningReport({
  childId,
  childName,
  compact = false,
}: {
  childId: string;
  childName: string;
  compact?: boolean;
}) {
  const data = useLearningData(childId);
  const entries = Object.values(data.progress).filter((p) =>
    getLesson(p.lessonId),
  );
  const now = useLearningClock();
  const { completed, autonomous, retained, streak } = learningSummary(data.progress, data.daily, now);
  const support = entries.filter((p) => p.needsSupport);
  return (
    <section
      aria-label={`Aprendizaje de ${childName}`}
      className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-6"
    >
      <header>
        <h2 className="text-base font-semibold tracking-tight text-slate-900">
          Qué está aprendiendo {childName}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          La clase recorrida, la resolución con apoyo, la comprobación autónoma
          y el repaso diferido aportan información distinta.
        </p>
      </header>
      {data.loading ? (
        <p role="status" className="text-sm text-slate-500">
          Cargando evidencias de aprendizaje…
        </p>
      ) : data.error ? (
        <p role="alert" className="text-sm text-amber-700">
          {data.error}
        </p>
      ) : (
        <>
          <dl className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Recorridos completados", value: completed },
              {
                label: "Comprobaciones autónomas superadas",
                value: autonomous,
              },
              { label: "Repasos diferidos superados", value: retained },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-slate-200/80 bg-slate-50 p-4">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="mt-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                  {value}{" "}
                  <span className="text-sm font-normal text-slate-500">
                    de {LESSONS.length}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          {support.length > 0 && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Siguiente apoyo recomendado: volver a los ejemplos y la práctica
              guiada de {getLesson(support[0].lessonId)?.title.toLowerCase()}.
            </p>
          )}
          {!compact && (
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Avance por clase">
              <table className="w-full min-w-[38rem] text-left text-sm">
                <caption className="sr-only">
                  Evidencias por lección del programa
                </caption>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                    <th className="p-3">Lección</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Última comprobación</th>
                    <th className="p-3">Próximo repaso</th>
                  </tr>
                </thead>
                <tbody>
                  {LESSONS.map((lesson) => {
                    const p = data.progress[lesson.id];
                    return (
                      <tr key={lesson.id} className="border-b border-slate-200/80">
                        <th
                          className="p-3 font-semibold text-slate-900"
                          scope="row"
                        >
                          {lesson.title}
                          {p?.classCompleted && (
                            <span className="mt-1 block text-xs font-normal text-slate-500">
                              Explicación recorrida
                            </span>
                          )}
                        </th>
                        <td className="p-3 font-medium text-indigo-600">
                          {learningStatus(p)}
                        </td>
                        <td className="p-3 text-slate-600 tabular-nums">
                          {p?.lastCheck
                            ? `${p.lastCheck.correct}/${p.lastCheck.total} de forma autónoma`
                            : "Sin comprobar"}
                        </td>
                        <td className="p-3 text-slate-600">
                          {p?.reviewDueAt
                            ? new Date(p.reviewDueAt).toLocaleDateString("es")
                            : "Se programa al superar la comprobación"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!compact &&
            LEARNING_UNITS.some((unit) => data.reviews[mixedReviewId(unit.id)]?.lastResult) && (
              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Repasos mixtos por unidad">
                <table className="w-full min-w-[30rem] text-left text-sm">
                  <caption className="mb-2 text-left font-semibold text-slate-900">
                    Repasos mixtos por unidad
                  </caption>
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                      <th className="p-3">Unidad</th>
                      <th className="p-3">Sesiones</th>
                      <th className="p-3">Mejor resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LEARNING_UNITS.map((unit) => {
                      const review = data.reviews[mixedReviewId(unit.id)];
                      if (!review?.lastResult) return null;
                      return (
                        <tr key={unit.id} className="border-b border-slate-200/80">
                          <th scope="row" className="p-3 font-semibold text-slate-900">
                            {unit.title}
                          </th>
                          <td className="p-3 text-slate-600 tabular-nums">{review.round}</td>
                          <td className="p-3 font-medium text-indigo-600 tabular-nums">
                            {review.bestResult?.correct}/{review.bestResult?.total} de forma autónoma
                            {review.completedAt ? " · superado" : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          {!compact &&
            ADVENTURES.some((adventure) => data.adventures[adventure.id]?.attempts) && (
              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Aventuras">
                <table className="w-full min-w-[30rem] text-left text-sm">
                  <caption className="mb-2 text-left font-semibold text-slate-900">
                    Aventuras
                  </caption>
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                      <th className="p-3">Misión</th>
                      <th className="p-3">Planes probados</th>
                      <th className="p-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ADVENTURES.map((adventure) => {
                      const state = data.adventures[adventure.id];
                      if (!state?.attempts) return null;
                      return (
                        <tr key={adventure.id} className="border-b border-slate-200/80">
                          <th scope="row" className="p-3 font-semibold text-slate-900">
                            {adventure.title}
                          </th>
                          <td className="p-3 text-slate-600 tabular-nums">{state.attempts}</td>
                          <td className="p-3 font-medium text-indigo-600">
                            {state.completedAt ? "Completada" : "En curso"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          {!compact && data.placement?.result && (
            <p className="rounded-xl border border-slate-200/80 bg-slate-50 p-4 text-sm text-slate-600">
              <strong className="text-slate-900">Evaluación de ubicación:</strong>{" "}
              {data.placement.result.mastered.length} de {LESSONS.length} clases sugeridas como opcionales al empezar
              ({new Date(data.placement.result.at).toLocaleDateString("es-PE")}). Esas clases quedan opcionales; no
              cuentan como terminadas ni dan estrellas.
            </p>
          )}
          {!compact && data.daily && data.daily.sessions > 0 && (() => {
            const strength = dailyStrength(data.daily);
            return (
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-4 text-sm text-slate-600">
                <p>
                  <strong className="text-slate-900">Repaso espaciado:</strong> {data.daily.sessions}{" "}
                  {data.daily.sessions === 1 ? "sesión" : "sesiones"}
                  {data.daily.lastResult &&
                    ` · última: ${data.daily.lastResult.correct} de ${data.daily.lastResult.total} sin ayuda (${new Date(data.daily.lastResult.at).toLocaleDateString("es-PE")})`}
                  .
                </p>
                <p className="mt-1">
                  Ideas afianzadas (vuelven en 14 días o más): <strong className="text-emerald-700">{strength.strong}</strong> · en
                  proceso: <strong className="text-indigo-600">{strength.growing}</strong> · por reforzar:{" "}
                  <strong className="text-amber-700">{strength.weak}</strong>.
                </p>
                {data.daily.streak && (
                  <p className="mt-1">
                    Racha de repaso: {streak}{" "}
                    {streak === 1 ? "día seguido" : "días seguidos"} · mejor racha:{" "}
                    {data.daily.streak.best}. Saltarse un día se perdona una vez por semana.
                  </p>
                )}
              </div>
            );
          })()}
          {!compact && (
            <AnswerHabitsPanel parentId={data.parentId} childId={childId} childName={childName} progress={data.progress} now={now} />
          )}
          {!compact && (
            <MisconceptionPanel parentId={data.parentId} childId={childId} childName={childName} />
          )}
          <p className="text-xs leading-relaxed text-slate-500">
            Una comprobación exige al menos 4 de 5 respuestas autónomas e
            incluye comprensión y aplicación. El repaso usa otras preguntas,
            desde tres días después. El repaso mixto mezcla problemas de varias clases de una unidad y se supera con 5 de 6. Estos criterios corresponden al programa
            inicial y se ajustarán mediante revisión pedagógica.
          </p>
        </>
      )}
    </section>
  );
}
