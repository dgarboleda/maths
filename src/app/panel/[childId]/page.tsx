"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile, SkillProgress } from "@/lib/types";
import { getStrand } from "@/lib/strands";
import { MODULES, isMastered, isUnlocked, missingPrerequisites } from "@/lib/curriculum";

const STRAND_COLORS: Record<string, string> = {
  aritmetica: "bg-purple-100 text-purple-800",
  algebra: "bg-pink-100 text-pink-800",
  geometria: "bg-blue-100 text-blue-800",
  medicion: "bg-emerald-100 text-emerald-800",
  logica: "bg-amber-100 text-amber-800",
};

export default function CurriculaPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string }>();
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const {
        db,
        firestore: { collection, doc, getDoc, getDocs },
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

      <div className="flex flex-col gap-6">
        {tiers.map((tier) => (
          <section key={tier} aria-label={`Franja ${tier + 1}`} className="flex flex-col gap-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-500">Franja {tier + 1}</h2>
            <ul className="flex flex-col gap-1">
              {MODULES.filter((m) => m.tier === tier).map((mod) => {
                const mastered = isMastered(progressBySkill, mod.id);
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
                      <span className="font-medium text-emerald-700">✓ Dominado</span>
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
