"use client";

import { Brain, ChartLine, Map as MapIcon, Percent, Puzzle, Target } from "lucide-react";
import { useFamily } from "@/components/family/FamilyProvider";
import { useChildDashboard } from "@/lib/family/useChildDashboard";
import {
  Bar,
  ChildSwitcher,
  MasteryBar,
  SectionCard,
  SkeletonRows,
  StatTile,
  StatusPill,
  TrendChip,
  WeeklyChart,
} from "@/components/family/ui";

export default function ProgresoPage() {
  const { parentId, selectedChild, selectedChildId, loadingChildren } = useFamily();
  const dashboard = useChildDashboard(parentId, selectedChildId);

  if (loadingChildren) {
    return (
      <p role="status" className="text-indigo-200">
        Cargando…
      </p>
    );
  }

  if (!selectedChild) {
    return (
      <p className="text-sm text-slate-400">Todavía no hay perfiles de hijos creados.</p>
    );
  }

  const weeklyProblems = dashboard.weeklyProblems.reduce((acc, d) => acc + d.problems, 0);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Progreso</h1>
          <p className="mt-1 text-sm text-slate-400">
            Cómo avanza {selectedChild.name} en la aventura y en lo que aprende.
          </p>
        </div>
        <ChildSwitcher />
      </header>

      {dashboard.loading ? (
        <div className="family-panel rounded-2xl p-5">
          <SkeletonRows rows={4} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatTile
              icon={<Brain className="size-5 text-slate-100" aria-hidden="true" />}
              label="Dominio global"
              value={`${dashboard.masteryGlobal} %`}
            />
            <StatTile
              icon={<Puzzle className="size-5 text-cyan-300" aria-hidden="true" />}
              label="Problemas esta semana"
              value={weeklyProblems}
            />
            <StatTile
              icon={<Target className="size-5 text-emerald-300" aria-hidden="true" />}
              label="Acierto semanal"
              value={`${dashboard.weeklyAccuracy} %`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Dominio por hilo" icon={<Percent className="size-4" aria-hidden="true" />}>
              <ul className="space-y-3.5">
                {dashboard.strandRows.map((s) => (
                  <li key={s.slug}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-white">
                        <span aria-hidden="true">{s.emoji} </span>
                        {s.label}
                      </p>
                      <span className="flex items-center gap-2">
                        <TrendChip trend={s.trend} />
                        <span className="text-sm font-bold tabular-nums text-slate-200">{s.mastery} %</span>
                      </span>
                    </div>
                    <MasteryBar value={s.mastery} label={`${s.label}: ${s.mastery} % de dominio`} />
                  </li>
                ))}
              </ul>
              <p className="mt-3 rounded-lg bg-slate-800/50 px-3 py-2 text-xs text-slate-400">
                Un módulo se considera dominado al superar la línea del 85 % de aciertos en los últimos 12 intentos.
              </p>
            </SectionCard>

            <div className="space-y-4">
              <SectionCard title="Ritmo de la semana" icon={<ChartLine className="size-4" aria-hidden="true" />}>
                <WeeklyChart week={dashboard.weeklyProblems} />
              </SectionCard>

              <SectionCard title="Avance por mundos" icon={<MapIcon className="size-4" aria-hidden="true" />}>
                <ul className="space-y-4">
                  {dashboard.worlds.map((w) => (
                    <li key={w.id}>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-bold ${w.status === "bloqueado" ? "text-slate-500" : "text-white"}`}>
                          {w.title}
                        </p>
                        <StatusPill status={w.status} />
                      </div>
                      <Bar
                        value={w.done}
                        max={w.total}
                        label={`${w.title}: ${w.done} de ${w.total} objetivos`}
                        tone={w.status === "completado" ? "success" : w.status === "en-curso" ? "accent" : "primary"}
                        className="mt-1.5"
                      />
                      <p className="mt-1 text-xs text-slate-400">{w.zoneName}</p>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
