"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useFamily } from "@/components/family/FamilyProvider";
import { useLearningDashboard } from "@/lib/family/useLearningDashboard";
import { ActivityRow, EmptyState, SectionCard, WeeklyChart } from "@/components/family/ui";
import { LearningReport } from "@/components/learning/LearningReport";
import { HelpUsageReport } from "@/components/learning/HelpUsageReport";
import { ChildStarsCard } from "@/components/family/FamilyStars";
import { Avatar } from "@/components/world/Avatar";
import { LESSONS } from "@/lib/learning/domain";

export default function ChildLearningPage() {
  const { childId } = useParams<{ childId: string }>();
  const { parentId, children, loadingChildren } = useFamily();
  const dashboard = useLearningDashboard(childId);
  const child = children.find((item) => item.id === childId);
  if (loadingChildren) return <p role="status">Cargando perfil…</p>;
  if (!child) return <p role="alert">No encontramos este perfil. <Link href="/panel/hijos">Volver a Hijos</Link></p>;
  return <div className="space-y-6">
    <Link href="/panel/hijos" className="inline-flex min-h-11 items-center text-sm font-medium text-indigo-600 underline hover:text-indigo-700">Volver a Hijos</Link>
    <header className="family-panel flex flex-wrap items-center gap-4 rounded-2xl p-5 sm:p-6">
      <Avatar avatarId={child.avatarId} title={child.name} className="size-16 rounded-full border border-slate-200" />
      <div className="min-w-0 flex-1"><h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{child.name}</h1>
        <p className="mt-1 text-sm text-slate-600 tabular-nums">{dashboard.completed} de {LESSONS.length} clases terminadas · {dashboard.streak} días de racha de repaso</p>
        <p className="mt-1 text-sm font-medium text-amber-600 tabular-nums">{dashboard.totalStars ?? "…"} estrellas</p></div>
      <Link href={`/jugar/${childId}/mapa`} className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Ver mapa de aprendizaje</Link>
    </header>
    <LearningReport childId={childId} childName={child.name} />
    <HelpUsageReport childId={childId} childName={child.name} />
    <ChildStarsCard parentId={parentId} childId={childId} childName={child.name} />
    <SectionCard title="Siguiente paso"><p className="font-semibold text-slate-900">{dashboard.nextLesson.title}</p><p className="mt-1 text-sm text-slate-600">{dashboard.nextLesson.objective}</p><Link href="/panel/plan" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-indigo-600 underline hover:text-indigo-700">Preparar su plan de estudio</Link></SectionCard>
    {dashboard.error && <p role="alert" className="text-sm text-amber-700">{dashboard.error}</p>}
    <SectionCard title="Ritmo de la semana"><WeeklyChart noun="respuestas" week={dashboard.weeklyProblems} previousTotal={dashboard.loading ? undefined : dashboard.previousWeekProblems} /></SectionCard>
    <SectionCard title="Actividad reciente">{dashboard.activity.length ? <ul className="divide-y divide-slate-200/80">{dashboard.activity.map((item) => <ActivityRow key={item.id} item={item} />)}</ul> : <EmptyState icon="📘" title="Sin actividad todavía" text="Las clases y los repasos aparecerán aquí al comenzar." />}</SectionCard>
    <Link href={`/panel/archivo/${childId}`} className="inline-flex min-h-11 items-center text-sm text-slate-500 underline hover:text-slate-700">Consultar el historial de actividades anteriores</Link>
  </div>;
}
