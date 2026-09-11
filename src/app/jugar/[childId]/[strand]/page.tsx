"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile, SkillProgress } from "@/lib/types";
import { getStrand } from "@/lib/strands";
import { getModule, isMastered, modulesForStrand } from "@/lib/curriculum";
import { getStrandNarrative } from "@/lib/narrative";
import { zoneScene, type Interactable } from "@/lib/world/scenes";
import { activeQuest } from "@/lib/world/quests";
import { GameShell } from "@/components/GameShell";
import { ZoneScene } from "@/components/world/ZoneScene";
import { PuzzleOverlay } from "@/components/world/PuzzleOverlay";
import { playSound } from "@/lib/gameSound";
import { useTotalStars } from "@/lib/useTotalStars";
import { useSoundPreference } from "@/lib/useSoundPreference";
import { useRequirePlacement } from "@/lib/useRequirePlacement";

/**
 * Interior de una zona del mundo. Los objetos son los módulos reales del
 * hilo: el candado sale de los prerrequisitos, el problema del generador del
 * módulo y el intento se guarda donde siempre. El enlace "Entrar" de cada
 * objeto sigue llevando a la pantalla completa del tema.
 */
export default function ZonaPage() {
  const { user, loading, parentId } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string; strand: string }>();
  const strand = getStrand(params.strand);

  const [child, setChild] = useState<ChildProfile | null>(null);
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
  const [selected, setSelected] = useState<Interactable | null>(null);
  const [streak, setStreak] = useState(0);
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

  if (loading || !user || !parentId) {
    return (
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-slate-300">
          Cargando…
        </p>
      </main>
    );
  }

  const scene = strand ? zoneScene(strand.slug) : null;

  if (!strand || !scene) {
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

  if (!child || placementPending) {
    return (
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-slate-300">
          Cargando…
        </p>
      </main>
    );
  }

  const modules = modulesForStrand(strand.slug);
  const dominados = modules.filter((mod) => isMastered(progressBySkill, mod.id)).length;
  const narrative = getStrandNarrative(strand.slug);
  const quest = activeQuest(progressBySkill);
  const questModuleIds =
    quest?.objectives.filter((o) => !o.done && !o.locked).map((o) => o.moduleId) ?? [];
  const selectedModule = selected ? getModule(selected.moduleId) : null;

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
      streak={streak}
      soundOn={soundOn}
      onToggleSound={toggleSound}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-2xl border border-indigo-500/25 bg-slate-900/70 px-4 py-3">
          <span aria-hidden="true" className="text-2xl">
            {narrative.icon}
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold uppercase tracking-wide text-indigo-200">{narrative.zoneName}</p>
            <p className="text-xs text-slate-400">{narrative.tagline}</p>
          </div>
          <p className="text-xs font-bold text-indigo-300">
            {dominados}/{modules.length} temas dominados
          </p>
        </div>

        <ZoneScene
          childId={params.childId}
          scene={scene}
          progressBySkill={progressBySkill}
          questModuleIds={questModuleIds}
          onSelect={(interactable) => {
            playSound("click", soundOn);
            setSelected(interactable);
          }}
        />

        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href={`/jugar/${params.childId}/${strand.slug}/evento`}
            onClick={() => playSound("click", soundOn)}
            className="flex items-center justify-between gap-3 rounded-2xl border-2 border-amber-400/50 bg-gradient-to-r from-amber-600 to-yellow-600 px-4 py-3 text-white shadow-sm ring-1 ring-white/10 transition-all hover:scale-[1.02]"
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
      </div>

      {selected && selectedModule && (
        <PuzzleOverlay
          parentId={parentId}
          childId={params.childId}
          interactable={selected}
          mod={selectedModule}
          progressBySkill={progressBySkill}
          streak={streak}
          soundOn={soundOn}
          onClose={() => setSelected(null)}
          onResolved={(moduleId, updated, correct) => {
            setProgressBySkill((prev) => ({ ...prev, [moduleId]: updated }));
            setStreak((s) => (correct ? s + 1 : 0));
          }}
        />
      )}
    </GameShell>
  );
}
