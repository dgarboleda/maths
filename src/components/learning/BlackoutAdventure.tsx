"use client";

import Link from "next/link";
import { useState } from "react";
import { Activity, Radio, Wrench, Zap } from "lucide-react";
import {
  useLearningAction,
  useLearningData,
} from "@/lib/learning/useLearningData";
import type { AdventureState } from "@/lib/learning/domain";
import {
  LearningLoading,
  LearningLoadError,
  LearningShell,
  primaryButton,
  SaveNotice,
  secondaryButton,
} from "./LearningShell";

const buildings = [
  {
    name: "Hospital",
    icon: Activity,
    need: 90,
    clue: "Requiere 3/4 de la reserva original para mantener sus equipos.",
    position: "left-[4%] top-[18%]",
  },
  {
    name: "Radio",
    icon: Radio,
    need: 20,
    clue: "Requiere 1/6 de la reserva original para coordinar la ayuda.",
    position: "right-[4%] top-[18%]",
  },
  {
    name: "Taller",
    icon: Wrench,
    need: 10,
    clue: "Necesita al menos 10 unidades. Puede utilizar lo que quede después de los otros edificios.",
    position: "right-[8%] bottom-[10%]",
  },
] as const;

export function BlackoutAdventure({ childId }: { childId: string }) {
  const data = useLearningData(childId);
  const mutation = useLearningAction(data.parentId, childId);
  if (data.loading) return <LearningLoading />;
  if (data.error || !data.child)
    return (
      <LearningLoadError
        message={data.error ?? "No encontramos este perfil."}
      />
    );
  const confirmed =
    mutation.confirmed?.lessonId === "apagon"
      ? (mutation.confirmed.progress as AdventureState)
      : undefined;
  const state =
    confirmed && confirmed.revision > data.adventure.revision
      ? confirmed
      : data.adventure;
  return (
    <LearningShell
      childId={childId}
      title="El apagón"
      eyebrow="Capítulo 01 / Devuelve la energía a la ciudad"
    >
      <AdventureGame
        key={childId}
        childId={childId}
        state={state}
        mutation={mutation}
      />
    </LearningShell>
  );
}

