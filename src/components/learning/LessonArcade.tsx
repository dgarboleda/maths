"use client";

import dynamic from "next/dynamic";
import type { LessonExercise, PracticeGame } from "@/lib/minigames/lessonExercise";
import { LessonChoiceGame } from "./LessonChoiceGame";

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
  mode: PracticeGame;
  exercise: LessonExercise;
}) {
  if (mode !== "frogger" && mode !== "cohete") return <LessonChoiceGame game={mode} exercise={exercise} />;
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
