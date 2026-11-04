"use client";
import { useEffect, useState } from "react";
import { getFirebase } from "@/lib/firebase";
import type { CustomLesson } from "../../../../functions/src/customLessons/schema";
import type { LessonEntry } from "./groupLessons";

/** Clases de la familia (publicadas y borradores) y las escrituras del panel. */
export function useCustomLessons(parentId: string | null | undefined) {
  const [items, setItems] = useState<LessonEntry[]>([]);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    if (!parentId) return;
    let off: (() => void) | undefined;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore: f }) => {
        if (cancelled) return;
        off = f.onSnapshot(
          f.collection(db, "parents", parentId, "customLessons"),
          (snap) => { setLoadError(false); setItems(snap.docs.map((d) => ({ ...(d.data() as CustomLesson), id: d.id }))); },
          () => setLoadError(true),
        );
      })
      .catch(() => setLoadError(true));
    return () => { cancelled = true; off?.(); };
  }, [parentId]);

  async function save(id: string | null, lesson: CustomLesson): Promise<string> {
    if (!parentId) throw new Error("Sin familia");
    const { db, firestore: f } = await getFirebase();
    const ref = id ? f.doc(db, "parents", parentId, "customLessons", id) : f.doc(f.collection(db, "parents", parentId, "customLessons"));
    await f.setDoc(ref, lesson);
    return ref.id;
  }

  async function remove(id: string): Promise<void> {
    if (!parentId) return;
    const { db, firestore: f } = await getFirebase();
    await f.deleteDoc(f.doc(db, "parents", parentId, "customLessons", id));
  }

  /** Guarda el orden de un tema: cada clase recibe su posición. */
  async function reorder(ids: string[]): Promise<void> {
    if (!parentId) return;
    const { db, firestore: f } = await getFirebase();
    const batch = f.writeBatch(db);
    ids.forEach((id, order) => batch.update(f.doc(db, "parents", parentId, "customLessons", id), { order }));
    await batch.commit();
  }

  return { items, loadError, save, remove, reorder };
}
