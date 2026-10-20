"use client";

import type { ReactNode } from "react";
import { useCustomCurriculum } from "@/lib/curriculum/useCustomCurriculum";

export default function LegacyCurriculumLoader({ parentId, children }: { parentId: string; children: ReactNode }) {
  const { ready } = useCustomCurriculum(parentId);
  if (!ready) return <p role="status" className="p-6 text-slate-300">Cargando actividades anteriores…</p>;
  return children;
}
