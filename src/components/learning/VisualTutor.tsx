"use client";

import { useState } from "react";
import { NOTICES, TUTORIALS, type Scene } from "./tutor/content";
import { ArrayBuilder, BalanceBoard, FractionReserves, NumberLine, PlaceValueBoard } from "./tutor/Manipulatives";
import { describe, reduce, type ManipulativeState, type Notice, type TutorAction } from "./tutor/model";
import { useNarration } from "./tutor/useNarration";
import { VoicePlayer } from "./tutor/VoicePlayer";

type Feedback = { kind: "hint" | "notice" | "success"; text: string } | null;

const storageKey = (lessonId: string) => `maths:tutor:${lessonId}`;

function readSaved(lessonId: string, scenes: number): number {
  try {
    const saved = Number(JSON.parse(localStorage.getItem(storageKey(lessonId)) ?? "{}").scene);
    return Number.isInteger(saved) && saved > 0 && saved < scenes ? saved : 0;
  } catch {
    return 0;
  }
}

function save(lessonId: string, scene: number) {
  try {
    localStorage.setItem(storageKey(lessonId), JSON.stringify({ scene }));
  } catch {
    // Sin almacenamiento el tutor funciona igual; solo no recuerda la escena.
  }
}

const button = "min-h-11 rounded-lg border px-3 font-semibold";

/**
 * Tutor visual: una voz pregrabada guía mientras el alumno manipula el
 * material. Es práctica guiada: no envía respuestas, no cuenta como
 * comprobación ni da estrellas (no recibe ninguna función del avance). Solo
 * recuerda en este navegador en qué escena se quedó.
 */
export function VisualTutor({ lessonId }: { lessonId: string }) {
  const tutorial = TUTORIALS[lessonId];
  const [index, setIndex] = useState(() => readSaved(lessonId, tutorial.scenes.length));
  const [resumed, setResumed] = useState(index > 0);
  const scene: Scene = tutorial.scenes[index];
  const [state, setState] = useState<ManipulativeState>(scene.initial);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const narration = useNarration();
  const last = index + 1 === tutorial.scenes.length;

  const goTo = (next: number, speak: boolean) => {
    const target = tutorial.scenes[next];
    setIndex(next);
    setState(target.initial);
    setDone(false);
    setFeedback(null);
    save(lessonId, next);
    setResumed(false);
    if (speak) narration.say(`${target.id}-intro`);
    else narration.stop();
  };

  const dispatch = (action: TutorAction) => {
    if (done) return;
    const { state: next, notice } = reduce(state, action);
    setState(next);
    if (notice) return announce("notice", notice);
    if (scene.goal(next)) {
      setDone(true);
      setFeedback({ kind: "success", text: scene.success });
      narration.say(`${scene.id}-logro`);
      if (last) save(lessonId, 0);
    } else if (feedback?.kind === "notice") setFeedback(null);
  };

  const announce = (kind: "notice", notice: Notice) => {
    setFeedback({ kind, text: NOTICES[notice] });
    narration.say(notice);
  };

  const hint = () => {
    setFeedback({ kind: "hint", text: scene.hint });
    narration.say(`${scene.id}-pista`);
  };

  const intro = `${scene.id}-intro`;

  return (
    <section aria-labelledby={`tutor-${lessonId}`} className="space-y-4 rounded-2xl border border-cyan-400/40 bg-slate-950 p-4 sm:p-6">
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wide text-cyan-300">
          Tutor visual · escena {index + 1} de {tutorial.scenes.length}
        </p>
        <h4 id={`tutor-${lessonId}`} className="text-xl font-bold text-white">
          {tutorial.title}
        </h4>
        <p className="text-sm text-slate-400">Práctica guiada: no cuenta como comprobación ni suma estrellas.</p>
      </header>

      {resumed && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
          Retomas donde lo dejaste.
          <button type="button" className="min-h-11 underline decoration-dotted underline-offset-4" onClick={() => goTo(0, false)}>
            Empezar desde el principio
          </button>
        </p>
      )}

      <p className="leading-relaxed text-slate-100">{scene.intro}</p>

      <VoicePlayer narration={narration} fallbackClip={intro} />
      <audio {...narration.audioProps} />
      {narration.status === "unavailable" && (
        <p role="status" className="text-sm text-amber-200">
          La voz no está disponible. Puedes seguir leyendo y completar la actividad.
        </p>
      )}

      <div className="rounded-xl bg-slate-900 p-4">
        {state.kind === "place-value" && <PlaceValueBoard state={state} dispatch={dispatch} />}
        {state.kind === "array" && <ArrayBuilder state={state} dispatch={dispatch} />}
        {state.kind === "fractions" && <FractionReserves state={state} dispatch={dispatch} />}
        {state.kind === "line" && <NumberLine state={state} dispatch={dispatch} />}
        {state.kind === "balance" && <BalanceBoard state={state} dispatch={dispatch} />}
        <p className="sr-only" aria-live="polite">
          {describe(state)}
        </p>
      </div>

      <div aria-live="polite" className="min-h-6">
        {feedback && (
          <p className={feedback.kind === "success" ? "font-semibold text-emerald-200" : "text-amber-200"}>{feedback.text}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {!done && (
          <button type="button" className={`${button} border-amber-300/70 text-amber-100`} onClick={hint}>
            Necesito una pista
          </button>
        )}
        <button type="button" className={`${button} border-slate-600 text-slate-200`} onClick={() => goTo(index, false)}>
          Reiniciar escena
        </button>
        {done && !last && (
          <button type="button" className={`${button} border-cyan-300 bg-cyan-300 text-slate-950`} onClick={() => goTo(index + 1, true)}>
            Continuar actividad
          </button>
        )}
        {done && last && (
          <button type="button" className={`${button} border-cyan-300 text-cyan-100`} onClick={() => goTo(0, false)}>
            Repetir la actividad
          </button>
        )}
      </div>
      {done && last && <p className="font-semibold text-cyan-200">Actividad terminada. Continúa con la clase cuando quieras.</p>}
    </section>
  );
}
