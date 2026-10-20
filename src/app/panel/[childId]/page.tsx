"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useFamily } from "@/components/family/FamilyProvider";
import { useLearningDashboard } from "@/lib/family/useLearningDashboard";
import { ActivityRow, EmptyState, SectionCard, WeeklyChart } from "@/components/family/ui";
import { LearningReport } from "@/components/learning/LearningReport";
import { Avatar } from "@/components/world/Avatar";
import { LESSONS } from "@/lib/learning/domain";

export default function ChildLearningPage() {
  const { childId } = useParams<{ childId: string }>();
  const { children, loadingChildren } = useFamily();
  const dashboard = useLearningDashboard(childId);
  const child = children.find((item) => item.id === childId);
  if (loadingChildren) return <p role="status">Cargando perfil…</p>;
  if (!child) return <p role="alert">No encontramos este perfil. <Link href="/panel/hijos">Volver a Hijos</Link></p>;
  return <div className="space-y-6">
    <Link href="/panel/hijos" className="inline-flex min-h-11 items-center text-cyan-200 underline">Volver a Hijos</Link>
    <header className="family-panel flex flex-wrap items-center gap-4 rounded-2xl p-5">
      <Avatar avatarId={child.avatarId} title={child.name} className="size-16 rounded-full" />
      <div className="min-w-0 flex-1"><h1 className="font-display text-2xl font-bold text-white">{child.name}</h1>
        <p className="mt-2 text-sm text-slate-300">{dashboard.completed} de {LESSONS.length} clases terminadas · {dashboard.streak} días de racha de repaso</p>
        <p className="mt-1 text-sm text-amber-200">{dashboard.totalStars ?? "…"} estrellas</p></div>
      <Link href={`/jugar/${childId}/mapa`} className="inline-flex min-h-11 items-center rounded-xl border border-cyan-300/30 px-4 text-cyan-200">Ver mapa de aprendizaje</Link>
    </header>
    <LearningReport childId={childId} childName={child.name} />
    <SectionCard title="Siguiente paso"><p className="font-bold text-white">{dashboard.nextLesson.title}</p><p className="mt-2 text-sm text-slate-300">{dashboard.nextLesson.objective}</p><Link href="/panel/plan" className="mt-3 inline-flex min-h-11 items-center text-cyan-200 underline">Preparar su plan de estudio</Link></SectionCard>
    {dashboard.error && <p role="alert" className="text-amber-200">{dashboard.error}</p>}
    <SectionCard title="Ritmo de la semana"><WeeklyChart noun="respuestas" week={dashboard.weeklyProblems} /></SectionCard>
    <SectionCard title="Actividad reciente">{dashboard.activity.length ? <ul>{dashboard.activity.map((item) => <ActivityRow key={item.id} item={item} />)}</ul> : <EmptyState icon="📘" title="Sin actividad todavía" text="Las clases y los repasos aparecerán aquí al comenzar." />}</SectionCard>
    <Link href={`/panel/archivo/${childId}`} className="inline-flex min-h-11 items-center text-sm text-slate-400 underline">Consultar el historial de actividades anteriores</Link>
  </div>;
}
