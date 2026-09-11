"use client";

import type { ModuleDef } from "@/lib/curriculum";
import type { CustomModuleDoc } from "@/lib/curriculum/customSchema";
import { STRANDS } from "@/lib/strands";

const LABEL_CLASS = "mb-1 block text-[11px] font-bold text-slate-400";
const INPUT_CLASS = "w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-cyan-400/50";

/**
 * Pestaña "Datos" del Editor de Currícula — Fase 21
 * (docs/level-editor-plan-v2.md §8.3-1). Metadata del módulo: el `id` es
 * fijo tras la creación (es la clave de `skillsProgress`, cambiarlo
 * perdería el progreso ya guardado con el id anterior).
 */
export function DatosTab({
  doc,
  allOtherModules,
  onChange,
}: {
  doc: CustomModuleDoc;
  allOtherModules: ModuleDef[];
  onChange: (doc: CustomModuleDoc) => void;
}) {
  const grouped = STRANDS.map((s) => ({ strand: s, modules: allOtherModules.filter((m) => m.strandSlug === s.slug) }));

  function toggle(id: string, on: boolean) {
    onChange({ ...doc, prerequisites: on ? [...doc.prerequisites, id] : doc.prerequisites.filter((p) => p !== id) });
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4 text-xs sm:p-6">
      <div>
        <span className={LABEL_CLASS}>Id (fijo, clave del progreso guardado)</span>
        <p className="rounded-md border border-indigo-500/10 bg-slate-900/60 px-2 py-1.5 font-mono text-[11px] text-slate-400">{doc.id}</p>
      </div>

      <label className="block">
        <span className={LABEL_CLASS}>Nombre</span>
        <input type="text" className={INPUT_CLASS} value={doc.label} onChange={(e) => onChange({ ...doc, label: e.target.value })} />
      </label>

      <label className="block">
        <span className={LABEL_CLASS}>Emoji</span>
        <input type="text" className={`${INPUT_CLASS} w-20 text-center text-lg`} value={doc.emoji} onChange={(e) => onChange({ ...doc, emoji: e.target.value })} />
      </label>

      <label className="block">
        <span className={LABEL_CLASS}>Hilo</span>
        <select className={INPUT_CLASS} value={doc.strandSlug} onChange={(e) => onChange({ ...doc, strandSlug: e.target.value })}>
          {STRANDS.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.emoji} {s.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={LABEL_CLASS}>Dificultad (1-10, solo estrellas)</span>
          <input
            type="number"
            min={1}
            max={10}
            className={INPUT_CLASS}
            value={doc.difficulty}
            onChange={(e) => onChange({ ...doc, difficulty: Number(e.target.value) })}
          />
        </label>
        <label className="block">
          <span className={LABEL_CLASS}>Grado (0 = preescolar, agrupa en el panel)</span>
          <input type="number" min={0} className={INPUT_CLASS} value={doc.tier} onChange={(e) => onChange({ ...doc, tier: Number(e.target.value) })} />
        </label>
      </div>

      <div>
        <span className={LABEL_CLASS}>Prerrequisitos (hay que dominarlos antes)</span>
        <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-indigo-500/15 bg-slate-950/40 p-2">
          {grouped.map(({ strand, modules }) =>
            modules.length === 0 ? null : (
              <div key={strand.slug}>
                <p className="px-1 pt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {strand.emoji} {strand.label}
                </p>
                {modules.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-slate-900/60">
                    <input type="checkbox" checked={doc.prerequisites.includes(m.id)} onChange={(e) => toggle(m.id, e.target.checked)} className="size-3.5 rounded border-indigo-500/40" />
                    <span className="text-slate-300">
                      {m.emoji} {m.label}
                      {m.id.startsWith("cst-") && <span className="ml-1 text-cyan-400">(tuyo)</span>}
                    </span>
                  </label>
                ))}
              </div>
            ),
          )}
        </div>
      </div>

      <label className="flex items-center gap-2 pt-1">
        <input type="checkbox" checked={doc.published} onChange={(e) => onChange({ ...doc, published: e.target.checked })} className="size-4 rounded border-indigo-500/40" />
        <span className="font-bold text-slate-300">Publicado (visible en el Level Editor y jugable)</span>
      </label>
    </div>
  );
}
