"use client";

import Link from "next/link";
import { getBadge } from "@/lib/badges";
import { moduleHref, type ModuleDef } from "@/lib/curriculum";
import { Avatar } from "./Avatar";

/**
 * Barra superior compacta del mundo: personaje, estrellas, insignias, sonido.
 * Todos los valores vienen del estado real —`starLedger` vía `useTotalStars`,
 * insignias de Firestore—; el HUD no guarda nada por su cuenta. El registro
 * de la misión activa vive ahora dentro de la propia escena (`QuestScene` /
 * `MissionOverlay`), no aquí.
 */
export function WorldTopBar({
  childId,
  childName,
  stars,
  earnedBadgeIds,
  soundOn,
  onToggleSound,
  nextChallengeModule,
}: {
  childId: string;
  childName: string;
  stars: number | null;
  earnedBadgeIds: string[];
  soundOn: boolean;
  onToggleSound: () => void;
  nextChallengeModule: ModuleDef | null;
}) {
  return (
    <header className="world-hud-panel mb-2 flex flex-wrap items-center gap-2 rounded-full px-3 py-2 sm:gap-3 sm:px-4">
      <span className="anim-idle flex h-9 items-center justify-center rounded-2xl border border-white/15 bg-slate-900/80 px-1.5">
        <Avatar className="h-8" title={`Personaje de ${childName}`} />
      </span>

      <div>
        <h1 className="world-text-glow bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text font-display text-base font-bold text-transparent sm:text-lg">
          Ciudad Central
        </h1>
        <p className="text-[11px] font-semibold text-indigo-300">{childName}</p>
      </div>

      <span className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-slate-900/70 px-3 py-1.5">
        <span aria-hidden="true">⭐</span>
        <span className="font-bold text-amber-300">
          <span className="sr-only">Estrellas: </span>
          {stars ?? "…"}
        </span>
      </span>

      {earnedBadgeIds.length > 0 && (
        <ul className="flex items-center gap-1.5" aria-label="Insignias ganadas">
          {earnedBadgeIds.map((id) => {
            const badge = getBadge(id);
            if (!badge) return null;
            return (
              <li
                key={id}
                title={`${badge.label}: ${badge.description}`}
                className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-950/60 px-2 py-1 text-xs font-bold text-amber-200"
              >
                <span aria-hidden="true">{badge.emoji}</span>
                {badge.label}
              </li>
            );
          })}
        </ul>
      )}

      <div className="ml-auto flex items-center gap-2">
        {nextChallengeModule && (
          <Link
            href={moduleHref(childId, nextChallengeModule)}
            className="flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-slate-900/70 px-3 py-1.5 text-xs font-bold text-violet-200 transition-colors hover:border-violet-300"
          >
            <span aria-hidden="true">⭐</span>
            Tu próximo desafío · {nextChallengeModule.label}
          </Link>
        )}
        <button
          type="button"
          onClick={onToggleSound}
          aria-pressed={soundOn}
          aria-label="Efectos de sonido"
          className="rounded-full border border-white/15 bg-slate-900/70 p-2 text-slate-200 hover:border-white/40"
        >
          <span aria-hidden="true">{soundOn ? "🔊" : "🔇"}</span>
        </button>
        <Link
          href="/perfiles"
          className="rounded-full border border-white/15 bg-slate-900/70 px-3 py-2 text-xs font-bold text-slate-200 hover:border-white/40"
        >
          Cambiar de perfil
        </Link>
      </div>
    </header>
  );
}
