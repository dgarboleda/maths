"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile, SkillProgress } from "@/lib/types";
import { useSoundPreference } from "@/lib/useSoundPreference";
import { useRequirePlacement } from "@/lib/useRequirePlacement";
import { useLevelDoc } from "@/lib/level/persistence/useLevelDoc";
import { LevelRuntime } from "@/components/level/runtime/LevelRuntime";

/**
 * Jugar un nivel del Level Editor — docs/level-editor-plan.md §9 (Fase 9).
 * Mismo patrón de autenticación/carga que `jugar/[childId]/page.tsx`
 * (Ciudad Central): el "padre" autenticado es `user.uid`, el niño es un
 * perfil bajo ese padre (nunca una cuenta de Firebase Auth propia), y el
 * progreso se lee de `skillsProgress` real — nada de eso cambia por venir
 * de un nivel creado con el editor en vez de estar hardcodeado.
 */
export default function JugarNivelPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string; levelId: string }>();
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [soundOn] = useSoundPreference();
  const placementPending = useRequirePlacement(params.childId, child, router);
  const { level, loading: levelLoading } = useLevelDoc(user?.uid, params.levelId);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore: { doc, getDoc } }) => getDoc(doc(db, "parents", user.uid, "children", params.childId)))
      .then((snap) => {
        if (cancelled) return;
        if (snap.exists()) setChild(snap.data() as ChildProfile);
        else setNotFound(true);
      })
      .catch((err) => console.error("No se pudo cargar el perfil", err));
    return () => {
      cancelled = true;
    };
  }, [user, params.childId]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore: { collection, getDocs } }) => getDocs(collection(db, "parents", user.uid, "children", params.childId, "skillsProgress")))
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
  }, [user, params.childId]);

  if (loading || !user) {
    return (
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-slate-300">
          Cargando…
        </p>
      </main>
    );
  }

  if (notFound) {
    return (
      <main id="contenido" tabIndex={-1} className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center">
        <p className="text-slate-400">No encontré ese perfil.</p>
        <Link href="/perfiles" className="text-sm text-slate-400 underline underline-offset-2">
          Volver a perfiles
        </Link>
      </main>
    );
  }

  if (!child || placementPending || !progressLoaded || levelLoading) {
    return (
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-slate-300">
          Cargando…
        </p>
      </main>
    );
  }

  if (!level) {
    return (
      <main id="contenido" tabIndex={-1} className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center">
        <p className="text-slate-400">No encontré ese nivel.</p>
        <Link href={`/jugar/${params.childId}`} className="text-sm text-slate-400 underline underline-offset-2">
          Volver
        </Link>
      </main>
    );
  }

  return (
    // `h-dvh overflow-hidden`: mismo criterio que jugar/[childId]/page.tsx —
    // la escena es una cámara que sigue al personaje, nunca scroll de página.
    <main id="contenido" tabIndex={-1} className="h-dvh overflow-hidden bg-slate-950 px-3 py-3 sm:px-4 sm:py-4">
      <div className="mx-auto h-full w-full max-w-3xl lg:max-w-none">
        <LevelRuntime level={level} childId={params.childId} childName={child.name} progressBySkill={progressBySkill} soundOn={soundOn} />
      </div>
    </main>
  );
}
