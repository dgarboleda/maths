"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile, RedemptionRequest, SkillProgress } from "@/lib/types";
import { nextChallenge } from "@/lib/curriculum";
import { WorldTopBar } from "@/components/world/WorldHud";
import { QuestScene } from "@/components/world/QuestScene";
import { ShopPanel, type RequestDoc } from "@/components/world/ShopPanel";
import { playSound } from "@/lib/gameSound";
import { useTotalStars } from "@/lib/useTotalStars";
import { useSoundPreference } from "@/lib/useSoundPreference";
import { useRequirePlacement } from "@/lib/useRequirePlacement";

/**
 * Ciudad Central: la pantalla de entrada del niño es la misión "El apagón",
 * puerto del prototipo de referencia — una sola escena pintada (no un
 * tablero de zonas), con la Dra. Nia, una terminal, un medidor y una
 * compuerta. Todo lo que se ve —qué punto está activo, qué se enciende, qué
 * se abre— se lee del motor académico de siempre (`QUESTS[0]` en
 * `lib/world/quests.ts`); esta pantalla no guarda ningún estado de misión
 * propio (ver `QuestScene`/`lib/world/questScene.ts`).
 */
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
    <main id="contenido" tabIndex={-1} className="min-h-screen bg-slate-950 px-3 py-3 sm:px-4 sm:py-4">
      <div className="mx-auto w-full max-w-3xl lg:max-w-none">
        <WorldTopBar
          childId={params.childId}
          childName={child.name}
          stars={totalStars}
          earnedBadgeIds={earnedBadgeIds}
          soundOn={soundOn}
          onToggleSound={toggleSound}
          nextChallengeModule={nextChallenge(progressBySkill)}
        />

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
