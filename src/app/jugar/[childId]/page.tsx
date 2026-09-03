"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile, RedemptionRequest, SkillProgress } from "@/lib/types";
import { STRANDS } from "@/lib/strands";
import { countUnlocked } from "@/lib/curriculum";
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
  aritmetica: "from-purple-500 to-purple-700",
  algebra: "from-pink-500 to-pink-700",
  geometria: "from-blue-500 to-blue-700",
  medicion: "from-emerald-500 to-emerald-700",
  logica: "from-amber-500 to-amber-600",
};

export default function JugarPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string }>();
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [requests, setRequests] = useState<RequestDoc[]>([]);
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
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
        tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-white">
        <p role="status" className="text-neutral-700">
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
        className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 bg-white px-6 text-center"
      >
        <p className="text-neutral-500">No encontré ese perfil.</p>
        <Link href="/perfiles" className="text-sm text-neutral-500 underline underline-offset-2">
          Volver a perfiles
        </Link>
      </main>
    );
  }

  if (!child) {
    return (
      <main id="contenido"
        tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-white">
        <p role="status" className="text-neutral-700">
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
          <div className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-purple-300 bg-gradient-to-r from-purple-100 to-pink-100 px-5 py-4">
            <div>
              <p className="font-bold text-purple-900">
                <span aria-hidden="true">🎯 </span>¿Hacemos una evaluación rápida?
              </p>
              <p className="text-sm text-purple-700">Nos ayuda a saber por dónde empezar. Dura 10-20 minutos.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/jugar/${params.childId}/evaluacion`}
                onClick={() => playSound("click", soundOn)}
                className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-500"
              >
                Empezar
              </Link>
              <button
                type="button"
                onClick={() => setPlacementDismissed(true)}
                className="text-sm font-bold text-purple-700 underline underline-offset-2"
              >
                Ahora no
              </button>
            </div>
          </div>
        )}

        <div>
          <h2 className="mb-3 text-center text-lg font-bold text-purple-800">
            ¿Qué quieres practicar hoy? <span aria-hidden="true">🎯</span>
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {STRANDS.map((strand) => {
              const { unlocked, total } = countUnlocked(progressBySkill, strand.slug);
              return (
                <Link
                  key={strand.slug}
                  href={`/jugar/${params.childId}/${strand.slug}`}
                  onClick={() => playSound("click", soundOn)}
                  className={`flex aspect-square flex-col items-center justify-center gap-2 rounded-3xl bg-gradient-to-br ${STRAND_GRADIENTS[strand.slug]} text-white shadow-lg transition-transform hover:scale-105`}
                >
                  <span aria-hidden="true" className="text-4xl">
                    {strand.emoji}
                  </span>
                  <span className="px-2 text-center text-sm font-bold">{strand.label}</span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                    {unlocked}/{total} desbloqueados
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mx-auto max-w-xl space-y-4 rounded-3xl border-4 border-purple-200 bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-purple-800">
              Canjear estrellas <span aria-hidden="true">⭐</span>
            </h2>
            {!showRedeemForm && (
              <button
                type="button"
                onClick={() => setShowRedeemForm(true)}
                disabled={!totalStars}
                className="rounded-xl bg-purple-100 px-4 py-1.5 text-sm font-bold text-purple-700 hover:bg-purple-200 disabled:opacity-40"
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
                  className="flex items-center justify-between rounded-xl border-2 border-purple-100 px-4 py-2 text-sm"
                >
                  <span className="text-purple-900">
                    {r.rewardLabel} · {r.starsSpent} <span aria-hidden="true">★</span>
                    <span className="sr-only">estrellas</span>
                  </span>
                  <span
                    className={
                      r.status === "aprobado"
                        ? "font-bold text-emerald-600"
                        : r.status === "rechazado"
                          ? "font-bold text-red-500"
                          : "font-bold text-slate-700"
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border-2 border-purple-100 bg-purple-50 p-4">
      <label className="flex flex-col gap-1 text-sm font-bold text-purple-800">
        ¿Qué quieres canjear?
        <input
          value={rewardLabel}
          onChange={(e) => setRewardLabel(e.target.value)}
          placeholder="Ej. 800 Robux"
          className="rounded-xl border-2 border-purple-200 px-3 py-2 font-normal focus:border-purple-500"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-bold text-purple-800">
        ¿Cuántas estrellas? (tienes {maxStars} ★)
        <input
          inputMode="numeric"
          value={starsSpent}
          onChange={(e) => setStarsSpent(e.target.value.replace(/\D/g, ""))}
          className="rounded-xl border-2 border-purple-200 px-3 py-2 font-normal focus:border-purple-500"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm font-bold text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          Enviar
        </button>
        <button type="button" onClick={onDone} className="text-sm font-bold text-slate-700">
          Cancelar
        </button>
      </div>
    </form>
  );
}
