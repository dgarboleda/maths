"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile, SkillProgress } from "@/lib/types";
import { useSoundPreference } from "@/lib/useSoundPreference";
import { useRequirePlacement } from "@/lib/useRequirePlacement";
import { useTotalStars } from "@/lib/useTotalStars";
import { useLevelDoc } from "@/lib/level/persistence/useLevelDoc";
import { LevelRuntime } from "@/components/level/runtime/LevelRuntime";

/**
 * Jugar un nivel del Level Editor — docs/level-editor-plan.md §9 (Fase 9).
 * Mismo patrón de autenticación/carga que `jugar/[childId]/page.tsx`
 * (Ciudad Central): el dueño de los datos es `parentId` (de `useAuth`, ver
 * `AuthProvider.tsx`) — el `uid` real de la cuenta de padre, o el de la
 * familia si esta es una sesión propia del hijo (custom token). El niño
 * nunca tiene una cuenta de Firebase Auth "normal", y el progreso se lee de
 * `skillsProgress` real — nada de eso cambia por venir de un nivel creado
 * con el editor en vez de estar hardcodeado.
 */
export default function JugarNivelPage() {
  const { user, loading, parentId } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string; levelId: string }>();
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [soundOn] = useSoundPreference();
  const placementPending = useRequirePlacement(params.childId, child, router);
  const { level, loading: levelLoading } = useLevelDoc(parentId, params.levelId);
  // Fase 18 movió Ciudad Central (y cualquier otro nivel real) a esta misma
  // ruta genérica, pero el AXIA de `WorldTopBar` (world/WorldHud.tsx) se
  // quedó atado a `QuestScene`/`ciudad-central-legacy` — sin esto, jugar
  // cualquier nivel del Level Editor nunca mostraba el saldo real. No se
  // reutiliza `WorldTopBar` tal cual porque asume "Ciudad Central" como
  // título fijo (no sirve para un nivel cualquiera); acá solo el AXIA, que sí
  // es genérico. Play Test (LevelEditorScreen.tsx) no pasa por esta página —
  // vive fuera de `nivel/[levelId]`, así que no le agrega este HUD.
  const totalStars = useTotalStars(parentId, params.childId);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore: { doc, getDoc } }) => getDoc(doc(db, "parents", parentId, "children", params.childId)))
      .then((snap) => {
        if (cancelled) return;
        if (snap.exists()) setChild(snap.data() as ChildProfile);
        else setNotFound(true);
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

  if (loading || !user || !parentId) {
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
      {/* Arriba a la derecha: `LevelHud` (dentro de `LevelRuntime`) ya ocupa
          la esquina superior izquierda con el nombre del nivel/misión. */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-end p-2 sm:p-3">
        <span className="world-hud-panel pointer-events-auto flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-slate-900/80 px-3 py-1.5">
          <Image src="/illustrations/icon-axia.webp" alt="" aria-hidden="true" width={16} height={16} className="size-4" />
          <span className="text-sm font-bold text-amber-300">
            <span className="sr-only">AXIA: </span>
            {totalStars ?? "…"}
          </span>
        </span>
      </header>
      <div className="mx-auto h-full w-full max-w-3xl lg:max-w-none">
        <LevelRuntime
          level={level}
          parentId={parentId}
          childId={params.childId}
          childName={child.name}
          progressBySkill={progressBySkill}
          soundOn={soundOn}
        />
      </div>
    </main>
  );
}
