"use client";

import Link from "next/link";
import { Check, Flame, Play, Star, Swords, UserRoundPlus } from "lucide-react";
import { useFamily, type ChildDoc } from "@/components/family/FamilyProvider";
import { useChildDashboard } from "@/lib/family/useChildDashboard";
import { ageFromBirthDate } from "@/lib/family/age";
import { Avatar } from "@/components/world/Avatar";

export default function HijosPage() {
  const { children, loadingChildren } = useFamily();

  if (loadingChildren) {
    return (
      <p role="status" className="text-indigo-200">
        Cargando…
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Hijos</h1>
        <p className="mt-1 text-sm text-slate-400">
          El hijo seleccionado se usa en Resumen, Progreso y Recompensas.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {children.map((c) => (
          <ChildCard key={c.id} child={c} />
        ))}

        <Link
          href="/perfiles"
          className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-indigo-500/30 p-4 text-center text-slate-400 transition-colors hover:border-indigo-400/60 hover:text-white"
        >
          <span className="grid size-11 place-items-center rounded-full bg-slate-800/60">
            <UserRoundPlus className="size-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-bold">Añadir perfil</p>
          <p className="max-w-52 text-xs">Crea un nuevo perfil desde la pantalla de perfiles.</p>
        </Link>
      </div>
    </div>
  );
}

function ChildCard({ child }: { child: ChildDoc }) {
  const { parentId, selectedChildId, setSelectedChildId } = useFamily();
  const dashboard = useChildDashboard(parentId, child.id);
  const selected = selectedChildId === child.id;
  const age = ageFromBirthDate(child.birthDate);

  return (
    <article
      className={`family-tile relative rounded-2xl p-4 ${selected ? "ring-1 ring-cyan-400/50" : ""}`}
    >
      {selected && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-cyan-300">
          <Check className="size-3" aria-hidden="true" />
          Seleccionado
        </span>
      )}

      <header className="flex items-center gap-3">
        <Avatar
          variant="headshot"
          title={child.name}
          className="size-16 shrink-0 rounded-full border-2 border-indigo-500/25"
        />
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold leading-tight text-white">{child.name}</h2>
          {age !== null && <p className="text-xs text-slate-400">{age} años</p>}
          <p className="mt-1 inline-flex rounded-full bg-slate-800/60 px-2.5 py-0.5 text-[11px] font-bold text-slate-200">
            Nivel {dashboard.level}
          </p>
        </div>
      </header>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        <li className="inline-flex items-center gap-1 rounded-full bg-slate-800/60 px-2.5 py-1 text-xs font-bold text-amber-300">
          <Star className="size-3.5" aria-hidden="true" />
          {dashboard.totalStars ?? "…"}
          <span className="sr-only">estrellas</span>
        </li>
        <li className="inline-flex items-center gap-1 rounded-full bg-slate-800/60 px-2.5 py-1 text-xs font-bold text-orange-300">
          <Flame className="size-3.5" aria-hidden="true" />
          {dashboard.streak} días
          <span className="sr-only">de racha</span>
        </li>
        <li className="inline-flex items-center gap-1 rounded-full bg-slate-800/60 px-2.5 py-1 text-xs font-bold text-slate-200">
          {dashboard.masteryGlobal} % dominio
        </li>
      </ul>

      <div className="mt-3 rounded-xl bg-slate-800/50 p-3">
        {dashboard.currentMission ? (
          <>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-cyan-300">
              <Swords className="size-3.5" aria-hidden="true" />
              {dashboard.currentMission.zoneName}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-100">
              <span aria-hidden="true">{dashboard.currentMission.icon} </span>
              {dashboard.currentMission.title}
            </p>
            <p className="mt-1 text-xs text-slate-400">{dashboard.currentMission.progressLabel}</p>
          </>
        ) : (
          <p className="text-sm font-semibold text-emerald-300">✓ Todas las misiones completadas</p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={selected}
          onClick={() => setSelectedChildId(child.id)}
          className={`flex min-h-11 flex-1 items-center justify-center rounded-xl border text-sm font-bold transition-colors ${
            selected
              ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-300"
              : "border-indigo-500/25 bg-slate-800/60 text-slate-100 hover:bg-slate-800"
          }`}
        >
          {selected ? "Seleccionado" : "Seleccionar"}
        </button>
        <Link
          href={`/panel/${child.id}`}
          className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-indigo-500/25 bg-slate-800/60 text-sm font-bold text-slate-100 transition-colors hover:bg-slate-800"
        >
          Ver detalle
        </Link>
        <Link
          href={`/jugar/${child.id}`}
          className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm font-bold text-white transition-colors hover:brightness-110"
        >
          <Play className="size-4" aria-hidden="true" />
          Jugar
        </Link>
      </div>
    </article>
  );
}
