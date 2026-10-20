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
import { MisconceptionPanel } from "./MisconceptionPanel";

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
  const completed = entries.filter((p) => p.completedAt).length;
  const autonomous = entries.filter(
    (p) => p.checkPassedAt && !p.needsSupport,
  ).length;
  const retained = entries.filter(
    (p) => p.retainedAt && p.lastReview?.passed && !p.needsSupport,
  ).length;
  const support = entries.filter((p) => p.needsSupport);
  return (
    <section
      aria-label={`Aprendizaje de ${childName}`}
      className="space-y-4 rounded-2xl border border-cyan-400/25 bg-slate-900 p-5"
    >
      <header>
        <h2 className="font-display text-xl font-bold text-white">
          Qué está aprendiendo {childName}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          La clase recorrida, la resolución con apoyo, la comprobación autónoma
          y el repaso diferido aportan información distinta.
        </p>
      </header>
      {data.loading ? (
        <p role="status" className="text-sm text-slate-300">
          Cargando evidencias de aprendizaje…
        </p>
      ) : data.error ? (
        <p role="alert" className="text-amber-200">
          {data.error}
        </p>
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Recorridos completados", value: completed },
              {
                label: "Comprobaciones autónomas superadas",
                value: autonomous,
              },
              { label: "Repasos diferidos superados", value: retained },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-slate-950 p-4">
                <dt className="text-xs text-slate-300">{label}</dt>
                <dd className="mt-2 text-2xl font-bold text-cyan-200">
                  {value}{" "}
                  <span className="text-sm font-normal text-slate-400">
                    de {LESSONS.length}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          {support.length > 0 && (
            <p className="rounded-xl bg-amber-950/30 p-4 text-sm text-amber-100">
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
                  <tr className="border-b border-slate-600 text-slate-300">
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
                      <tr key={lesson.id} className="border-b border-slate-800">
                        <th
                          className="p-3 font-semibold text-white"
                          scope="row"
                        >
                          {lesson.title}
                          {p?.classCompleted && (
                            <span className="mt-1 block text-xs font-normal text-slate-400">
                              Explicación recorrida
                            </span>
                          )}
                        </th>
                        <td className="p-3 text-cyan-200">
                          {learningStatus(p)}
                        </td>
                        <td className="p-3 text-slate-300">
                          {p?.lastCheck
                            ? `${p.lastCheck.correct}/${p.lastCheck.total} de forma autónoma`
                            : "Sin comprobar"}
                        </td>
                        <td className="p-3 text-slate-300">
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
                  <caption className="mb-2 text-left font-semibold text-white">
                    Repasos mixtos por unidad
                  </caption>
                  <thead>
                    <tr className="border-b border-slate-600 text-slate-300">
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
                        <tr key={unit.id} className="border-b border-slate-800">
                          <th scope="row" className="p-3 font-semibold text-white">
                            {unit.title}
                          </th>
                          <td className="p-3 text-slate-300">{review.round}</td>
                          <td className="p-3 text-cyan-200">
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
                  <caption className="mb-2 text-left font-semibold text-white">
                    Aventuras
                  </caption>
                  <thead>
                    <tr className="border-b border-slate-600 text-slate-300">
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
                        <tr key={adventure.id} className="border-b border-slate-800">
                          <th scope="row" className="p-3 font-semibold text-white">
                            {adventure.title}
                          </th>
                          <td className="p-3 text-slate-300">{state.attempts}</td>
                          <td className="p-3 text-cyan-200">
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
            <p className="rounded-xl bg-slate-950 p-4 text-sm text-slate-300">
              <strong className="text-white">Evaluación de ubicación:</strong>{" "}
              {data.placement.result.mastered.length} de {LESSONS.length} clases dominadas al empezar
              ({new Date(data.placement.result.at).toLocaleDateString("es-PE")}). Esas clases quedan opcionales; no
              cuentan como terminadas ni dan estrellas.
            </p>
          )}
          {!compact && data.daily && data.daily.sessions > 0 && (() => {
            const strength = dailyStrength(data.daily);
            return (
              <div className="rounded-xl bg-slate-950 p-4 text-sm text-slate-300">
                <p>
                  <strong className="text-white">Repaso espaciado:</strong> {data.daily.sessions}{" "}
                  {data.daily.sessions === 1 ? "sesión" : "sesiones"}
                  {data.daily.lastResult &&
                    ` · última: ${data.daily.lastResult.correct} de ${data.daily.lastResult.total} sin ayuda (${new Date(data.daily.lastResult.at).toLocaleDateString("es-PE")})`}
                  .
                </p>
                <p className="mt-1">
                  Ideas afianzadas (vuelven en 14 días o más): <strong className="text-emerald-200">{strength.strong}</strong> · en
                  proceso: <strong className="text-cyan-200">{strength.growing}</strong> · por reforzar:{" "}
                  <strong className="text-amber-200">{strength.weak}</strong>.
                </p>
                {data.daily.streak && (
                  <p className="mt-1">
                    Racha de repaso: {data.daily.streak.current}{" "}
                    {data.daily.streak.current === 1 ? "día seguido" : "días seguidos"} hasta el{" "}
                    {new Date(`${data.daily.streak.lastDay}T12:00:00Z`).toLocaleDateString("es-PE")} · mejor racha:{" "}
                    {data.daily.streak.best}. Saltarse un día se perdona una vez por semana.
                  </p>
                )}
              </div>
            );
          })()}
          {!compact && (
            <MisconceptionPanel parentId={data.parentId} childId={childId} childName={childName} />
          )}
          <p className="text-xs leading-relaxed text-slate-400">
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
