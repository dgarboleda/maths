"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { getFirebase } from "@/lib/firebase";
import { LEARNING_UNITS, LESSONS } from "@/lib/learning/domain";
import { plannedLessonIds } from "@/lib/learning/studyPlan";
import type { ChildDoc } from "./FamilyProvider";

export function StudyPlanEditor({ parentId, child }: { parentId: string; child: ChildDoc }) {
  const [selected, setSelected] = useState(() => plannedLessonIds(child.learningPlan));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const id = useId();
  async function save() {
    if (saving) return;
    setSaving(true); setMessage(""); setError("");
    try {
      const { db, firestore: { doc, updateDoc } } = await getFirebase();
      await updateDoc(doc(db, "parents", parentId, "children", child.id), { learningPlan: { lessonIds: plannedLessonIds({ lessonIds: selected }) } });
      setMessage("Plan guardado. Aparecerá en el inicio y el mapa de aprendizaje.");
    } catch { setError("No se pudo guardar el plan. Conservamos tu selección para reintentar."); }
    finally { setSaving(false); }
  }
  return <div className="space-y-5">
    <p className="max-w-3xl text-sm leading-relaxed text-slate-300">Elige las clases prioritarias para {child.name}. El recorrido recomienda primero sus bases. Todas las clases siguen disponibles; esta elección no cambia el progreso ni concede logros.</p>
    <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="space-y-5">
      <fieldset disabled={saving} className="space-y-4">
        <legend className="mb-3 font-bold text-cyan-200">Clases prioritarias</legend>
        {LEARNING_UNITS.map((unit) => <fieldset key={unit.id} className="rounded-2xl border border-slate-700 p-4">
          <legend className="px-2 font-semibold text-slate-100">{unit.title}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {LESSONS.filter((lesson) => lesson.unitId === unit.id).map((lesson) => <label key={lesson.id} htmlFor={`${id}-${lesson.id}`} className="flex min-h-11 items-start gap-3 rounded-xl bg-slate-900/60 p-3 text-sm text-slate-200">
              <input id={`${id}-${lesson.id}`} type="checkbox" checked={selected.includes(lesson.id)} className="mt-0.5 size-5 shrink-0 accent-cyan-300"
                onChange={(event) => { const checked = event.target.checked; setMessage(""); setSelected((previous) => checked ? [...previous, lesson.id] : previous.filter((value) => value !== lesson.id)); }} />
              <span><span className="block font-semibold">{lesson.title}</span><span className="mt-1 block text-xs text-slate-400">{lesson.objective}</span></span>
            </label>)}
          </div>
        </fieldset>)}
      </fieldset>
      <div className="sticky bottom-24 rounded-2xl lg:bottom-0 border border-slate-700 bg-slate-950/95 p-4">
        <p className="text-sm text-slate-300">{selected.length} clases prioritarias{selected.length === 0 ? " · se sigue el programa completo" : ""}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button disabled={saving} type="submit" className="min-h-11 rounded-xl bg-cyan-300 px-5 font-bold text-slate-950 disabled:opacity-50">{saving ? "Guardando…" : "Guardar plan"}</button>
          <button disabled={saving} type="button" className="min-h-11 rounded-xl border border-slate-600 px-4 text-slate-200" onClick={() => { setSelected([]); setMessage(""); }}>Seguir el programa completo</button>
          <Link href={`/jugar/${child.id}/mapa`} className="inline-flex min-h-11 items-center px-2 text-cyan-200 underline">Ver mapa de aprendizaje</Link>
        </div>
        <p role="status" className="mt-2 text-sm text-emerald-200">{message}</p>
        {error && <p role="alert" className="mt-2 text-sm text-rose-200">{error}</p>}
      </div>
    </form>
  </div>;
}
