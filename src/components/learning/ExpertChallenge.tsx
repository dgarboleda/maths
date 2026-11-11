"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Flame, Minus, Plus, Trophy, Zap } from "lucide-react";
import {
  expertInputs,
  STAR_REWARDS,
  type AdventureDef,
  type AdventureState,
} from "@/lib/learning/core";
import type { useLearningAction } from "@/lib/learning/useLearningData";
import { OpenCalculatorButton, useCalculatorTarget } from "./Calculator";
import { primaryButton, secondaryButton } from "./LearningShell";

/**
 * Segunda fase de una aventura: se desbloquea al completar la misión. La
 * historia da un giro y el plan se prueba sin pistas junto a los datos; la
 * única ayuda es la respuesta de la ciudad a cada plan probado.
 */
export function ExpertChallenge({
  adventure,
  state,
  mutation,
}: {
  adventure: AdventureDef;
  state: AdventureState;
  mutation: ReturnType<typeof useLearningAction>;
}) {
  const challenge = adventure.expert;
  if (!challenge || !state.completedAt) return null;
  const expert = state.expert;
  const done = Boolean(expert?.completedAt);
  return (
    <section
      aria-labelledby={`reto-${adventure.id}`}
      className={`space-y-5 rounded-3xl border p-5 sm:p-6 ${done ? "border-amber-300/50 bg-amber-950/20" : "border-fuchsia-400/40 bg-gradient-to-b from-fuchsia-950/40 to-slate-950"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-fuchsia-200">
            <Flame size={14} aria-hidden="true" /> Fase 2 · Reto experto
          </p>
          <h2 id={`reto-${adventure.id}`} className="mt-1 text-2xl font-bold text-white">
            {done ? "Reto experto superado" : "La historia da un giro"}
          </h2>
        </div>
        <p className="rounded-full border border-amber-300/40 px-3 py-1 text-sm font-bold text-amber-100">
          {done ? `Superado en ${expert!.attempts} ${expert!.attempts === 1 ? "prueba" : "pruebas"}` : `+${STAR_REWARDS.adventureExpert} estrellas`}
        </p>
      </div>
      {!expert?.inspected ? (
        <>
          <p className="max-w-3xl leading-relaxed text-slate-200">
            Cumpliste la misión, pero la ciudad no descansa. El reto experto cambia los datos y pide
            más: optimizar, razonar al revés o cumplir más condiciones a la vez. No hay pistas junto a
            los datos.
          </p>
          <button
            type="button"
            disabled={mutation.blocked}
            className={primaryButton}
            onClick={() => void mutation.run(adventure.id, state.revision, { kind: "inspect", expert: true })}
          >
            <Flame size={17} aria-hidden="true" />
            Aceptar el reto
          </button>
        </>
      ) : (
        <ExpertPlan key={adventure.id} adventure={adventure} state={state} mutation={mutation} />
      )}
    </section>
  );
}

function ExpertPlan({
  adventure,
  state,
  mutation,
}: {
  adventure: AdventureDef;
  state: AdventureState;
  mutation: ReturnType<typeof useLearningAction>;
}) {
  const challenge = adventure.expert!;
  const expert = state.expert!;
  const inputs = expertInputs(adventure);
  const [values, setValues] = useState(() => expert.allocation.map(String));
  const [invalid, setInvalid] = useState<string | null>(null);
  const tested = expert.attempts > 0 ? challenge.evaluate(expert.allocation) : null;
  const done = Boolean(expert.completedAt);
  const change = (i: number, value: string) => {
    setInvalid(null);
    setValues((old) => old.map((v, at) => (at === i ? value : v)));
  };
  useCalculatorTarget(
    inputs.map((input) => input.label),
    (value, i) => change(i, value),
    !mutation.blocked,
    true,
  );
  const parse = (value: string) => Number(value.trim().replace("−", "-"));
  const nudge = (i: number, delta: number) => {
    const input = inputs[i],
      current = parse(values[i]);
    change(i, String(Math.min(input.max, Math.max(input.min, (Number.isFinite(current) ? current : input.start) + delta))));
  };
  const submit = () => {
    const plan = values.map(parse);
    const wrong = inputs.findIndex(
      (input, i) => values[i].trim() === "" || !Number.isInteger(plan[i]) || plan[i] < input.min || plan[i] > input.max,
    );
    if (wrong >= 0) {
      const input = inputs[wrong];
      setInvalid(`${input.label}: escribe un número entero entre ${input.min} y ${input.max}.`);
      return;
    }
    void mutation.run(adventure.id, state.revision, { kind: "dispatch", allocation: plan, expert: true });
  };
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,1fr)]">
      <div className="space-y-4">
        <p className="rounded-2xl border border-fuchsia-300/30 bg-slate-950/70 p-4 leading-relaxed text-slate-100">
          {challenge.brief}
        </p>
        <ul aria-label="Objetivos del reto experto" className="space-y-2">
          {challenge.goals.map((goal, i) => {
            const met = tested?.goals[i] ?? false;
            return (
              <li
                key={goal}
                className={`flex items-center gap-3 rounded-xl border p-3 ${met ? "border-amber-200 bg-amber-950/60 text-amber-50" : "border-slate-600 bg-slate-900 text-slate-300"}`}
              >
                {met ? <CheckCircle2 size={20} aria-hidden="true" /> : <Circle size={20} aria-hidden="true" />}
                <span className="font-semibold">{goal}</span>
                <span className="sr-only">{met ? "cumplido" : "pendiente"}</span>
              </li>
            );
          })}
        </ul>
        {done && (
          <div className="space-y-2 rounded-2xl border border-amber-300/40 bg-amber-950/40 p-4 text-amber-50">
            <p className="inline-flex items-center gap-2 font-bold">
              <Trophy size={18} aria-hidden="true" /> {STAR_REWARDS.adventureExpert} estrellas, una sola vez
            </p>
            <p className="text-sm leading-relaxed">{challenge.success}</p>
          </div>
        )}
      </div>
      <div className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold">Tu plan experto</h3>
          <span className="text-xs text-slate-400">
            {expert.attempts} {expert.attempts === 1 ? "prueba" : "pruebas"}
          </span>
        </div>
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl border p-4 text-sm leading-relaxed ${done ? "border-amber-300/40 bg-amber-950/50 text-amber-50" : "border-slate-600 bg-slate-950 text-slate-200"}`}
        >
          {expert.feedback}
        </div>
        <fieldset disabled={mutation.blocked} className="space-y-4">
          <legend className="sr-only">Valores del plan experto</legend>
          {inputs.map((input, i) => (
            <div key={input.id}>
              <label htmlFor={`experto-${input.id}`} className="text-sm font-bold">
                {input.label}
                {input.unit ? ` (${input.unit})` : ""}
              </label>
              <div className="mt-2 flex items-center gap-2">
                <button type="button" aria-label={`Restar a ${input.label}`} title="Restar" onClick={() => nudge(i, -input.step)} className={secondaryButton}>
                  <Minus size={16} aria-hidden="true" />
                </button>
                <input
                  id={`experto-${input.id}`}
                  inputMode="numeric"
                  value={values[i]}
                  onChange={(event) => change(i, event.target.value)}
                  className="min-h-11 w-28 rounded-xl border border-slate-600 bg-slate-950 px-3 text-center font-mono text-lg text-amber-100"
                />
                <button type="button" aria-label={`Sumar a ${input.label}`} title="Sumar" onClick={() => nudge(i, input.step)} className={secondaryButton}>
                  <Plus size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </fieldset>
        <OpenCalculatorButton disabled={mutation.blocked} />
        {invalid && (
          <p role="alert" className="text-sm text-amber-200">
            {invalid}
          </p>
        )}
        <button type="button" disabled={mutation.blocked} onClick={submit} className={`${primaryButton} w-full`}>
          <Zap size={17} aria-hidden="true" />
          Probar el plan experto
        </button>
      </div>
    </div>
  );
}
