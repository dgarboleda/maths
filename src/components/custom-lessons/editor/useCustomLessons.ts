"use client";
import { useEffect, useRef, useState } from "react";
import { getFirebase } from "@/lib/firebase";
import type { CustomLesson } from "../../../../functions/src/customLessons/schema";
import { deleteLesson, reorderLessons, saveLesson, syncLessons, type SaveMode } from "../api";
import type { LessonEntry } from "./groupLessons";

/** ¿Hay clases publicadas sin versión para alumnos, o versiones que sobran? */
export function needsSync(items: readonly Pick<LessonEntry, "id" | "published">[], publicIds: ReadonlySet<string>): boolean {
  const published = items.filter((i) => i.published);
  return published.length !== publicIds.size || published.some((i) => !publicIds.has(i.id));
}

/** Clases de la familia (publicadas y borradores) y las escrituras del panel, que pasan por Functions. */
export function useCustomLessons(parentId: string | null | undefined) {
  const [items, setItems] = useState<LessonEntry[] | null>(null);
  const [publicIds, setPublicIds] = useState<Set<string> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const synced = useRef(false);
  useEffect(() => {
    if (!parentId) return;
    const offs: (() => void)[] = [];
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore: f }) => {
        if (cancelled) return;
        offs.push(f.onSnapshot(
          f.collection(db, "parents", parentId, "customLessons"),
          (snap) => { setLoadError(false); setItems(snap.docs.map((d) => ({ ...(d.data() as CustomLesson), id: d.id }))); },
          () => setLoadError(true),
        ));
        offs.push(f.onSnapshot(
          f.collection(db, "parents", parentId, "customLessonsPublic"),
          (snap) => setPublicIds(new Set(snap.docs.map((d) => d.id))),
          () => {},
        ));
      })
      .catch(() => setLoadError(true));
    return () => { cancelled = true; offs.forEach((off) => off()); };
  }, [parentId]);

  // Una sola vez por visita: repara clases publicadas antes de la versión para alumnos.
  useEffect(() => {
    if (!parentId || !items || !publicIds || synced.current || !needsSync(items, publicIds)) return;
    synced.current = true;
    syncLessons(parentId).catch(() => {});
  }, [parentId, items, publicIds]);

  async function save(id: string | null, lesson: CustomLesson, mode: SaveMode, expectedUpdatedAt: number | null) {
    if (!parentId) throw new Error("Sin familia");
    return saveLesson({ parentId, lessonId: id, lesson, mode, expectedUpdatedAt });
  }
  async function remove(id: string): Promise<void> {
    if (parentId) await deleteLesson(parentId, id);
  }
  /** Guarda el orden de un tema: cada clase recibe su posición. */
  async function reorder(ids: string[]): Promise<void> {
    if (parentId) await reorderLessons(parentId, ids);
  }

  return { items: items ?? [], loadError, save, remove, reorder };
}
