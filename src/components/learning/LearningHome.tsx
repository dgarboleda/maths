"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Compass,
  Gamepad2,
  Lightbulb,
  RotateCcw,
} from "lucide-react";
import {
  getLesson,
  learningStatus,
  LEARNING_UNITS,
  LESSONS,
  mixedReviewId,
  MIXED_REVIEW_MIN_LESSONS,
  dailyDue,
  dailyEligible,
  initialDaily,
  limaDay,
  streakToday,
  PERU_MAP,
  recommendedLesson,
  STAGE_LABELS,
  type LearningProgress,
  type MixedReviewState,
  type UnitId,
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
import styles from "./learning.module.css";

export const unitStyles: Record<
  UnitId,
  { accent: string; surface: string; symbol: string }
> = {
  numeros: {
    accent: "text-emerald-200",
    surface: "border-emerald-300/20 bg-emerald-300/10",
    symbol: "±",
  },
  fracciones: {
    accent: "text-cyan-200",
    surface: "border-cyan-300/20 bg-cyan-300/10",
    symbol: "¾",
  },
  proporcionalidad: {
    accent: "text-amber-200",
    surface: "border-amber-300/20 bg-amber-300/10",
    symbol: "a : b",
  },
  algebra: {
    accent: "text-violet-200",
    surface: "border-violet-300/20 bg-violet-300/10",
    symbol: "x + y",
  },
  expresiones: {
    accent: "text-fuchsia-200",
    surface: "border-fuchsia-300/20 bg-fuchsia-300/10",
    symbol: "f(x)",
  },
  geometria: {
    accent: "text-sky-200",
    surface: "border-sky-300/20 bg-sky-300/10",
    symbol: "△",
  },
  datos: {
    accent: "text-rose-200",
    surface: "border-rose-300/20 bg-rose-300/10",
    symbol: "x̄",
  },
};

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
  const placed = data.placement?.result ?? null;
  const reviewable = dailyEligible(data.progress, placed?.mastered ?? []);
  const dueToday = dailyDue(data.daily ?? initialDaily(), reviewable, now).length;
  const reviewedToday = data.daily?.rewardDay === limaDay(now);
  const reviewStreak = streakToday(data.daily, now);
  const streakLabel = reviewStreak.current > 0 ? ` · 🔥 ${reviewStreak.current}` : "";
  const unfinished = recommendedLesson(
    new Set(LESSONS.filter((l) => data.progress[l.id]?.completedAt).map((l) => l.id)),
    placed,
  );
  const next = getLesson(active?.lessonId ?? "") ?? unfinished ?? LESSONS[0];
  const completed = LESSONS.filter(
    (lesson) => data.progress[lesson.id]?.completedAt,
  ).length;
  const nextActionLabel = active
    ? "Continuar aprendiendo"
    : data.progress[next.id]
      ? "Volver a esta clase"
      : completed > 0
        ? "Comenzar mi siguiente clase"
        : "Comenzar mi primera clase";
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
      <div className="space-y-8 sm:space-y-10">
        {view === "home" ? (
          <section
            aria-label="Tu siguiente paso"
            className={`${styles.hero} grid gap-7 rounded-3xl border border-cyan-300/25 p-5 sm:p-8 lg:grid-cols-[1.4fr_1fr]`}
          >
            <div className="flex flex-col items-start">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-200">
                <span
                  className="size-1.5 rounded-full bg-cyan-300"
                  aria-hidden="true"
                />
                {active
                  ? "Tu clase te espera"
                  : completed === LESSONS.length
                    ? "Sigue explorando"
                    : "Tu siguiente paso"}
              </span>
              <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-slate-400">
                {LEARNING_UNITS.find((unit) => unit.id === next.unitId)?.title}
              </p>
              <h2 className="mt-2 max-w-xl font-display text-2xl font-bold leading-tight text-white sm:text-3xl">
                {next.title}
              </h2>
              <p className="mt-3 max-w-xl leading-relaxed text-slate-300">
                {next.objective}
              </p>
              <Link
                href={`${base}/aprende/${next.id}`}
                className={`${primaryButton} mt-6 w-full sm:w-auto`}
              >
                {nextActionLabel}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                {active ? `Retoma: ${STAGE_LABELS[active.stage]}. ` : ""}
                Tu avance se guarda. Puedes parar y volver después.
              </p>
              {reviewable.length > 0 && (
                <Link
                  href={`${base}/aprende/diario`}
                  className={`${secondaryButton} mt-4 w-full sm:w-auto`}
                >
                  {reviewedToday
                    ? `Repaso de hoy hecho ✓${streakLabel} · repasar más`
                    : dueToday > 0
                      ? `Repasar hoy · ${dueToday} ${dueToday === 1 ? "idea" : "ideas"}${streakLabel}`
                      : `Repasar hoy · adelantar un repaso${streakLabel}`}
                  {reviewStreak.atRisk && <span className="sr-only">. Tu racha de repaso sigue si repasas hoy.</span>}
                </Link>
              )}
              {placed ? (
                <Link
                  href={`${base}/aprende/ubicacion`}
                  className="mt-4 text-sm font-semibold text-cyan-200 underline underline-offset-4"
                >
                  Tu ubicación: {placed.mastered.length} {placed.mastered.length === 1 ? "clase que ya dominas" : "clases que ya dominas"} · ver resultado
                </Link>
              ) : (
                completed === 0 && (
                  <Link
                    href={`${base}/aprende/ubicacion`}
                    className={`${secondaryButton} mt-4 w-full sm:w-auto`}
                  >
                    ¿Ya sabes algo? Encuentra tu punto de partida
                  </Link>
                )
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 sm:p-6">
              <h3 className="text-sm font-bold text-white">
                Una idea, paso a paso
              </h3>
              <ol className="mt-5 space-y-5">
                {[
                  {
                    icon: BookOpen,
                    title: "Entiende la idea",
                    body: "Explicaciones visuales y ejemplos razonados.",
                  },
                  {
                    icon: Gamepad2,
                    title: "Ponla en juego",
                    body: "Practica con pistas, a tu ritmo.",
                  },
                  {
                    icon: Lightbulb,
                    title: "Úsala en una situación real",
                    body: "Comprueba lo aprendido y aplícalo.",
                  },
                ].map(({ icon: Icon, title: label, body }, index) => (
                  <li key={label} className="flex gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200">
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-100">
                        <span className="mr-2 text-cyan-200">0{index + 1}</span>
                        {label}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">
                        {body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-6 border-t border-white/10 pt-4">
                <div className="mb-2 flex justify-between gap-3 text-xs text-slate-300">
                  <span>Clases terminadas</span>
                  <strong>
                    {completed} de {LESSONS.length}
                  </strong>
                </div>
                <progress
                  aria-label="Clases terminadas"
                  value={completed}
                  max={LESSONS.length}
                  className="block h-1.5 w-full overflow-hidden rounded-full accent-cyan-300"
                />
              </div>
            </div>
          </section>
        ) : (
          <div className="space-y-5">
            <p className="max-w-3xl leading-relaxed text-slate-300">
              {view === "learn"
                ? "Comprende una idea, descubre cómo se resuelve y prueba por tu cuenta. Elige un tema; puedes volver a sus bases cuando lo necesites."
                : "Elige una idea y practica con ayuda. Nueve minijuegos se alternan en las actividades compatibles; también puedes escribir tu respuesta. Pedir una pista forma parte de aprender."}
            </p>
            <nav
              aria-label="Unidades de aprendizaje"
              className="flex flex-wrap gap-2"
            >
              {LEARNING_UNITS.map((unit, index) => (
                <Link
                  key={unit.id}
                  href={`#unit-${unit.id}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:border-slate-400"
                >
                  <span className={unitStyles[unit.id].accent}>
                    0{index + 1}
                  </span>
                  {unit.id === "fracciones"
                    ? "Fracciones"
                    : unit.id === "proporcionalidad"
                      ? "Proporcionalidad"
                      : "Álgebra"}
                </Link>
              ))}
            </nav>
          </div>
        )}

        {due && (
          <section
            aria-label="Repaso disponible"
            className="flex flex-col items-start gap-4 rounded-2xl border border-amber-300/25 bg-amber-300/5 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex gap-3">
              <RotateCcw
                className="mt-1 shrink-0 text-amber-200"
                size={21}
                aria-hidden="true"
              />
              <div>
                <h2 className="font-bold text-amber-200">
                  Una idea para recuperar hoy
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-300">
                  Vuelve a {due.title.toLowerCase()} con preguntas diferentes.
                  Descubre qué recuerdas sin repetir toda la clase.
                </p>
              </div>
            </div>
            <Link
              className={`${secondaryButton} w-full shrink-0 sm:w-auto`}
              href={`${base}/aprende/${due.id}?modo=review`}
            >
              Hacer un repaso
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </section>
        )}

        {view === "home" ? (
          <section aria-labelledby="learning-units">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Explora a tu ritmo
                </p>
                <h2
                  id="learning-units"
                  className="mt-1 font-display text-2xl font-bold"
                >
                  Tu recorrido de aprendizaje
                </h2>
              </div>
              <Link
                className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-cyan-200"
                href={`${base}/aprende`}
              >
                Ver todas las clases
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {LEARNING_UNITS.map((unit, index) => {
                const lessons = LESSONS.filter(
                  (lesson) => lesson.unitId === unit.id,
                );
                const finished = lessons.filter(
                  (lesson) => data.progress[lesson.id]?.completedAt,
                ).length;
                const theme = unitStyles[unit.id];
                return (
                  <Link
                    key={unit.id}
                    href={`${base}/aprende#unit-${unit.id}`}
                    className={`${styles.unitCard} group flex flex-col rounded-2xl border border-slate-700 p-5 transition-colors sm:p-6`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${theme.surface} ${theme.accent}`}
                      >
                        UNIDAD {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`font-display text-3xl ${theme.accent}`}
                      >
                        {theme.symbol}
                      </span>
                    </div>
                    <h3 className="mt-5 text-lg font-bold leading-snug text-white">
                      {unit.title}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
                      {unit.description}
                    </p>
                    <p className="mt-5 text-xs text-slate-300">
                      {finished} de {lessons.length} clases terminadas
                    </p>
                    <progress
                      aria-label={`Clases terminadas de ${unit.title}`}
                      value={finished}
                      max={lessons.length}
                      className="mt-2 block h-1 w-full overflow-hidden rounded-full accent-cyan-300"
                    />
                    <span
                      className={`mt-5 flex items-center justify-between text-sm font-bold ${theme.accent}`}
                    >
                      Explorar unidad
                      <ArrowRight size={17} aria-hidden="true" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : (
          LEARNING_UNITS.map((unit, unitIndex) => (
            <section
              key={unit.id}
              aria-labelledby={`unit-${unit.id}`}
              className="space-y-4"
            >
              <div className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className={`grid size-11 shrink-0 place-items-center rounded-xl border text-sm font-bold ${unitStyles[unit.id].surface} ${unitStyles[unit.id].accent}`}
                >
                  {String(unitIndex + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2
                    id={`unit-${unit.id}`}
                    className={`${styles.unitHeading} text-xl font-bold`}
                  >
                    {unit.title}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">
                    {unit.description}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {LESSONS.filter((lesson) => lesson.unitId === unit.id).map(
                  (lesson, index) => (
                    <LessonCard
                      key={lesson.id}
                      childId={childId}
                      lessonId={lesson.id}
                      index={index}
                      progress={data.progress[lesson.id]}
                      practice={view === "practice"}
                      placed={Boolean(placed?.mastered.includes(lesson.id))}
                    />
                  ),
                )}
              </div>
              <MixedReviewCard
                childId={childId}
                unitId={unit.id}
                completed={
                  LESSONS.filter(
                    (lesson) =>
                      lesson.unitId === unit.id &&
                      data.progress[lesson.id]?.completedAt,
                  ).length
                }
                review={data.reviews[mixedReviewId(unit.id)]}
              />
            </section>
          ))
        )}

        {view === "home" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                href: "/practicar",
                icon: Gamepad2,
                title: "Practica a tu manera",
                body: "Nueve minijuegos, respuestas escritas y pistas para seguir probando.",
                action: "Elegir un tema",
              },
              {
                href: "/aventura",
                icon: Compass,
                title: "La ciudad necesita tus ideas",
                body: "Siete misiones, una por unidad: tus decisiones matemáticas devuelven la energía, salvan el mercado y diseñan la plaza.",
                action: "Explorar las aventuras",
              },
            ].map(({ href, icon: Icon, title: label, body, action }) => (
              <Link
                key={href}
                href={`${base}${href}`}
                className="group flex items-start gap-4 rounded-2xl border border-slate-700 bg-slate-900/60 p-5 transition-colors hover:border-cyan-300/60"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-300/10 text-violet-200">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-bold text-white">{label}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {body}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-cyan-200">
                    {action}
                    <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
        <details className="border-t border-slate-800 pt-5 text-sm text-slate-400">
          <summary className="w-fit cursor-pointer py-3 font-semibold text-slate-300">
            Más actividades para explorar
          </summary>
          <div className="mt-2 flex flex-col items-start gap-2">
            <Link
              href={`${base}/mapa`}
              className="inline-flex min-h-11 items-center py-2 underline underline-offset-4"
            >
              Mundos de tu familia y actividades adicionales
            </Link>
            <Link
              href={`${base}/evaluacion`}
              className="inline-flex min-h-11 items-center py-2 underline underline-offset-4"
            >
              Evaluación curricular ampliada · opcional
            </Link>
          </div>
        </details>
      </div>
    </LearningShell>
  );
}

function LessonCard({
  childId,
  lessonId,
  index,
  progress,
  practice,
  placed,
}: {
  childId: string;
  lessonId: string;
  index: number;
  progress?: LearningProgress;
  practice: boolean;
  placed: boolean;
}) {
  const lesson = getLesson(lessonId)!;
  const peru = PERU_MAP[lesson.id];
  const theme = unitStyles[lesson.unitId];
  return (
    <Link
      href={`/jugar/${childId}/aprende/${lesson.id}${practice ? "?modo=practice" : ""}`}
      className={`${styles.unitCard} flex flex-col rounded-2xl border border-slate-700 p-5 transition-colors sm:p-6`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`text-xs font-bold ${theme.accent}`}>
          CLASE {String(index + 1).padStart(2, "0")}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${progress?.completedAt ? "bg-emerald-300/10 text-emerald-200" : "bg-white/5 text-slate-300"}`}
        >
          {progress?.completedAt && <Check size={13} aria-hidden="true" />}
          {!progress && placed ? "Dominada en tu ubicación" : learningStatus(progress)}
        </span>
      </div>
      {peru && (
        <p className="mt-2 text-xs text-slate-400">
          Perú · {peru.grade}.° de secundaria (orientativo)
        </p>
      )}
      <h3 className="mt-4 text-lg font-bold leading-snug text-white">
        {lesson.title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
        {lesson.objective}
      </p>
      <span
        className={`mt-5 flex items-center justify-between gap-2 border-t border-white/10 pt-4 text-sm font-semibold ${theme.accent}`}
      >
        {practice
          ? "Practicar este tema"
          : progress
            ? "Abrir mi clase"
            : "Conocer esta idea"}
        <ArrowRight size={17} aria-hidden="true" />
      </span>
    </Link>
  );
}

function MixedReviewCard({
  childId,
  unitId,
  completed,
  review,
}: {
  childId: string;
  unitId: UnitId;
  completed: number;
  review?: MixedReviewState;
}) {
  const theme = unitStyles[unitId];
  const ready = completed >= MIXED_REVIEW_MIN_LESSONS;
  const body = (
    <>
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl border ${theme.surface} ${theme.accent}`}>
        <RotateCcw size={18} aria-hidden="true" />
      </span>
      <div className="flex-1">
        <h3 className="font-bold text-white">Repaso mixto de la unidad</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">
          {ready
            ? "Problemas de tus clases terminadas, mezclados: primero decide qué idea usar."
            : `Se habilita al terminar ${MIXED_REVIEW_MIN_LESSONS} clases de esta unidad (llevas ${completed}).`}
        </p>
        {review?.bestResult && (
          <p className="mt-2 text-xs text-slate-300">
            Mejor sesión: {review.bestResult.correct} de {review.bestResult.total} de forma autónoma
            {review.completedAt ? " · superado" : ""}
          </p>
        )}
      </div>
      {ready && <ArrowRight className={theme.accent} size={18} aria-hidden="true" />}
    </>
  );
  return ready ? (
    <Link
      href={`/jugar/${childId}/aprende/${mixedReviewId(unitId)}`}
      className="flex items-start gap-4 rounded-2xl border border-dashed border-slate-600 bg-slate-900/60 p-5 transition-colors hover:border-cyan-300/60"
    >
      {body}
    </Link>
  ) : (
    <div className="flex items-start gap-4 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-5">
      {body}
    </div>
  );
}
