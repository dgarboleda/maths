"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile, SkillProgress } from "@/lib/types";
import { STRANDS } from "@/lib/strands";
import { recommendedModule, type ModuleDef } from "@/lib/curriculum";
import { GameShell } from "@/components/GameShell";
import { MultiModuleChallenge } from "@/components/topic/MultiModuleChallenge";
import { useTotalStars } from "@/lib/useTotalStars";
import { useSoundPreference } from "@/lib/useSoundPreference";
import { useRequirePlacement } from "@/lib/useRequirePlacement";
import { playSound } from "@/lib/gameSound";
import { awardStars } from "@/lib/starLedger";
import { getWorld } from "@/lib/gameworld/persistence/worldRepository";

/** Fase 34 (docs/plan-jugabilidad.md §8): estrellas de bono al vencer el
 *  boss general — mismo monto y misma razón ("boss_level", ya existe en
 *  StarReason) que ya usa el bono del Cohete ([moduleId]/page.tsx), que
 *  hasta ahora era el único lugar que la escribía. */
const BOSS_BONUS = 15;

/** Hasta un módulo recomendado por hilo — nunca uno bloqueado ni ya dominado
 * (recommendedModule ya garantiza eso), se salta los hilos sin recomendado. */
function pickBossModules(progressBySkill: Record<string, SkillProgress>): ModuleDef[] {
  return STRANDS.map((s) => recommendedModule(progressBySkill, s.slug)).filter(
    (m): m is ModuleDef => m !== null,
  );
}

export default function BossChallengePage() {
  const { user, loading, parentId } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string }>();

  const [child, setChild] = useState<ChildProfile | null>(null);
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
  const [progressLoaded, setProgressLoaded] = useState(false);
  // Fase 34: "el boss ES el guardián" — el boss general es Khaos, el
  // antagonista del mundo (siempre "Khaos" salvo que el padre lo haya
  // renombrado desde el Editor de Mundo). Sin mundo todavía, el nombre por
  // defecto de `createEmptyWorld` alcanza igual.
  const [antagonistName, setAntagonistName] = useState("Khaos");
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
      setProgressLoaded(true);
    })().catch((err) => console.error("No se pudo cargar el progreso", err));
    return () => {
      cancelled = true;
    };
  }, [parentId, params.childId]);

  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore }) => getWorld(firestore, db, parentId))
      .then((w) => {
        if (!cancelled && w?.story.antagonistName) setAntagonistName(w.story.antagonistName);
      })
      .catch((err) => console.error("No se pudo cargar el nombre del antagonista", err));
    return () => {
      cancelled = true;
    };
  }, [parentId]);

  const modules = useMemo(() => pickBossModules(progressBySkill), [progressBySkill]);

  function handleVictory() {
    if (!parentId) return;
    getFirebase()
      .then(({ db, firestore }) => awardStars(firestore, db, parentId, params.childId, BOSS_BONUS, "boss_level"))
      .catch((err) => console.error("No se pudo otorgar el bono del boss", err));
  }

  function handleDefeat() {
    playSound("fail", soundOn);
  }

  if (loading || !user || !parentId) {
    return (
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-slate-300">
          Cargando…
        </p>
      </main>
    );
  }

  if (!child || !progressLoaded || placementPending) {
    return (
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-slate-300">
          Cargando…
        </p>
      </main>
    );
  }

  return (
    <GameShell
      icon="💥"
      title="Boss Challenge"
      subtitle={
        <Link href={`/jugar/${params.childId}`} className="underline">
          ← {child.name}
        </Link>
      }
      stars={totalStars}
      soundOn={soundOn}
      onToggleSound={toggleSound}
    >
      <div className="mx-auto max-w-xl space-y-4">
        {modules.length < 2 ? (
          <p className="text-center text-slate-400">
            Todavía no tienes suficientes desafíos desbloqueados para el Boss Challenge. Sigue avanzando en tus
            hilos y vuelve pronto.
          </p>
        ) : (
          <div className="rounded-3xl border-2 border-indigo-500/30 bg-slate-900/60 p-6 shadow-xl">
            {/* Fase 34: "el boss ES el guardián" — antes de las preguntas,
                a quién se enfrenta. */}
            <div className="mb-4 flex flex-col items-center gap-2 text-center">
              <Image src="/illustrations/khaos.webp" alt="" aria-hidden="true" width={72} height={72} className="rounded-2xl border border-rose-400/30" />
              <p className="font-display text-lg font-bold text-rose-200">{antagonistName}</p>
            </div>
            <MultiModuleChallenge
              childId={params.childId}
              modules={modules}
              soundOn={soundOn}
              lives={3}
              onDefeat={handleDefeat}
              onVictory={handleVictory}
              theme={{
                icon: "💥",
                title: "Boss Challenge",
                tagline: "Un reto de cada zona que ya desbloqueaste.",
                closingMessage: `¡${antagonistName} derrotado!`,
              }}
            />
          </div>
        )}
      </div>
    </GameShell>
  );
}
