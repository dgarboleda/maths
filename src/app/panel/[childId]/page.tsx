"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile, Placement, SkillProgress } from "@/lib/types";
import { getStrand, STRANDS } from "@/lib/strands";
import { MODULES, isMastered, isUnlocked, missingPrerequisites } from "@/lib/curriculum";
import { moduleForTier } from "@/lib/placement";
import { BADGES } from "@/lib/badges";

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

export default function CurriculaPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string }>();
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
  const [evaluaciones, setEvaluaciones] = useState<PlacementDoc[]>([]);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

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
      setEvaluaciones(
        placementsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Placement) })),
      );

      const badgesSnap = await getDocs(
        collection(db, "parents", user.uid, "children", params.childId, "badges"),
      );
      if (cancelled) return;
      setEarnedBadgeIds(badgesSnap.docs.map((d) => d.id));
    })().catch((err) => console.error("No se pudo cargar el progreso", err));
    return () => {
      cancelled = true;
    };
  }, [user, params.childId]);

  if (loading || !user) {
    return (
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-indigo-200">
          Cargando…
        </p>
      </main>
    );
  }

  if (!child) {
    return (
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-indigo-200">
          Cargando…
        </p>
      </main>
    );
  }

  const tiers = [...new Set(MODULES.map((m) => m.tier))].sort((a, b) => a - b);

  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 bg-slate-950 px-6 py-10"
    >
      <div>
        <h1 className="family-text-glow font-display text-2xl font-bold text-white">Currícula de {child.name}</h1>
        <Link href="/panel" className="text-sm font-semibold text-indigo-300 underline-offset-2 hover:underline">
          ← Volver al panel
        </Link>
        <p className="mt-2 text-sm text-slate-400">
          Cada franja agrupa temas de nivel similar. Un tema se desbloquea cuando se dominan todos sus prerrequisitos
          (mostrados entre paréntesis cuando está bloqueado), sin importar de qué materia vengan.
        </p>
      </div>

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

      <section aria-label="Insignias" className="family-panel flex flex-col gap-3 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-white">Insignias</h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {BADGES.map((badge) => {
            const earned = earnedBadgeIds.includes(badge.id);
            return (
              <li
                key={badge.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm ${
                  earned ? "border-amber-400/30 bg-amber-500/10" : "border-indigo-500/15 text-slate-500"
                }`}
              >
                <span aria-hidden="true" className="text-xl">
                  {badge.emoji}
                </span>
                <span>
                  <span className={`block font-semibold ${earned ? "text-amber-200" : "text-slate-500"}`}>
                    {badge.label}
                  </span>
                  <span className="text-xs text-slate-400">{badge.description}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex flex-col gap-6">
        {tiers.map((tier) => (
          <section key={tier} aria-label={`Franja ${tier + 1}`} className="flex flex-col gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wide text-indigo-300">Franja {tier + 1}</h2>
            <ul className="flex flex-col gap-1">
              {MODULES.filter((m) => m.tier === tier).map((mod) => {
                const mastered = isMastered(progressBySkill, mod.id);
                const viaPlacement = progressBySkill[mod.id]?.masteredVia === "placement";
                const unlocked = isUnlocked(progressBySkill, mod.id);
                const missing = missingPrerequisites(progressBySkill, mod.id);
                const strandLabel = getStrand(mod.strandSlug)?.label ?? mod.strandSlug;
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
    </main>
  );
}
