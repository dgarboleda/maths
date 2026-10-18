"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  ArrowRight,
  BookOpen,
  Compass,
  Lightbulb,
  PenLine,
} from "lucide-react";
import {
  getLesson,
  learningStatus,
  LEARNING_UNITS,
  LESSONS,
  STAGE_LABELS,
  type LearningProgress,
} from "@/lib/learning/domain";
import { useLearningData } from "@/lib/learning/useLearningData";
import { useLearningClock } from "@/lib/learning/useLearningClock";
import { getFirebase } from "@/lib/firebase";
import { recordStreak } from "@/lib/streak";
import {
  LearningLoading,
  LearningLoadError,
  LearningShell,
  primaryButton,
  secondaryButton,
} from "./LearningShell";

export function LearningHome({
  childId,
  view = "home",
}: {
  childId: string;
  view?: "home" | "learn" | "practice";
}) {
  const data = useLearningData(childId);
  const now = useLearningClock();
  const { parentId, child } = data;
  useEffect(() => {
    if (!parentId || !child) return;
    getFirebase()
      .then(({ db, firestore }) =>
        recordStreak(firestore, db, parentId, childId, child),
      )
      .catch((error) => console.error("No se pudo actualizar la racha", error));
  }, [parentId, child, childId]);
  if (data.loading) return <LearningLoading />;
  if (data.error || !data.child)
    return (
      <LearningLoadError
        message={data.error ?? "No encontramos este perfil."}
      />
    );
  const base = `/jugar/${childId}`;
  const active = Object.values(data.progress)
    .filter((p) => getLesson(p.lessonId) && p.stage !== "summary")
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const unfinished = LESSONS.find(
    (lesson) => !data.progress[lesson.id]?.completedAt,
  );
  const next = getLesson(active?.lessonId ?? "") ?? unfinished ?? LESSONS[0];
  const due = LESSONS.find((lesson) => {
    const p = data.progress[lesson.id];
    return p?.reviewDueAt && p.reviewDueAt <= now;
  });
  const title =
    view === "home"
      ? `Hola, ${data.child.name}. ¿Qué vamos a descubrir?`
      : view === "learn"
        ? "Aprender con sentido"
        : "Practicar y ganar confianza";
  return (
    <LearningShell
      childId={childId}
      title={title}
      eyebrow={view === "home" ? "Tu espacio de matemáticas" : "Tu biblioteca"}
    >
      <div className="space-y-8">
        {view === "home" ? (
          <>
            <section className="grid gap-6 rounded-3xl border border-cyan-300/25 bg-gradient-to-br from-cyan-950/70 to-slate-900 p-6 sm:p-8 lg:grid-cols-[1.3fr_1fr]">
              <div>
                <p className="text-sm font-bold text-cyan-200">
                  Tu siguiente paso
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  {next.title}
                </h2>
                <p className="mt-3 max-w-xl text-slate-300">{next.objective}</p>
                <p className="mt-3 text-sm text-slate-400">
                  {active
                    ? `Retoma: ${STAGE_LABELS[active.stage]}`
                    : "Clase breve · ejemplos · práctica · aplicación"}
                  . Puedes parar y continuar después.
                </p>
                <Link
                  href={`${base}/aprende/${next.id}`}
                  className={`${primaryButton} mt-5`}
                >
                  {active
                    ? "Continuar aprendiendo"
                    : "Comenzar mi primera clase"}
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-5">
                <Lightbulb
                  size={24}
                  className="text-amber-300"
                  aria-hidden="true"
                />
                <h3 className="mt-3 font-bold text-white">
                  Comprende. Prueba. Transforma.
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Recibe una explicación, practica a tu ritmo y usa tus ideas
                  para resolver lo que ocurre en la ciudad. Pedir ayuda forma
                  parte de aprender.
                </p>
              </div>
            </section>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  href: "/aprende",
                  icon: BookOpen,
                  title: "Aprender",
                  body: "Doce clases con ideas visuales y ejemplos que explican cada paso.",
                },
                {
                  href: "/practicar",
                  icon: PenLine,
                  title: "Practicar",
                  body: "Resuelve, pide pistas, revisa el desarrollo y vuelve a intentarlo.",
                },
                {
                  href: "/aventura",
                  icon: Compass,
                  title: "El apagón",
                  body: "Explora la central y devuelve la energía a la ciudad con tus decisiones.",
                },
              ].map(({ href, icon: Icon, title: label, body }) => (
                <Link
                  key={href}
                  href={`${base}${href}`}
                  className="group rounded-2xl border border-slate-700 bg-slate-900 p-5 hover:border-cyan-300"
                >
                  <Icon
                    size={23}
                    className="text-cyan-300"
                    aria-hidden="true"
                  />
                  <h2 className="mt-3 text-lg font-bold">{label}</h2>
                  <p className="mt-2 text-sm text-slate-300">{body}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-cyan-200">
                    Entrar
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
            {due && (
              <section className="rounded-2xl border border-amber-400/30 bg-amber-950/20 p-5">
                <h2 className="font-bold text-amber-200">
                  Una idea para recuperar hoy
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  Vuelve a {due.title.toLowerCase()} con preguntas diferentes.
                  El repaso comprueba qué recuerdas sin repetir toda la clase.
                </p>
                <Link
                  className={`${secondaryButton} mt-4`}
                  href={`${base}/aprende/${due.id}?modo=review`}
                >
                  Hacer un repaso
                </Link>
              </section>
            )}
          </>
        ) : (
          <p className="max-w-3xl text-slate-300">
            {view === "learn"
              ? "Cada clase conecta el significado, los ejemplos y la práctica. Puedes comenzar por la idea que necesitas y consultar sus bases cuando haga falta."
              : "Elige un tema para practicar con explicaciones y ayudas. Las comprobaciones autónomas y los repasos se muestran por separado."}
          </p>
        )}
        {LEARNING_UNITS.map((unit) => (
          <section
            key={unit.id}
            aria-labelledby={`unit-${unit.id}`}
            className="space-y-4"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                {unit.id === "fracciones"
                  ? "01"
                  : unit.id === "proporcionalidad"
                    ? "02"
                    : "03"}{" "}
                / Tu recorrido
              </p>
              <h2 id={`unit-${unit.id}`} className="mt-1 text-xl font-bold">
                {unit.title}
              </h2>
              <p className="mt-1 text-sm text-slate-400">{unit.description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {LESSONS.filter((lesson) => lesson.unitId === unit.id).map(
                (lesson) => (
                  <LessonCard
                    key={lesson.id}
                    childId={childId}
                    lessonId={lesson.id}
                    progress={data.progress[lesson.id]}
                    practice={view === "practice"}
                  />
                ),
              )}
            </div>
          </section>
        ))}
        <footer className="flex flex-wrap gap-4 border-t border-slate-800 pt-5 text-sm text-slate-400">
          <Link
            href={`${base}/mapa`}
            className="min-h-11 py-2 underline underline-offset-4"
          >
            Mundos de tu familia y actividades adicionales
          </Link>
          <Link
            href={`${base}/evaluacion`}
            className="min-h-11 py-2 underline underline-offset-4"
          >
            Evaluación curricular ampliada · opcional
          </Link>
        </footer>
      </div>
    </LearningShell>
  );
}

function LessonCard({
  childId,
  lessonId,
  progress,
  practice,
}: {
  childId: string;
  lessonId: string;
  progress?: LearningProgress;
  practice: boolean;
}) {
  const lesson = getLesson(lessonId)!;
  return (
    <Link
      href={`/jugar/${childId}/aprende/${lesson.id}${practice ? "?modo=practice" : ""}`}
      className="flex min-h-32 flex-col rounded-2xl border border-slate-700 bg-slate-900 p-5 transition-colors hover:border-cyan-300"
    >
      <span className="text-xs font-semibold text-cyan-200">
        {learningStatus(progress)}
      </span>
      <h3 className="mt-2 font-bold text-white">{lesson.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-300">
        {lesson.objective}
      </p>
      <span className="mt-4 text-sm font-semibold text-cyan-200">
        {practice
          ? "Practicar este tema"
          : progress
            ? "Abrir mi clase"
            : "Conocer esta idea"}{" "}
        →
      </span>
    </Link>
  );
}
