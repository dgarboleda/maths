"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { Attempt, ChildProfile, RedemptionRequest, SkillProgress } from "@/lib/types";
import { STRANDS, getStrand } from "@/lib/strands";
import { recommendedModule, countUnlocked } from "@/lib/curriculum";
import { useTotalStars } from "@/lib/useTotalStars";
import { Avatar } from "@/components/world/Avatar";

interface ChildDoc extends ChildProfile {
  id: string;
}

export default function PanelPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<ChildDoc[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore: { collection, onSnapshot, orderBy, query } }) => {
        if (cancelled) return;
        const q = query(collection(db, "parents", user.uid, "children"), orderBy("createdAt", "asc"));
        unsubscribe = onSnapshot(q, (snap) => {
          setChildren(snap.docs.map((d) => ({ id: d.id, ...(d.data() as ChildProfile) })));
        });
      })
      .catch((err) => console.error("No se pudo cargar la lista de hijos", err));
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user]);

  if (loading || !user) {
    return (
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-indigo-200">
          Cargando…
        </p>
      </main>
    );
  }

  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 bg-slate-950 px-6 py-10"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="family-text-glow font-display text-2xl font-bold text-white">Panel de padre</h1>
          <Link href="/perfiles" className="text-sm font-semibold text-indigo-300 underline-offset-2 hover:underline">
            Volver a perfiles
          </Link>
        </div>
        <button
          type="button"
          onClick={() => getFirebase().then(({ auth }) => signOut(auth)).catch(console.error)}
          className="text-sm font-semibold text-slate-400 underline-offset-2 hover:underline"
        >
          Cerrar sesión
        </button>
      </div>

      {children.length === 0 && (
        <p className="family-panel rounded-2xl px-4 py-5 text-sm text-indigo-200">
          Todavía no hay perfiles de hijos creados.
        </p>
      )}

      <div className="flex flex-col gap-6">
        {children.map((child) => (
          <ChildSection key={child.id} parentId={user.uid} child={child} />
        ))}
      </div>
    </main>
  );
}

interface RequestDoc extends RedemptionRequest {
  id: string;
}
interface AttemptDoc extends Attempt {
  id: string;
}

