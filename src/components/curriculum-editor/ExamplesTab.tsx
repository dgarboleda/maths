"use client";

import { Plus, Trash2, Wand2 } from "lucide-react";
import { compileGenerator } from "@/lib/curriculum/generatorTemplates";
import type { ExampleStep, GeneratorSpec, WorkedExample } from "@/lib/curriculum/customSchema";

const LABEL_CLASS = "mb-1 block text-[11px] font-bold text-slate-400";
const INPUT_CLASS = "w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-cyan-400/50";

function newStep(): ExampleStep {
  return { id: crypto.randomUUID(), text: "" };
}

function newExample(): WorkedExample {
  return { id: crypto.randomUUID(), prompt: "", steps: [newStep()], answer: 0, answerText: "" };
}

/**
 * Pestaña "Ejemplos" del Editor de Currícula — Fase 21
 * (docs/level-editor-plan-v2.md §8.2/§8.3-4). Un `WorkedExample` es
 * contenido fijo (no generado): el botón "Generar desde el generador"
 * corre `compileGenerator` una sola vez y precarga enunciado/respuesta para
 * que el padre solo tenga que escribir los pasos.
 */
export function ExamplesTab({ examples, generator, onChange }: { examples: WorkedExample[]; generator: GeneratorSpec; onChange: (e: WorkedExample[]) => void }) {
  function updateExample(i: number, patch: Partial<WorkedExample>) {
    onChange(examples.map((ex, j) => (j === i ? { ...ex, ...patch } : ex)));
  }
  function updateStep(exIdx: number, stepIdx: number, patch: Partial<ExampleStep>) {
    const ex = examples[exIdx];
    updateExample(exIdx, { steps: ex.steps.map((s, j) => (j === stepIdx ? { ...s, ...patch } : s)) });
  }

  function generateOne(i: number) {
    try {
      const p = compileGenerator(generator)();
      updateExample(i, { prompt: p.prompt, answer: p.answer });
    } catch (err) {
      console.error("No se pudo generar un ejemplo desde el generador", err);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 text-xs sm:p-6">
      <h2 className="text-sm font-bold text-white">Ejemplos resueltos</h2>
      {examples.map((ex, i) => (
        <div key={ex.id} className="space-y-2 rounded-lg border border-indigo-500/20 bg-slate-950/40 p-3">
          <div className="flex items-center gap-1.5">
            <input type="text" placeholder="Enunciado" className={INPUT_CLASS} value={ex.prompt} onChange={(e) => updateExample(i, { prompt: e.target.value })} />
            <button type="button" onClick={() => generateOne(i)} className="flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-slate-700" title="Generar desde el generador">
              <Wand2 className="size-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onChange(examples.filter((_, j) => j !== i))}
              className="rounded-md p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400"
              aria-label="Quitar ejemplo"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <label className="block">
              <span className={LABEL_CLASS}>Respuesta (número)</span>
              <input type="number" className={INPUT_CLASS} value={ex.answer} onChange={(e) => updateExample(i, { answer: Number(e.target.value) })} />
            </label>
            <label className="block">
              <span className={LABEL_CLASS}>Respuesta en texto (opcional, p. ej. &quot;12 manzanas&quot;)</span>
              <input type="text" className={INPUT_CLASS} value={ex.answerText} onChange={(e) => updateExample(i, { answerText: e.target.value })} />
            </label>
          </div>

          <div className="space-y-1.5">
            <span className={LABEL_CLASS}>Pasos</span>
            {ex.steps.map((step, si) => (
              <div key={step.id} className="flex items-center gap-1.5">
                <span className="w-4 shrink-0 text-center text-slate-500">{si + 1}</span>
                <input type="text" placeholder="Texto del paso" className={INPUT_CLASS} value={step.text} onChange={(e) => updateStep(i, si, { text: e.target.value })} />
                <input
                  type="text"
                  placeholder="Fórmula (opcional)"
                  className={`${INPUT_CLASS} font-mono`}
                  value={step.math ?? ""}
                  onChange={(e) => updateStep(i, si, { math: e.target.value || undefined })}
                />
                <button
                  type="button"
                  onClick={() => updateExample(i, { steps: ex.steps.filter((_, j) => j !== si) })}
                  className="rounded-md p-1 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400"
                  aria-label={`Quitar paso ${si + 1}`}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateExample(i, { steps: [...ex.steps, newStep()] })}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/10"
            >
              <Plus className="size-3.5" aria-hidden="true" /> Añadir paso
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...examples, newExample()])}
        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/10"
      >
        <Plus className="size-3.5" aria-hidden="true" /> Añadir ejemplo
      </button>
    </div>
  );
}
