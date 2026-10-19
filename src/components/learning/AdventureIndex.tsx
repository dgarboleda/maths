"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Compass } from "lucide-react";
import { useLearningData } from "@/lib/learning/useLearningData";
import { ADVENTURES, LEARNING_UNITS } from "@/lib/learning/domain";
import {
  LearningLoading,
  LearningLoadError,
  LearningShell,
} from "./LearningShell";

/** Una aventura por unidad: problemas abiertos para aplicar lo aprendido. */
export function AdventureIndex({ childId }: { childId: string }) {
  const data = useLearningData(childId);
  if (data.loading) return <LearningLoading />;
  if (data.error || !data.child)
    return (
      <LearningLoadError
        message={data.error ?? "No encontramos este perfil."}
      />
    );
  const done = ADVENTURES.filter(
    (adventure) => data.adventures[adventure.id]?.completedAt,
  ).length;
  return (
    <LearningShell
      childId={childId}
      title="Aventuras"
      eyebrow={`${done} de ${ADVENTURES.length} misiones completadas`}
    >
      <p className="mb-6 max-w-3xl leading-relaxed text-slate-300">
        Cada unidad tiene una misión en Ciudad Central. No hay una única
        respuesta escrita: decides un plan, lo pruebas y la ciudad te dice qué
        condición falta. Cada misión completada da 10 estrellas una vez.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {ADVENTURES.map((adventure) => {
          const state = data.adventures[adventure.id],
            unit = LEARNING_UNITS.find((u) => u.id === adventure.unitId);
          return (
            <li key={adventure.id}>
              <Link
                href={`/jugar/${childId}/aventura/${adventure.id}`}
                className="group flex h-full items-start gap-4 rounded-2xl border border-slate-700 bg-slate-900/60 p-5 transition-colors hover:border-cyan-300/60"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-300/10 text-violet-200">
                  {state?.completedAt ? (
                    <CheckCircle2 size={22} aria-hidden="true" />
                  ) : (
                    <Compass size={22} aria-hidden="true" />
                  )}
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    {unit?.title}
                  </p>
                  <h2 className="mt-1 font-bold text-white">
                    {adventure.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {adventure.intro}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-cyan-200">
                    {state?.completedAt
                      ? "Completada · volver a jugar"
                      : state?.attempts
                        ? `Continuar · ${state.attempts} ${state.attempts === 1 ? "prueba" : "pruebas"}`
                        : "Empezar misión"}
                    <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </LearningShell>
  );
}
