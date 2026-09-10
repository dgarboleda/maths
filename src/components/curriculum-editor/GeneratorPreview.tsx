"use client";

import { useMemo, useState } from "react";
import { compileGenerator } from "@/lib/curriculum/generatorTemplates";
import { problemSignature, type Problem } from "@/lib/problem";
import type { GeneratorSpec } from "@/lib/curriculum/customSchema";

/**
 * "Generar N preguntas" — Fase 21, recomendación §10.2 del plan, marcada
 * como obligatoria (no opcional): es el único mecanismo realista para que
 * un padre confíe en un generador que escribió. Corre `compileGenerator`
 * sobre el spec en edición y avisa de duplicados (`problemSignature`),
 * respuestas negativas/no enteras cuando `inputType: "integer"`.
 */
export function GeneratorPreview({ spec }: { spec: GeneratorSpec }) {
  const [batch, setBatch] = useState<Problem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    try {
      const generate = compileGenerator(spec);
      setBatch(Array.from({ length: 20 }, generate));
      setError(null);
    } catch (err) {
      setBatch(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const stats = useMemo(() => {
    if (!batch) return null;
    const seen = new Set<string>();
    let duplicates = 0;
    let invalidAnswers = 0;
    for (const p of batch) {
      const sig = problemSignature(p);
      if (seen.has(sig)) duplicates++;
      seen.add(sig);
      if (p.inputType === "integer" && (!Number.isInteger(p.answer) || p.answer < 0)) invalidAnswers++;
    }
    return { duplicates, invalidAnswers };
  }, [batch]);

  return (
    <div className="space-y-2 rounded-lg border border-indigo-500/15 bg-slate-900/40 p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-slate-300">Vista previa</p>
        <button type="button" onClick={run} className="rounded-md bg-cyan-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-cyan-500">
          Generar 20 preguntas
        </button>
      </div>

      {error && <p className="text-[11px] text-rose-300">Error al generar: {error}</p>}

      {stats && (stats.duplicates > 0 || stats.invalidAnswers > 0) && (
        <ul className="space-y-0.5 text-[11px] text-amber-300">
          {stats.duplicates > 0 && <li>⚠ {stats.duplicates} pregunta(s) repetida(s) — quizás el rango de variables es muy chico.</li>}
          {stats.invalidAnswers > 0 && <li>⚠ {stats.invalidAnswers} respuesta(s) negativa(s) o no entera(s) con tipo &quot;entero&quot;.</li>}
        </ul>
      )}

      {batch && (
        <div className="max-h-64 overflow-y-auto rounded-md border border-indigo-500/10">
          <table className="w-full text-left text-[11px]">
            <thead className="sticky top-0 bg-slate-950/90 text-slate-400">
              <tr>
                <th className="px-2 py-1 font-bold">Enunciado</th>
                <th className="px-2 py-1 font-bold">Respuesta</th>
                <th className="px-2 py-1 font-bold">Pista 1</th>
              </tr>
            </thead>
            <tbody>
              {batch.map((p, i) => (
                <tr key={i} className="border-t border-indigo-500/10 text-slate-300">
                  <td className="px-2 py-1">{p.prompt}</td>
                  <td className="px-2 py-1 tabular-nums">{p.choiceLabels ? p.choiceLabels[p.choices?.indexOf(p.answer) ?? -1] : p.answer}</td>
                  <td className="px-2 py-1 text-slate-500">{p.hints?.[0] ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
