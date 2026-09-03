"use client";

import { getModule } from "@/lib/curriculum";

export function ConceptoGeneric({ moduleId }: { moduleId: string }) {
  const mod = getModule(moduleId);
  if (!mod) return null;
  const Concept = mod.ConceptComponent;
  return <Concept />;
}
