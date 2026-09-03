"use client";

import { useEffect, useMemo, useState } from "react";
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

/** Hasta un módulo recomendado por hilo — nunca uno bloqueado ni ya dominado
 * (recommendedModule ya garantiza eso), se salta los hilos sin recomendado. */
function pickBossModules(progressBySkill: Record<string, SkillProgress>): ModuleDef[] {
  return STRANDS.map((s) => recommendedModule(progressBySkill, s.slug)).filter(
    (m): m is ModuleDef => m !== null,
  );
}

export default function BossChallengePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string }>();

  const [child, setChild] = useState<ChildProfile | null>(null);
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
  const [progressLoaded, setProgressLoaded] = useState(false);
  const totalStars = useTotalStars(user?.uid, params.childId);
  const [soundOn, toggleSound] = useSoundPreference();
  const placementPending = useRequirePlacement(params.childId, child, router);

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
      setProgressLoaded(true);
    })().catch((err) => console.error("No se pudo cargar el progreso", err));
    return () => {
      cancelled = true;
    };
  }, [user, params.childId]);

  const modules = useMemo(() => pickBossModules(progressBySkill), [progressBySkill]);

  if (loading || !user) {
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
            <MultiModuleChallenge
              childId={params.childId}
              modules={modules}
              soundOn={soundOn}
              theme={{
                icon: "💥",
                title: "Boss Challenge",
                tagline: "Un reto de cada zona que ya desbloqueaste.",
                closingMessage: "¡Boss derrotado!",
              }}
            />
          </div>
        )}
      </div>
    </GameShell>
  );
}
