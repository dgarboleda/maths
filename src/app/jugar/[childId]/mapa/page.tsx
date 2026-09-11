"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile, SkillProgress } from "@/lib/types";
import { useTotalStars } from "@/lib/useTotalStars";
import { useRequirePlacement } from "@/lib/useRequirePlacement";
import { listLevels, getLevel } from "@/lib/level/persistence/levelRepository";
import type { LevelDefinition } from "@/lib/level/schema";
import { getWorld } from "@/lib/gameworld/persistence/worldRepository";
import { worldGraphState } from "@/lib/gameworld/progress";
import type { GameWorld } from "@/lib/gameworld/schema";

const STATE_LABEL: Record<string, string> = { bloqueado: "Bloqueado", disponible: "Disponible", completado: "Completado" };
const STATE_CLASS: Record<string, string> = {
  bloqueado: "border-slate-700 bg-slate-900/60 text-slate-500",
  disponible: "border-cyan-400/50 bg-cyan-950/50 text-cyan-100 hover:bg-cyan-950/80",
  completado: "border-emerald-400/50 bg-emerald-950/50 text-emerald-100 hover:bg-emerald-950/80",
};

/**
 * Mapa del jugador — Fase 18 (docs/level-editor-plan-v2.md §5.3). Un nodo
 * por nivel, con estado derivado en cada carga de `skillsProgress`/
 * `starLedger` reales (`worldGraphState`) — cero estado propio de mundo.
 */
export default function JugarMapaPage() {
  const { user, loading, parentId } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string }>();
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [world, setWorld] = useState<GameWorld | null>(null);
  const [levels, setLevels] = useState<LevelDefinition[] | null>(null);
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
  const [progressLoaded, setProgressLoaded] = useState(false);
  const totalStars = useTotalStars(parentId, params.childId);
  const placementPending = useRequirePlacement(params.childId, child, router);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore: { doc, getDoc } }) => getDoc(doc(db, "parents", parentId, "children", params.childId)))
      .then((snap) => {
        if (!cancelled && snap.exists()) setChild(snap.data() as ChildProfile);
      })
      .catch((err) => console.error("No se pudo cargar el perfil", err));
    return () => {
      cancelled = true;
    };
  }, [parentId, params.childId]);

  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore: { collection, getDocs } }) => getDocs(collection(db, "parents", parentId, "children", params.childId, "skillsProgress")))
      .then((snap) => {
        if (cancelled) return;
        const map: Record<string, SkillProgress> = {};
        snap.forEach((d) => (map[d.id] = d.data() as SkillProgress));
        setProgressBySkill(map);
      })
      .catch((err) => console.error("No se pudo cargar el progreso", err))
      .finally(() => {
        if (!cancelled) setProgressLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [parentId, params.childId]);

  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    getFirebase()
      .then(async ({ db, firestore }) => {
        const [w, summaries] = await Promise.all([getWorld(firestore, db, parentId), listLevels(firestore, db, parentId)]);
        const full = await Promise.all(summaries.map((s) => getLevel(firestore, db, parentId, s.id)));
        return { w, levels: full.filter((l): l is LevelDefinition => l !== null) };
      })
      .then(({ w, levels: full }) => {
        if (cancelled) return;
        setWorld(w);
        setLevels(full);
      })
      .catch((err) => console.error("No se pudo cargar el mundo", err));
    return () => {
      cancelled = true;
    };
  }, [parentId, params.childId]);

  if (loading || !user || !parentId || !child || placementPending || !progressLoaded || !levels || !world) {
    return (
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-slate-300">
          Cargando…
        </p>
      </main>
    );
  }

  const levelsById = Object.fromEntries(levels.map((l) => [l.id, l]));
  const graphState = worldGraphState(world, levelsById, progressBySkill, totalStars ?? 0);

  return (
    <main id="contenido" tabIndex={-1} className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-1 text-center">
          <h1 className="font-display text-2xl font-bold text-white">{world.story.title || "Math Quest"}</h1>
          {world.story.logline && <p className="text-sm text-slate-400">{world.story.logline}</p>}
        </header>

        {world.nodes.length === 0 ? (
          <p className="text-center text-sm text-slate-500">Este mundo todavía no tiene niveles en el mapa.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {world.nodes.map((node) => {
              const level = levelsById[node.levelId];
              const state = graphState[node.levelId] ?? "bloqueado";
              const locked = state === "bloqueado";
              const content = (
                <>
                  <span className="text-2xl leading-none">{node.icon || "🧩"}</span>
                  <span className="text-sm font-bold">{level?.name ?? node.label}</span>
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide">
                    {locked && <Lock className="size-3" aria-hidden="true" />}
                    {STATE_LABEL[state]}
                  </span>
                </>
              );
              return (
                <li key={node.levelId}>
                  {locked || !level ? (
                    <div className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border px-3 py-3 text-center ${STATE_CLASS[state]}`}>{content}</div>
                  ) : (
                    <Link
                      href={`/jugar/${params.childId}/nivel/${node.levelId}`}
                      className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border px-3 py-3 text-center transition-colors ${STATE_CLASS[state]}`}
                    >
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="text-center">
          <Link href={`/jugar/${params.childId}`} className="text-xs text-slate-500 underline underline-offset-2">
            Volver
          </Link>
        </div>
      </div>
    </main>
  );
}
