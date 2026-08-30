"use client";

import { useState } from "react";
import type { Problem } from "@/lib/problem";
import { getStrand } from "@/lib/strands";
import { playSound } from "@/lib/gameSound";

export function EjemplosTab({
  strandSlug,
  difficulty,
  soundOn,
}: {
  strandSlug: string;
  difficulty: number;
  soundOn: boolean;
}) {
  const strand = getStrand(strandSlug)!;
  const [examples, setExamples] = useState<Problem[]>(() =>
    Array.from({ length: 3 }, () => strand.generateProblem(difficulty)),
  );
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  function refresh() {
    playSound("click", soundOn);
    setExamples(Array.from({ length: 3 }, () => strand.generateProblem(difficulty)));
    setRevealed({});
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">
          Ejemplos resueltos <span aria-hidden="true">📚</span>
        </h2>
        <p className="mt-1 text-sm text-slate-700">Mira estos ejemplos para entender mejor el tema.</p>
      </div>

      <div className="mx-auto flex max-w-xl flex-col gap-4">
        {examples.map((ex) => (
          <div key={ex.id} className="rounded-2xl border-2 border-purple-200 bg-white p-5 text-center shadow-sm">
            <p className="text-xl font-bold text-purple-900">{ex.prompt}</p>
            {revealed[ex.id] ? (
              <p role="status" className="mt-3 text-lg font-extrabold text-emerald-700">
                Respuesta: {ex.answer}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  playSound("click", soundOn);
                  setRevealed((r) => ({ ...r, [ex.id]: true }));
                }}
                className="mt-3 rounded-xl bg-purple-100 px-4 py-1.5 text-sm font-bold text-purple-700 hover:bg-purple-200"
              >
                Ver la respuesta
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={refresh}
          className="text-sm font-bold text-purple-700 underline hover:text-purple-900"
        >
          <span aria-hidden="true">🔄 </span>Ver otros ejemplos
        </button>
      </div>
    </div>
  );
}
