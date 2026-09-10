"use client";

import { useState } from "react";
import type { Problem } from "@/lib/problem";
import { getModule } from "@/lib/curriculum";
import { getCustomExamples } from "@/lib/curriculum/customRegistry";
import type { WorkedExample } from "@/lib/curriculum/customSchema";
import { playSound } from "@/lib/gameSound";

/**
 * Ejemplos resueltos — Fase 21 (docs/level-editor-plan-v2.md §8.2): un
 * módulo personalizado puede traer `WorkedExample[]` autorales (pasos
 * escritos por el padre, no generados). Si `examples` no se pasa
 * explícitamente, se resuelve solo desde el registro hidratado
 * (`getCustomExamples`) — así los 52 módulos de código, que nunca tienen
 * ejemplos autorales ahí, siguen exactamente con el comportamiento de
 * "generar y mostrar" de siempre, sin que el llamador tenga que cambiar
 * nada.
 */
export function EjemplosTab({
  moduleId,
  soundOn,
  examples: authoredExamples,
}: {
  moduleId: string;
  soundOn: boolean;
  examples?: WorkedExample[];
}) {
  const mod = getModule(moduleId)!;
  const resolvedAuthored = authoredExamples ?? getCustomExamples(moduleId) ?? [];

  if (resolvedAuthored.length > 0) {
    return <AuthoredExamples examples={resolvedAuthored} soundOn={soundOn} />;
  }

  return <GeneratedExamples generateProblem={mod.generateProblem} soundOn={soundOn} />;
}

function AuthoredExamples({ examples, soundOn }: { examples: WorkedExample[]; soundOn: boolean }) {
  const [openSteps, setOpenSteps] = useState<Record<string, number>>({});

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">
          Ejemplos resueltos <span aria-hidden="true">📚</span>
        </h2>
        <p className="mt-1 text-sm text-slate-700">Sigue los pasos para entender cómo se resuelve.</p>
      </div>

      <div className="mx-auto flex max-w-xl flex-col gap-4">
        {examples.map((ex) => {
          const shown = openSteps[ex.id] ?? 0;
          return (
            <div key={ex.id} className="rounded-2xl border-2 border-purple-200 bg-white p-5 shadow-sm">
              <p className="text-center text-xl font-bold text-purple-900">{ex.prompt}</p>
              <ol className="mt-4 space-y-2">
                {ex.steps.slice(0, shown).map((step, i) => (
                  <li key={step.id} className="rounded-xl bg-purple-50 p-3 text-left text-sm text-slate-700">
                    <span className="mr-1.5 font-bold text-purple-700">{i + 1}.</span>
                    {step.text}
                    {step.math && <div className="mt-1 font-bold text-purple-800">{step.math}</div>}
                    {step.imageSrc && (
                      // eslint-disable-next-line @next/next/no-img-element -- fuente dinámica (biblioteca de assets del padre).
                      <img src={step.imageSrc} alt="" className="mt-2 max-h-32 rounded-lg object-contain" />
                    )}
                  </li>
                ))}
              </ol>
              {shown < ex.steps.length ? (
                <button
                  type="button"
                  onClick={() => {
                    playSound("click", soundOn);
                    setOpenSteps((s) => ({ ...s, [ex.id]: shown + 1 }));
                  }}
                  className="mt-3 w-full rounded-xl bg-purple-100 px-4 py-1.5 text-sm font-bold text-purple-700 hover:bg-purple-200"
                >
                  {shown === 0 ? "Ver el primer paso" : "Siguiente paso"}
                </button>
              ) : (
                <p role="status" className="mt-3 text-center text-lg font-extrabold text-emerald-700">
                  Respuesta: {ex.answerText || ex.answer}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GeneratedExamples({ generateProblem, soundOn }: { generateProblem: () => Problem; soundOn: boolean }) {
  const [examples, setExamples] = useState<Problem[]>(() => Array.from({ length: 3 }, generateProblem));
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  function refresh() {
    playSound("click", soundOn);
    setExamples(Array.from({ length: 3 }, generateProblem));
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
