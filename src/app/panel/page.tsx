"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, ChartLine, Flame, History, Play, Star, Swords } from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useFamily, type ChildDoc } from "@/components/family/FamilyProvider";
import { useChildDashboard, type ChildDashboard } from "@/lib/family/useChildDashboard";
import {
  ActivityRow,
  ChildSwitcher,
  EmptyState,
  SectionCard,
  SkeletonRows,
  WeeklyChart,
} from "@/components/family/ui";
import { Avatar } from "@/components/world/Avatar";

const DAY_MS = 86_400_000;

interface AlertItem {
  id: string;
  icon: string;
  text: string;
}

function buildAlerts(children: ChildDoc[], dashboards: Record<string, ChildDashboard>): AlertItem[] {
  const alerts: AlertItem[] = [];
  const now = Date.now();
  for (const c of children) {
    const d = dashboards[c.id];
    if (!d) continue;
    if (d.daysSinceLastAttempt !== null && d.daysSinceLastAttempt >= 3) {
      alerts.push({
        id: `inactividad-${c.id}`,
        icon: "⚠️",
        text: `${c.name} lleva ${d.daysSinceLastAttempt} días sin practicar.`,
      });
    }
    const recentBadge = d.badges.find(
      (b) => b.unlocked && b.earnedAt !== null && now - b.earnedAt < 7 * DAY_MS,
    );
    if (recentBadge) {
      alerts.push({
        id: `insignia-${c.id}-${recentBadge.id}`,
        icon: "🏅",
        text: `${c.name} desbloqueó la insignia «${recentBadge.label}».`,
      });
    }
    if (d.pendingRedemptions.length > 0) {
      const r = d.pendingRedemptions[0];
      alerts.push({
        id: `canje-${c.id}`,
        icon: "🎁",
        text: `${c.name} tiene un canje pendiente: «${r.rewardLabel}» · ${r.starsSpent} ★.`,
      });
    }
  }
  return alerts;
}

export default function PanelPage() {
  const { user } = useAuth();
  const { parentId, children, loadingChildren, selectedChildId } = useFamily();
  const [dashboards, setDashboards] = useState<Record<string, ChildDashboard>>({});

  const handleDashboard = useCallback((childId: string, dashboard: ChildDashboard) => {
    setDashboards((prev) => (prev[childId] === dashboard ? prev : { ...prev, [childId]: dashboard }));
  }, []);

  const greeting = user?.email ? user.email.split("@")[0] : "";
  const alerts = useMemo(() => buildAlerts(children, dashboards), [children, dashboards]);
  const recentActivity = useMemo(
    () =>
      children
        .flatMap((c) => (dashboards[c.id]?.activity ?? []).slice(0, 2).map((item) => ({ item, name: c.name })))
        .sort((a, b) => b.item.when - a.item.when)
        .slice(0, 6),
    [children, dashboards],
  );
  const selectedDashboard = selectedChildId ? dashboards[selectedChildId] : undefined;

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
        <h1 className="family-text-glow font-display text-2xl font-bold text-white sm:text-3xl">
          {greeting ? `Hola, ${greeting}` : "Panel familiar"}
        </h1>
        <p className="mt-1 text-sm text-slate-400">Esto es lo que ha pasado en Math Quest esta semana.</p>
      </header>

      {children.length === 0 ? (
        <EmptyState
          icon={<Star className="size-5" aria-hidden="true" />}
          title="Todavía no hay perfiles"
          text="Crea el primer perfil desde «Perfiles» para ver aquí su progreso."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {children.map((c) => (
              <ChildResumenEntry key={c.id} parentId={parentId} child={c} onDashboard={handleDashboard} />
            ))}
          </div>

          <SectionCard title="Avisos" icon={<Bell className="size-4" aria-hidden="true" />}>
            {alerts.length === 0 ? (
              <EmptyState
                icon={<Bell className="size-5" aria-hidden="true" />}
                title="Sin avisos"
                text="Todo tranquilo por ahora."
              />
            ) : (
              <ul className="divide-y divide-indigo-500/15">
                {alerts.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 py-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-slate-800/60"
                    >
                      {a.icon}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-slate-100">
                      {a.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="Ritmo de la semana"
              icon={<ChartLine className="size-4" aria-hidden="true" />}
              action={<ChildSwitcher />}
            >
              {selectedDashboard ? <WeeklyChart week={selectedDashboard.weeklyProblems} /> : <SkeletonRows rows={3} />}
            </SectionCard>

            <SectionCard title="Actividad reciente" icon={<History className="size-4" aria-hidden="true" />}>
              {recentActivity.length === 0 ? (
                <EmptyState
                  icon={<History className="size-5" aria-hidden="true" />}
                  title="Todavía no hay actividad."
                  text="Cuando jueguen, la actividad aparecerá aquí."
                />
              ) : (
                <ul className="divide-y divide-indigo-500/15">
                  {recentActivity.map(({ item, name }) => (
                    <ActivityRow key={item.id} item={item} childName={name} />
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}

function ChildResumenEntry({
  parentId,
  child,
  onDashboard,
}: {
  parentId: string | undefined;
  child: ChildDoc;
  onDashboard: (childId: string, dashboard: ChildDashboard) => void;
}) {
  const dashboard = useChildDashboard(parentId, child.id);

  useEffect(() => {
    onDashboard(child.id, dashboard);
  }, [child.id, dashboard, onDashboard]);

  return (
    <section aria-label={`Progreso de ${child.name}`} className="family-tile rounded-2xl p-4">
      <header className="flex items-center gap-3">
        <Avatar
          variant="headshot"
          title={child.name}
          className="size-14 shrink-0 rounded-full border-2 border-indigo-500/30"
        />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold leading-tight text-white">{child.name}</h2>
          <p className="text-xs text-slate-400">Nivel {dashboard.level}</p>
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

      <div className="mt-3 flex gap-2">
        <Link
          href={`/panel/${child.id}`}
          className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-indigo-500/25 bg-slate-800/60 text-sm font-bold text-slate-100 transition-colors hover:bg-slate-800"
        >
          Ver perfil
        </Link>
        <Link
          href={`/jugar/${child.id}`}
          className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm font-bold text-white transition-colors hover:brightness-110"
        >
          <Play className="size-4" aria-hidden="true" />
          Jugar
        </Link>
      </div>
    </section>
  );
}
