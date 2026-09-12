"use client";

import Link from "next/link";
import type { KeyboardEvent, RefObject } from "react";
import { moduleHref, type ModuleDef } from "@/lib/curriculum";
import type { LevelEntity } from "@/lib/level/schema";

/**
 * Panel "el sistema no te reconoce todavía" — Fase 36 (docs/plan-
 * minijuegos-retro.md), extraído de `LevelCoheteOverlay.tsx` (Fase 33) para
 * que cada minijuego arcade nuevo no lo vuelva a duplicar. Deliberadamente
 * NO reemplaza el gate propio de `PuzzleOverlay.tsx`: ese tiene su propio
 * theming (`isCore`) y es compartido con la escena legacy de Ciudad
 * Central — fuera de alcance tocarlo acá.
 */
export function PrerequisiteGate({
  mod,
  entity,
  childId,
  missing,
  titleId,
  dialogRef,
  onKeyDown,
  onClose,
}: {
  mod: ModuleDef;
  entity: LevelEntity | undefined;
  childId: string;
  missing: ModuleDef[];
  titleId: string;
  dialogRef: RefObject<HTMLDivElement | null>;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="world-terminal-panel world-scanlines w-full max-w-lg space-y-4 rounded-3xl border-2 border-cyan-400/40 p-5 focus:outline-none sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-display text-lg font-bold text-cyan-200">
            {entity?.name ?? mod.label}
          </h2>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-3 py-1.5 text-sm font-bold text-slate-300 hover:bg-slate-700">
            Salir
          </button>
        </div>
        <p className="text-slate-300">El sistema no te reconoce todavía. Necesitas dominar antes:</p>
        <ul className="flex flex-col gap-1">
          {missing.map((m) => (
            <li key={m.id} className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-bold text-slate-200">
              <span aria-hidden="true">🔧 </span>
              {m.label}
            </li>
          ))}
        </ul>
        <Link href={moduleHref(childId, missing[0])} className="inline-block rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white">
          Ir a entrenar {missing[0].label}
        </Link>
      </div>
    </div>
  );
}
