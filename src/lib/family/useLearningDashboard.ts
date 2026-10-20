"use client";

import { useEffect, useMemo, useState } from "react";
import { getFirebase } from "@/lib/firebase";
import { useLearningData } from "@/lib/learning/useLearningData";
import { useLearningClock } from "@/lib/learning/useLearningClock";
import { getLesson, limaDay, type AnswerOutcome } from "@/lib/learning/domain";
import { learningSummary, timestampMillis } from "@/lib/learning/summary";
import { nextStudyLesson } from "@/lib/learning/studyPlan";
import { useTotalStars } from "@/lib/useTotalStars";
import type { ActivityItem, RequestDoc } from "./useChildDashboard";

interface Event { id: string; lessonId: string; action: { kind: string }; createdAt: unknown; outcome?: AnswerOutcome }
interface Extra { key: string; events: Event[]; requests: RequestDoc[]; loaded: string[]; error: string | null }
const EMPTY: Extra = { key: "", events: [], requests: [], loaded: [], error: null };
const DAY = 86_400_000;

export function useLearningDashboard(childId: string) {
  const { parentId, progress, daily, adventures, placement, child, loading, error } = useLearningData(childId);
  const now = useLearningClock();
  const totalStars = useTotalStars(parentId, childId || undefined);
  const today = limaDay(now);
  const weekStart = Date.parse(`${today}T05:00:00Z`) - 6 * DAY;
  const key = `${parentId ?? ""}/${childId}/${today}`;
  const [extra, setExtra] = useState<Extra>(EMPTY);
  useEffect(() => {
    if (!parentId || !childId) return;
    let cancelled = false;
    const unsubscribes: (() => void)[] = [];
    const receive = (part: string, patch: Partial<Extra>) => {
      if (!cancelled) setExtra((previous) => {
        const current = previous.key === key ? previous : EMPTY;
        return { ...current, ...patch, key, loaded: [...new Set([...current.loaded, part])] };
      });
    };
    const fail = () => receive("error", { error: "No pudimos cargar la actividad. Comprueba la conexión." });
    getFirebase().then(({ db, firestore: { collection, query, where, orderBy, onSnapshot } }) => {
      if (cancelled) return;
      const path = ["parents", parentId!, "children", childId] as const;
      unsubscribes.push(onSnapshot(query(collection(db, ...path, "learningEvidence"), where("createdAt", ">=", new Date(weekStart)), orderBy("createdAt", "desc")),
        (snap) => receive("events", { events: snap.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Event) }), fail));
      unsubscribes.push(onSnapshot(query(collection(db, ...path, "redemptionRequests"), orderBy("createdAt", "desc")),
        (snap) => receive("requests", { requests: snap.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as RequestDoc) }), fail));
    }).catch(fail);
    return () => { cancelled = true; unsubscribes.forEach((unsubscribe) => unsubscribe()); };
  }, [parentId, childId, key, weekStart]);
  const current = extra.key === key ? extra : EMPTY;
  return useMemo(() => {
    const summary = learningSummary(progress, daily, now);
    const answers = current.events.filter((event) => event.action?.kind === "answer" && event.outcome);
    const weeklyProblems = Array.from({ length: 7 }, (_, index) => {
      const at = weekStart + index * DAY;
      const day = limaDay(at);
      return { day: new Date(at).toLocaleDateString("es", { weekday: "narrow", timeZone: "America/Lima" }).toUpperCase(),
        problems: answers.filter((event) => limaDay(timestampMillis(event.createdAt)) === day).length };
    });
    const times = [...Object.values(progress).map((p) => p.updatedAt), ...Object.values(adventures).map((p) => p.updatedAt), daily?.updatedAt ?? 0, placement?.updatedAt ?? 0].filter((at) => at > 0);
    const lastAt = Math.max(0, ...times);
    const activity: ActivityItem[] = current.events.slice(0, 8).map((event) => ({
      id: event.id, when: timestampMillis(event.createdAt), kind: "practica",
      text: event.lessonId === "diario" ? "Repaso espaciado" : event.lessonId === "ubicacion" ? "Ubicación de aprendizaje" : getLesson(event.outcome?.lessonId ?? event.lessonId)?.title ?? "Aplicación y repaso",
      detail: event.outcome ? event.outcome.correct ? "Respuesta correcta" : "Respuesta para reforzar" : "Avance guardado",
    }));
    const badges = [
      { id: "first-lesson", emoji: "📘", label: "Primera clase", description: "Completar un recorrido de aprendizaje.", unlocked: summary.completed > 0 },
      { id: "autonomous", emoji: "💡", label: "Resuelvo por mi cuenta", description: "Superar una comprobación autónoma.", unlocked: summary.autonomous > 0 },
      { id: "retained", emoji: "🌱", label: "Lo recuerdo", description: "Superar un repaso diferido sin apoyo.", unlocked: summary.retained > 0 },
      { id: "daily", emoji: "🔥", label: "Hábito de repaso", description: "Terminar una sesión de repaso diario.", unlocked: (daily?.sessions ?? 0) > 0 },
    ].map((badge) => ({ ...badge, image: undefined }));
    return { ...summary, totalStars, weeklyProblems, activity, badges,
      loading: loading || (!current.error && current.loaded.length < 2), error: error ?? current.error,
      daysSinceLastAttempt: lastAt ? Math.max(0, Math.floor((now - lastAt) / DAY)) : null,
      pendingRedemptions: current.requests.filter((r) => r.status === "pendiente"),
      resolvedRedemptions: current.requests.filter((r) => r.status !== "pendiente"),
      nextLesson: nextStudyLesson(progress, placement, child?.learningPlan),
    };
  }, [progress, daily, adventures, placement, child, loading, error, current, totalStars, now, weekStart]);
}

export type LearningDashboard = ReturnType<typeof useLearningDashboard>;
