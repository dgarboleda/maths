"use client";

import Link from "next/link";
import { Check, Flame, Play, Star, UserRoundPlus } from "lucide-react";
import { useFamily, type ChildDoc } from "@/components/family/FamilyProvider";
import { useLearningDashboard } from "@/lib/family/useLearningDashboard";
import { LESSONS } from "@/lib/learning/domain";
import { ageFromBirthDate } from "@/lib/family/age";
import { Avatar } from "@/components/world/Avatar";

export default function HijosPage() {
  const { children, loadingChildren } = useFamily();

  if (loadingChildren) {
    return (
      <p role="status" className="text-slate-600">
        Cargando…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Hijos</h1>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          El hijo seleccionado se usa en Resumen, Progreso y Recompensas.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {children.map((c) => (
          <ChildCard key={c.id} child={c} />
        ))}

        <Link
          href="/perfiles"
          className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 text-center text-slate-500 transition-colors hover:border-indigo-400 hover:bg-white hover:text-slate-900"
        >
          <span className="grid size-11 place-items-center rounded-full bg-slate-100 text-slate-600">
            <UserRoundPlus className="size-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold text-slate-900">Añadir perfil</p>
          <p className="max-w-52 text-xs text-slate-500">Crea un nuevo perfil desde la pantalla de perfiles.</p>
        </Link>
      </div>
    </div>
  );
}

function ChildCard({ child }: { child: ChildDoc }) {
  const { selectedChildId, setSelectedChildId } = useFamily();
  const dashboard = useLearningDashboard(child.id);
  const selected = selectedChildId === child.id;
  const age = ageFromBirthDate(child.birthDate);

  return (
    <article
      className={`family-tile relative rounded-2xl p-5 sm:p-6 ${selected ? "ring-2 ring-indigo-600/30" : ""}`}
    >
      {selected && (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-indigo-200/60 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
          <Check className="size-3" aria-hidden="true" />
          Seleccionado
        </span>
      )}

      <header className="flex items-center gap-3">
        <Avatar
          variant="headshot"
          title={child.name}
          avatarId={child.avatarId}
          className="size-16 shrink-0 rounded-full border-2 border-slate-200"
        />
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold leading-tight text-slate-900">{child.name}</h2>
          {age !== null && <p className="text-xs text-slate-500 tabular-nums">{age} años</p>}
          <p className="mt-1 inline-flex rounded-full border border-slate-200/80 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 tabular-nums">
            {dashboard.completed} de {LESSONS.length} clases
          </p>
        </div>
      </header>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        <li className="inline-flex items-center gap-1 rounded-full border border-amber-200/60 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 tabular-nums">
          <Star className="size-3.5" aria-hidden="true" />
          {dashboard.totalStars ?? "…"}
          <span className="sr-only">estrellas</span>
        </li>
        <li className="inline-flex items-center gap-1 rounded-full border border-orange-200/60 bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700 tabular-nums">
          <Flame className="size-3.5" aria-hidden="true" />
          {dashboard.streak} días
          <span className="sr-only">de racha de repaso</span>
        </li>
        <li className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 tabular-nums">
          {dashboard.autonomous} comprobaciones autónomas
        </li>
      </ul>

      <p className="mt-3 text-sm font-medium text-indigo-600">Siguiente idea: {dashboard.nextLesson.title}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={selected}
          onClick={() => setSelectedChildId(child.id)}
          className={`flex min-h-11 flex-1 items-center justify-center rounded-xl border text-sm font-semibold transition-colors ${
            selected
              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {selected ? "Seleccionado" : "Seleccionar"}
        </button>
        <Link
          href={`/panel/${child.id}`}
          className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Ver detalle
        </Link>
        <Link
          href={`/jugar/${child.id}`}
          className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          <Play className="size-4" aria-hidden="true" />
          Jugar
        </Link>
      </div>
    </article>
  );
}
