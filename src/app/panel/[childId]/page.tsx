"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Brain, ChartLine, Flame, History, Map as MapIcon, Medal, Play, Star, Target } from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useFamily } from "@/components/family/FamilyProvider";
import { useChildDashboard } from "@/lib/family/useChildDashboard";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile, Placement, SkillProgress } from "@/lib/types";
import { getStrand, STRANDS } from "@/lib/strands";
import { allModules, isMastered, isUnlocked, missingPrerequisites } from "@/lib/curriculum";
import { moduleForTier } from "@/lib/placement";
import { getPisaCategory, gradeLabel, PISA_LEVELS } from "@/lib/pisa";
import { ageFromBirthDate } from "@/lib/family/age";
import { Avatar } from "@/components/world/Avatar";
import {
  ActivityRow,
  Bar,
  EmptyState,
  MasteryBar,
  SectionCard,
  SkeletonRows,
  StatusPill,
  TrendChip,
  WeeklyChart,
} from "@/components/family/ui";

const STRAND_COLORS: Record<string, string> = {
  aritmetica: "border-violet-400/30 bg-violet-500/15 text-violet-200",
  algebra: "border-pink-400/30 bg-pink-500/15 text-pink-200",
  geometria: "border-sky-400/30 bg-sky-500/15 text-sky-200",
  medicion: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200",
  logica: "border-amber-400/30 bg-amber-500/15 text-amber-200",
};

interface PlacementDoc extends Placement {
  id: string;
}

