"use client";

import dynamic from "next/dynamic";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useSoundPreference } from "@/lib/useSoundPreference";
import type { LessonExercise, PracticeGame } from "@/lib/minigames/lessonExercise";

const Frogger = dynamic(() =>
  import("@/components/topic/FroggerGeneric").then((m) => m.FroggerGeneric),
);
const Cohete = dynamic(() =>
  import("@/components/topic/CoheteGeneric").then((m) => m.CoheteGeneric),
);
const Snake = dynamic(() =>
  import("@/components/topic/SnakeGeneric").then((m) => m.SnakeGeneric),
);
const Runner = dynamic(() =>
  import("@/components/topic/RunnerGeneric").then((m) => m.RunnerGeneric),
);
const NumberPac = dynamic(() =>
  import("@/components/topic/NumberPacGeneric").then((m) => m.NumberPacGeneric),
);
const Invaders = dynamic(() =>
  import("@/components/topic/InvadersGeneric").then((m) => m.InvadersGeneric),
);
const Breakout = dynamic(() =>
  import("@/components/topic/BreakoutGeneric").then((m) => m.BreakoutGeneric),
);
const Topos = dynamic(() =>
  import("@/components/topic/TopoGeneric").then((m) => m.TopoGeneric),
);
const Cajas = dynamic(() =>
  import("@/components/topic/CajasGeneric").then((m) => m.CajasGeneric),
);
const GAMES = {
  frogger: Frogger,
  cohete: Cohete,
  snake: Snake,
  runner: Runner,
  numberpac: NumberPac,
  invaders: Invaders,
  breakout: Breakout,
  topos: Topos,
  cajas: Cajas,
} as const;
const noLegacyReward = async () => 0;

export function LessonArcade({
  mode,
  exercise,
  onTogglePause,
  showPause,
}: {
  mode: PracticeGame;
  exercise: LessonExercise;
  onTogglePause: () => void;
  showPause: boolean;
}) {
  const Game = GAMES[mode];
  // Los efectos arcade siguen la preferencia de sonido de toda la app.
  const [soundOn, toggleSound] = useSoundPreference();
  return (
    <Game
      moduleId=""
      soundOn={soundOn}
      onAnswer={noLegacyReward}
      exercise={{ ...exercise, controls: (
      <div className="relative z-20 mb-2 flex justify-end gap-2">
        {showPause && <button
          type="button"
          onClick={onTogglePause}
          disabled={exercise.disabled}
          aria-label={exercise.paused ? "Reanudar partida" : "Pausar partida"}
          title={exercise.paused ? "Reanudar partida" : "Pausar partida"}
          className="grid size-11 place-items-center rounded-xl border border-slate-500 bg-slate-900/90 text-slate-100 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-50"
        >
          {exercise.paused ? <Play size={20} aria-hidden="true" /> : <Pause size={20} aria-hidden="true" />}
        </button>}
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={soundOn}
          aria-label="Sonido del juego"
          title="Sonido del juego"
          className="grid size-11 place-items-center rounded-xl border border-slate-500 bg-slate-900/90 text-slate-100 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
          {soundOn ? <Volume2 size={20} aria-hidden="true" /> : <VolumeX size={20} aria-hidden="true" />}
        </button>
      </div>
      ) }}
    />
  );
}
