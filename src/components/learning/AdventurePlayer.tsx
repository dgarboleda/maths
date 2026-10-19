"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Circle, Minus, Plus, Search, Zap } from "lucide-react";
import {
  useLearningAction,
  useLearningData,
} from "@/lib/learning/useLearningData";
import {
  getAdventure,
  getLesson,
  initialAdventure,
  type AdventureDef,
  type AdventureState,
} from "@/lib/learning/domain";
import {
  LearningLoading,
  LearningLoadError,
  LearningShell,
  primaryButton,
  SaveNotice,
  secondaryButton,
} from "./LearningShell";

/** Aventura de unidad genérica: inspeccionar, planificar y probar el plan
 *  contra las restricciones que evalúa el servidor. */
export function AdventurePlayer({
  childId,
  adventureId,
}: {
  childId: string;
  adventureId: string;
}) {
  const adventure = getAdventure(adventureId);
  const data = useLearningData(childId);
  const mutation = useLearningAction(data.parentId, childId);
  if (!adventure)
    return <LearningLoadError message="No encontramos esta aventura." />;
  if (data.loading) return <LearningLoading />;
  if (data.error || !data.child)
    return (
      <LearningLoadError
        message={data.error ?? "No encontramos este perfil."}
      />
    );
  const confirmed =
    mutation.confirmed?.lessonId === adventure.id
      ? (mutation.confirmed.progress as AdventureState)
      : undefined;
  const saved = data.adventures[adventure.id] ?? initialAdventure(adventure.id);
  const state =
    confirmed && confirmed.revision > saved.revision ? confirmed : saved;
  return (
    <LearningShell
      childId={childId}
      title={adventure.title}
      eyebrow={adventure.eyebrow}
    >
      <AdventureGame
        key={adventure.id}
        childId={childId}
        adventure={adventure}
        state={state}
        mutation={mutation}
      />
    </LearningShell>
  );
}

