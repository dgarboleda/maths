"use client";

import { useFamily } from "@/components/family/FamilyProvider";
import { ChildSwitcher } from "@/components/family/ui";
import { StudyPlanEditor } from "@/components/family/StudyPlanEditor";

export default function StudyPlanPage() {
  const { parentId, selectedChild, loadingChildren } = useFamily();
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Plan de estudio</h1><p className="mt-1 text-xs text-slate-500 sm:text-sm">Clases y objetivos del programa de matemáticas.</p></div><ChildSwitcher /></header>
    {loadingChildren ? <p role="status" className="text-slate-600">Cargando perfiles…</p> : parentId && selectedChild ? <StudyPlanEditor key={selectedChild.id} parentId={parentId} child={selectedChild} /> : <p className="text-sm text-slate-600">Crea un perfil para preparar su plan.</p>}
  </div>;
}
