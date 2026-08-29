"use client";

import { useState } from "react";
import { getStrand } from "@/lib/strands";

export function WordProblemConcept({ strandSlug, difficulty }: { strandSlug: string; difficulty: number }) {
  const strand = getStrand(strandSlug)!;
  const [problem, setProblem] = useState(() => strand.generateProblem(difficulty));
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Piensa el problema paso a paso 🤔</h2>
      <ol className="mx-auto max-w-md list-decimal space-y-1 text-left text-sm text-slate-600 marker:font-bold marker:text-purple-500">
        <li>Lee con calma: ¿qué te están preguntando?</li>
        <li>Busca los números importantes (a veces hay datos que no sirven).</li>
        <li>Decide qué operación usar: sumar, restar, multiplicar o dividir.</li>
        <li>Resuelve y revisa si la respuesta tiene sentido.</li>
      </ol>
      <div className="mx-auto max-w-xl rounded-2xl border-2 border-purple-200 bg-white p-6 shadow-sm">
        <p className="text-xl font-bold text-purple-900">{problem.prompt}</p>
        {revealed ? (
          <p className="mt-4 text-lg font-extrabold text-emerald-600">Respuesta: {problem.answer}</p>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="mt-4 rounded-xl bg-purple-100 px-4 py-1.5 text-sm font-bold text-purple-700 hover:bg-purple-200"
          >
            Ver la respuesta
          </button>
        )}
      </div>
      <button
        onClick={() => {
          setProblem(strand.generateProblem(difficulty));
          setRevealed(false);
        }}
        className="text-sm font-bold text-purple-600 underline hover:text-purple-800"
      >
        🔄 Otro problema
      </button>
    </div>
  );
}
