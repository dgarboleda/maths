"use client";

import { Plus, Trash2 } from "lucide-react";
import { PropertyField } from "@/components/level/editor/fields/PropertyFields";
import { CONCEPT_TEMPLATES, getConceptTemplate, type ConceptSpec } from "@/lib/curriculum/conceptCatalog";
import type { ConceptSlide } from "@/components/topic/concepts/SlidesConcept";
import type { PropertyValue } from "@/lib/level/schema";
import { ConceptPreview } from "./ConceptPreview";

const LABEL_CLASS = "mb-1 block text-[11px] font-bold text-slate-400";
const INPUT_CLASS = "w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-cyan-400/50";

function parseSlides(json: string): ConceptSlide[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function SlidesEditor({ slidesJson, onChange }: { slidesJson: string; onChange: (json: string) => void }) {
  const slides = parseSlides(slidesJson);

  function update(i: number, patch: Partial<ConceptSlide>) {
    onChange(JSON.stringify(slides.map((s, j) => (j === i ? { ...s, ...patch } : s))));
  }

  return (
    <div className="space-y-2">
      <span className={LABEL_CLASS}>Láminas</span>
      {slides.map((s, i) => (
        <div key={i} className="space-y-1.5 rounded-md border border-indigo-500/15 bg-slate-950/30 p-2">
          <div className="flex items-center gap-1.5">
            <input type="text" placeholder="Título" className={INPUT_CLASS} value={s.title} onChange={(e) => update(i, { title: e.target.value })} />
            <button
              type="button"
              onClick={() => onChange(JSON.stringify(slides.filter((_, j) => j !== i)))}
              className="rounded-md p-1 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400"
              aria-label={`Quitar lámina ${i + 1}`}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          </div>
          <textarea rows={2} placeholder="Texto" className={INPUT_CLASS} value={s.text} onChange={(e) => update(i, { text: e.target.value })} />
          <input
            type="text"
            placeholder="/illustrations/… (opcional)"
            className={INPUT_CLASS}
            value={s.imageSrc ?? ""}
            onChange={(e) => update(i, { imageSrc: e.target.value || undefined })}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange(JSON.stringify([...slides, { title: "", text: "" }]))}
        className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/10"
      >
        <Plus className="size-3.5" aria-hidden="true" /> Añadir lámina
      </button>
    </div>
  );
}

/**
 * Pestaña "Concepto" — Fase 21 (docs/level-editor-plan-v2.md §8.1/§8.3-3).
 * Selector de plantilla + sus `params` con el mismo `PropertyField` del
 * Level Editor, más una vista previa en vivo del componente real: lo que se
 * ve acá es exactamente lo que va a ver el niño en la pestaña "Concepto".
 */
export function ConceptoTab({ concept, onChange }: { concept: ConceptSpec; onChange: (c: ConceptSpec) => void }) {
  const template = getConceptTemplate(concept.templateId) ?? CONCEPT_TEMPLATES[0];

  function selectTemplate(id: string) {
    const t = getConceptTemplate(id);
    if (!t) return;
    const params = Object.fromEntries(t.params.map((f) => [f.key, f.default])) as Record<string, string | number | boolean>;
    onChange({ templateId: id, params });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 text-xs sm:p-6">
      <label className="block">
        <span className={LABEL_CLASS}>Plantilla de concepto</span>
        <select className={INPUT_CLASS} value={template.id} onChange={(e) => selectTemplate(e.target.value)}>
          {CONCEPT_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      {template.id === "slides" ? (
        <SlidesEditor
          slidesJson={typeof concept.params.slidesJson === "string" ? concept.params.slidesJson : "[]"}
          onChange={(slidesJson) => onChange({ ...concept, params: { ...concept.params, slidesJson } })}
        />
      ) : (
        <div className="space-y-3">
          {template.params.map((field) => (
            <PropertyField
              key={field.key}
              field={field}
              value={concept.params[field.key] ?? (field.default as PropertyValue)}
              onChange={(value) => onChange({ ...concept, params: { ...concept.params, [field.key]: value as string | number | boolean } })}
            />
          ))}
        </div>
      )}

      <div>
        <span className={LABEL_CLASS}>Vista previa</span>
        <div className="rounded-2xl border-2 border-purple-100 bg-white p-6">
          <ConceptPreview spec={concept} />
        </div>
      </div>
    </div>
  );
}
