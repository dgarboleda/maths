"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile, RedemptionRequest, SkillProgress } from "@/lib/types";
import { STRANDS } from "@/lib/strands";
import { masteredCountForStrand, moduleHref, nextChallenge, recommendedModule } from "@/lib/curriculum";
import { getStrandNarrative } from "@/lib/narrative";
import { getBadge } from "@/lib/badges";
import { GameShell } from "@/components/GameShell";
import { playSound } from "@/lib/gameSound";
import { useTotalStars } from "@/lib/useTotalStars";
import { useSoundPreference } from "@/lib/useSoundPreference";

interface RequestDoc extends RedemptionRequest {
  id: string;
}

const STATUS_LABEL: Record<RedemptionRequest["status"], string> = {
  pendiente: "Esperando aprobación",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

const STRAND_GRADIENTS: Record<string, string> = {
  aritmetica: "from-violet-600 to-violet-900",
  algebra: "from-fuchsia-600 to-fuchsia-900",
  geometria: "from-blue-600 to-blue-900",
  medicion: "from-emerald-600 to-emerald-900",
  logica: "from-amber-600 to-amber-800",
};

export default function JugarPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string }>();
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [requests, setRequests] = useState<RequestDoc[]>([]);
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<string[]>([]);
  const [showRedeemForm, setShowRedeemForm] = useState(false);
  const [placementDismissed, setPlacementDismissed] = useState(false);
  const totalStars = useTotalStars(user?.uid, params.childId);
  const [soundOn, toggleSound] = useSoundPreference();

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
          if (snap.exists()) setChild(snap.data() as ChildProfile);
          else setNotFound(true);
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
      <main id="contenido"
        tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
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

  if (!child) {
    return (
      <main id="contenido"
        tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-slate-300">
          Cargando…
        </p>
      </main>
    );
  }

  return (
    <GameShell
      icon="✖️"
      title={`¡Hola, ${child.name}!`}
      subtitle={
        <Link href="/perfiles" className="underline">
          Cambiar de perfil
        </Link>
      }
      stars={totalStars}
      soundOn={soundOn}
      onToggleSound={toggleSound}
    >
      <div className="space-y-8">
        {child.placementStatus !== "completo" && !placementDismissed && (
          <div className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-violet-500/40 bg-gradient-to-r from-violet-950/70 to-fuchsia-950/70 px-5 py-4">
            <div>
              <p className="font-bold text-violet-100">
                <span aria-hidden="true">🎯 </span>¿Hacemos una evaluación rápida?
              </p>
              <p className="text-sm text-violet-300">Nos ayuda a saber por dónde empezar. Dura 10-20 minutos.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/jugar/${params.childId}/evaluacion`}
                onClick={() => playSound("click", soundOn)}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white hover:from-violet-500 hover:to-fuchsia-500"
              >
                Empezar
              </Link>
              <button
                type="button"
                onClick={() => setPlacementDismissed(true)}
                className="text-sm font-bold text-violet-300 underline underline-offset-2"
              >
                Ahora no
              </button>
            </div>
          </div>
        )}

        {earnedBadgeIds.length > 0 && (
          <ul className="flex flex-wrap justify-center gap-3" aria-label="Insignias ganadas">
            {earnedBadgeIds.map((id) => {
              const badge = getBadge(id);
              if (!badge) return null;
              return (
                <li
                  key={id}
                  title={`${badge.label}: ${badge.description}`}
                  className="flex items-center gap-2 rounded-full border-2 border-amber-400/40 bg-amber-950/40 px-3 py-1.5"
                >
                  <span aria-hidden="true" className="text-xl">
                    {badge.emoji}
                  </span>
                  <span className="text-sm font-bold text-amber-200">{badge.label}</span>
                </li>
              );
            })}
          </ul>
        )}

        {(() => {
          const challenge = nextChallenge(progressBySkill);
          if (!challenge) return null;
          return (
            <Link
              href={moduleHref(params.childId, challenge)}
              onClick={() => playSound("click", soundOn)}
              className="mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl border-2 border-amber-400/50 bg-gradient-to-r from-amber-600/80 to-orange-600/80 px-5 py-4 text-white shadow-lg ring-1 ring-white/10 transition-transform hover:scale-[1.01]"
            >
              <span className="flex items-center gap-3">
                <span aria-hidden="true" className="text-2xl">
                  ⭐
                </span>
                <span>
                  <span className="block text-xs font-bold uppercase tracking-wide text-amber-100">
                    Tu próximo desafío
                  </span>
                  <span className="block font-bold">
                    {challenge.emoji} {challenge.label}
                  </span>
                </span>
              </span>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">Ir →</span>
            </Link>
          );
        })()}

        <Link
          href={`/jugar/${params.childId}/boss`}
          onClick={() => playSound("click", soundOn)}
          className="mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl border-2 border-red-400/50 bg-gradient-to-r from-red-700/80 to-slate-900 px-5 py-4 text-white shadow-lg ring-1 ring-white/10 transition-transform hover:scale-[1.01]"
        >
          <span className="flex items-center gap-3">
            <span aria-hidden="true" className="text-2xl">
              💥
            </span>
            <span className="font-bold">Boss Challenge</span>
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">Entrar →</span>
        </Link>

        <div>
          <h2 className="mb-3 text-center text-lg font-bold text-indigo-200">
            ¿Qué quieres practicar hoy? <span aria-hidden="true">🎯</span>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {STRANDS.map((strand) => {
              const narrative = getStrandNarrative(strand.slug);
              const { mastered, total } = masteredCountForStrand(progressBySkill, strand.slug);
              const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
              const recommended = recommendedModule(progressBySkill, strand.slug);
              return (
                <div
                  key={strand.slug}
                  className={`flex flex-col gap-3 rounded-3xl bg-gradient-to-br ${STRAND_GRADIENTS[strand.slug]} p-4 text-white shadow-lg ring-1 ring-white/10`}
                >
                  <Link
                    href={`/jugar/${params.childId}/${strand.slug}`}
                    onClick={() => playSound("click", soundOn)}
                    className="flex items-center gap-3 rounded-xl hover:underline"
                  >
                    <span aria-hidden="true" className="text-3xl">
                      {narrative.icon}
                    </span>
                    <span>
                      <span className="block text-sm font-bold uppercase tracking-wide">{narrative.zoneName}</span>
                      <span className="block text-xs text-white/70">{strand.label}</span>
                    </span>
                  </Link>

                  <div>
                    <div
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Progreso en ${narrative.zoneName}`}
                      className="h-2 w-full overflow-hidden rounded-full bg-white/20"
                    >
                      <div className="h-2 rounded-full bg-white" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs font-bold text-white/90">
                      {mastered} / {total} habilidades dominadas
                    </p>
                  </div>

                  {recommended && (
                    <Link
                      href={moduleHref(params.childId, recommended)}
                      onClick={() => playSound("click", soundOn)}
                      className="mt-auto inline-flex w-fit items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-bold hover:bg-white/30"
                    >
                      ▶ Continuar misión
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mx-auto max-w-xl space-y-4 rounded-3xl border-2 border-indigo-500/30 bg-slate-900/60 p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-indigo-200">
              Canjear estrellas <span aria-hidden="true">⭐</span>
            </h2>
            {!showRedeemForm && (
              <button
                type="button"
                onClick={() => setShowRedeemForm(true)}
                disabled={!totalStars}
                className="rounded-xl bg-slate-800 px-4 py-1.5 text-sm font-bold text-indigo-200 hover:bg-slate-700 disabled:opacity-40"
              >
                Pedir canje
              </button>
            )}
          </div>

          {showRedeemForm && (
            <RedeemForm
              parentId={user.uid}
              childId={params.childId}
              maxStars={totalStars ?? 0}
              onDone={() => setShowRedeemForm(false)}
            />
          )}

          {requests.length > 0 && (
            <ul className="flex flex-col gap-2">
              {requests.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border-2 border-indigo-500/20 px-4 py-2 text-sm"
                >
                  <span className="text-slate-200">
                    {r.rewardLabel} · {r.starsSpent} <span aria-hidden="true">★</span>
                    <span className="sr-only">estrellas</span>
                  </span>
                  <span
                    className={
                      r.status === "aprobado"
                        ? "font-bold text-emerald-400"
                        : r.status === "rechazado"
                          ? "font-bold text-red-400"
                          : "font-bold text-slate-400"
                    }
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </GameShell>
  );
}

function RedeemForm({
  parentId,
  childId,
  maxStars,
  onDone,
}: {
  parentId: string;
  childId: string;
  maxStars: number;
  onDone: () => void;
}) {
  const [rewardLabel, setRewardLabel] = useState("");
  const [starsSpent, setStarsSpent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const amount = parseInt(starsSpent, 10);
    if (!Number.isInteger(amount) || amount <= 0) {
      setError("Ingresa una cantidad válida de estrellas.");
      return;
    }
    if (amount > maxStars) {
      setError(`Solo tienes ${maxStars} ★ disponibles.`);
      return;
    }
    if (!rewardLabel.trim()) {
      setError("Dile a tu papá o mamá qué quieres canjear.");
      return;
    }
    setSubmitting(true);
    try {
      const {
        db,
        firestore: { addDoc, collection, serverTimestamp },
      } = await getFirebase();
      await addDoc(
        collection(db, "parents", parentId, "children", childId, "redemptionRequests"),
        {
          starsSpent: amount,
          rewardLabel: rewardLabel.trim(),
          status: "pendiente",
          createdAt: serverTimestamp(),
          resolvedAt: null,
        },
      );
      onDone();
    } catch {
      setError("No se pudo enviar la solicitud. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border-2 border-indigo-500/30 bg-slate-950/60 p-4">
      <label className="flex flex-col gap-1 text-sm font-bold text-indigo-200">
        ¿Qué quieres canjear?
        <input
          value={rewardLabel}
          onChange={(e) => setRewardLabel(e.target.value)}
          placeholder="Ej. 800 Robux"
          className="rounded-xl border-2 border-indigo-500/30 bg-slate-900 px-3 py-2 font-normal text-slate-100 placeholder:text-slate-500 focus:border-violet-400"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-bold text-indigo-200">
        ¿Cuántas estrellas? (tienes {maxStars} ★)
        <input
          inputMode="numeric"
          value={starsSpent}
          onChange={(e) => setStarsSpent(e.target.value.replace(/\D/g, ""))}
          className="rounded-xl border-2 border-indigo-500/30 bg-slate-900 px-3 py-2 font-normal text-slate-100 focus:border-violet-400"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm font-bold text-red-400">
          {error}
        </p>
      )}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          Enviar
        </button>
        <button type="button" onClick={onDone} className="text-sm font-bold text-slate-400">
          Cancelar
        </button>
      </div>
    </form>
  );
}
