"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile, SkillProgress } from "@/lib/types";
import { getStrand } from "@/lib/strands";
import { modulesForStrand, isMastered, isUnlocked, missingPrerequisites, recommendedModule } from "@/lib/curriculum";
import { getStrandNarrative } from "@/lib/narrative";
import { GameShell } from "@/components/GameShell";
import { playSound } from "@/lib/gameSound";
import { useTotalStars } from "@/lib/useTotalStars";
import { useSoundPreference } from "@/lib/useSoundPreference";

export default function StrandTopicListPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string; strand: string }>();
  const strand = getStrand(params.strand);

  const [child, setChild] = useState<ChildProfile | null>(null);
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
  const totalStars = useTotalStars(user?.uid, params.childId);
  const [soundOn, toggleSound] = useSoundPreference();

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
      <main id="contenido"
        tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-slate-300">
          Cargando…
        </p>
      </main>
    );
  }

  if (!strand) {
    return (
      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center"
      >
        <p className="text-slate-400">Ese hilo todavía no existe.</p>
        <Link href={`/jugar/${params.childId}`} className="text-sm text-slate-400 underline underline-offset-2">
          Volver
        </Link>
      </main>
    );
  }

  if (!child) {
    return (
      <main id="contenido"
        tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-slate-300">
          Cargando…
        </p>
      </main>
    );
  }

  const modules = modulesForStrand(strand.slug);
  const dominados = modules.filter((mod) => isMastered(progressBySkill, mod.id)).length;
  const recommended = recommendedModule(progressBySkill, strand.slug);
  const narrative = getStrandNarrative(strand.slug);

  return (
    <GameShell
      icon={strand.emoji}
      title={strand.label}
      subtitle={
        <Link href={`/jugar/${params.childId}`} className="underline">
          ← {child.name}
        </Link>
      }
      stars={totalStars}
      soundOn={soundOn}
      onToggleSound={toggleSound}
    >
      <div className="space-y-4">
        <div className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl border-2 border-indigo-500/20 bg-slate-900/60 px-4 py-3">
          <span aria-hidden="true" className="text-2xl">
            {narrative.icon}
          </span>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-indigo-200">{narrative.zoneName}</p>
            <p className="text-xs text-slate-400">{narrative.tagline}</p>
          </div>
        </div>

        <p className="text-center text-sm font-bold text-indigo-300">
          {dominados}/{modules.length} temas dominados
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {modules.map((mod) => {
            const mastered = isMastered(progressBySkill, mod.id);
            const unlocked = isUnlocked(progressBySkill, mod.id);
            const isRecommended = recommended?.id === mod.id;

            if (!unlocked) {
              const missing = missingPrerequisites(progressBySkill, mod.id);
              const missingLabel = missing.map((m) => m.label).join(", ");
              return (
                <div
                  key={mod.id}
                  aria-disabled="true"
                  aria-label={`Bloqueado: dominá primero ${missingLabel}`}
                  className="flex flex-col gap-1 rounded-2xl border-2 border-slate-700/60 bg-slate-900/40 px-4 py-3 text-slate-500"
                >
                  <span className="flex items-center gap-3">
                    <span aria-hidden="true" className="text-2xl">
                      🔒
                    </span>
                    <span className="font-bold">{mod.label}</span>
                  </span>
                  <span className="pl-9 text-xs">Dominá primero: {missingLabel}</span>
                </div>
              );
            }

            const href = mod.href ? mod.href(params.childId) : `/jugar/${params.childId}/${strand.slug}/${mod.id}`;

            return (
              <Link
                key={mod.id}
                href={href}
                onClick={() => playSound("click", soundOn)}
                className={`flex items-center justify-between gap-3 rounded-2xl border-2 bg-slate-900/60 px-4 py-3 shadow-sm transition-all hover:scale-[1.02] ${
                  mastered
                    ? "border-emerald-400/60 shadow-[0_0_12px_rgba(52,211,153,0.25)]"
                    : isRecommended
                      ? "border-violet-400/60 bg-violet-950/40 shadow-[0_0_12px_rgba(167,139,250,0.3)]"
                      : "border-indigo-500/20"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span aria-hidden="true" className="text-2xl">
                    {mod.emoji}
                  </span>
                  <span className="font-bold text-slate-100">{mod.label}</span>
                </span>
                {mastered ? (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-300">
                    <span aria-hidden="true">✓ </span>Dominado
                  </span>
                ) : isRecommended ? (
                  <span className="rounded-full bg-violet-500/20 px-2 py-1 text-xs font-bold text-violet-300">Recomendado</span>
                ) : null}
              </Link>
            );
          })}
        </div>

        <Link
          href={`/jugar/${params.childId}/${strand.slug}/evento`}
          onClick={() => playSound("click", soundOn)}
          className="flex items-center justify-between gap-3 rounded-2xl border-2 border-amber-400/50 bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-3 text-white shadow-sm ring-1 ring-white/10 transition-all hover:scale-[1.02]"
        >
          <span className="flex items-center gap-3">
            <span aria-hidden="true" className="text-2xl">
              🔐
            </span>
            <span className="font-bold">Código secreto</span>
          </span>
          <span className="rounded-full bg-white/20 px-2 py-1 text-xs font-bold">Evento</span>
        </Link>

        {strand.slug === "logica" && (
          <Link
            href={`/jugar/${params.childId}/piramide`}
            onClick={() => playSound("click", soundOn)}
            className="flex items-center justify-between gap-3 rounded-2xl border-2 border-orange-400/50 bg-gradient-to-r from-red-600 to-orange-600 px-4 py-3 text-white shadow-sm ring-1 ring-white/10 transition-all hover:scale-[1.02]"
          >
            <span className="flex items-center gap-3">
              <span aria-hidden="true" className="text-2xl">
                🔺
              </span>
              <span className="font-bold">Pirámide numérica</span>
            </span>
            <span className="rounded-full bg-white/20 px-2 py-1 text-xs font-bold">Especial</span>
          </Link>
        )}
      </div>
    </GameShell>
  );
}
