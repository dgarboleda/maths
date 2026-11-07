"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import { ALL_CHILDREN, isPublicLesson, prerequisiteMet, visibleTo, type LessonProgress, type PublicLesson } from "../../../functions/src/customLessons/schema";
import { groupLessons } from "./editor/groupLessons";

type Entry = PublicLesson & { id: string };
export interface ListedLesson extends Entry { done: boolean; locked: boolean; lockedBy?: string; overdue: boolean }

/** Clases que ve este alumno: visibles ya, con su estado (terminada, bloqueada, con entrega). */
export function listLessons(lessons: readonly Entry[], progress: ReadonlyMap<string, Partial<LessonProgress>>, childId: string, now: number): ListedLesson[] {
  const byId = new Map(lessons.map((l) => [l.id, l]));
  return lessons.filter((l) => visibleTo(l, childId, now)).map((l) => {
    const p = progress.get(l.id);
    const done = p?.completed === true && p.lessonVersion === l.version;
    const required = l.requires ? byId.get(l.requires) : undefined;
    const locked = !!l.requires && !prerequisiteMet(required, l.requires ? progress.get(l.requires) : undefined, childId, now);
    return { ...l, done, locked, lockedBy: locked ? required?.title : undefined, overdue: !done && l.dueAt !== undefined && l.dueAt < now };
  });
}

const dateLabel = (ms: number) => new Date(ms).toLocaleDateString("es", { day: "numeric", month: "short" });

export function CustomLessonList({ childId }: { childId: string }) {
  const { parentId } = useAuth();
  const [error, setError] = useState(false);
  const [byAudience, setByAudience] = useState<Record<string, Entry[]>>({});
  const [progress, setProgress] = useState<Map<string, Partial<LessonProgress>>>(new Map());
  // Las clases con fecha de inicio aparecen solas al llegar el día.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    const offs: (() => void)[] = [];
    getFirebase().then(({ db, firestore: f }) => {
      if (cancelled) return;
      const lessons = f.collection(db, "parents", parentId, "customLessonsPublic");
      // Dos consultas: las asignadas a este alumno y las de toda la familia (las reglas solo admiten estas).
      for (const audience of [childId, ALL_CHILDREN]) {
        offs.push(f.onSnapshot(f.query(lessons, f.where("audience", "array-contains", audience)), (snap) => {
          setByAudience((prev) => ({ ...prev, [audience]: snap.docs.flatMap((d) => { const data = d.data(); return isPublicLesson(data) ? [{ ...data, id: d.id }] : []; }) }));
        }, () => setError(true)));
      }
      offs.push(f.onSnapshot(f.collection(db, "parents", parentId, "children", childId, "customLessonProgress"), (snap) => {
        setProgress(new Map(snap.docs.map((d) => [d.id, d.data() as Partial<LessonProgress>])));
      }, () => {}));
    }).catch(() => setError(true));
    return () => { cancelled = true; offs.forEach((off) => off()); };
  }, [parentId, childId]);
  const unique = [...new Map(Object.values(byAudience).flat().map((l) => [l.id, l])).values()];
  const items = listLessons(unique, progress, childId, now);
  if (error) return <p role="alert">No se pudieron cargar las clases creadas para ti.</p>;
  if (!items.length) return null;
  return (
    <section aria-label="Clases creadas para ti" className="space-y-3 rounded-2xl border border-violet-500 bg-slate-900 p-5">
      <h2 className="text-xl font-bold">Clases creadas para ti</h2>
      {groupLessons(items).map((group) => (
        <div key={group.key || "sin-tema"} className="space-y-1">
          <h3 className="font-bold text-violet-200">{group.topic}</h3>
          <ul className="space-y-2 pl-2">
            {group.lessons.map((item) => (
              <li key={item.id} className="flex flex-wrap items-baseline gap-2">
                {item.locked
                  ? <span className="text-slate-400">🔒 {item.title} <span className="text-sm">· termina antes «{item.lockedBy ?? "la clase anterior"}»</span></span>
                  : <Link className="text-cyan-200 underline" href={`/jugar/${childId}/personalizadas/${item.id}`}>{item.title}</Link>}
                {item.done && <span className="text-sm text-emerald-300">✓ Terminada</span>}
                {!item.done && item.dueAt !== undefined && <span className={`text-sm ${item.overdue ? "text-amber-300" : "text-slate-300"}`}>{item.overdue ? "Entrega pasada" : "Entregar antes del"} {dateLabel(item.dueAt)}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
