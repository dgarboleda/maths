"use client";

import dynamic from "next/dynamic";
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
}: {
  mode: PracticeGame;
  exercise: LessonExercise;
}) {
  const Game = GAMES[mode];
  return (
    <Game
      moduleId=""
      soundOn={false}
      onAnswer={noLegacyReward}
      exercise={exercise}
    />
  );
}
