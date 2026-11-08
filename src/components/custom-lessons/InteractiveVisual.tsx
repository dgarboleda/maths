"use client";

import dynamic from "next/dynamic";
import { useId, useState } from "react";
import { isLessonVisual, type LessonVisual } from "../../../functions/src/customLessons/visuals";

// Los modelos incorporados se descargan solo cuando una clase los necesita.
const LearningVisual = dynamic(() => import("@/components/learning/LearningVisual").then((m) => m.LearningVisual), {
  loading: () => <p role="status">Preparando el recurso…</p>,
});

function NumberLine({ min, max, initial }: { min: number; max: number; initial: number }) {
  const [value, setValue] = useState(initial);
  const id = useId();
  const position = (value - min) / (max - min) * 100;
  return <div className="space-y-3 rounded-xl border border-cyan-300/30 bg-slate-950 p-4">
    <label htmlFor={id} className="block text-sm font-bold">Valor: <output htmlFor={id}>{value}</output></label>
    <input id={id} type="range" min={min} max={max} step={1} value={value} onChange={(event) => setValue(Number(event.target.value))} className="min-h-11 w-full accent-cyan-300" />
    <div role="img" aria-label={`Recta numérica de ${min} a ${max}, valor seleccionado ${value}`} className="relative mx-3 h-14">
      <div className="absolute inset-x-0 top-5 h-0.5 bg-slate-300" />
      <span className="absolute top-1 h-8 w-0.5 bg-amber-300" style={{ left: `${position}%` }} />
      <span className="absolute -left-2 top-8 text-xs">{min}</span><span className="absolute -right-2 top-8 text-xs">{max}</span>
      <span className="absolute top-0 -translate-x-1/2 rounded bg-slate-900 px-1 text-xs font-bold text-amber-200" style={{ left: `${position}%` }}>{value}</span>
    </div>
    <p className="text-sm text-slate-300">Mueve el control para explorar la posición de cada número.</p>
  </div>;
}

/** Igual para la vista previa familiar y la clase publicada. */
export function InteractiveVisual({ visual }: { visual: LessonVisual }) {
  if (!isLessonVisual(visual)) return <p role="status" className="text-amber-200">Revisa la configuración de este recurso.</p>;
  return <section className="space-y-2" aria-label={visual.title || "Recurso interactivo"}>
    {visual.title && <h3 className="text-lg font-bold">{visual.title}</h3>}
    {visual.description && <p className="text-sm text-slate-300 whitespace-pre-wrap">{visual.description}</p>}
    {visual.kind === "custom-number-line" ? <NumberLine key={`${visual.min}-${visual.max}-${visual.initial}`} min={visual.min!} max={visual.max!} initial={visual.initial!} /> : <LearningVisual key={visual.kind} kind={visual.kind} />}
  </section>;
}
