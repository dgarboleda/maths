"use client";

import { useEffect } from "react";
import type { useRouter } from "next/navigation";
import type { ChildProfile } from "./types";

/**
 * Sin la evaluación inicial completa no hay currícula por nivel armada para
 * el niño: el plan de temas sale de su resultado (ver placement.ts), no de
 * jugar a ciegas. Toda ruta de juego —ciudad, zona, módulo, evento, boss,
 * misiones, pirámide— redirige a la evaluación mientras
 * `placementStatus !== "completo"`; la propia página de evaluación es la
 * única que no llama a este hook.
 */
export function useRequirePlacement(
  childId: string,
  child: ChildProfile | null,
  router: ReturnType<typeof useRouter>,
): boolean {
  const pending = child !== null && child.placementStatus !== "completo";

  useEffect(() => {
    if (pending) router.replace(`/jugar/${childId}/evaluacion`);
  }, [pending, childId, router]);

  return pending;
}