export default function ChildDetailPage() {
  const { user } = useAuth();
  const { parentId, setSelectedChildId } = useFamily();
  const params = useParams<{ childId: string }>();
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
  const [evaluaciones, setEvaluaciones] = useState<PlacementDoc[]>([]);
  const dashboard = useChildDashboard(parentId, params.childId);

  useEffect(() => {
    setSelectedChildId(params.childId);
  }, [params.childId, setSelectedChildId]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const {
        db,
        firestore: { collection, doc, getDoc, getDocs, orderBy, query },
      } = await getFirebase();
      if (cancelled) return;
      const childSnap = await getDoc(doc(db, "parents", user.uid, "children", params.childId));
      if (cancelled || !childSnap.exists()) return;
      setChild(childSnap.data() as ChildProfile);

      const progressSnap = await getDocs(
        collection(db, "parents", user.uid, "children", params.childId, "skillsProgress"),
      );
      if (cancelled) return;
      const map: Record<string, SkillProgress> = {};
      progressSnap.forEach((d) => (map[d.id] = d.data() as SkillProgress));
      setProgressBySkill(map);

      const placementsSnap = await getDocs(
        query(
          collection(db, "parents", user.uid, "children", params.childId, "placements"),
          orderBy("completedAt", "desc"),
        ),
      );
      if (cancelled) return;
      setEvaluaciones(placementsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Placement) })));
    })().catch((err) => console.error("No se pudo cargar el progreso", err));
    return () => {
      cancelled = true;
    };
  }, [user, params.childId]);

  if (!child) {
    return (
      <p role="status" className="text-indigo-200">
        Cargando…
      </p>
    );
  }

  const tiers = [...new Set(allModules().map((m) => m.tier))].sort((a, b) => a - b);
  const age = ageFromBirthDate(child.birthDate);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/panel/hijos"
        className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full px-1 text-sm font-semibold text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Hijos
      </Link>

      <header className="family-panel flex flex-wrap items-center gap-4 rounded-2xl p-4 sm:p-5">
        <Avatar
          variant="headshot"
          title={child.name}
          className="size-20 shrink-0 rounded-full border-2 border-cyan-400/40"
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold leading-tight text-white">{child.name}</h1>
          {age !== null && <p className="text-sm text-slate-400">{age} años</p>}
          <ul className="mt-2 flex flex-wrap gap-1.5">
            <li className="inline-flex items-center gap-1 rounded-full bg-slate-800/60 px-2.5 py-1 text-xs font-bold text-slate-200">
              Nivel {dashboard.level}
            </li>
            <li className="inline-flex items-center gap-1 rounded-full bg-slate-800/60 px-2.5 py-1 text-xs font-bold text-amber-300">
              <Star className="size-3.5" aria-hidden="true" />
              {dashboard.totalStars ?? "…"}
              <span className="sr-only">estrellas</span>
            </li>
            <li className="inline-flex items-center gap-1 rounded-full bg-slate-800/60 px-2.5 py-1 text-xs font-bold text-orange-300">
              <Flame className="size-3.5" aria-hidden="true" />
              {dashboard.streak} días de racha
            </li>
            <li className="inline-flex items-center gap-1 rounded-full bg-slate-800/60 px-2.5 py-1 text-xs font-bold text-cyan-300">
              <Target className="size-3.5" aria-hidden="true" />
              {dashboard.weeklyAccuracy} % de acierto
            </li>
          </ul>
        </div>
        <Link
          href={`/jugar/${params.childId}`}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 text-sm font-bold text-white transition-colors hover:brightness-110"
        >
          <Play className="size-4" aria-hidden="true" />
          Jugar como {child.name}
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Mundos" icon={<MapIcon className="size-4" aria-hidden="true" />}>
          <ul className="space-y-4">
            {dashboard.worlds.map((w) => (
              <li key={w.id}>
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-bold ${w.status === "bloqueado" ? "text-slate-500" : "text-white"}`}>
                    <span aria-hidden="true">{w.icon} </span>
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
                <p className="mt-1 text-xs text-slate-400">
                  {w.zoneName} · {w.done} de {w.total} objetivos
                </p>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Dominio por hilo" icon={<Brain className="size-4" aria-hidden="true" />}>
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
            La línea marca el umbral de dominio (85 % de aciertos en los últimos 12 intentos).
          </p>
        </SectionCard>

        <SectionCard title="Insignias" icon={<Medal className="size-4" aria-hidden="true" />}>
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {dashboard.badges.map((b) => (
              <li
                key={b.id}
                className={`rounded-xl border p-3 ${
                  b.unlocked ? "border-amber-400/30 bg-amber-500/10" : "border-indigo-500/15 bg-slate-800/40"
                }`}
              >
                {b.image ? (
                  <Image src={b.image} alt="" aria-hidden="true" width={24} height={24} className="size-6" />
                ) : (
                  <span aria-hidden="true" className="text-xl">
                    {b.emoji}
                  </span>
                )}
                <p className={`mt-2 text-sm font-bold leading-tight ${b.unlocked ? "text-amber-200" : "text-slate-500"}`}>
                  {b.label}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{b.description}</p>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Actividad reciente" icon={<History className="size-4" aria-hidden="true" />}>
          {dashboard.activity.length === 0 ? (
            <EmptyState
              icon={<History className="size-5" aria-hidden="true" />}
              title="Sin actividad todavía"
              text="Cuando practique, la actividad aparecerá aquí."
            />
          ) : (
            <ul className="divide-y divide-indigo-500/15">
              {dashboard.activity.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Ritmo de la semana" icon={<ChartLine className="size-4" aria-hidden="true" />}>
        {dashboard.loading ? <SkeletonRows rows={3} /> : <WeeklyChart week={dashboard.weeklyProblems} />}
      </SectionCard>

      <section aria-label="Evaluaciones de ubicación" className="family-panel flex flex-col gap-3 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Evaluaciones de ubicación</h2>
          <Link
            href={`/jugar/${params.childId}/evaluacion`}
            className="text-sm font-semibold text-cyan-300 underline-offset-2 hover:underline"
          >
            {evaluaciones.length > 0 ? "Volver a evaluar" : "Hacer la evaluación inicial"}
          </Link>
        </div>

        {evaluaciones.length === 0 ? (
          <p className="text-sm text-slate-400">
            Todavía no se ha hecho ninguna evaluación de ubicación. Sirve como línea base para medir el avance con el
            tiempo.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {evaluaciones.map((ev) => (
              <li key={ev.id} className="rounded-xl border border-indigo-500/20 bg-slate-900/50 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-white">
                    {ev.completedAt ? new Date(ev.completedAt).toLocaleDateString("es") : "…"}
                  </span>
                  <span className="font-bold text-violet-300">
                    {ev.overallGradeBand} ({ev.overallScore}/100)
                  </span>
                </div>
                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-slate-400">
                  {STRANDS.map((s) => {
                    const r = ev.perStrand[s.slug];
                    if (!r) return null;
                    return (
                      <span key={s.slug}>
                        {s.emoji} {r.gradeBand}
                      </span>
                    );
                  })}
                </p>
                {STRANDS.some((s) => ev.perStrand[s.slug]?.weakTiers?.length) && (
                  <p className="mt-1 text-xs text-amber-300">
                    Puntos de mejora:{" "}
                    {STRANDS.flatMap((s) => {
                      const r = ev.perStrand[s.slug];
                      if (!r?.weakTiers?.length) return [];
                      const labels = r.weakTiers
                        .map((tier) => moduleForTier(s.slug, tier)?.label)
                        .filter((label): label is string => Boolean(label));
                      return labels.length ? [`${s.emoji} ${labels.join(", ")}`] : [];
                    }).join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-bold text-white">Currícula completa</h2>
        <p className="text-sm text-slate-400">
          Los temas se agrupan por grado escolar de referencia, y cada uno indica su área y nivel en la escala de PISA.
          Un tema se desbloquea cuando se dominan todos sus prerrequisitos (mostrados entre paréntesis cuando está
          bloqueado), sin importar de qué materia vengan.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {tiers.map((tier) => (
          <section key={tier} aria-label={gradeLabel(tier)} className="flex flex-col gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wide text-indigo-300">{gradeLabel(tier)}</h2>
            <ul className="flex flex-col gap-1">
              {allModules()
                .filter((m) => m.tier === tier)
                .map((mod) => {
                const mastered = isMastered(progressBySkill, mod.id);
                const viaPlacement = progressBySkill[mod.id]?.masteredVia === "placement";
                const unlocked = isUnlocked(progressBySkill, mod.id);
                const missing = missingPrerequisites(progressBySkill, mod.id);
                const strandLabel = getStrand(mod.strandSlug)?.label ?? mod.strandSlug;
                const pisaCategory = mod.pisa ? getPisaCategory(mod.pisa.category) : undefined;
                return (
                  <li
                    key={mod.id}
                    className="family-tile flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-bold ${STRAND_COLORS[mod.strandSlug] ?? "border-indigo-500/20 bg-slate-800 text-slate-300"}`}
                      >
                        {strandLabel}
                      </span>
                      <span className="font-semibold text-white">
                        {mod.emoji} {mod.label}
                      </span>
                      {mod.pisa && pisaCategory && (
                        <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-200">
                          <span aria-hidden="true">{pisaCategory.emoji} </span>
                          PISA {PISA_LEVELS[mod.pisa.level].code}
                          <span className="sr-only"> · {pisaCategory.label}</span>
                        </span>
                      )}
                    </span>
                    {mastered ? (
                      <span className="font-bold text-emerald-300">
                        ✓ Dominado{viaPlacement ? " (evaluación inicial)" : ""}
                      </span>
                    ) : unlocked ? (
                      <span className="font-bold text-violet-300">▶ Desbloqueado</span>
                    ) : (
                      <span className="text-slate-500">🔒 Bloqueado (falta: {missing.map((m) => m.label).join(", ")})</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
