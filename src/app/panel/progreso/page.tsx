"use client";

import Link from "next/link";
import { useFamily } from "@/components/family/FamilyProvider";
import { ActivityRow, ChildSwitcher, EmptyState, SectionCard, WeeklyChart } from "@/components/family/ui";
import { LearningReport } from "@/components/learning/LearningReport";
import { useLearningDashboard } from "@/lib/family/useLearningDashboard";

export default function ProgresoPage() {
  const { selectedChild, loadingChildren } = useFamily();
  const dashboard = useLearningDashboard(selectedChild?.id ?? "");
  if (loadingChildren) return <p role="status">Cargando perfiles…</p>;
  if (!selectedChild) return <EmptyState icon="📘" title="Todavía no hay perfiles" text="Crea un perfil para acompañar su aprendizaje." />;
  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-display text-2xl font-bold text-white">Progreso</h1><p className="mt-2 text-sm text-slate-400">Clases, práctica con apoyo, autonomía y repaso de {selectedChild.name}.</p></div><ChildSwitcher /></header>
    <LearningReport key={selectedChild.id} childId={selectedChild.id} childName={selectedChild.name} />
    {dashboard.error && <p role="alert" className="text-amber-200">{dashboard.error}</p>}
    <SectionCard title="Ritmo de la semana"><WeeklyChart noun="respuestas" week={dashboard.weeklyProblems} /></SectionCard>
    <SectionCard title="Actividad reciente">{dashboard.activity.length ? <ul>{dashboard.activity.map((item) => <ActivityRow key={item.id} item={item} />)}</ul> : <p className="text-sm text-slate-400">Cuando comience una clase o un repaso, su actividad aparecerá aquí.</p>}</SectionCard>
    <Link href={`/panel/archivo/${selectedChild.id}`} className="inline-flex min-h-11 items-center text-sm text-slate-400 underline">Consultar el historial de actividades anteriores</Link>
  </div>;
}
