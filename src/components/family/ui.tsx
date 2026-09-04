"use client";

import { useId, type ReactNode } from "react";
import { Lock, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Avatar } from "@/components/world/Avatar";
import type { ActivityItem } from "@/lib/family/useChildDashboard";
import type { Trend, WorldStatus } from "@/lib/family/useChildDashboard";
import { useFamily } from "./FamilyProvider";

/**
 * Kit de UI del panel familiar: puerto directo de los componentes puros del
 * prototipo de referencia (mismo nombre/props donde tiene sentido), con sus
 * clases de tokens oklch traducidas a lo que ya usa el resto de la app
 * (`.family-panel`/`.family-tile` + paleta slate/violeta/ámbar — ver el plan
 * de esta sesión para la tabla de equivalencias).
 */

export function SectionCard({
  title,
  icon,
  action,
  children,
  className = "",
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={`family-panel rounded-2xl p-4 sm:p-5 ${className}`}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2
          id={headingId}
          className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-[0.14em] text-slate-400"
        >
          {icon}
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function StatTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <div className="family-panel flex items-center gap-3 rounded-2xl p-3.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-800/60">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-lg font-bold leading-tight text-white">{value}</span>
        <span className="block text-xs text-slate-400">
          {label}
          {sub ? ` · ${sub}` : ""}
        </span>
      </span>
    </div>
  );
}

const TONE_CLASS: Record<"accent" | "energy" | "success" | "primary", string> = {
  accent: "bg-cyan-400",
  energy: "bg-orange-400",
  success: "bg-emerald-400",
  primary: "bg-gradient-to-r from-violet-500 to-fuchsia-500",
};

/** Barra de progreso accesible con tonos semánticos. */
export function Bar({
  value,
  max = 100,
  label,
  tone = "accent",
  className = "",
}: {
  value: number;
  max?: number;
  label: string;
  tone?: "accent" | "energy" | "success" | "primary";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={`h-2 w-full overflow-hidden rounded-full bg-slate-800/80 ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${TONE_CLASS[tone]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Barra de dominio con marca del umbral de mastery (85 %). */
export function MasteryBar({ value, label }: { value: number; label: string }) {
  const tone = value >= 85 ? "success" : value >= 60 ? "accent" : "energy";
  return (
    <div className="relative">
      <Bar value={value} label={label} tone={tone} />
      <span aria-hidden="true" className="absolute inset-y-0 w-0.5 bg-white/50" style={{ left: "85%" }} />
    </div>
  );
}

export function TrendChip({ trend }: { trend: Trend }) {
  const Icon = trend === "sube" ? TrendingUp : trend === "baja" ? TrendingDown : Minus;
  const cls = trend === "sube" ? "text-emerald-300" : trend === "baja" ? "text-orange-300" : "text-slate-400";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${cls}`}>
      <Icon className="size-3.5" aria-hidden="true" />
      {trend}
    </span>
  );
}

export function StatusPill({ status }: { status: WorldStatus }) {
  const map: Record<WorldStatus, { text: string; cls: string }> = {
    completado: { text: "Completado", cls: "bg-emerald-500/15 text-emerald-300" },
    "en-curso": { text: "En curso", cls: "bg-cyan-500/15 text-cyan-300" },
    bloqueado: { text: "Bloqueado", cls: "bg-slate-800 text-slate-500" },
  };
  const it = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${it.cls}`}
    >
      {status === "bloqueado" && <Lock className="size-3" aria-hidden="true" />}
      {it.text}
    </span>
  );
}

/** Gráfico semanal: problemas resueltos por día (no minutos — no hay dato
 * real de tiempo de práctica). Sin barra de "objetivo": no hay una meta
 * semanal real que mostrar. */
export function WeeklyChart({ week }: { week: { day: string; problems: number }[] }) {
  const maxProblems = Math.max(5, ...week.map((d) => d.problems));
  const totalProblems = week.reduce((acc, d) => acc + d.problems, 0);
  return (
    <div>
      <div
        className="flex h-28 items-end gap-2"
        role="img"
        aria-label={`Problemas resueltos por día esta semana: ${week
          .map((d) => `${d.day} ${d.problems}`)
          .join(", ")}. Total ${totalProblems} problemas.`}
      >
        {week.map((d, i) => (
          <div key={`${d.day}-${i}`} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <div className="flex h-20 w-full items-end">
              <div
                className={`w-full rounded-t-md transition-[height] duration-500 ${
                  d.problems === 0 ? "h-1 bg-slate-800" : "bg-violet-500/80"
                }`}
                style={d.problems > 0 ? { height: `${(d.problems / maxProblems) * 100}%` } : undefined}
              />
            </div>
            <span className="text-[10px] font-bold uppercase text-slate-400">{d.day}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">{totalProblems} problemas esta semana</p>
    </div>
  );
}

const ACTIVITY_ICON: Record<ActivityItem["kind"], string> = {
  practica: "⚡",
  insignia: "🏅",
  canje: "🎁",
};

export function ActivityRow({ item, childName }: { item: ActivityItem; childName?: string }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span aria-hidden="true" className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-slate-800/60">
        {ACTIVITY_ICON[item.kind]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-snug text-slate-100">
          {childName ? `${childName} · ` : ""}
          {item.text}
        </span>
        <span className="mt-0.5 block text-xs text-slate-400">
          {new Date(item.when).toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </span>
      </span>
    </li>
  );
}

export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-indigo-500/25 px-4 py-8 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-slate-800/60 text-slate-400">{icon}</span>
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="max-w-xs text-xs text-slate-400">{text}</p>
    </div>
  );
}

export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" className="space-y-3">
      <span className="sr-only">Cargando datos del perfil…</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} aria-hidden="true" className="space-y-1.5">
          <div className="skeleton-block h-3.5 w-2/5" />
          <div className="skeleton-block h-2.5 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Selector de hijo (oculto si el padre solo tiene un perfil). */
export function ChildSwitcher() {
  const { children, selectedChildId, setSelectedChildId } = useFamily();
  if (children.length < 2) return null;
  return (
    <div role="group" aria-label="Elegir hijo" className="family-panel flex items-center gap-1 rounded-full p-1">
      {children.map((c) => {
        const selected = c.id === selectedChildId;
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={selected}
            onClick={() => setSelectedChildId(c.id)}
            className={`flex min-h-9 items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold transition-colors ${
              selected ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Avatar variant="headshot" title={c.name} className="size-6 rounded-full border border-indigo-500/30" />
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
