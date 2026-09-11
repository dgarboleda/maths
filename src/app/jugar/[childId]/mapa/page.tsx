"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile, RedemptionRequest, SkillProgress } from "@/lib/types";
import { useTotalStars } from "@/lib/useTotalStars";
import { useSoundPreference } from "@/lib/useSoundPreference";
import { useRequirePlacement } from "@/lib/useRequirePlacement";
import { listLevels, getLevel } from "@/lib/level/persistence/levelRepository";
import type { LevelDefinition } from "@/lib/level/schema";
import { getWorld } from "@/lib/gameworld/persistence/worldRepository";
import { worldGraphState } from "@/lib/gameworld/progress";
import { currentStoryMoment } from "@/lib/gameworld/storyProgress";
import type { GameWorld } from "@/lib/gameworld/schema";
import { masteredCountForStrand, nextChallenge, nextReview } from "@/lib/curriculum";
import { getStrandNarrative } from "@/lib/narrative";
import { STRANDS } from "@/lib/strands";
import { WorldTopBar } from "@/components/world/WorldHud";
import { ShopPanel, type RequestDoc } from "@/components/world/ShopPanel";
import { StoryBeatOverlay } from "@/components/world/StoryBeatOverlay";
import { AvatarPickerDialog } from "@/components/family/AvatarPickerDialog";
import { useResolvedAvatar } from "@/lib/useResolvedAvatar";
import { playSound } from "@/lib/gameSound";

const STATE_LABEL: Record<string, string> = { bloqueado: "Bloqueado", disponible: "Disponible", completado: "Completado" };
const STATE_CLASS: Record<string, string> = {
  bloqueado: "border-slate-700 bg-slate-900/60 text-slate-500",
  disponible: "border-cyan-400/50 bg-cyan-950/50 text-cyan-100 hover:bg-cyan-950/80",
  completado: "border-emerald-400/50 bg-emerald-950/50 text-emerald-100 hover:bg-emerald-950/80",
};

/**
 * Mapa del jugador — Fase 18 (docs/level-editor-plan-v2.md §5.3), ampliado a
 * hub del jugador en la Fase 28 (docs/plan-jugabilidad.md §2). Un nodo por
 * nivel, con estado derivado en cada carga de `skillsProgress`/`starLedger`
 * reales (`worldGraphState`) — cero estado propio de mundo — más las
 * superficies que hasta la Fase 28 solo existían en la ruta de regresión
 * `ciudad-central-legacy` y ningún enlace de producción alcanzaba: la barra
 * superior (AXIA, insignias, próximo desafío, repaso vencido), las zonas del
 * mundo, el Boss Challenge, la tienda y el diario de misiones.
 */
