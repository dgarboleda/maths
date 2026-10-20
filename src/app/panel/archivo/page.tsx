"use client";

import Link from "next/link";
import { useFamily } from "@/components/family/FamilyProvider";
import { BackupPanel } from "@/components/family/BackupPanel";
import { SectionCard } from "@/components/family/ui";

export default function PreviousActivitiesPage() {
  const { parentId, children, selectedChild } = useFamily();
  return <div className="space-y-5">
    <header><h1 className="font-display text-2xl font-bold text-white">Archivo de actividades anteriores</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">Aquí se conservan las creaciones y los resultados del recorrido anterior. Sus porcentajes y evaluaciones no acreditan las clases del programa actual. Para acompañar el aprendizaje, utiliza Progreso y Plan de estudio.</p></header>
    <div className="flex flex-wrap gap-3"><Link href="/panel/progreso" className="inline-flex min-h-11 items-center text-cyan-200 underline">Ver progreso actual</Link><Link href="/panel/plan" className="inline-flex min-h-11 items-center text-cyan-200 underline">Plan de estudio</Link></div>
    <SectionCard title="Creaciones anteriores"><ul className="space-y-2">{[
      ["/panel/editor", "Niveles creados"], ["/panel/editor/mundo", "Mundo y avatares personalizados"], ["/panel/curriculum", "Ejercicios personalizados"],
    ].map(([href, label]) => <li key={href}><Link href={href} className="inline-flex min-h-11 items-center text-slate-200 underline">{label}</Link></li>)}</ul></SectionCard>
    <SectionCard title="Historial anterior de cada perfil"><ul>{children.map((child) => <li key={child.id}><Link href={`/panel/archivo/${child.id}`} className="inline-flex min-h-11 items-center text-slate-200 underline">Historial anterior de {child.name}</Link></li>)}</ul></SectionCard>
    {selectedChild && <SectionCard title="Jugar a las actividades anteriores"><p className="mb-3 text-sm text-slate-400">Compatibilidad con mundos y ejercicios ya creados; sus resultados se registran por separado.</p><Link href={`/jugar/${selectedChild.id}/mapa-anterior`} className="inline-flex min-h-11 items-center text-cyan-200 underline">Abrir el mundo anterior de {selectedChild.name}</Link></SectionCard>}
    {parentId && <SectionCard title="Respaldo de creaciones anteriores"><p className="mb-4 text-sm text-slate-400">Este archivo incluye mundos, niveles, ejercicios y referencias a imágenes. No incluye perfiles ni el avance de las clases y repasos.</p><BackupPanel parentId={parentId} /></SectionCard>}
  </div>;
}
