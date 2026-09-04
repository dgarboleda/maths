"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile, RedemptionRequest, SkillProgress } from "@/lib/types";
import { nextChallenge } from "@/lib/curriculum";
import { activeQuest } from "@/lib/world/quests";
import { normalizeAvatar, type AvatarLook } from "@/lib/world/avatar";
import { CityScene } from "@/components/world/CityScene";
import { QuestPanel, WorldTopBar } from "@/components/world/WorldHud";
import { ShopPanel, type RequestDoc } from "@/components/world/ShopPanel";
import { AvatarEditor } from "@/components/world/AvatarEditor";
import { playSound } from "@/lib/gameSound";
import { useTotalStars } from "@/lib/useTotalStars";
import { useSoundPreference } from "@/lib/useSoundPreference";
import { useRequirePlacement } from "@/lib/useRequirePlacement";

/**
 * Ciudad Central: la pantalla de entrada del niño ya no es un tablero de
 * tarjetas, sino el mundo. Todo lo que se ve —zonas encendidas, candados,
 * misión activa, estrellas, insignias— se lee del motor académico de siempre;
 * esta pantalla no guarda ningún estado de juego propio.
 */
export default function CiudadCentralPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string }>();
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [requests, setRequests] = useState<RequestDoc[]>([]);
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<string[]>([]);
  const [look, setLook] = useState<AvatarLook | null>(null);
  const [panel, setPanel] = useState<"ninguno" | "tienda" | "personaje">("ninguno");
  const [npcAbierto, setNpcAbierto] = useState(false);
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
            const profile = snap.data() as ChildProfile;
            setChild(profile);
            setLook(normalizeAvatar(profile.avatar));
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
      .catch((err) => console.error("No se pudo cargar el progreso", err));
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

  if (!child || !look || placementPending) {
    return (
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-slate-300">
          Cargando…
        </p>
      </main>
    );
  }

  const quest = activeQuest(progressBySkill);
  // La evaluación inicial ya es obligatoria para llegar hasta aquí
  // (useRequirePlacement redirige mientras esté pendiente): Ada solo
  // ofrece repetirla, y únicamente cuando el niño la llama.

  return (
    <main id="contenido" tabIndex={-1} className="min-h-screen bg-slate-950 px-3 py-3 sm:px-4 sm:py-4">
      <div className="mx-auto w-full max-w-3xl">
        <WorldTopBar
          childId={params.childId}
          childName={child.name}
          look={look}
          stars={totalStars}
          earnedBadgeIds={earnedBadgeIds}
          soundOn={soundOn}
          onToggleSound={toggleSound}
          onOpenAvatar={() => setPanel("personaje")}
          nextChallengeModule={nextChallenge(progressBySkill)}
        />

        {npcAbierto && (
          <div className="anim-rise world-quest-panel mb-2 flex items-start gap-3 rounded-2xl border-2 border-cyan-400/40 px-4 py-3">
            <span
              aria-hidden="true"
              className="world-ring-glow flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/40 bg-cyan-500/10 text-3xl"
            >
              🧑‍🔬
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold text-cyan-100">
                Ada, la ingeniera: <span aria-hidden="true">🎯 </span>¿Volvemos a medir tu nivel?
              </p>
              <p className="text-xs text-cyan-300/90">
                —Repetirla te dice cuánto avanzaste desde la última vez. Empezamos justo encima de lo que ya dominas.
              </p>
              <div className="mt-2 flex items-center gap-3">
                <Link
                  href={`/jugar/${params.childId}/evaluacion`}
                  onClick={() => playSound("click", soundOn)}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-1.5 text-sm font-bold text-white"
                >
                  Volver a evaluar
                </Link>
                <button
                  type="button"
                  onClick={() => setNpcAbierto(false)}
                  className="text-sm font-bold text-cyan-300 underline underline-offset-2"
                >
                  Ahora no
                </button>
              </div>
            </div>
          </div>
        )}

        <CityScene
          childId={params.childId}
          childName={child.name}
          look={look}
          progressBySkill={progressBySkill}
          questStrandSlug={quest?.quest.strandSlug ?? null}
          onOpenShop={() => {
            playSound("click", soundOn);
            setPanel("tienda");
          }}
          onOpenNpc={() => {
            playSound("click", soundOn);
            setNpcAbierto(true);
          }}
        />

        <QuestPanel
          childId={params.childId}
          quest={quest}
          onFocusZone={(strandSlug) => router.push(`/jugar/${params.childId}/${strandSlug}`)}
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

      {panel === "personaje" && (
        <AvatarEditor
          parentId={user.uid}
          childId={params.childId}
          look={look}
          onChange={setLook}
          onClose={() => setPanel("ninguno")}
        />
      )}
    </main>
  );
}
