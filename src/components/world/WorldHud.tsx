"use client";

import Image from "next/image";
import Link from "next/link";
import { getBadge } from "@/lib/badges";
import { moduleHref, type ModuleDef } from "@/lib/curriculum";
import { Avatar } from "./Avatar";

/**
 * Barra superior compacta del mundo: personaje, AXIA, insignias, sonido.
 * Flota fija respecto al viewport (`fixed inset-x-0 top-0` en el `<header>`
 * envoltorio) — no respecto a la escena ni al contenedor de la página—, así
 * que se queda siempre arriba aunque el contenido debajo sea más alto que la
 * pantalla y haya scroll. `.world-hud-panel` ya está pensada como panel
 * flotante (blur + sombra en globals.css); el `<div>` interno replica el
 * padding horizontal y el `max-w-3xl lg:max-w-none` de `<main>` en
 * jugar/[childId]/page.tsx para que, a igual ancho de pantalla, quede
 * exactamente donde antes quedaba en flujo normal. Todos los valores vienen
 * del estado real —`starLedger` vía `useTotalStars`, insignias de
 * Firestore—; el HUD no guarda nada por su cuenta. "AXIA" es solo el nombre
 * narrativo que se muestra para las estrellas ya existentes
 * (docs/guion-narrativa-math-quest.md §21): no hay una moneda nueva, ni un
 * dato nuevo en Firestore. El registro de la misión activa vive ahora dentro
 * de la propia escena (`QuestScene` / `MissionOverlay`), no aquí.
 */
export function WorldTopBar({
  childId,
  childName,
  title = "Ciudad Central",
  stars,
  earnedBadgeIds,
  soundOn,
  onToggleSound,
  nextChallengeModule,
  nextReviewModule,
  avatarHeadshotSrc,
  onAvatarClick,
}: {
  childId: string;
  childName: string;
  /** Fase 28 (docs/plan-jugabilidad.md §2): antes hardcodeado a "Ciudad
   *  Central". El hub (`/mapa`) pasa `world.story.title`; la ruta legacy
   *  no pasa nada y conserva el literal de siempre. */
  title?: string;
  stars: number | null;
  earnedBadgeIds: string[];
  soundOn: boolean;
  onToggleSound: () => void;
  nextChallengeModule: ModuleDef | null;
  /** Módulo dominado con el repaso más vencido (Fase 27, docs/plan-salto-
   *  producto.md §5.5) — opcional: las pantallas que todavía no calculan
   *  `nextReview()` simplemente no muestran este chip, sin romper nada. */
  nextReviewModule?: ModuleDef | null;
  /** Fase 32 (docs/plan-jugabilidad.md §6): retrato del avatar elegido del
   *  catálogo del Mundo (`useResolvedAvatar`) — `undefined` pinta el
   *  retrato de fábrica de siempre (`Avatar.tsx`). */
  avatarHeadshotSrc?: string;
  /** Si se pasa, el retrato del HUD se vuelve un botón (el hub lo usa para
   *  abrir `AvatarPickerDialog`) — `undefined` lo deja como el `<span>`
   *  decorativo de siempre; Ciudad Central legacy nunca lo pasa. */
  onAvatarClick?: () => void;
}) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center px-3 pt-3 sm:px-4 sm:pt-4">
      <div
        className="world-hud-panel pointer-events-auto flex w-full max-w-3xl flex-wrap items-center gap-2 rounded-full bg-cover bg-center px-3 py-2 sm:gap-3 sm:px-4 lg:max-w-none"
        style={{ backgroundImage: "linear-gradient(rgba(15,12,35,0.82),rgba(15,12,35,0.82)), url(/illustrations/icon-hud-frame.webp)" }}
      >
        {onAvatarClick ? (
          <button
            type="button"
            onClick={onAvatarClick}
            aria-label={`Cambiar el avatar de ${childName}`}
            // Sin `anim-idle` acá a propósito: un botón que nunca deja de
            // rebotar es más difícil de acertar con precisión (y a Playwright
            // no lo deja nunca "estable" para el clic) — la decoración de
            // reposo queda solo para el `<span>` no interactivo de abajo.
            className="flex h-9 items-center justify-center rounded-2xl border border-white/15 bg-slate-900/80 px-1.5 transition-colors hover:border-cyan-300/50"
          >
            <Avatar headshotSrc={avatarHeadshotSrc} className="h-8" title={`Personaje de ${childName}`} />
          </button>
        ) : (
          <span className="anim-idle flex h-9 items-center justify-center rounded-2xl border border-white/15 bg-slate-900/80 px-1.5">
            <Avatar headshotSrc={avatarHeadshotSrc} className="h-8" title={`Personaje de ${childName}`} />
          </span>
        )}

        <div>
          <h1 className="world-text-glow bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text font-display text-base font-bold text-transparent sm:text-lg">
            {title}
          </h1>
          <p className="text-[11px] font-semibold text-indigo-300">{childName}</p>
        </div>

        <span className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-slate-900/70 px-3 py-1.5">
          <Image src="/illustrations/icon-axia.webp" alt="" aria-hidden="true" width={16} height={16} className="size-4" />
          <span className="font-bold text-amber-300">
            <span className="sr-only">AXIA: </span>
            {stars ?? "…"}
          </span>
        </span>

        {earnedBadgeIds.length > 0 && (
          <div className="flex items-center gap-1.5">
          <Image src="/illustrations/icon-insignias.webp" alt="" aria-hidden="true" width={20} height={20} className="size-5" />
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
                  {badge.image ? (
                    <Image src={badge.image} alt="" aria-hidden="true" width={16} height={16} className="size-4" />
                  ) : (
                    <span aria-hidden="true">{badge.emoji}</span>
                  )}
                  {badge.label}
                </li>
              );
            })}
          </ul>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {nextReviewModule && (
            <Link
              href={moduleHref(childId, nextReviewModule)}
              className="flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-slate-900/70 px-3 py-1.5 text-xs font-bold text-cyan-200 transition-colors hover:border-cyan-300"
            >
              <span aria-hidden="true">🔁</span>
              Repaso · {nextReviewModule.label}
            </Link>
          )}
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
      </div>
    </header>
  );
}
