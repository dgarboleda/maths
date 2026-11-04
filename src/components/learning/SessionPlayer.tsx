"use client";

import dynamic from "next/dynamic";
import { LearningLoading } from "./LearningShell";

// Los repasos y la ubicación usan el catálogo completo. Se cargan bajo
// demanda para que la página de una clase no lo reciba (un componente de
// servidor no divide el código de los de cliente que importa).
const DailyReviewPlayer = dynamic(
  () => import("./DailyReviewPlayer").then((module) => module.DailyReviewPlayer),
  { loading: LearningLoading },
);
const MixedReviewPlayer = dynamic(
  () => import("./MixedReviewPlayer").then((module) => module.MixedReviewPlayer),
  { loading: LearningLoading },
);
const PlacementPlayer = dynamic(
  () => import("./PlacementPlayer").then((module) => module.PlacementPlayer),
  { loading: LearningLoading },
);

/** Sesiones que no son una clase: repaso diario, ubicación y repaso mixto. */
export function SessionPlayer({ childId, sessionId }: { childId: string; sessionId: string }) {
  if (sessionId === "diario") return <DailyReviewPlayer childId={childId} />;
  if (sessionId === "ubicacion") return <PlacementPlayer childId={childId} />;
  return <MixedReviewPlayer childId={childId} reviewId={sessionId} />;
}