function ChildSection({ parentId, child }: { parentId: string; child: ChildDoc }) {
  const totalStars = useTotalStars(parentId, child.id);
  const [requests, setRequests] = useState<RequestDoc[]>([]);
  const [attempts, setAttempts] = useState<AttemptDoc[]>([]);
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore: { collection, onSnapshot } }) => {
        if (cancelled) return;
        unsubscribe = onSnapshot(
          collection(db, "parents", parentId, "children", child.id, "skillsProgress"),
          (snap) => {
            const map: Record<string, SkillProgress> = {};
            snap.forEach((d) => (map[d.id] = d.data() as SkillProgress));
            setProgressBySkill(map);
          },
        );
      })
      .catch((err) => console.error("No se pudo cargar el progreso", err));
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [parentId, child.id]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore: { collection, onSnapshot, orderBy, query } }) => {
        if (cancelled) return;
        const q = query(
          collection(db, "parents", parentId, "children", child.id, "redemptionRequests"),
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
  }, [parentId, child.id]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore: { collection, onSnapshot, orderBy, query, limit } }) => {
        if (cancelled) return;
        const q = query(
          collection(db, "parents", parentId, "children", child.id, "attempts"),
          orderBy("createdAt", "desc"),
          limit(8),
        );
        unsubscribe = onSnapshot(q, (snap) => {
          setAttempts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Attempt) })));
        });
      })
      .catch((err) => console.error("No se pudo cargar la actividad reciente", err));
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [parentId, child.id]);

  const pending = requests.filter((r) => r.status === "pendiente");
  const resolved = requests.filter((r) => r.status !== "pendiente").slice(0, 5);

  async function resolveRequest(request: RequestDoc, approve: boolean) {
    if (resolvingId) return;
    setResolvingId(request.id);
    try {
      const {
        db,
        firestore: { addDoc, collection, doc, serverTimestamp, updateDoc },
      } = await getFirebase();
      if (approve) {
        await addDoc(collection(db, "parents", parentId, "children", child.id, "starLedger"), {
          delta: -request.starsSpent,
          reason: "redemption",
          attemptId: null,
          createdAt: serverTimestamp(),
        });
      }
      await updateDoc(
        doc(db, "parents", parentId, "children", child.id, "redemptionRequests", request.id),
        {
          status: approve ? "aprobado" : "rechazado",
          resolvedAt: serverTimestamp(),
        },
      );
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <section aria-label={`Progreso de ${child.name}`} className="family-panel flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-600/40 to-fuchsia-600/30">
            <Avatar className="h-7" title={child.name} />
          </span>
          <span className="font-display font-bold text-white">{child.name}</span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-slate-900/60 px-3 py-1 text-sm font-bold text-amber-300">
          <span aria-hidden="true">⭐</span>
          {totalStars === null ? "…" : `${totalStars} estrellas`}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-xs font-bold uppercase tracking-wide text-indigo-300">Progreso por hilo</h3>
        <ul className="grid grid-cols-1 gap-1 text-sm text-slate-300 sm:grid-cols-2">
          {STRANDS.map((s) => {
            const recommended = recommendedModule(progressBySkill, s.slug);
            const { unlocked, total } = countUnlocked(progressBySkill, s.slug);
            return (
              <li key={s.slug} className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-200">{s.label}</span>
                <span className="text-slate-400">
                  {recommended ? recommended.label : "todo dominado"} · {unlocked}/{total}
                </span>
              </li>
            );
          })}
        </ul>
        <Link
          href={`/panel/${child.id}`}
          className="mt-1 self-start text-sm font-semibold text-cyan-300 underline-offset-2 hover:underline"
        >
          Ver currícula completa
        </Link>
      </div>

      {pending.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-indigo-300">Canjes pendientes</h3>
          {pending.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3"
            >
              <span className="text-sm font-semibold text-amber-100">
                {r.rewardLabel} · {r.starsSpent} estrellas
              </span>
              <div className="flex gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => resolveRequest(r, true)}
                  disabled={resolvingId === r.id}
                  aria-label={`Aprobar el canje de ${r.rewardLabel} por ${r.starsSpent} estrellas`}
                  className="font-bold text-emerald-300 underline-offset-2 hover:underline disabled:opacity-40"
                >
                  Aprobar
                </button>
                <button
                  type="button"
                  onClick={() => resolveRequest(r, false)}
                  disabled={resolvingId === r.id}
                  aria-label={`Rechazar el canje de ${r.rewardLabel} por ${r.starsSpent} estrellas`}
                  className="font-semibold text-slate-400 underline-offset-2 hover:underline disabled:opacity-40"
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-bold uppercase tracking-wide text-indigo-300">Canjes resueltos</h3>
          {resolved.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm">
              <span className="text-slate-300">
                {r.rewardLabel} · {r.starsSpent} estrellas
              </span>
              <span className={r.status === "aprobado" ? "font-semibold text-emerald-300" : "font-semibold text-red-300"}>
                {r.status === "aprobado" ? "Aprobado" : "Rechazado"}
              </span>
            </div>
          ))}
        </div>
      )}

      {attempts.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-bold uppercase tracking-wide text-indigo-300">Actividad reciente</h3>
          <ul className="flex flex-col gap-1 text-sm text-slate-300">
            {attempts.map((a) => (
              <li key={a.id} className="flex items-center justify-between">
                <span>{describeSkill(a.skillId)}</span>
                <span className={a.correct ? "font-semibold text-emerald-300" : "text-slate-400"}>
                  {a.correct ? "correcto" : "incorrecto"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pending.length === 0 && resolved.length === 0 && attempts.length === 0 && (
        <p className="text-sm text-slate-400">Todavía no hay actividad.</p>
      )}
    </section>
  );
}

function describeSkill(skillId: string): string {
  const parts = skillId.split("-");
  const strandLabel = getStrand(parts[0])?.label ?? parts[0];
  const kind = parts.slice(1, -1).join(" ").replaceAll("_", " ");
  const level = parts[parts.length - 1]?.replace("d", "nivel ");
  return `${strandLabel} · ${kind} · ${level}`;
}
