"use client";

import { useEffect, useMemo, useState } from "react";
import { getFirebase } from "@/lib/firebase";
import type { Attempt, RedemptionRequest, SkillProgress } from "@/lib/types";
import { STRANDS } from "@/lib/strands";
import { allModules, isMastered, masteredCountForStrand, modulesForStrand } from "@/lib/curriculum";
import { todayKey } from "@/lib/mastery";
import { QUESTS, activeQuest, questProgress } from "@/lib/world/quests";
import { getStrandNarrative } from "@/lib/narrative";
import { BADGES, type BadgeDef } from "@/lib/badges";
import { useTotalStars } from "@/lib/useTotalStars";
import { describeSkill } from "./describeSkill";

export type Trend = "sube" | "estable" | "baja";

export interface StrandRow {
  slug: string;
  label: string;
  emoji: string;
  mastery: number;
  trend: Trend;
  attempts: number;
}

export type WorldStatus = "completado" | "en-curso" | "bloqueado";

export interface WorldRow {
  id: string;
  icon: string;
  title: string;
  premise: string;
  zoneName: string;
  status: WorldStatus;
  done: number;
  total: number;
}

export interface CurrentMission {
  icon: string;
  title: string;
  zoneName: string;
  progressLabel: string;
}

export type ActivityKind = "practica" | "insignia" | "canje";

export interface ActivityItem {
  id: string;
  when: number;
  kind: ActivityKind;
  text: string;
  detail?: string;
}

export interface EarnedBadge extends BadgeDef {
  unlocked: boolean;
  earnedAt: number | null;
}

export interface RequestDoc extends RedemptionRequest {
  id: string;
}

export interface ChildDashboard {
  loading: boolean;
  masteryGlobal: number;
  level: number;
  weeklyAccuracy: number;
  weeklyProblems: { day: string; problems: number }[];
  streak: number;
  /** Días desde el último intento registrado; `null` si nunca practicó. */
  daysSinceLastAttempt: number | null;
  strandRows: StrandRow[];
  worlds: WorldRow[];
  currentMission: CurrentMission | null;
  badges: EarnedBadge[];
  activity: ActivityItem[];
  pendingRedemptions: RequestDoc[];
  resolvedRedemptions: RequestDoc[];
  totalStars: number | null;
}

/** `serverTimestamp()` llega como `Timestamp` de Firestore, no como el
 * `number` que declara el tipo — este es el primer código que necesita el
 * valor real en milisegundos (los usos anteriores solo ordenaban con él). */
