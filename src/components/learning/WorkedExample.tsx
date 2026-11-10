"use client";

import { useState } from "react";
import { Check, Lightbulb } from "lucide-react";
import { MathText } from "@/components/MathText";
import type { Example } from "@/lib/learning/core";
import { explanationPrompt } from "@/lib/learning/selfExplanation";
import { secondaryButton } from "./LearningShell";

/**
 * Pasos de un ejemplo resuelto. Con `explain`, el alumno elige la
 * justificación de cada paso antes de leerla (autoexplicación). Nunca
 * bloquea: se pueden mostrar todas las explicaciones o continuar.
 */
export function WorkedExample({ example, explain }: { example: Example; explain: boolean }) {
  // Por paso: true = acertó, false = eligió otra justificación o la pidió.
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const active = explain ? example.steps.findIndex((_, index) => !(index in answers)) : -1;
  const own = Object.values(answers).filter(Boolean).length;
  return (
    <>
      {explain && (
        <p className="rounded-xl border border-cyan-300/30 bg-cyan-950/40 p-4 text-sm leading-relaxed text-cyan-100">
          <Lightbulb className="mr-2 inline" size={18} aria-hidden="true" />
          Ahora explícalo tú: en cada paso, elige por qué se hace antes de leerlo. No cuenta para tu comprobación.
        </p>
      )}
      <ol className="space-y-3">
        {example.steps.map((step, index) => {
          const prompt = explain && index === active ? explanationPrompt(example, index) : null;
          const shown = !explain || index in answers;
          return (
            <li key={index} className="rounded-xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-xs font-bold uppercase text-cyan-200">Paso {index + 1}</p>
              <p className="mt-2 overflow-x-auto text-lg font-semibold">
                <MathText text={step.math} />
              </p>
              {prompt && (
                <fieldset className="mt-3 space-y-2">
                  <legend className="text-sm font-bold text-slate-100">¿Por qué se hace este paso?</legend>
                  {prompt.options.map((option, position) => (
                    <button
                      key={option}
                      type="button"
                      className={`${secondaryButton} w-full justify-start text-left`}
                      onClick={() => setAnswers((current) => ({ ...current, [index]: position === prompt.correct }))}
                    >
                      <MathText text={option} />
                    </button>
                  ))}
                </fieldset>
              )}
              {shown && (
                <div aria-live="polite">
                  {explain && (
                    <p className={`mt-3 inline-flex items-center gap-2 text-sm font-semibold ${answers[index] ? "text-emerald-300" : "text-orange-300"}`}>
                      {answers[index] ? (
                        <><Check size={16} strokeWidth={3} aria-hidden="true" /> Lo explicaste tú</>
                      ) : (
                        "Esta es la justificación de este paso"
                      )}
                    </p>
                  )}
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    <strong>Por qué:</strong> <MathText text={step.why} />
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {explain && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-300" aria-live="polite">
            Explicaste {own} de {example.steps.length} pasos por tu cuenta.
          </p>
          {active !== -1 && (
            <button
              type="button"
              className="min-h-11 text-sm font-bold text-cyan-200 underline"
              onClick={() =>
                setAnswers((current) => Object.fromEntries(example.steps.map((_, index) => [index, current[index] ?? false])))
              }
            >
              Mostrar todas las explicaciones
            </button>
          )}
        </div>
      )}
    </>
  );
}