export default function JugarMapaPage() {
  const { user, loading, parentId } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string }>();
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [world, setWorld] = useState<GameWorld | null>(null);
  const [levels, setLevels] = useState<LevelDefinition[] | null>(null);
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<string[]>([]);
  const [requests, setRequests] = useState<RequestDoc[]>([]);
  const [panel, setPanel] = useState<"ninguno" | "tienda">("ninguno");
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  // Fase 32 (docs/plan-jugabilidad.md §6): `useResolvedAvatar` lee el
  // `avatarId` del hijo una sola vez al montar — este contador fuerza una
  // relectura justo después de elegir uno nuevo, para que el HUD lo
  // refleje sin recargar la página.
  const [avatarRefreshKey, setAvatarRefreshKey] = useState(0);
  const totalStars = useTotalStars(parentId, params.childId);
  const { avatar: resolvedAvatar } = useResolvedAvatar(parentId, params.childId, progressBySkill, avatarRefreshKey);
  const [soundOn, toggleSound] = useSoundPreference();
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
        if (!cancelled && snap.exists()) setChild(snap.data() as ChildProfile);
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

  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore: { collection, getDocs } }) => getDocs(collection(db, "parents", parentId, "children", params.childId, "badges")))
      .then((snap) => {
        if (!cancelled) setEarnedBadgeIds(snap.docs.map((d) => d.id));
      })
      .catch((err) => console.error("No se pudieron cargar las insignias", err));
    return () => {
      cancelled = true;
    };
  }, [parentId, params.childId]);

  useEffect(() => {
    if (!parentId) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore: { collection, onSnapshot, orderBy, query } }) => {
        if (cancelled) return;
        const q = query(
          collection(db, "parents", parentId, "children", params.childId, "redemptionRequests"),
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
  }, [parentId, params.childId]);

  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    getFirebase()
      .then(async ({ db, firestore }) => {
        const [w, summaries] = await Promise.all([getWorld(firestore, db, parentId), listLevels(firestore, db, parentId)]);
        const full = await Promise.all(summaries.map((s) => getLevel(firestore, db, parentId, s.id)));
        return { w, levels: full.filter((l): l is LevelDefinition => l !== null) };
      })
      .then(({ w, levels: full }) => {
        if (cancelled) return;
        setWorld(w);
        setLevels(full);
      })
      .catch((err) => console.error("No se pudo cargar el mundo", err));
    return () => {
      cancelled = true;
    };
  }, [parentId, params.childId]);

  if (loading || !user || !parentId || !child || placementPending || !progressLoaded || !levels || !world) {
    return (
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-slate-300">
          Cargando…
        </p>
      </main>
    );
  }

  const levelsById = Object.fromEntries(levels.map((l) => [l.id, l]));
  const graphState = worldGraphState(world, levelsById, progressBySkill, totalStars ?? 0);

  // Fase 30 (docs/plan-jugabilidad.md §4): intro/outro del mundo. `child` ya
  // está cargado acá (el gate de arriba lo exige), así que el hub es el
  // primer sitio real donde mostrarlos.
  const allNodesComplete = world.nodes.length > 0 && world.nodes.every((n) => graphState[n.levelId] === "completado");
  const seenStoryIds = child.seenStoryIds ?? [];
  const storyMoment = currentStoryMoment(world, { seenStoryIds, allNodesComplete });

  async function dismissStory(storyId: string) {
    const next = [...seenStoryIds, storyId];
    setChild((c) => (c ? { ...c, seenStoryIds: next } : c));
    if (!parentId) return;
    try {
      const { db, firestore } = await getFirebase();
      await firestore.updateDoc(firestore.doc(db, "parents", parentId, "children", params.childId), { seenStoryIds: next });
    } catch (err) {
      console.error("No se pudo guardar el progreso de la historia", err);
    }
  }

  return (
    <main id="contenido" tabIndex={-1} className="min-h-screen bg-slate-950 px-4 pb-6 pt-24 sm:px-6">
      <WorldTopBar
        childId={params.childId}
        childName={child.name}
        title={world.story.title || "Math Quest"}
        stars={totalStars}
        earnedBadgeIds={earnedBadgeIds}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        nextChallengeModule={nextChallenge(progressBySkill)}
        nextReviewModule={nextReview(progressBySkill)}
        avatarHeadshotSrc={resolvedAvatar?.headshotSrc}
        onAvatarClick={() => setAvatarPickerOpen(true)}
        streakDays={child.streakDays}
      />

      <div className="mx-auto max-w-3xl space-y-6">
        {world.story.logline && <p className="text-center text-sm text-slate-400">{world.story.logline}</p>}

        {/* Regla `showWorldMap` (Fase 28, docs/plan-jugabilidad.md §2.5): sigue
            ocultando solo la grilla de nodos, nunca el resto del hub — un
            mundo lineal (sin mapa) igual quiere zonas, boss, tienda y diario. */}
        {world.rules.showWorldMap &&
          (world.nodes.length === 0 ? (
            <p className="text-center text-sm text-slate-500">Este mundo todavía no tiene niveles en el mapa.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {world.nodes.map((node) => {
                const level = levelsById[node.levelId];
                const state = graphState[node.levelId] ?? "bloqueado";
                const locked = state === "bloqueado";
                // Fase 29 (docs/plan-jugabilidad.md §3): `allowReplay: false`
                // deja de mostrar como clicable un nodo ya completado — sigue
                // viéndose "Completado" (mismo STATE_CLASS), solo deja de ser
                // un enlace.
                const replayBlocked = state === "completado" && !world.rules.allowReplay;
                const content = (
                  <>
                    <span className="text-2xl leading-none">{node.icon || "🧩"}</span>
                    <span className="text-sm font-bold">{level?.name ?? node.label}</span>
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide">
                      {locked && <Lock className="size-3" aria-hidden="true" />}
                      {STATE_LABEL[state]}
                    </span>
                  </>
                );
                return (
                  <li key={node.levelId}>
                    {locked || replayBlocked || !level ? (
                      <div className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border px-3 py-3 text-center ${STATE_CLASS[state]}`}>{content}</div>
                    ) : (
                      <Link
                        href={`/jugar/${params.childId}/nivel/${node.levelId}`}
                        className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border px-3 py-3 text-center transition-colors ${STATE_CLASS[state]}`}
                      >
                        {content}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          ))}

        <section aria-labelledby="zonas-heading" className="space-y-2">
          <h2 id="zonas-heading" className="font-display text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Zonas
          </h2>
          <ul className="flex flex-col gap-1.5">
            {STRANDS.map((s) => {
              const { mastered, total } = masteredCountForStrand(progressBySkill, s.slug);
              const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
              const narrative = getStrandNarrative(s.slug);
              return (
                <li key={s.slug}>
                  <Link
                    href={`/jugar/${params.childId}/${s.slug}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2 text-sm font-bold text-slate-100 transition-colors hover:border-white/25"
                  >
                    <span>
                      <span aria-hidden="true">{narrative.icon} </span>
                      {narrative.zoneName}
                      <span className="ml-1.5 text-xs font-semibold text-slate-400">{s.label}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-slate-400">
                      <span
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Progreso en ${narrative.zoneName}`}
                        className="h-1.5 w-10 overflow-hidden rounded-full bg-white/15"
                      >
                        <span className="block h-1.5 rounded-full bg-cyan-400" style={{ width: `${pct}%` }} />
                      </span>
                      {mastered}/{total}
                    </span>
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href={`/jugar/${params.childId}/boss`}
                className="flex items-center gap-2 rounded-xl border border-pink-400/30 bg-pink-500/10 px-3 py-2 text-sm font-bold text-pink-200 transition-colors hover:border-pink-300/50"
              >
                <span aria-hidden="true">⚡</span>
                Central eléctrica · Boss Challenge
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  playSound("click", soundOn);
                  setPanel("tienda");
                }}
                className="flex w-full items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sm font-bold text-sky-200 transition-colors hover:border-sky-300/50"
              >
                <span aria-hidden="true">🏪</span>
                Tienda
              </button>
            </li>
          </ul>
          <Link href={`/jugar/${params.childId}/misiones`} className="inline-block text-sm font-bold text-amber-200 underline underline-offset-2">
            Ver diario completo ▸
          </Link>
        </section>

        <div className="text-center">
          <Link href={`/jugar/${params.childId}`} className="text-xs text-slate-500 underline underline-offset-2">
            Volver
          </Link>
        </div>
      </div>

      {panel === "tienda" && (
        <ShopPanel
          parentId={parentId}
          childId={params.childId}
          maxStars={totalStars ?? 0}
          requests={requests}
          onClose={() => setPanel("ninguno")}
        />
      )}

      {storyMoment && <StoryBeatOverlay beats={storyMoment.beats} onClose={() => dismissStory(storyMoment.storyId)} />}

      {avatarPickerOpen && (
        <AvatarPickerDialog
          parentId={parentId}
          child={{ ...child, id: params.childId }}
          onClose={() => setAvatarPickerOpen(false)}
          onSaved={(avatarId) => {
            setChild((c) => (c ? { ...c, avatarId } : c));
            setAvatarRefreshKey((k) => k + 1);
          }}
        />
      )}
    </main>
  );
}
