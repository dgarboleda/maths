"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile, RedemptionRequest, SkillProgress } from "@/lib/types";
import { nextChallenge } from "@/lib/curriculum";
import { WorldTopBar } from "@/components/world/WorldHud";
import { QuestScene } from "@/components/world/QuestScene";
import { ShopPanel, type RequestDoc } from "@/components/world/ShopPanel";
import { LevelRuntime } from "@/components/level/runtime/LevelRuntime";
import { ciudadCentralAsLevel } from "@/lib/level/legacy/ciudadCentral";
import { playSound } from "@/lib/gameSound";
import { useTotalStars } from "@/lib/useTotalStars";
import { useSoundPreference } from "@/lib/useSoundPreference";
import { useRequirePlacement } from "@/lib/useRequirePlacement";

/**
 * Ciudad Central: la pantalla de entrada del niño es la misión "El apagón".
 *
 * Con `NEXT_PUBLIC_LEVELS_V2` apagado (el default hoy) sigue siendo el
 * puerto del prototipo de referencia de siempre — una sola escena pintada
 * (no un tablero de zonas), con la Dra. Nia, una terminal, un medidor y una
 * compuerta, leyendo `QUESTS[0]` (`lib/world/quests.ts`) sin ningún estado
 * de misión propio (`QuestScene`/`lib/world/questScene.ts`).
 *
 * Con el flag activo (Fase 14, docs/level-editor-plan.md §12.4, "decisión
 * explícita" ya tomada), la escena la pinta el motor genérico del Level
 * Editor (`LevelRuntime`) sobre `ciudadCentralAsLevel()` — mismo mundo,
 * mismos 3 desafíos y la misma restauración final, con algunas piezas muy
 * específicas de `QuestScene.tsx` simplificadas (ver el comentario largo de
 * `ciudadCentral.ts`: sin la presentación especial de Khaos la primera vez,
 * sin flecha guía). `QuestScene.tsx` no se toca ni se borra — sigue siendo
 * la escena real mientras el flag esté apagado (§12.1, "coexistencia, no
 * reemplazo").
 */
