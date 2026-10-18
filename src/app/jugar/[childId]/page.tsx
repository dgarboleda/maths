"use client";

import { useParams } from "next/navigation";
import { LearningHome } from "@/components/learning/LearningHome";

/** Aprendizaje y aventura incluidos; los mundos familiares son una opción. */
export default function PlayerHomePage() {
  const { childId } = useParams<{ childId: string }>();
  return <LearningHome key={childId} childId={childId} />;
}
