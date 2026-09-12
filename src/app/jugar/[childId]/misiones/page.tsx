"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile, SkillProgress } from "@/lib/types";
import { moduleHref, getModule, nextReview } from "@/lib/curriculum";
import { QUESTS, questProgress, type QuestProgress } from "@/lib/world/quests";
import { derivedQuestProgress } from "@/lib/gameworld/derivedQuest";
import { getStrandNarrative } from "@/lib/narrative";
import { GameShell } from "@/components/GameShell";
import { useTotalStars } from "@/lib/useTotalStars";
import { useSoundPreference } from "@/lib/useSoundPreference";
import { useRequirePlacement } from "@/lib/useRequirePlacement";

/**
 * Diario de misiones. Cada objetivo apunta a un módulo real y se marca con el
 * progreso académico de verdad: no hay estado de misión guardado, se deriva
 * de `skillsProgress` en cada render.
 */
export default function MisionesPage() {
  const { user, loading, parentId } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string }>();
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
  const totalStars = useTotalStars(parentId, params.childId);
  const [soundOn, toggleSound] = useSoundPreference();
  const placementPending = useRequirePlacement(params.childId, child, router);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    (async () => {
      const {
        db,
        firestore: { collection, doc, getDoc, getDocs },
      } = await getFirebase();
      if (cancelled) return;
      const childSnap = await getDoc(doc(db, "parents", parentId, "children", params.childId));
      if (cancelled || !childSnap.exists()) return;
      setChild(childSnap.data() as ChildProfile);

      const progressSnap = await getDocs(
        collection(db, "parents", parentId, "children", params.childId, "skillsProgress"),
      );
      if (cancelled) return;
      const map: Record<string, SkillProgress> = {};
      progressSnap.forEach((d) => (map[d.id] = d.data() as SkillProgress));
      setProgressBySkill(map);
    })().catch((err) => console.error("No se pudo cargar el progreso", err));
    return () => {
      cancelled = true;
    };
  }, [parentId, params.childId]);

  if (loading || !user || !parentId || !child || placementPending) {
    return (
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-slate-300">
          Cargando…
        </p>
      </main>
    );
  }

  // Fase 35 (docs/plan-jugabilidad.md §9): las 3 QUESTS fijas (9 objetivos,
  // todos d1-d3) se agotan rápido contra 53 módulos reales — una vez
  // completas, se agrega una misión derivada de los módulos reales más
  // cercanos al frente de avance, para que el diario nunca quede vacío.
  const allDone = QUESTS.every((q) => questProgress(progressBySkill, q).complete);
  const extra = allDone ? derivedQuestProgress(progressBySkill) : null;
  // El repaso vencido (Fase 27) entra al diario como un objetivo más, no
  // solo como el chip del hub (Fase 28).
  const due = nextReview(progressBySkill);

  return (
    <GameShell
      icon="📓"
      title="Diario de misiones"
      subtitle={
        <Link href={`/jugar/${params.childId}`} className="underline">
          ← {child.name}
        </Link>
      }
      stars={totalStars}
      soundOn={soundOn}
      onToggleSound={toggleSound}
    >
      <ul className="flex flex-col gap-3">
        {due && (
          <li className="rounded-2xl border-2 border-cyan-400/40 bg-cyan-950/20 px-4 py-4">
            <h2 className="font-display text-base font-bold text-cyan-100">
              <span aria-hidden="true">🔁 </span>Repaso vencido
            </h2>
            <p className="mt-1 text-sm text-slate-400">{due.label} está listo para un repaso — no lo pierdas de vista.</p>
            <Link href={moduleHref(params.childId, due)} className="mt-2 inline-block text-xs font-bold text-cyan-300 underline underline-offset-2">
              Repasar {due.label}
            </Link>
          </li>
        )}
        {QUESTS.map((quest) => (
          <QuestCard key={quest.id} childId={params.childId} progress={questProgress(progressBySkill, quest)} />
        ))}
        {extra && <QuestCard childId={params.childId} progress={extra} />}
      </ul>
    </GameShell>
  );
}

function QuestCard({ childId, progress }: { childId: string; progress: QuestProgress }) {
  const narrative = getStrandNarrative(progress.quest.strandSlug);
  const pct = Math.round((progress.doneCount / progress.total) * 100);
  return (
    <li
      className={`rounded-2xl border-2 px-4 py-4 ${
        progress.complete ? "border-emerald-400/50 bg-emerald-950/30" : "border-indigo-500/30 bg-slate-900/70"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-base font-bold text-indigo-100">
          <span aria-hidden="true">{progress.quest.icon} </span>
          {progress.quest.title}
        </h2>
        <span
          className={`rounded-full px-2 py-1 text-xs font-bold ${
            progress.complete ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-300"
          }`}
        >
          {progress.complete ? "✓ Completada" : `${progress.doneCount}/${progress.total}`}
        </span>
      </div>

      <p className="mt-1 text-sm text-slate-400">{progress.quest.premise}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-indigo-300">
        <span aria-hidden="true">{narrative.icon} </span>
        {narrative.zoneName}
      </p>

      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progreso de ${progress.quest.title}`}
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
      >
        <div className="h-1.5 rounded-full bg-violet-400" style={{ width: `${pct}%` }} />
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {progress.objectives.map((objective) => {
          const mod = getModule(objective.moduleId);
          return (
            <li
              key={objective.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm"
            >
              <span className={objective.done ? "text-emerald-300" : "text-slate-200"}>
                <span aria-hidden="true">{objective.done ? "✓ " : objective.locked ? "🔒 " : "○ "}</span>
                <span className="sr-only">{objective.done ? "Completado: " : objective.locked ? "Bloqueado: " : "Pendiente: "}</span>
                {objective.label}
                <span className="block text-xs text-slate-400">Habilidad: {objective.moduleLabel}</span>
              </span>
              {objective.locked ? (
                <span className="text-xs text-slate-400">Falta dominar {objective.missing.join(", ")}</span>
              ) : (
                mod && (
                  <Link href={moduleHref(childId, mod)} className="text-xs font-bold text-violet-300 underline underline-offset-2">
                    Entrenar
                  </Link>
                )
              )}
            </li>
          );
        })}
      </ul>
    </li>
  );
}
