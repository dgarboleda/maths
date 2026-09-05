"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { DoorClosed, MessageCircle, Settings, Sparkles, Star, Terminal as TerminalIcon, X } from "lucide-react";
import { masteredCountForStrand } from "@/lib/curriculum";
import { getStrandNarrative } from "@/lib/narrative";
import { STRANDS } from "@/lib/strands";
import type { Quest, QuestProgress } from "@/lib/world/quests";
import type { CiudadCentralHotspot, CiudadCentralHotspotKind } from "@/lib/world/questScene";
import type { SkillProgress } from "@/lib/types";
import { useDialogFocus } from "./useDialogFocus";

const DIALOG_ICON: Record<CiudadCentralHotspotKind, React.ComponentType<{ className?: string }>> = {
  npc: MessageCircle,
  terminal: TerminalIcon,
  mecanismo: Settings,
  puerta: DoorClosed,
  barrera: DoorClosed,
};

/* ---------------- diálogo estilo aventura (línea a línea) ---------------- */

export function DialogOverlay({
  hotspot,
  onClose,
  onContinue,
  continueLabel,
}: {
  hotspot: CiudadCentralHotspot;
  onClose: () => void;
  onContinue: () => void;
  continueLabel: string;
}) {
  const titleId = useId();
  const { dialogRef, handleKeyDown } = useDialogFocus(onClose);
  const [line, setLine] = useState(0);
  const lines = hotspot.intro.length > 0 ? hotspot.intro : [hotspot.lockedNote];
  const last = line >= lines.length - 1;
  const isNpc = hotspot.kind === "npc";
  const Icon = DIALOG_ICON[hotspot.kind];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-3 pb-5 backdrop-blur-sm sm:items-center sm:p-6 sm:pb-9">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="anim-rise world-quest-panel relative w-full max-w-2xl rounded-3xl p-4 focus:outline-none sm:p-5"
      >
        <div className="flex items-start gap-3 sm:gap-4">
          {isNpc ? (
            <img
              src="/illustrations/nia-portrait.webp"
              alt=""
              width={816}
              height={816}
              loading="lazy"
              className="world-ring-glow -mt-12 size-24 shrink-0 rounded-2xl border border-cyan-400/40 bg-slate-900/80 object-contain object-top p-1 sm:-mt-14 sm:size-28"
            />
          ) : (
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/15 bg-slate-900 text-cyan-300">
              <Icon className="size-6" aria-hidden="true" />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <p className="font-display text-[11px] uppercase tracking-[0.22em] text-cyan-300">
              {isNpc ? "Investigadora de AXIA" : hotspot.label}
            </p>
            <h2 id={titleId} className="font-display text-lg font-bold text-slate-50 sm:text-xl">
              {isNpc ? "Dra. Nia" : hotspot.label}
            </h2>
            <p key={line} aria-live="polite" className="anim-rise mt-2 min-h-12 text-[15px] leading-relaxed text-slate-100">
              {lines[line]}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 pl-1" aria-hidden="true">
            {lines.map((_, i) => (
              <span key={i} className={`size-1.5 rounded-full ${i <= line ? "bg-cyan-400" : "bg-white/20"}`} />
            ))}
          </span>
          <button
            type="button"
            onClick={last ? onContinue : () => setLine((l) => l + 1)}
            className="min-h-11 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 font-display font-bold text-white transition-transform hover:scale-[1.03]"
          >
            {last ? continueLabel : "Continuar ▸"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- registro / briefing de misión ---------------- */

export function MissionOverlay({
  childId,
  quest,
  progressBySkill,
  intro = false,
  onClose,
  onOpenShop,
}: {
  childId: string;
  quest: QuestProgress;
  progressBySkill: Record<string, SkillProgress>;
  intro?: boolean;
  onClose: () => void;
  onOpenShop: () => void;
}) {
  const titleId = useId();
  const { dialogRef, handleKeyDown } = useDialogFocus(onClose);
  const currentId = quest.objectives.find((o) => !o.done)?.id;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="anim-rise world-quest-panel relative max-h-full w-full max-w-lg overflow-y-auto rounded-3xl p-5 focus:outline-none sm:p-6"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-[11px] uppercase tracking-[0.22em] text-amber-300">
              {intro ? "MISIÓN 01 · Nueva misión" : "MISIÓN 01"}
            </p>
            <h2 id={titleId} className="font-display text-xl font-bold text-slate-50 sm:text-2xl">
              <span aria-hidden="true">{quest.quest.icon} </span>
              {quest.quest.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <p className="text-[15px] leading-relaxed text-slate-200">{quest.quest.premise}</p>

        <ol className="mt-4 space-y-2">
          {quest.objectives.map((o, i) => {
            const current = o.id === currentId;
            return (
              <li
                key={o.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                  current ? "border-amber-400/50 bg-amber-400/10" : "border-white/10 bg-slate-900/50"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`grid size-7 shrink-0 place-items-center rounded-full border text-xs font-bold ${
                    o.done
                      ? "border-emerald-400 bg-emerald-500 text-white"
                      : current
                        ? "border-amber-300 text-amber-200"
                        : "border-white/20 text-slate-400"
                  }`}
                >
                  {o.done ? "✓" : i + 1}
                </span>
                <span className={`min-w-0 flex-1 text-slate-100 ${o.done ? "text-slate-400 line-through" : ""}`}>
                  {o.label}
                </span>
                {current && (
                  <span className="shrink-0 rounded-full bg-amber-400/20 px-2 py-0.5 font-display text-[9px] font-bold uppercase tracking-[0.18em] text-amber-200">
                    En curso
                  </span>
                )}
                <span className="sr-only">{o.done ? "completado" : current ? "objetivo actual" : "pendiente"}</span>
              </li>
            );
          })}
        </ol>

        {intro ? (
          <button
            type="button"
            onClick={onClose}
            className="mt-5 min-h-12 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 font-display text-lg font-bold text-white transition-transform hover:scale-[1.02]"
          >
            Comenzar a explorar ▸
          </button>
        ) : (
          <>
            <h3 className="mt-5 font-display text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Otras zonas
            </h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {STRANDS.map((s) => {
                const { mastered, total } = masteredCountForStrand(progressBySkill, s.slug);
                const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
                const narrative = getStrandNarrative(s.slug);
                return (
                  <li key={s.slug}>
                    <Link
                      href={`/jugar/${childId}/${s.slug}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2 text-sm font-bold text-slate-100 transition-colors hover:border-white/25"
                    >
                      <span>
                        <span aria-hidden="true">{narrative.icon} </span>
                        {narrative.zoneName}
                        <span className="ml-1.5 text-xs font-semibold text-slate-400">{s.label}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-slate-400">
                        <span
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Progreso en ${narrative.zoneName}`}
                          className="h-1.5 w-10 overflow-hidden rounded-full bg-white/15"
                        >
                          <span className="block h-1.5 rounded-full bg-cyan-400" style={{ width: `${pct}%` }} />
                        </span>
                        {mastered}/{total}
                      </span>
                    </Link>
                  </li>
                );
              })}
              <li>
                <Link
                  href={`/jugar/${childId}/boss`}
                  className="flex items-center gap-2 rounded-xl border border-pink-400/30 bg-pink-500/10 px-3 py-2 text-sm font-bold text-pink-200 transition-colors hover:border-pink-300/50"
                >
                  <span aria-hidden="true">⚡</span>
                  Central eléctrica · Boss Challenge
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenShop();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sm font-bold text-sky-200 transition-colors hover:border-sky-300/50"
                >
                  <span aria-hidden="true">🏪</span>
                  Tienda
                </button>
              </li>
            </ul>
            <Link
              href={`/jugar/${childId}/misiones`}
              className="mt-3 inline-block text-sm font-bold text-amber-200 underline underline-offset-2"
            >
              Ver diario completo ▸
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- recompensa final ---------------- */

export function RewardOverlay({
  masteredLabel,
  nextQuest,
  onClose,
}: {
  /** Módulo real dominado por primera vez al cerrar esta misión, si aplica — sin insignia inventada si no hubo ninguna. */
  masteredLabel: string | null;
  nextQuest: Quest | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const { dialogRef, handleKeyDown } = useDialogFocus(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="anim-rise world-quest-panel relative w-full max-w-lg rounded-3xl p-5 focus:outline-none sm:p-6"
      >
        <p className="font-display text-[11px] uppercase tracking-[0.22em] text-amber-300">Misión completada</p>
        <h2 id={titleId} className="font-display text-xl font-bold text-slate-50 sm:text-2xl">
          La ciudad vuelve a la vida
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-200">
          El AXIA vuelve a fluir: el generador ruge, las farolas se encienden una a una y la plaza recupera su color.
          El Null Drenador se retira, por ahora. La Dra. Nia te espera junto a la fuente para la próxima misión.
        </p>
        {masteredLabel && (
          <ul className="mt-4 grid gap-2">
            <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2">
              <Sparkles className="size-5 text-amber-300" aria-hidden="true" />
              <span className="font-semibold text-slate-100">
                <span aria-hidden="true">🏆 </span>Habilidad dominada: {masteredLabel}
              </span>
            </li>
          </ul>
        )}
        {nextQuest && (
          <p className="mt-4 rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-slate-400">
            <Star className="mr-1 inline size-3.5 text-amber-300" aria-hidden="true" />
            Siguiente destino: <span aria-hidden="true">{nextQuest.icon} </span>
            {nextQuest.title}…
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 font-display font-bold text-white"
        >
          ¡Genial!
        </button>
      </div>
    </div>
  );
}