function AdventureGame({
  childId,
  state,
  mutation,
}: {
  childId: string;
  state: AdventureState;
  mutation: ReturnType<typeof useLearningAction>;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [allocation, setAllocation] = useState<[number, number, number]>(() => [
    ...state.allocation,
  ]);
  const planned = allocation.reduce((sum, value) => sum + value, 0);
  const tested = state.allocation.reduce((sum, value) => sum + value, 0);
  const connected = state.attempts > 0 && tested <= 120;
  const lit = buildings.map(
    (building, i) => connected && state.allocation[i] >= building.need,
  );
  const success = lit.every(Boolean);
  return (
    <div className="space-y-6">
      <p className="max-w-3xl leading-relaxed text-slate-300">
        La red cayó durante la noche. El hospital mantiene sus equipos con una
        batería de emergencia, la radio no transmite y el taller espera energía
        para reparar el sistema. Tienes una reserva: decide cómo usarla.
      </p>
      <SaveNotice
        busy={mutation.busy}
        error={mutation.error}
        retry={mutation.retry}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,1fr)]">
        <section
          aria-label="Mapa de la ciudad"
          className="relative min-h-[25rem] overflow-hidden rounded-3xl border border-slate-700 bg-gradient-to-b from-indigo-950 to-slate-950 sm:min-h-[30rem]"
        >
          <div
            aria-hidden="true"
            className={`absolute inset-x-0 top-0 h-1 ${success ? "bg-amber-300" : "bg-slate-700"}`}
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            <path
              d="M 24 67 L 24 32 M 24 67 L 78 32 M 24 67 L 78 78"
              fill="none"
              stroke="#334155"
              strokeWidth="2"
            />
            {lit.map(
              (on, i) =>
                on && (
                  <path
                    key={i}
                    d={
                      i === 0
                        ? "M 24 67 L 24 32"
                        : i === 1
                          ? "M 24 67 L 78 32"
                          : "M 24 67 L 78 78"
                    }
                    fill="none"
                    stroke="#67e8f9"
                    strokeWidth="1"
                  />
                ),
            )}
          </svg>
          <p className="absolute left-4 top-4 text-xs font-bold uppercase tracking-widest text-slate-400">
            Ciudad Central ·{" "}
            {success ? "Red restaurada" : "Suministro de emergencia"}
          </p>
          {buildings.map((building, i) => {
            const Icon = building.icon;
            return (
              <button
                key={building.name}
                type="button"
                disabled={!state.inspected}
                aria-pressed={selected === i}
                onClick={() => setSelected(i)}
                className={`absolute ${building.position} flex min-h-24 w-[38%] flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center transition-colors ${lit[i] ? "border-cyan-200 bg-cyan-950 text-cyan-100" : "border-slate-600 bg-slate-900 text-slate-300"} ${selected === i ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-slate-950" : ""} disabled:opacity-70`}
              >
                <Icon size={25} aria-hidden="true" />
                <span className="font-bold">{building.name}</span>
                <span className="text-xs">
                  {lit[i]
                    ? "En funcionamiento"
                    : state.attempts > 0
                      ? "Sin suministro suficiente"
                      : "Espera conexión"}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            disabled={mutation.blocked}
            onClick={() => {
              setSelected(null);
              if (!state.inspected)
                void mutation.run("apagon", state.revision, {
                  kind: "inspect",
                });
            }}
            className="absolute bottom-[16%] left-[5%] flex min-h-24 w-[38%] flex-col items-center justify-center gap-2 rounded-2xl border border-amber-300/70 bg-amber-950 px-3 py-4 text-amber-100 disabled:opacity-50"
          >
            <Zap size={28} aria-hidden="true" />
            <span className="font-bold">
              {state.inspected
                ? "Central · 120 unidades"
                : "Inspeccionar la central"}
            </span>
            <span className="text-xs">
              {state.inspected ? "Planifica la distribución" : "Empieza aquí"}
            </span>
          </button>
        </section>
        <section
          aria-label="Planifica el suministro"
          className="space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6"
        >
          <h2 className="text-xl font-bold">
            {!state.inspected
              ? "Antes de conectar"
              : selected === null
                ? "Tu plan de suministro"
                : buildings[selected].name}
          </h2>
          <div
            role="status"
            aria-live="polite"
            className={`rounded-xl border p-4 text-sm leading-relaxed ${success ? "border-emerald-400/40 bg-emerald-950/50 text-emerald-100" : "border-slate-600 bg-slate-950 text-slate-200"}`}
          >
            {state.feedback}
          </div>
          {!state.inspected ? (
            <p className="text-sm leading-relaxed text-slate-300">
              Inspecciona la central en el mapa. Después visita cada edificio
              para conocer sus necesidades y ajustar los suministros.
            </p>
          ) : (
            <>
              {selected !== null && (
                <p className="rounded-xl bg-cyan-950/40 p-4 text-sm text-cyan-100">
                  {buildings[selected].clue}
                </p>
              )}
              <fieldset disabled={mutation.blocked} className="space-y-5">
                <legend className="sr-only">
                  Unidades de energía para cada edificio
                </legend>
                {buildings.map((building, i) => (
                  <div key={building.name}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <label
                        htmlFor={`supply-${i}`}
                        className="text-sm font-bold"
                      >
                        {building.name}
                      </label>
                      <output
                        htmlFor={`supply-${i}`}
                        className="rounded-lg bg-slate-950 px-3 py-1 font-mono text-cyan-200"
                      >
                        {allocation[i]}
                      </output>
                    </div>
                    <input
                      id={`supply-${i}`}
                      type="range"
                      min={0}
                      max={120}
                      step={5}
                      value={allocation[i]}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        setAllocation(
                          (old) =>
                            old.map((n, at) => (at === i ? value : n)) as [
                              number,
                              number,
                              number,
                            ],
                        );
                        setSelected(i);
                      }}
                      className="min-h-8 w-full accent-cyan-300"
                    />
                  </div>
                ))}
              </fieldset>
              <p
                className={`rounded-xl p-3 text-sm font-bold ${planned > 120 ? "bg-amber-950 text-amber-100" : "bg-slate-950 text-slate-200"}`}
              >
                Plan: {planned} de 120 unidades ·{" "}
                {planned > 120
                  ? `sobrecarga de ${planned - 120}`
                  : `quedan ${120 - planned} por asignar`}
              </p>
              <button
                type="button"
                disabled={mutation.blocked}
                onClick={() =>
                  void mutation.run("apagon", state.revision, {
                    kind: "dispatch",
                    allocation,
                  })
                }
                className={`${primaryButton} w-full`}
              >
                <Zap size={17} aria-hidden="true" />
                Probar la distribución
              </button>
              <p className="text-xs text-slate-400">
                Cada prueba se guarda. Puedes experimentar sin perder tus
                logros; las luces reflejan el último suministro probado.
              </p>
            </>
          )}
        </section>
      </div>
      {success && (
        <section className="space-y-3 rounded-2xl border border-emerald-300/40 bg-emerald-950/30 p-6">
          <h2 className="text-2xl font-bold text-emerald-100">
            La ciudad vuelve a responder
          </h2>
          <p className="text-slate-200">
            La radio coordina a los equipos, el hospital mantiene sus servicios
            y el taller comienza la reparación. Usaste una referencia común: 3/4
            de 120 = 90 y 1/6 de 120 = 20. Quedaron 10 para el taller.
          </p>
          <p className="text-sm text-emerald-200">
            Misión completada · 10 estrellas una sola vez. Aprender con ayuda
            conserva la misma recompensa.
          </p>
          <Link
            href={`/jugar/${childId}/aprende/razones`}
            className={primaryButton}
          >
            Siguiente clase: comparar cantidades con razones
          </Link>
        </section>
      )}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-900 p-5">
        <div>
          <h2 className="font-bold">La matemática que cambia esta ciudad</h2>
          <p className="mt-1 text-sm text-slate-300">
            Aprende por qué se divide entre el denominador y se toman las partes
            del numerador.
          </p>
        </div>
        <Link
          href={`/jugar/${childId}/aprende/fraccion-cantidad`}
          className={secondaryButton}
        >
          Recibir la clase de fracciones
        </Link>
      </section>
    </div>
  );
}
