"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const LegacyLoader = dynamic(() => import("./LegacyCurriculumLoader"));

export function isLegacyPath(pathname: string) {
  return /^\/panel\/(editor|curriculum|archivo)(\/|$)/.test(pathname) ||
    /^\/jugar\/[^/]+\/(mapa-anterior|evaluacion|nivel|ciudad-central-legacy|boss|piramide|misiones|aritmetica|algebra|geometria|medicion|logica)(\/|$)/.test(pathname);
}

/** Las clases incluidas nunca esperan ni descargan el compilador antiguo. */
export function LegacyCurriculumBoundary({ parentId, children }: { parentId?: string; children: ReactNode }) {
  const pathname = usePathname();
  return parentId && isLegacyPath(pathname)
    ? <LegacyLoader parentId={parentId}>{children}</LegacyLoader>
    : children;
}
