"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Compass, Flame, Star, Trophy } from "lucide-react";
import { useLearningData } from "@/lib/learning/useLearningData";
import {
  ADVENTURE_DIFFICULTY_LABEL,
  ADVENTURE_EXPERT_STARS,
  ADVENTURE_STARS,
  ADVENTURES,
  adventureStars,
  expertRounds,
  LEARNING_UNITS,
  missingAdventureLessons,
} from "@/lib/learning/core";
import {
  LearningLoading,
  LearningLoadError,
  LearningShell,
} from "./LearningShell";

/** Aventuras por unidad: problemas abiertos para aplicar lo aprendido. */
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
  const experts = ADVENTURES.filter(
    (adventure) => data.adventures[adventure.id]?.expert?.completedAt,
  ).length;
  return (
    <LearningShell
      childId={childId}
      title="Aventuras"
      eyebrow={`${done} de ${ADVENTURES.length} misiones completadas · ${experts} retos expertos`}
    >
      <p className="mb-6 max-w-3xl leading-relaxed text-slate-300">
        Explora las misiones de cada unidad en Ciudad Central. No hay una única
        respuesta escrita: decides un plan, lo pruebas y la ciudad te dice qué
        condición falta. Cada misión completada da estrellas una vez según su
        dificultad ({ADVENTURE_STARS.basica} básica, {ADVENTURE_STARS.intermedia} intermedia,{" "}
        {ADVENTURE_STARS.avanzada} avanzada) y desbloquea su reto experto: la historia da un giro, sin pistas, por{" "}
        {ADVENTURE_EXPERT_STARS.basica}, {ADVENTURE_EXPERT_STARS.intermedia} o{" "}
        {ADVENTURE_EXPERT_STARS.avanzada} estrellas más según la dificultad. Cada partida del reto trae datos nuevos.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {ADVENTURES.map((adventure) => {
          const state = data.adventures[adventure.id],
            unit = LEARNING_UNITS.find((u) => u.id === adventure.unitId),
            missing = missingAdventureLessons(adventure, data.progress);
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
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      {unit?.title}
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 px-2 py-0.5 text-xs font-bold text-amber-100">
                      {ADVENTURE_DIFFICULTY_LABEL[adventure.difficulty]} ·{" "}
                      {adventureStars(adventure)}
                      <Star size={12} aria-hidden="true" />
                      <span className="sr-only">estrellas</span>
                    </span>
                  </div>
                  <h2 className="mt-1 font-bold text-white">
                    {adventure.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {adventure.intro}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-cyan-200">
                    {missing.length
                      ? `Completa ${missing.length} ${missing.length === 1 ? "clase" : "clases"} para jugar`
                      : state?.completedAt
                      ? "Completada · volver a jugar"
                      : state?.attempts
                        ? `Continuar · ${state.attempts} ${state.attempts === 1 ? "prueba" : "pruebas"}`
                        : "Empezar misión"}
                    <ArrowRight size={16} aria-hidden="true" />
                  </span>
                  {state?.completedAt && !missing.length && (
                    <span className={`mt-3 flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${state.expert?.completedAt ? "border-amber-300/50 text-amber-100" : "border-fuchsia-300/50 text-fuchsia-100"}`}>
                      {state.expert?.completedAt ? <Trophy size={14} aria-hidden="true" /> : <Flame size={14} aria-hidden="true" />}
                      {state.expert?.completedAt
                        ? `Reto experto superado · ${expertRounds(state.expert)} ${expertRounds(state.expert) === 1 ? "partida" : "partidas"}`
                        : state.expert?.attempts
                          ? `Reto experto en curso · ${state.expert.attempts} ${state.expert.attempts === 1 ? "prueba" : "pruebas"}`
                          : "Reto experto disponible"}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </LearningShell>
  );
}
