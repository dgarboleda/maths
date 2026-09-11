"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile } from "@/lib/types";
import { listLevels } from "@/lib/level/persistence/levelRepository";
import { getWorld } from "@/lib/gameworld/persistence/worldRepository";
import { NoLevelsYet } from "@/components/jugar/NoLevelsYet";
import { useRequirePlacement } from "@/lib/useRequirePlacement";

/**
 * Despachador de `/jugar/{childId}` — Fase 18 (docs/level-editor-plan-v2.md
 * §5.1). Ya no renderiza ningún juego acá: decide a qué pantalla real
 * mandar al niño según el Mundo del padre, y **nunca** cae en un contenido
 * por defecto silencioso.
 *
 * `ciudadCentralAsLevel()` deja de construirse acá — el camino que la
 * mostraba incondicionalmente (`NEXT_PUBLIC_LEVELS_V2`) se retira; sigue
 * existiendo como semilla opcional del "mundo de ejemplo"
 * (`seedExampleWorld`, ver `NoLevelsYet`) y como nivel real una vez creado.
 * `QuestScene.tsx`/`src/lib/world/**` no se tocan (coexistencia): siguen
 * accesibles en `/jugar/{childId}/ciudad-central-legacy`, una ruta de
 * regresión estable para comparar comportamiento — no hay ningún enlace de
 * producción hacia ahí, así que un niño nunca la encuentra jugando normal.
 *
 * `useRequirePlacement` faltaba acá (bug real, no solo de las pruebas): sin
 * él, un hijo recién creado sin niveles ni evaluación completa caía en
 * `NoLevelsYet` en vez de que lo mandaran a completar la evaluación inicial
 * primero — exactamente el mismo criterio que ya aplican todas las
 * pantallas de juego (`[strand]/page.tsx`, `nivel/[levelId]/page.tsx`, …).
 */
export default function JugarDespachadorPage() {
  const { user, loading, parentId } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string }>();
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [destination, setDestination] = useState<"loading" | "none" | { href: string }>("loading");
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
    // Con la evaluación pendiente, `useRequirePlacement` ya va a redirigir a
    // /evaluacion — ni conviene ni hace falta decidir a qué nivel mandarlo.
    if (!parentId || placementPending) return;
    let cancelled = false;
    getFirebase()
      .then(async ({ db, firestore }) => {
        const [world, levels] = await Promise.all([getWorld(firestore, db, parentId), listLevels(firestore, db, parentId)]);
        if (cancelled) return;
        const levelIds = new Set(levels.map((l) => l.id));
        const start = world?.nodes.find((n) => n.isStart && levelIds.has(n.levelId));
        if (start) {
          setDestination({ href: `/jugar/${params.childId}/nivel/${start.levelId}` });
        } else if (levels.length >= 2 && (world?.rules.showWorldMap ?? true)) {
          setDestination({ href: `/jugar/${params.childId}/mapa` });
        } else if (levels.length === 1) {
          setDestination({ href: `/jugar/${params.childId}/nivel/${levels[0].id}` });
        } else {
          setDestination("none");
        }
      })
      .catch((err) => {
        console.error("No se pudo decidir a dónde llevar al jugador", err);
        if (!cancelled) setDestination("none");
      });
    return () => {
      cancelled = true;
    };
  }, [parentId, params.childId, placementPending]);

  useEffect(() => {
    if (typeof destination === "object") router.replace(destination.href);
  }, [destination, router]);

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

  if (!child || placementPending || destination === "loading") {
    return (
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-slate-300">
          Cargando…
        </p>
      </main>
    );
  }

  if (destination === "none") {
    return <NoLevelsYet childId={params.childId} childName={child.name} parentId={parentId} />;
  }

  // `destination` ya es un objeto `{ href }`: el efecto de arriba ya disparó
  // el `router.replace`, esto solo cubre el instante entre ese efecto y la
  // navegación real.
  return (
    <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
      <p role="status" className="text-slate-300">
        Cargando…
      </p>
    </main>
  );
}
