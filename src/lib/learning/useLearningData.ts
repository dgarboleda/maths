"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase, getFirebaseFunctions } from "@/lib/firebase";
import type { ChildProfile } from "@/lib/types";
import {
  getLesson,
  migrateProgress,
  type AdventureAction,
  type AdventureState,
  type LearningAction,
  type LearningProgress,
  type MixedReviewState,
  type PlacementAction,
  type PlacementState,
  type DailyReviewState,
} from "./domain";

interface Snapshot {
  key: string;
  child: ChildProfile | null;
  progress: Record<string, LearningProgress>;
  /** Repasos mixtos por unidad (documentos `repaso-{unidad}`). */
  reviews: Record<string, MixedReviewState>;
  /** Evaluación de ubicación (`learningProgress/ubicacion`). */
  placement: PlacementState | null;
  /** Repaso espaciado diario (`learningProgress/diario`). */
  daily: DailyReviewState | null;
  /** Estado de cada aventura jugada (`learningMissions/{aventura}`). */
  adventures: Record<string, AdventureState>;
  loaded: string[];
  error: string | null;
}
function empty(key: string): Snapshot {
  return {
    key,
    child: null,
    progress: {},
    reviews: {},
    placement: null,
    daily: null,
    adventures: {},
    loaded: [],
    error: null,
  };
}

export function useLearningData(childId: string) {
  const { user, loading: authLoading, parentId } = useAuth();
  const router = useRouter();
  const key = `${parentId ?? ""}/${childId}`;
  const [snapshot, setSnapshot] = useState<Snapshot>(() => empty(""));
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);
  useEffect(() => {
    if (!user || !parentId || !childId) return;
    let cancelled = false;
    const subscriptions: (() => void)[] = [];
    const receive = (part: string, patch: Partial<Snapshot>) => {
      if (!cancelled)
        setSnapshot((previous) => {
          const current = previous.key === key ? previous : empty(key);
          return {
            ...current,
            ...patch,
            loaded: [...new Set([...current.loaded, part])],
          };
        });
    };
    const failed = () =>
      receive("error", {
        error:
          "No pudimos cargar este perfil y su avance. Comprueba la conexión y vuelve a intentarlo con una sesión autorizada.",
      });
    getFirebase()
      .then(({ db, firestore: { doc, collection, onSnapshot } }) => {
        if (cancelled) return;
        const path = ["parents", parentId, "children", childId] as const;
        subscriptions.push(
          onSnapshot(
            doc(db, ...path),
            { includeMetadataChanges: true },
            (snap) => {
              if (!snap.exists() && snap.metadata.fromCache) return;
              receive(
                "child",
                snap.exists()
                  ? { child: snap.data() as ChildProfile }
                  : {
                      child: null,
                      error: "Este perfil ya no está disponible.",
                    },
              );
            },
            failed,
          ),
        );
        subscriptions.push(
          onSnapshot(
            collection(db, ...path, "learningProgress"),
            (snap) =>
              receive("progress", {
                reviews: Object.fromEntries(
                  snap.docs
                    .filter((item) => item.id.startsWith("repaso-"))
                    .map((item) => [item.id, item.data() as MixedReviewState]),
                ),
                placement:
                  (snap.docs.find((item) => item.id === "ubicacion")?.data() as PlacementState | undefined) ?? null,
                daily:
                  (snap.docs.find((item) => item.id === "diario")?.data() as DailyReviewState | undefined) ?? null,
                progress: Object.fromEntries(
                  snap.docs.filter((item) => !item.id.startsWith("repaso-") && item.id !== "ubicacion" && item.id !== "diario").map((item) => {
                    const saved = item.data() as LearningProgress;
                    const lesson = getLesson(item.id);
                    // Misma migración que aplica el servidor en la próxima acción.
                    return [item.id, lesson ? migrateProgress(lesson, saved) : saved];
                  }),
                ),
              }),
            failed,
          ),
        );
        subscriptions.push(
          onSnapshot(
            collection(db, ...path, "learningMissions"),
            (snap) =>
              receive("adventure", {
                adventures: Object.fromEntries(
                  snap.docs.map((item) => [item.id, item.data() as AdventureState]),
                ),
              }),
            failed,
          ),
        );
      })
      .catch(failed);
    return () => {
      cancelled = true;
      subscriptions.forEach((unsubscribe) => unsubscribe());
    };
  }, [user, parentId, childId, key]);
  const current = snapshot.key === key ? snapshot : empty(key);
  return {
    ...current,
    parentId,
    loading:
      authLoading || !user || (!current.error && current.loaded.length < 3),
  };
}

interface Request {
  parentId: string;
  childId: string;
  lessonId: string;
  expectedRevision: number;
  operationId: string;
  action: LearningAction | AdventureAction | PlacementAction;
}
export function useLearningAction(
  parentId: string | undefined,
  childId: string,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{
    parentId: string;
    childId: string;
    lessonId: string;
    progress: LearningProgress | AdventureState | MixedReviewState | PlacementState | DailyReviewState;
  } | null>(null);
  const pending = useRef<Request | null>(null);
  const inFlight = useRef(false);
  async function send(request: Request): Promise<boolean> {
    if (inFlight.current) return false;
    inFlight.current = true;
    pending.current = request;
    setBusy(true);
    setError(null);
    try {
      const { functions, functionsFns } = await getFirebaseFunctions();
      const result = await functionsFns.httpsCallable<
        Request,
        { progress: LearningProgress | AdventureState | MixedReviewState | PlacementState | DailyReviewState }
      >(
        functions,
        "recordLearningAction",
      )(request);
      setConfirmed({
        parentId: request.parentId,
        childId: request.childId,
        lessonId: request.lessonId,
        progress: result.data.progress,
      });
      pending.current = null;
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo guardar el avance.";
      setError(
        `${message} Tu actividad seguirá disponible al volver a entrar.`,
      );
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function run(
    lessonId: string,
    revision: number,
    action: LearningAction | AdventureAction | PlacementAction,
  ): Promise<boolean> {
    if (!parentId || pending.current || inFlight.current) return false;
    return send({
      parentId,
      childId,
      lessonId,
      expectedRevision: revision,
      operationId: crypto.randomUUID(),
      action,
    });
  }
  return {
    run,
    busy,
    error,
    confirmed: confirmed?.parentId === parentId && confirmed?.childId === childId ? confirmed : null,
    blocked: busy || error !== null,
    retry: () =>
      pending.current ? send(pending.current) : Promise.resolve(false),
  };
}
