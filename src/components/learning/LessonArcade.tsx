"use client";

import dynamic from "next/dynamic";
import type { LessonExercise, PracticeMode } from "@/lib/minigames/lessonExercise";

const Frogger = dynamic(() =>
  import("@/components/topic/FroggerGeneric").then((m) => m.FroggerGeneric),
);
const Cohete = dynamic(() =>
  import("@/components/topic/CoheteGeneric").then((m) => m.CoheteGeneric),
);
const noLegacyReward = async () => 0;

export function LessonArcade({
  mode,
  exercise,
}: {
  mode: Exclude<PracticeMode, "write">;
  exercise: LessonExercise;
}) {
  const Game = mode === "frogger" ? Frogger : Cohete;
  return (
    <Game
      moduleId=""
      soundOn={false}
      onAnswer={noLegacyReward}
      exercise={exercise}
    />
  );
}
