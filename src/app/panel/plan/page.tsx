"use client";

import { useFamily } from "@/components/family/FamilyProvider";
import { ChildSwitcher } from "@/components/family/ui";
import { StudyPlanEditor } from "@/components/family/StudyPlanEditor";

export default function StudyPlanPage() {
  const { parentId, selectedChild, loadingChildren } = useFamily();
  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-display text-2xl font-bold text-white">Plan de estudio</h1><p className="mt-2 text-sm text-slate-400">Clases y objetivos del programa de matemáticas.</p></div><ChildSwitcher /></header>
    {loadingChildren ? <p role="status">Cargando perfiles…</p> : parentId && selectedChild ? <StudyPlanEditor key={selectedChild.id} parentId={parentId} child={selectedChild} /> : <p>Crea un perfil para preparar su plan.</p>}
  </div>;
}
