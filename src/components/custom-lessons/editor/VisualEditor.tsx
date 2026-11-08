"use client";
import { useState } from "react";
import { MAX_VISUALS, VISUAL_CATALOG, type LessonVisual, type LessonVisualKind } from "../../../../functions/src/customLessons/visuals";
import { InteractiveVisual } from "../InteractiveVisual";
import { moveItem, newQuestionId } from "./lessonDraft";
import { inputClass, smallButton } from "./styles";

const groups = [...new Set(VISUAL_CATALOG.map(([, , group]) => group))];
const makeVisual = (): LessonVisual => ({ id: newQuestionId(), kind: "custom-number-line", title: "Recta numérica", description: "", min: -10, max: 10, initial: 0 });

function VisualPreview({ visual }: { visual: LessonVisual }) {
  const [open, setOpen] = useState(false);
  return <details className="rounded-lg border border-slate-600 p-3" onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer font-bold">Probar este recurso</summary>
    {open && <div className="mt-3"><InteractiveVisual visual={visual} /></div>}
  </details>;
}

export function VisualEditor({ visuals, onChange }: { visuals: LessonVisual[]; onChange: (visuals: LessonVisual[]) => void }) {
  const [query, setQuery] = useState("");
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const matches = (name: string, group: string) => normalize(`${name} ${group}`).includes(normalize(query.trim()));
  const update = (index: number, patch: Partial<LessonVisual>) => onChange(visuals.map((v, i) => i === index ? { ...v, ...patch } : v));
  const setKind = (index: number, kind: LessonVisualKind) => {
    const old = visuals[index];
    const name = kind === "custom-number-line" ? "Recta numérica configurable" : VISUAL_CATALOG.find(([id]) => id === kind)?.[1] ?? "Recurso interactivo";
    onChange(visuals.map((v, i) => i !== index ? v : { id: old.id, kind, title: name, description: old.description, ...(kind === "custom-number-line" ? { min: -10, max: 10, initial: 0 } : {}) }));
  };
  return <section id="lesson-visuals" tabIndex={-1} className="space-y-4 rounded-2xl border border-cyan-500/30 bg-slate-950/50 p-4" aria-labelledby="visuals-title">
    <div><h2 id="visuals-title" className="text-xl font-bold">Recursos interactivos</h2><p className="mt-1 text-sm text-slate-300">Añade modelos para que el alumno mueva controles y explore antes de responder. Puedes usar hasta {MAX_VISUALS} por clase.</p></div>
    {visuals.length > 0 && <label className="block text-sm">Buscar modelo por tema o nombre<input type="search" className={inputClass} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Por ejemplo: fracciones o geometría" /></label>}
    {visuals.map((visual, index) => <article key={visual.id} className="space-y-3 rounded-xl border border-slate-600 bg-slate-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Recurso {index + 1}</h3><div className="flex flex-wrap gap-2">
        <button type="button" className={smallButton} disabled={index === 0} onClick={() => onChange(moveItem(visuals, index, index - 1))} aria-label={`Subir recurso ${index + 1}`}>↑</button>
        <button type="button" className={smallButton} disabled={index === visuals.length - 1} onClick={() => onChange(moveItem(visuals, index, index + 1))} aria-label={`Bajar recurso ${index + 1}`}>↓</button>
        <button type="button" className={smallButton} onClick={() => onChange(visuals.filter((_, i) => i !== index))}>Quitar recurso {index + 1}</button>
      </div></div>
      <label className="block text-sm">Modelo
        <select className={inputClass} value={visual.kind} onChange={(event) => setKind(index, event.target.value as LessonVisualKind)}>
          <option value="custom-number-line">Recta numérica configurable</option>
          {groups.map((group) => { const options = VISUAL_CATALOG.filter(([id, name, g]) => g === group && (id === visual.kind || matches(name, g))); return options.length ? <optgroup key={group} label={group}>{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</optgroup> : null; })}
        </select>
      </label>
      <p className="text-xs text-slate-400">Los modelos del catálogo usan los mismos controles y valores iniciales de las clases integradas. La recta configurable permite elegir su rango.</p>
      <label className="block text-sm">Título del recurso<input className={inputClass} value={visual.title} maxLength={100} onChange={(event) => update(index, { title: event.target.value })} /></label>
      <label className="block text-sm">Consigna opcional<textarea className={inputClass} rows={2} value={visual.description} maxLength={500} onChange={(event) => update(index, { description: event.target.value })} /></label>
      {visual.kind === "custom-number-line" && <fieldset className="grid gap-3 sm:grid-cols-3"><legend className="text-sm font-bold">Rango de la recta</legend>{([['min', 'Mínimo'], ['max', 'Máximo'], ['initial', 'Valor inicial']] as const).map(([field, label]) => <label key={field} className="block text-sm">{label}<input type="number" className={inputClass} value={visual[field] ?? ""} min={-100} max={100} onChange={(event) => update(index, { [field]: event.target.value === "" ? undefined : event.target.valueAsNumber })} /></label>)}<p className="text-xs text-slate-400 sm:col-span-3">Usa enteros entre −100 y 100; el rango puede abarcar como máximo 100 unidades y debe incluir el valor inicial.</p></fieldset>}
      <VisualPreview visual={visual} />
    </article>)}
    <button type="button" className={smallButton} disabled={visuals.length >= MAX_VISUALS} onClick={() => onChange([...visuals, makeVisual()])}>Añadir recurso interactivo</button>
  </section>;
}