function toMillis(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof (value as { toMillis?: () => number }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function trendFromResults(results: Array<{ correct: boolean; day: string }>): Trend {
  if (results.length < 4) return "estable";
  const sorted = [...results].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  const mid = Math.floor(sorted.length / 2);
  const older = sorted.slice(0, mid);
  const recent = sorted.slice(mid);
  const accuracy = (arr: typeof sorted) => arr.filter((r) => r.correct).length / arr.length;
  const diffPoints = (accuracy(recent) - accuracy(older)) * 100;
  if (diffPoints >= 10) return "sube";
  if (diffPoints <= -10) return "baja";
  return "estable";
}

/** Días desde `millis` hasta ahora, en un helper propio para que el hook no
 * llame directamente a `Date.now()` durante el render. */
function daysSince(millis: number): number {
  return Math.floor((Date.now() - millis) / 86_400_000);
}

/** Últimos 7 días calendario locales, del más antiguo al más reciente. */
function lastSevenDays(): { key: string; label: string }[] {
  const days: { key: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push({
      key: todayKey(date),
      label: date.toLocaleDateString("es", { weekday: "narrow" }).toUpperCase(),
    });
  }
  return days;
}

/**
 * Panel de datos de un hijo para el panel familiar: un solo objeto
 * calculado a partir de colecciones reales (`skillsProgress`, `attempts`,
 * `badges`, `redemptionRequests`), reusando exclusivamente las reglas de
 * negocio que ya existen (mastery, misiones, insignias) — no inventa
 * ningún dato nuevo.
 */
export function useChildDashboard(
  parentId: string | undefined,
  childId: string | undefined,
): ChildDashboard {
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
  const [attempts, setAttempts] = useState<Array<Attempt & { id: string }>>([]);
  const [earnedBadges, setEarnedBadges] = useState<Record<string, number>>({});
  const [redemptions, setRedemptions] = useState<RequestDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const totalStars = useTotalStars(parentId, childId);

  useEffect(() => {
    if (!parentId || !childId) return;
    let cancelled = false;
    const unsubscribes: Array<() => void> = [];

    getFirebase()
      .then(({ db, firestore: { collection, onSnapshot, orderBy, query, limit } }) => {
        if (cancelled) return;

        unsubscribes.push(
          onSnapshot(collection(db, "parents", parentId, "children", childId, "skillsProgress"), (snap) => {
            const map: Record<string, SkillProgress> = {};
            snap.forEach((d) => (map[d.id] = d.data() as SkillProgress));
            setProgressBySkill(map);
            setLoading(false);
          }),
        );

        unsubscribes.push(
          onSnapshot(
            query(
              collection(db, "parents", parentId, "children", childId, "attempts"),
              orderBy("createdAt", "desc"),
              limit(400),
            ),
            (snap) => {
              setAttempts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Attempt) })));
            },
          ),
        );

        unsubscribes.push(
          onSnapshot(collection(db, "parents", parentId, "children", childId, "badges"), (snap) => {
            const map: Record<string, number> = {};
            snap.forEach((d) => (map[d.id] = (d.data().earnedAt as number) ?? 0));
            setEarnedBadges(map);
          }),
        );

        unsubscribes.push(
          onSnapshot(
            query(
              collection(db, "parents", parentId, "children", childId, "redemptionRequests"),
              orderBy("createdAt", "desc"),
            ),
            (snap) => {
              setRedemptions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as RedemptionRequest) })));
            },
          ),
        );
      })
      .catch((err) => {
        console.error("No se pudo cargar el panel del hijo", err);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      unsubscribes.forEach((u) => u());
    };
  }, [parentId, childId]);

  return useMemo(() => {
    const modules = allModules();
    const masteredModules = modules.filter((m) => isMastered(progressBySkill, m.id)).length;
    const masteryGlobal = modules.length ? Math.round((masteredModules / modules.length) * 100) : 0;

    const week = lastSevenDays();
    const attemptsByDay = new Map<string, Attempt[]>();
    for (const a of attempts) {
      const key = todayKey(new Date(toMillis(a.createdAt)));
      const list = attemptsByDay.get(key) ?? [];
      list.push(a);
      attemptsByDay.set(key, list);
    }
    const weeklyProblems = week.map(({ key, label }) => ({
      day: label,
      problems: attemptsByDay.get(key)?.length ?? 0,
    }));
    const weekAttempts = week.flatMap(({ key }) => attemptsByDay.get(key) ?? []);
    const weeklyAccuracy = weekAttempts.length
      ? Math.round((weekAttempts.filter((a) => a.correct).length / weekAttempts.length) * 100)
      : 0;

    const distinctDays = new Set(attempts.map((a) => todayKey(new Date(toMillis(a.createdAt)))));
    let streak = 0;
    const cursor = new Date();
    while (distinctDays.has(todayKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    const lastAttemptMillis = attempts.length ? toMillis(attempts[0].createdAt) : null;
    const daysSinceLastAttempt = lastAttemptMillis === null ? null : daysSince(lastAttemptMillis);

    const strandRows: StrandRow[] = STRANDS.map((s) => {
      const { mastered, total } = masteredCountForStrand(progressBySkill, s.slug);
      const mods = modulesForStrand(s.slug);
      const results = mods.flatMap((m) => progressBySkill[m.id]?.recentResults ?? []);
      return {
        slug: s.slug,
        label: s.label,
        emoji: s.emoji,
        mastery: total ? Math.round((mastered / total) * 100) : 0,
        trend: trendFromResults(results),
        attempts: results.length,
      };
    });

    const questsProgress = QUESTS.map((q) => questProgress(progressBySkill, q));
    const worlds: WorldRow[] = questsProgress.map((qp) => {
      const allLocked = qp.objectives.every((o) => o.locked);
      const status: WorldStatus = qp.complete
        ? "completado"
        : qp.doneCount > 0
          ? "en-curso"
          : allLocked
            ? "bloqueado"
            : "en-curso";
      return {
        id: qp.quest.id,
        icon: qp.quest.icon,
        title: qp.quest.title,
        premise: qp.quest.premise,
        zoneName: getStrandNarrative(qp.quest.strandSlug).zoneName,
        status,
        done: qp.doneCount,
        total: qp.total,
      };
    });

    const active = activeQuest(progressBySkill);
    const currentMission: CurrentMission | null = active
      ? {
          icon: active.quest.icon,
          title: active.quest.title,
          zoneName: getStrandNarrative(active.quest.strandSlug).zoneName,
          progressLabel: `${active.doneCount} de ${active.total} objetivos`,
        }
      : null;

    const badges: EarnedBadge[] = BADGES.map((b) => ({
      ...b,
      unlocked: b.id in earnedBadges,
      earnedAt: earnedBadges[b.id] ?? null,
    }));

    const activity: ActivityItem[] = [
      ...attempts.slice(0, 8).map((a) => ({
        id: `attempt-${a.id}`,
        when: toMillis(a.createdAt),
        kind: "practica" as const,
        text: `${describeSkill(a.skillId)} — ${a.correct ? "correcto" : "incorrecto"}`,
      })),
      ...badges
        .filter((b) => b.unlocked && b.earnedAt !== null)
        .map((b) => ({
          id: `badge-${b.id}`,
          when: b.earnedAt as number,
          kind: "insignia" as const,
          text: `Insignia desbloqueada: ${b.label}`,
        })),
      ...redemptions
        .filter((r) => r.status === "aprobado")
        .map((r) => ({
          id: `canje-${r.id}`,
          when: toMillis(r.resolvedAt),
          kind: "canje" as const,
          text: `Canjeó «${r.rewardLabel}» por ${r.starsSpent} ★`,
        })),
    ]
      .sort((a, b) => b.when - a.when)
      .slice(0, 8);

    return {
      loading,
      masteryGlobal,
      level: masteredModules,
      weeklyAccuracy,
      weeklyProblems,
      streak,
      daysSinceLastAttempt,
      strandRows,
      worlds,
      currentMission,
      badges,
      activity,
      pendingRedemptions: redemptions.filter((r) => r.status === "pendiente"),
      resolvedRedemptions: redemptions.filter((r) => r.status !== "pendiente").slice(0, 5),
      totalStars,
    };
  }, [progressBySkill, attempts, earnedBadges, redemptions, totalStars, loading]);
}
