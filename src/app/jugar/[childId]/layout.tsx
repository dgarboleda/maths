"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { LegacyCurriculumBoundary } from "@/components/legacy/LegacyCurriculumBoundary";

export default function JugarChildLayout({ children }: { children: ReactNode }) {
  const { parentId } = useAuth();
  return <LegacyCurriculumBoundary parentId={parentId}>{children}</LegacyCurriculumBoundary>;
}
