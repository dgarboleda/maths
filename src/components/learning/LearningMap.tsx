"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { Check, Compass, Flag, Map, RotateCcw } from "lucide-react";
import { ADVENTURES, dailyDue, dailyEligible, initialDaily, LEARNING_UNITS, LESSONS, learningStatus } from "@/lib/learning/domain";
import { useLearningData } from "@/lib/learning/useLearningData";
import { useLearningClock } from "@/lib/learning/useLearningClock";
import { nextStudyLesson, plannedLessonIds } from "@/lib/learning/studyPlan";
import { getProfileAvatar } from "@/lib/profileAvatars";
import { useTotalStars } from "@/lib/useTotalStars";
import { Avatar } from "@/components/world/Avatar";
import { LearningLoading, LearningLoadError, LearningShell, primaryButton, secondaryButton } from "./LearningShell";

const LearningRewards = dynamic(() => import("./LearningRewards"));

export function LearningMap({ childId }: { childId: string }) {
  const data = useLearningData(childId);
  const now = useLearningClock();
  const stars = useTotalStars(data.parentId, childId);
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const rewardsTrigger = useRef<HTMLButtonElement>(null);
  if (data.loading) return <LearningLoading />;
  if (data.error || !data.child) return <LearningLoadError message={data.error ?? "No encontramos este perfil."} />;
  const base = `/jugar/${childId}`;
  const next = nextStudyLesson(data.progress, data.placement, data.child.learningPlan);
  const priorities = new Set(plannedLessonIds(data.child.learningPlan));
  const due = dailyDue(data.daily ?? initialDaily(), dailyEligible(data.progress, data.placement?.result?.mastered ?? []), now).length;
  return (
    <LearningShell childId={childId} title="Mapa de mi aprendizaje" eyebrow="Siete rutas para descubrir matemáticas"
      portrait={getProfileAvatar(data.child.avatarId) ? <Avatar avatarId={data.child.avatarId} title={`Avatar de ${data.child.name}`} className="size-16 rounded-2xl" /> : undefined}>
      <div className="space-y-7">
        <section aria-label="Tu siguiente paso" className="rounded-2xl border border-cyan-300/30 bg-cyan-950/30 p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-cyan-200"><Map size={18} aria-hidden="true" />Tu recorrido ya está preparado</p>
          <p className="mt-3 text-slate-300">Cada parada te lleva a una clase con explicación, ejemplos y práctica. Puedes explorar cualquier ruta o volver a sus bases.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={`${base}/aprende/${next.id}`} className={primaryButton}>Siguiente idea: {next.title}</Link>
            {due > 0 && <Link href={`${base}/aprende/diario`} className={secondaryButton}><RotateCcw size={18} aria-hidden="true" />Repasar hoy · {due} {due === 1 ? "idea" : "ideas"}</Link>}
            <button ref={rewardsTrigger} type="button" className={secondaryButton} disabled={stars === null} onClick={() => setRewardsOpen(true)}>⭐ {stars ?? "…"} estrellas · Mis premios</button>
          </div>
        </section>
        <ol className="space-y-7">
          {LEARNING_UNITS.map((unit, index) => {
            const lessons = LESSONS.filter((lesson) => lesson.unitId === unit.id);
            const completed = lessons.filter((lesson) => data.progress[lesson.id]?.completedAt).length;
            const adventure = ADVENTURES.find((item) => item.unitId === unit.id);
            return <li key={unit.id}>
              <section aria-labelledby={`map-${unit.id}`} className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/60">
                <header className="flex items-center gap-4 border-b border-slate-700 bg-white/5 p-5">
                  <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-2xl bg-violet-400/15 text-xl font-bold text-violet-200">{index + 1}</span>
                  <div className="min-w-0"><h2 id={`map-${unit.id}`} className="font-display text-xl font-bold">{unit.title}</h2>
                    <p className="mt-1 text-sm text-slate-300">{completed} de {lessons.length} clases terminadas</p></div>
                </header>
                <ol className="space-y-1 p-4 sm:p-5">
                  {lessons.map((lesson, step) => {
                    const progress = data.progress[lesson.id];
                    const done = Boolean(progress?.completedAt);
                    return <li key={lesson.id} className="relative pl-12 before:absolute before:bottom-0 before:left-4 before:top-0 before:w-px before:bg-slate-600 last:before:bottom-1/2">
                      <span aria-hidden="true" className={`absolute left-0 top-4 grid size-8 place-items-center rounded-full border-2 ${done ? "border-emerald-300 bg-emerald-950 text-emerald-200" : "border-slate-500 bg-slate-900 text-slate-300"}`}>{done ? <Check size={16} /> : step + 1}</span>
                      <Link href={`${base}/aprende/${lesson.id}`} className={`block rounded-xl border p-4 transition-colors hover:border-cyan-300 ${next.id === lesson.id ? "border-cyan-300/50 bg-cyan-300/5" : "border-transparent"}`}>
                        <span className="block font-semibold">{lesson.title}</span>
                        <span className="mt-1 block text-sm text-slate-300">{done ? "Clase terminada · " : ""}{learningStatus(progress)}</span>
                        {priorities.has(lesson.id) && <span className="mt-2 inline-flex items-center gap-1 text-xs text-amber-200"><Flag size={12} aria-hidden="true" />En tu plan de estudio</span>}
                        {progress?.reviewDueAt && progress.reviewDueAt <= now ? <span className="mt-1 block text-xs text-amber-200">Repaso diferido disponible</span> : null}
                      </Link>
                    </li>;
                  })}
                </ol>
                {adventure && <Link href={`${base}/aventura/${adventure.id}`} className="mx-5 mb-5 flex min-h-12 items-center gap-3 rounded-xl border border-violet-300/30 bg-violet-300/5 p-4 text-violet-200">
                  <Compass size={22} aria-hidden="true" /><span><span className="block font-bold">Aventura: {adventure.title}</span><span className="text-sm">{data.adventures[adventure.id]?.completedAt ? "Aventura terminada · volver a explorar" : "Aplica las ideas de esta ruta"}</span></span>
                </Link>}
              </section>
            </li>;
          })}
        </ol>
      </div>
      {rewardsOpen && data.parentId && <LearningRewards parentId={data.parentId} childId={childId} stars={stars ?? 0} onClose={() => { setRewardsOpen(false); rewardsTrigger.current?.focus({ preventScroll: true }); }} />}
    </LearningShell>
  );
}
