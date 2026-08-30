"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthProvider";
import { auth, db } from "@/lib/firebase";
import type { Attempt, ChildProfile, RedemptionRequest, SkillProgress } from "@/lib/types";
import { STRANDS, getStrand } from "@/lib/strands";
import { frontierDifficulty, masteredCount } from "@/lib/mastery";
import { suggestedDifficulty } from "@/lib/problem";
import { useTotalStars } from "@/lib/useTotalStars";

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
    const q = query(
      collection(db, "parents", user.uid, "children"),
      orderBy("createdAt", "asc"),
    );
    return onSnapshot(q, (snap) => {
      setChildren(snap.docs.map((d) => ({ id: d.id, ...(d.data() as ChildProfile) })));
    });
  }, [user]);

  if (loading || !user) return null;

  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 bg-white px-6 py-14"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Panel de padre</h1>
          <Link href="/perfiles" className="text-sm text-neutral-500 underline underline-offset-2">
            Volver a perfiles
          </Link>
        </div>
        <button
          type="button"
          onClick={() => signOut(auth)}
          className="text-sm text-neutral-600 underline underline-offset-2"
        >
          Cerrar sesión
        </button>
      </div>

      {children.length === 0 && (
        <p className="text-neutral-700">Todavía no hay perfiles de hijos creados.</p>
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
    return onSnapshot(
      collection(db, "parents", parentId, "children", child.id, "skillsProgress"),
      (snap) => {
        const map: Record<string, SkillProgress> = {};
        snap.forEach((d) => (map[d.id] = d.data() as SkillProgress));
        setProgressBySkill(map);
      },
    );
  }, [parentId, child.id]);

  useEffect(() => {
    const q = query(
      collection(db, "parents", parentId, "children", child.id, "redemptionRequests"),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...(d.data() as RedemptionRequest) })));
    });
  }, [parentId, child.id]);

  useEffect(() => {
    const q = query(
      collection(db, "parents", parentId, "children", child.id, "attempts"),
      orderBy("createdAt", "desc"),
      limit(8),
    );
    return onSnapshot(q, (snap) => {
      setAttempts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Attempt) })));
    });
  }, [parentId, child.id]);

  const pending = requests.filter((r) => r.status === "pendiente");
  const resolved = requests.filter((r) => r.status !== "pendiente").slice(0, 5);

  async function resolveRequest(request: RequestDoc, approve: boolean) {
    if (resolvingId) return;
    setResolvingId(request.id);
    try {
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
    <section
      aria-label={`Progreso de ${child.name}`}
      className="flex flex-col gap-4 rounded-xl border border-neutral-200 p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-800"
          >
            {child.name.charAt(0).toUpperCase()}
          </span>
          <span className="font-medium text-neutral-900">{child.name}</span>
        </div>
        <span className="font-medium text-amber-700">
          {totalStars === null ? "…" : `${totalStars} estrellas`}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-700">
          Progreso por hilo
        </h3>
        <ul className="grid grid-cols-1 gap-1 text-sm text-neutral-600 sm:grid-cols-2">
          {STRANDS.map((s) => {
            const floor = suggestedDifficulty(child.birthDate);
            const frontier = frontierDifficulty(progressBySkill, s.slug, floor);
            const dominados = masteredCount(progressBySkill, s.slug);
            return (
              <li key={s.slug} className="flex items-center justify-between">
                <span>{s.label}</span>
                <span className="text-neutral-600">
                  nivel {frontier} · {dominados} dominados
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {pending.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-700">
            Canjes pendientes
          </h3>
          {pending.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
            >
              <span className="text-sm text-neutral-900">
                {r.rewardLabel} · {r.starsSpent} estrellas
              </span>
              <div className="flex gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => resolveRequest(r, true)}
                  disabled={resolvingId === r.id}
                  aria-label={`Aprobar el canje de ${r.rewardLabel} por ${r.starsSpent} estrellas`}
                  className="font-medium text-emerald-700 underline underline-offset-2 disabled:opacity-40"
                >
                  Aprobar
                </button>
                <button
                  type="button"
                  onClick={() => resolveRequest(r, false)}
                  disabled={resolvingId === r.id}
                  aria-label={`Rechazar el canje de ${r.rewardLabel} por ${r.starsSpent} estrellas`}
                  className="text-neutral-600 underline underline-offset-2 disabled:opacity-40"
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
          <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-700">
            Canjes resueltos
          </h3>
          {resolved.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm">
              <span className="text-neutral-700">
                {r.rewardLabel} · {r.starsSpent} estrellas
              </span>
              <span className={r.status === "aprobado" ? "text-emerald-700" : "text-red-700"}>
                {r.status === "aprobado" ? "Aprobado" : "Rechazado"}
              </span>
            </div>
          ))}
        </div>
      )}

      {attempts.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-700">
            Actividad reciente
          </h3>
          <ul className="flex flex-col gap-1 text-sm text-neutral-600">
            {attempts.map((a) => (
              <li key={a.id} className="flex items-center justify-between">
                <span>{describeSkill(a.skillId)}</span>
                <span className={a.correct ? "text-emerald-700" : "text-neutral-700"}>
                  {a.correct ? "correcto" : "incorrecto"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pending.length === 0 && resolved.length === 0 && attempts.length === 0 && (
        <p className="text-sm text-neutral-700">Todavía no hay actividad.</p>
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
