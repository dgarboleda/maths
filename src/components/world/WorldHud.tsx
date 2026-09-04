"use client";

import Link from "next/link";
import { getBadge } from "@/lib/badges";
import { moduleHref, type ModuleDef } from "@/lib/curriculum";
import type { AvatarLook } from "@/lib/world/avatar";
import type { QuestProgress } from "@/lib/world/quests";
import { Avatar } from "./Avatar";

/**
 * HUD del mundo: barra compacta arriba (personaje, estrellas, insignias,
 * sonido) y panel de misión abajo. Todos los valores vienen del estado real
 * —`starLedger` vía `useTotalStars`, insignias de Firestore, misión derivada
 * de `skillsProgress`—; el HUD no guarda nada por su cuenta.
 */
export function WorldTopBar({
  childId,
  childName,
  look,
  stars,
  earnedBadgeIds,
  soundOn,
  onToggleSound,
  onOpenAvatar,
  nextChallengeModule,
}: {
  childId: string;
  childName: string;
  look: AvatarLook;
  stars: number | null;
  earnedBadgeIds: string[];
  soundOn: boolean;
  onToggleSound: () => void;
  onOpenAvatar: () => void;
  nextChallengeModule: ModuleDef | null;
}) {
  return (
    <header className="world-hud-panel mb-2 flex flex-wrap items-center gap-2 rounded-full px-3 py-2 sm:gap-3 sm:px-4">
      <button
        type="button"
        onClick={onOpenAvatar}
        aria-label={`Personalizar el personaje de ${childName}`}
        className="rounded-2xl border border-white/15 bg-slate-900/80 px-2 py-1 transition-transform hover:scale-105 hover:border-white/40"
      >
        <Avatar look={look} className="h-9 w-7" title={`Personaje de ${childName}`} />
      </button>

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

export function QuestPanel({
  childId,
  quest,
  onFocusZone,
}: {
  childId: string;
  quest: QuestProgress | null;
  onFocusZone: (strandSlug: string) => void;
}) {
  if (!quest) {
    return (
      <section
        aria-label="Misión actual"
        className="world-quest-panel anim-rise mt-2 rounded-2xl border border-emerald-400/40 px-4 py-3"
      >
        <p className="text-sm font-bold text-emerald-200">
          <span aria-hidden="true">🏆 </span>Todas las misiones de la Ciudad Central están resueltas.
        </p>
        <p className="text-xs text-slate-400">Explora las zonas para dominar habilidades nuevas.</p>
      </section>
    );
  }

  const pct = Math.round((quest.doneCount / quest.total) * 100);

  return (
    <section
      aria-label="Misión actual"
      className="world-quest-panel anim-rise mt-2 rounded-2xl border border-amber-400/40 px-4 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-amber-200">
          <span aria-hidden="true">{quest.quest.icon} </span>
          {quest.quest.title}
          <span aria-hidden="true" className="anim-blink ml-1 text-amber-300/80">
            ▮
          </span>
        </h2>
        <span className="text-xs font-bold text-slate-300">
          {quest.doneCount}/{quest.total}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progreso de la misión ${quest.quest.title}`}
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/15"
      >
        <div className="h-1.5 rounded-full bg-amber-300" style={{ width: `${pct}%` }} />
      </div>

      <ul className="mt-2 flex flex-col gap-1">
        {(() => {
          const currentId = quest.objectives.find((o) => !o.done && !o.locked)?.id;
          return quest.objectives.map((objective) => {
            const current = objective.id === currentId;
            return (
              <li
                key={objective.id}
                className={`flex flex-wrap items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-xs ${
                  current
                    ? "border border-amber-300/30 bg-amber-400/10 text-slate-100"
                    : objective.done
                      ? "text-emerald-300"
                      : objective.locked
                        ? "text-slate-400"
                        : "text-slate-200"
                }`}
              >
                <span aria-hidden="true">{objective.done ? "✓ " : objective.locked ? "🔒 " : "○ "}</span>
                <span className="sr-only">
                  {objective.done ? "Completado: " : objective.locked ? "Bloqueado: " : "Pendiente: "}
                </span>
                {objective.label}
                {objective.locked && objective.missing.length > 0 && (
                  <span className="text-slate-400"> — falta dominar {objective.missing.join(", ")}</span>
                )}
                {current && (
                  <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-[0.18em] text-amber-200">
                    En curso
                  </span>
                )}
              </li>
            );
          });
        })()}
      </ul>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onFocusZone(quest.quest.strandSlug)}
          className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-bold text-slate-950"
        >
          ▶ Seguir la misión
        </button>
        <Link
          href={`/jugar/${childId}/misiones`}
          className="text-xs font-bold text-amber-200 underline underline-offset-2"
        >
          Ver diario de misiones
        </Link>
      </div>
    </section>
  );
}