function AdventureGame({
  childId,
  adventure,
  state,
  mutation,
}: {
  childId: string;
  adventure: AdventureDef;
  state: AdventureState;
  mutation: ReturnType<typeof useLearningAction>;
}) {
  const [values, setValues] = useState(() => state.allocation.map(String));
  const [invalid, setInvalid] = useState<string | null>(null);
  const tested =
    state.attempts > 0 ? adventure.evaluate(state.allocation) : null;
  const success = Boolean(state.completedAt) && tested?.goals.every(Boolean);
  const change = (i: number, value: string) => {
    setInvalid(null);
    setValues((old) => old.map((v, at) => (at === i ? value : v)));
  };
  const nudge = (i: number, delta: number) => {
    const input = adventure.inputs[i],
      current = Number(values[i].replace("−", "-"));
    const next = Math.min(
      input.max,
      Math.max(input.min, (Number.isFinite(current) ? current : input.start) + delta),
    );
    change(i, String(next));
  };
  const submit = () => {
    const plan = values.map((v) => Number(v.trim().replace("−", "-")));
    const wrong = adventure.inputs.findIndex(
      (input, i) =>
        values[i].trim() === "" ||
        !Number.isInteger(plan[i]) ||
        plan[i] < input.min ||
        plan[i] > input.max,
    );
    if (wrong >= 0) {
      const input = adventure.inputs[wrong];
      setInvalid(
        `${input.label}: escribe un número entero entre ${input.min} y ${input.max}.`,
      );
      return;
    }
    void mutation.run(adventure.id, state.revision, {
      kind: "dispatch",
      allocation: plan,
    });
  };
  return (
    <div className="space-y-6">
      <p className="max-w-3xl leading-relaxed text-slate-300">
        {adventure.intro}
      </p>
      <SaveNotice
        busy={mutation.busy}
        error={mutation.error}
        retry={mutation.retry}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,1fr)]">
        <section
          aria-label="Objetivos de la misión"
          className="space-y-4 rounded-3xl border border-slate-700 bg-gradient-to-b from-indigo-950 to-slate-950 p-5 sm:p-6"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {success ? "Misión cumplida" : "Objetivos"}
          </p>
          <ul className="space-y-3">
            {adventure.goals.map((goal, i) => {
              const met = tested?.goals[i] ?? false;
              return (
                <li
                  key={goal}
                  className={`flex items-center gap-3 rounded-2xl border p-4 ${met ? "border-cyan-200 bg-cyan-950 text-cyan-100" : "border-slate-600 bg-slate-900 text-slate-300"}`}
                >
                  {met ? (
                    <CheckCircle2 size={22} aria-hidden="true" />
                  ) : (
                    <Circle size={22} aria-hidden="true" />
                  )}
                  <span className="font-semibold">{goal}</span>
                  <span className="sr-only">
                    {met ? "cumplido" : "pendiente"}
                  </span>
                </li>
              );
            })}
          </ul>
          {!state.inspected && (
            <button
              type="button"
              disabled={mutation.blocked}
              onClick={() =>
                void mutation.run(adventure.id, state.revision, {
                  kind: "inspect",
                })
              }
              className={`${primaryButton} w-full`}
            >
              <Search size={17} aria-hidden="true" />
              Investigar la situación
            </button>
          )}
        </section>
        <section
          aria-label="Tu plan"
          className="space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6"
        >
          <h2 className="text-xl font-bold">
            {state.inspected ? "Tu plan" : "Antes de decidir"}
          </h2>
          <div
            role="status"
            aria-live="polite"
            className={`rounded-xl border p-4 text-sm leading-relaxed ${success ? "border-emerald-400/40 bg-emerald-950/50 text-emerald-100" : "border-slate-600 bg-slate-950 text-slate-200"}`}
          >
            {state.feedback}
          </div>
          {state.inspected && (
            <>
              <fieldset disabled={mutation.blocked} className="space-y-4">
                <legend className="sr-only">Valores de tu plan</legend>
                {adventure.inputs.map((input, i) => (
                  <div key={input.id}>
                    <label
                      htmlFor={`plan-${input.id}`}
                      className="text-sm font-bold"
                    >
                      {input.label}
                      {input.unit ? ` (${input.unit})` : ""}
                    </label>
                    <p className="mt-1 text-xs text-slate-400">{input.clue}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Restar a ${input.label}`}
                        onClick={() => nudge(i, -input.step)}
                        className={secondaryButton}
                      >
                        <Minus size={16} aria-hidden="true" />
                      </button>
                      <input
                        id={`plan-${input.id}`}
                        inputMode="numeric"
                        value={values[i]}
                        onChange={(event) => change(i, event.target.value)}
                        className="min-h-11 w-28 rounded-xl border border-slate-600 bg-slate-950 px-3 text-center font-mono text-lg text-cyan-200"
                      />
                      <button
                        type="button"
                        aria-label={`Sumar a ${input.label}`}
                        onClick={() => nudge(i, input.step)}
                        className={secondaryButton}
                      >
                        <Plus size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </fieldset>
              {invalid && (
                <p role="alert" className="text-sm text-amber-200">
                  {invalid}
                </p>
              )}
              <button
                type="button"
                disabled={mutation.blocked}
                onClick={submit}
                className={`${primaryButton} w-full`}
              >
                <Zap size={17} aria-hidden="true" />
                Probar el plan
              </button>
              <p className="text-xs text-slate-400">
                Cada prueba se guarda. Puedes experimentar: los objetivos
                reflejan el último plan probado.
              </p>
            </>
          )}
        </section>
      </div>
      {success && (
        <section className="space-y-3 rounded-2xl border border-emerald-300/40 bg-emerald-950/30 p-6">
          <h2 className="text-2xl font-bold text-emerald-100">
            Misión completada
          </h2>
          <p className="text-slate-200">{adventure.success}</p>
          <p className="text-sm text-emerald-200">
            10 estrellas una sola vez. Aprender con ayuda conserva la misma
            recompensa.
          </p>
          <Link href={`/jugar/${childId}/aventura`} className={primaryButton}>
            Elegir otra aventura
          </Link>
        </section>
      )}
      <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-5">
        <h2 className="font-bold">La matemática detrás de esta misión</h2>
        <div className="flex flex-wrap gap-3">
          {adventure.lessonIds.map((id) => (
            <Link
              key={id}
              href={`/jugar/${childId}/aprende/${id}`}
              className={secondaryButton}
            >
              {getLesson(id)?.title ?? id}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