const LEVELS_V2 = process.env.NEXT_PUBLIC_LEVELS_V2 === "1";
export default function CiudadCentralPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string }>();
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [requests, setRequests] = useState<RequestDoc[]>([]);
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<string[]>([]);
  const [panel, setPanel] = useState<"ninguno" | "tienda">("ninguno");
  const [streak, setStreak] = useState(0);
  const totalStars = useTotalStars(user?.uid, params.childId);
  const [soundOn, toggleSound] = useSoundPreference();
  const placementPending = useRequirePlacement(params.childId, child, router);
  // Un solo `LevelDefinition` por sesión de la página: `ciudadCentralAsLevel`
  // genera ids nuevos en cada llamada (`newLevelId`/`newEntityId`/...), así
  // que recrearlo en cada render perdería la identidad de entidades/eventos
  // a mitad de partida (el bus de eventos vive en un `useState` que nunca se
  // reemplaza, atado a las referencias de este `level` — ver useLevelRuntime.ts).
  const levelV2 = useMemo(() => (LEVELS_V2 && user ? ciudadCentralAsLevel(user.uid) : null), [user]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore: { doc, getDoc } }) => {
        if (cancelled) return;
        return getDoc(doc(db, "parents", user.uid, "children", params.childId)).then((snap) => {
          if (cancelled) return;
          if (snap.exists()) {
            setChild(snap.data() as ChildProfile);
          } else setNotFound(true);
        });
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
      .then(({ db, firestore: { collection, getDocs } }) =>
        getDocs(collection(db, "parents", user.uid, "children", params.childId, "skillsProgress")),
      )
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

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore: { collection, getDocs } }) =>
        getDocs(collection(db, "parents", user.uid, "children", params.childId, "badges")),
      )
      .then((snap) => {
        if (cancelled) return;
        setEarnedBadgeIds(snap.docs.map((d) => d.id));
      })
      .catch((err) => console.error("No se pudieron cargar las insignias", err));
    return () => {
      cancelled = true;
    };
  }, [user, params.childId]);

  useEffect(() => {
    if (!user) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore: { collection, onSnapshot, orderBy, query } }) => {
        if (cancelled) return;
        const q = query(
          collection(db, "parents", user.uid, "children", params.childId, "redemptionRequests"),
          orderBy("createdAt", "desc"),
        );
        unsubscribe = onSnapshot(q, (snap) => {
          setRequests(snap.docs.map((d) => ({ id: d.id, ...(d.data() as RedemptionRequest) })));
        });
      })
      .catch((err) => console.error("No se pudieron cargar los canjes", err));
    return () => {
      cancelled = true;
      unsubscribe?.();
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
      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center"
      >
        <p className="text-slate-400">No encontré ese perfil.</p>
        <Link href="/perfiles" className="text-sm text-slate-400 underline underline-offset-2">
          Volver a perfiles
        </Link>
      </main>
    );
  }

  if (!child || placementPending || !progressLoaded) {
    return (
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-slate-300">
          Cargando…
        </p>
      </main>
    );
  }

  return (
    // `h-dvh overflow-hidden`: la escena es una cámara que sigue al
    // personaje (ver QuestScene/useCameraBox), no un lienzo que crece con
    // el contenido — nunca debe haber scroll vertical de página, solo la
    // imagen desplazándose por debajo del "visor" de tamaño fijo.
    <main id="contenido" tabIndex={-1} className="h-dvh overflow-hidden bg-slate-950 px-3 py-3 sm:px-4 sm:py-4">
      <div className="mx-auto h-full w-full max-w-3xl lg:max-w-none">
        <WorldTopBar
          childId={params.childId}
          childName={child.name}
          stars={totalStars}
          earnedBadgeIds={earnedBadgeIds}
          soundOn={soundOn}
          onToggleSound={toggleSound}
          nextChallengeModule={nextChallenge(progressBySkill)}
        />

        {levelV2 ? (
          <LevelRuntime
            level={levelV2}
            parentId={user.uid}
            childId={params.childId}
            childName={child.name}
            progressBySkill={progressBySkill}
            soundOn={soundOn}
          />
        ) : (
          <QuestScene
            childId={params.childId}
            parentId={user.uid}
            childName={child.name}
            progressBySkill={progressBySkill}
            streak={streak}
            soundOn={soundOn}
            onResolved={(moduleId, updated, correct) => {
              setProgressBySkill((prev) => ({ ...prev, [moduleId]: updated }));
              setStreak((s) => (correct ? s + 1 : 0));
            }}
            onOpenShop={() => {
              playSound("click", soundOn);
              setPanel("tienda");
            }}
          />
        )}

        {/* La tienda (`ShopPanel`) solo se abre hoy desde el registro de
            misión de `QuestScene` (`MissionOverlay`, no genérico) — con el
            motor nuevo activo ese botón no existe todavía, así que este es
            el único acceso mientras tanto (Fase 14, simplificación
            documentada en `ciudadCentral.ts`). */}
        {levelV2 && (
          <button
            type="button"
            onClick={() => {
              playSound("click", soundOn);
              setPanel("tienda");
            }}
            className="pointer-events-auto fixed bottom-3 right-3 z-30 flex min-h-11 items-center gap-1.5 rounded-full world-hud-panel px-3 py-1.5 text-sm font-semibold text-slate-100 sm:bottom-4 sm:right-4"
          >
            🏪 Tienda
          </button>
        )}
      </div>

      {panel === "tienda" && (
        <ShopPanel
          parentId={user.uid}
          childId={params.childId}
          maxStars={totalStars ?? 0}
          requests={requests}
          onClose={() => setPanel("ninguno")}
        />
      )}
    </main>
  );
}
