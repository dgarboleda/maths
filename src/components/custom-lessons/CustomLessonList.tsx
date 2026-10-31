"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import { validateCustomLesson, type CustomLesson } from "../../../functions/src/customLessons/schema";

export function CustomLessonList({ childId }: { childId: string }) {
  const { parentId } = useAuth();
  const [error, setError] = useState(false);
  const [items, setItems] = useState<(CustomLesson & { id: string })[]>([]);
  useEffect(() => {
    if (!parentId) return;
    let cancelled = false; let off: (() => void) | undefined;
    getFirebase().then(({ db, firestore: f }) => { if (!cancelled) off = f.onSnapshot(f.query(f.collection(db, "parents", parentId, "customLessons"), f.where("published", "==", true)), snap => setItems(snap.docs.flatMap(d => { const data = d.data(); return validateCustomLesson(data) ? [{ ...data, id: d.id }] : []; })), () => setError(true)); }).catch(() => setError(true));
    return () => { cancelled = true; off?.(); };
  }, [parentId]);
  if (error) return <p role="alert">No se pudieron cargar las clases creadas para ti.</p>;
  if (!items.length) return null;
  return <section aria-label="Clases creadas para ti" className="space-y-3 rounded-2xl border border-violet-500 bg-slate-900 p-5"><h2 className="text-xl font-bold">Clases creadas para ti</h2><ul className="space-y-2">{items.map(item => <li key={item.id}><Link className="text-cyan-200 underline" href={`/jugar/${childId}/personalizadas/${item.id}`}>{item.topic}: {item.title}</Link></li>)}</ul></section>;
}
