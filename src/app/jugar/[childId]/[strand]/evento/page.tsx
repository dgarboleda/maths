"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile, SkillProgress } from "@/lib/types";
import { getStrand } from "@/lib/strands";
import { isMastered, isUnlocked, modulesForStrand, type ModuleDef } from "@/lib/curriculum";
import { getStrandNarrative } from "@/lib/narrative";
import { GameShell } from "@/components/GameShell";
import { MultiModuleChallenge } from "@/components/topic/MultiModuleChallenge";
import { useTotalStars } from "@/lib/useTotalStars";
import { useSoundPreference } from "@/lib/useSoundPreference";

const MAX_CHALLENGES = 3;

/** Hasta 3 módulos desbloqueados del hilo, priorizando los no dominados —
 * nunca un módulo bloqueado, nunca se fabrica mastery. */
function pickModules(progressBySkill: Record<string, SkillProgress>, strandSlug: string): ModuleDef[] {
  const unlocked = modulesForStrand(strandSlug).filter((m) => isUnlocked(progressBySkill, m.id));
  const notMastered = unlocked.filter((m) => !isMastered(progressBySkill, m.id));
  const mastered = unlocked.filter((m) => isMastered(progressBySkill, m.id));
  return [...notMastered, ...mastered].slice(0, MAX_CHALLENGES);
}

export default function CodigoSecretoPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string; strand: string }>();
  const strand = getStrand(params.strand);

  const [child, setChild] = useState<ChildProfile | null>(null);
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [digits, setDigits] = useState<Record<number, number>>({});
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
      setProgressLoaded(true);
    })().catch((err) => console.error("No se pudo cargar el progreso", err));
    return () => {
      cancelled = true;
    };
  }, [user, params.childId]);

  const modules = useMemo(
    () => (strand ? pickModules(progressBySkill, strand.slug) : []),
    [progressBySkill, strand],
  );

  if (loading || !user) {
    return (
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
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

  if (!child || !progressLoaded) {
    return (
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-slate-300">
          Cargando…
        </p>
      </main>
    );
  }

  const narrative = getStrandNarrative(strand.slug);

  return (
    <GameShell
      icon="🔐"
      title="Código secreto"
      subtitle={
        <Link href={`/jugar/${params.childId}/${strand.slug}`} className="underline">
          ← {strand.label} de {child.name}
        </Link>
      }
      stars={totalStars}
      soundOn={soundOn}
      onToggleSound={toggleSound}
    >
      <div className="mx-auto max-w-xl space-y-4">
        <p className="text-center text-sm text-slate-400">
          <span aria-hidden="true">{narrative.icon} </span>
          Cada acierto en {narrative.zoneName} revela un dígito del código.
        </p>

        {modules.length >= 2 && (
          <div aria-label="Código descubierto" className="flex justify-center gap-2 font-mono text-2xl font-black text-amber-300">
            {modules.map((mod, i) => (
              <span
                key={mod.id}
                className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-amber-400/50 bg-slate-900"
              >
                {digits[i] ?? "?"}
              </span>
            ))}
          </div>
        )}

        {modules.length < 2 ? (
          <p className="text-center text-slate-400">
            Todavía no tienes suficientes temas desbloqueados en {strand.label} para este evento.
          </p>
        ) : (
          <div className="rounded-3xl border-2 border-indigo-500/30 bg-slate-900/60 p-6 shadow-xl">
            <MultiModuleChallenge
              childId={params.childId}
              modules={modules}
              soundOn={soundOn}
              theme={{
                icon: "🔐",
                title: "Código secreto",
                tagline: `${narrative.zoneName}: descifra el código resolviendo cada reto.`,
                closingMessage: "¡Código completo! Desbloqueaste el acceso.",
              }}
              onStepResolved={(index, correct) => {
                if (correct) {
                  setDigits((prev) => ({ ...prev, [index]: Math.floor(Math.random() * 10) }));
                }
              }}
            />
          </div>
        )}
      </div>
    </GameShell>
  );
}
