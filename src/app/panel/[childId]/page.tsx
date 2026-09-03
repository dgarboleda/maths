"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile, Placement, SkillProgress } from "@/lib/types";
import { getStrand, STRANDS } from "@/lib/strands";
import { MODULES, isMastered, isUnlocked, missingPrerequisites } from "@/lib/curriculum";

const STRAND_COLORS: Record<string, string> = {
  aritmetica: "bg-purple-100 text-purple-800",
  algebra: "bg-pink-100 text-pink-800",
  geometria: "bg-blue-100 text-blue-800",
  medicion: "bg-emerald-100 text-emerald-800",
  logica: "bg-amber-100 text-amber-800",
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
    })().catch((err) => console.error("No se pudo cargar el progreso", err));
    return () => {
      cancelled = true;
    };
  }, [user, params.childId]);

  if (loading || !user) {
    return (
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-white">
        <p role="status" className="text-neutral-700">
          Cargando…
        </p>
      </main>
    );
  }

  if (!child) {
    return (
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-white">
        <p role="status" className="text-neutral-700">
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
      className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 bg-white px-6 py-14"
    >
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Currícula de {child.name}</h1>
        <Link href="/panel" className="text-sm text-neutral-500 underline underline-offset-2">
          ← Volver al panel
        </Link>
        <p className="mt-2 text-sm text-neutral-600">
          Cada franja agrupa temas de nivel similar. Un tema se desbloquea cuando se dominan todos sus prerrequisitos
          (mostrados entre paréntesis cuando está bloqueado), sin importar de qué materia vengan.
        </p>
      </div>

      <section aria-label="Evaluaciones de ubicación" className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Evaluaciones de ubicación</h2>
          <Link
            href={`/jugar/${params.childId}/evaluacion`}
            className="text-sm text-neutral-500 underline underline-offset-2"
          >
            {evaluaciones.length > 0 ? "Volver a evaluar" : "Hacer la evaluación inicial"}
          </Link>
        </div>

        {evaluaciones.length === 0 ? (
          <p className="text-sm text-neutral-600">
            Todavía no se ha hecho ninguna evaluación de ubicación. Sirve como línea base para medir el avance con el
            tiempo.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {evaluaciones.map((ev) => (
              <li key={ev.id} className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-neutral-900">
                    {ev.completedAt ? new Date(ev.completedAt).toLocaleDateString("es") : "…"}
                  </span>
                  <span className="font-medium text-purple-700">
                    {ev.overallGradeBand} ({ev.overallScore}/100)
                  </span>
                </div>
                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-neutral-600">
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
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col gap-6">
        {tiers.map((tier) => (
          <section key={tier} aria-label={`Franja ${tier + 1}`} className="flex flex-col gap-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-500">Franja {tier + 1}</h2>
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
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STRAND_COLORS[mod.strandSlug] ?? "bg-neutral-100 text-neutral-700"}`}>
                        {strandLabel}
                      </span>
                      <span className="font-medium text-neutral-900">
                        {mod.emoji} {mod.label}
                      </span>
                    </span>
                    {mastered ? (
                      <span className="font-medium text-emerald-700">
                        ✓ Dominado{viaPlacement ? " (evaluación inicial)" : ""}
                      </span>
                    ) : unlocked ? (
                      <span className="font-medium text-purple-700">▶ Desbloqueado</span>
                    ) : (
                      <span className="text-neutral-500">🔒 Bloqueado (falta: {missing.map((m) => m.label).join(", ")})</span>
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
