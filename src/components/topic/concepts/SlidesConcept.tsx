"use client";

import { useState } from "react";

export interface ConceptSlide {
  title: string;
  text: string;
  imageSrc?: string;
}

/**
 * Plantilla de concepto genuinamente data-driven — Fase 21
 * (docs/level-editor-plan-v2.md §8.1): una secuencia de láminas
 * texto+imagen, para explicar un tema sin escribir ningún componente
 * nuevo. Es la única plantilla obligatoria de la fase, porque es la que
 * hace posible que un padre no técnico arme un concepto propio.
 */
export function SlidesConcept({ slides }: { slides: ConceptSlide[] }) {
  const [idx, setIdx] = useState(0);

  if (slides.length === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-2 text-center text-slate-500">
        <p>Todavía no hay láminas cargadas para este concepto.</p>
      </div>
    );
  }

  const slide = slides[Math.min(idx, slides.length - 1)];

  return (
    <div className="mx-auto max-w-xl space-y-6 text-center">
      <div className="rounded-2xl border-2 border-purple-200 bg-white p-6 shadow-sm">
        {slide.imageSrc && (
          // eslint-disable-next-line @next/next/no-img-element -- fuente dinámica (biblioteca de assets del padre), no un import estático.
          <img src={slide.imageSrc} alt="" className="mx-auto mb-4 max-h-56 rounded-xl object-contain" />
        )}
        <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">{slide.title}</h2>
        <p className="mt-3 whitespace-pre-line text-slate-600">{slide.text}</p>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="rounded-xl bg-purple-100 px-4 py-1.5 text-sm font-bold text-purple-700 hover:bg-purple-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Anterior
        </button>
        <span className="text-sm font-bold text-slate-500">
          {idx + 1} / {slides.length}
        </span>
        <button
          type="button"
          onClick={() => setIdx((i) => Math.min(slides.length - 1, i + 1))}
          disabled={idx === slides.length - 1}
          className="rounded-xl bg-purple-100 px-4 py-1.5 text-sm font-bold text-purple-700 hover:bg-purple-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
