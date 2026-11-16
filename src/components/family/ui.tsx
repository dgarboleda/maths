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
    <section aria-labelledby={headingId} className={`family-panel rounded-2xl p-5 sm:p-6 ${className}`}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2
          id={headingId}
          className="flex items-center gap-2 text-sm font-medium text-slate-800"
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
    <div className="family-panel flex items-center gap-3 rounded-2xl p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100/80 text-slate-700">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-2xl font-bold leading-tight tracking-tight text-slate-900 tabular-nums">{value}</span>
        <span className="block text-xs text-slate-500">
          {label}
          {sub ? ` · ${sub}` : ""}
        </span>
      </span>
    </div>
  );
}

const TONE_CLASS: Record<"accent" | "energy" | "success" | "primary", string> = {
  accent: "bg-sky-500",
  energy: "bg-amber-500",
  success: "bg-emerald-500",
  primary: "bg-indigo-600",
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
      className={`h-2 w-full overflow-hidden rounded-full bg-slate-200/80 ${className}`}
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
      <span aria-hidden="true" className="absolute inset-y-0 w-0.5 bg-slate-900/40" style={{ left: "85%" }} />
    </div>
  );
}

export function TrendChip({ trend }: { trend: Trend }) {
  const Icon = trend === "sube" ? TrendingUp : trend === "baja" ? TrendingDown : Minus;
  const cls = trend === "sube" ? "text-emerald-700" : trend === "baja" ? "text-amber-700" : "text-slate-500";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${cls}`}>
      <Icon className="size-3.5" aria-hidden="true" />
      {trend}
    </span>
  );
}

export function StatusPill({ status }: { status: WorldStatus }) {
  const map: Record<WorldStatus, { text: string; cls: string }> = {
    completado: { text: "Completado", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200/60" },
    "en-curso": { text: "En curso", cls: "bg-sky-50 text-sky-700 border border-sky-200/60" },
    bloqueado: { text: "Bloqueado", cls: "bg-slate-100 text-slate-600 border border-slate-200/80" },
  };
  const it = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${it.cls}`}
    >
      {status === "bloqueado" && <Lock className="size-3" aria-hidden="true" />}
      {it.text}
    </span>
  );
}

/** Gráfico semanal: problemas resueltos por día (no minutos — no hay dato
 * real de tiempo de práctica). Sin barra de "objetivo": no hay una meta
 * semanal real que mostrar. */
/** Diferencia con la semana anterior, en palabras. */
export function weekComparison(total: number, previous: number | undefined, noun: string): string | null {
  if (previous === undefined) return null;
  if (previous === 0) return total ? `La semana anterior no hubo ${noun}.` : null;
  const diff = total - previous,
    pct = Math.round((Math.abs(diff) / previous) * 100);
  if (diff === 0) return `Igual que la semana anterior (${previous}).`;
  return `${diff > 0 ? "▲" : "▼"} ${Math.abs(diff)} ${diff > 0 ? "más" : "menos"} que la semana anterior (${previous}; ${diff > 0 ? "+" : "−"}${pct} %).`;
}

export function WeeklyChart({ week, noun = "problemas", previousTotal }: {
  week: { day: string; problems: number }[];
  noun?: string;
  /** Total de la semana anterior, para comparar (si se conoce). */
  previousTotal?: number;
}) {
  const maxProblems = Math.max(5, ...week.map((d) => d.problems));
  const totalProblems = week.reduce((acc, d) => acc + d.problems, 0);
  const average = totalProblems / Math.max(1, week.length);
  const comparison = weekComparison(totalProblems, previousTotal, noun);
  const avgText = average.toLocaleString("es", { maximumFractionDigits: 1 });
  return (
    <div>
      <div
        className="relative flex h-32 items-end gap-2"
        role="img"
        aria-label={`${noun} por día esta semana: ${week
          .map((d) => `${d.day} ${d.problems}`)
          .join(", ")}. Total ${totalProblems} ${noun}; media ${avgText} por día.${comparison ? ` ${comparison}` : ""}`}
      >
        {totalProblems > 0 && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-5 h-20">
            <div className="absolute inset-x-0 border-t border-dashed border-amber-500/70" style={{ bottom: `${(average / maxProblems) * 100}%` }}>
              <span className="absolute -top-4 right-0 text-[10px] font-bold text-amber-700">media {avgText}</span>
            </div>
          </div>
        )}
        {week.map((d, i) => (
          <div key={`${d.day}-${i}`} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span aria-hidden="true" className={`h-4 text-xs font-bold tabular-nums ${d.problems ? "text-slate-700" : "text-slate-400"}`}>{d.problems}</span>
            <div className="flex h-20 w-full items-end">
              <div
                className={`w-full rounded-t-md transition-[height] duration-500 motion-reduce:transition-none ${
                  d.problems === 0 ? "h-1 bg-slate-200" : "bg-indigo-600"
                }`}
                style={d.problems > 0 ? { height: `${(d.problems / maxProblems) * 100}%` } : undefined}
              />
            </div>
            <span className="text-xs font-semibold uppercase text-slate-500">{d.day}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500 tabular-nums">{totalProblems} {noun} esta semana{totalProblems ? ` · media ${avgText} por día` : ""}</p>
      {comparison && <p className="mt-1 text-xs font-semibold text-slate-600">{comparison}</p>}
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
      <span aria-hidden="true" className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100">
        {ACTIVITY_ICON[item.kind]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-snug text-slate-900">
          {childName ? `${childName} · ` : ""}
          {item.text}
        </span>
        {item.detail && <span className="mt-1 block text-xs text-slate-600">{item.detail}</span>}
        <span className="mt-0.5 block text-xs text-slate-500">
          {new Date(item.when).toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </span>
      </span>
    </li>
  );
}

export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-slate-100 text-slate-500">{icon}</span>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="max-w-xs text-xs text-slate-500">{text}</p>
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
            className={`flex min-h-9 items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold transition-colors ${
              selected ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Avatar variant="headshot" avatarId={c.avatarId} title={c.name} className="size-6 rounded-full border border-slate-200" />
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
