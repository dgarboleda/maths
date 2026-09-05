"use client";

import Link from "next/link";
import { getModule, masteredCountForStrand, moduleHref } from "@/lib/curriculum";
import type { SkillProgress } from "@/lib/types";
import type { Interactable, ZoneScene as ZoneSceneDef } from "@/lib/world/scenes";
import { interactableState } from "@/lib/world/state";
import { MINOR_NULL_CYCLE, ZONE_GUARDIAN } from "@/lib/world/guardians";
import { Hotspot } from "./Hotspot";

/**
 * Interior de una zona. Cada objeto es un módulo real del hilo: el candado
 * sale de `isUnlocked`, el brillo de `masteredAt`, y al interactuar se abre un
 * problema generado por el propio módulo. La lista académica sigue accesible
 * con el enlace "Entrar" de cada objeto, que lleva a la pantalla completa del
 * tema (concepto, práctica, cohete, ejemplos).
 *
 * El guardián de la zona (docs/guion-narrativa-math-quest.md §19) se muestra
 * "vencido" cuando `masteredCountForStrand` ya está completo — es una
 * lectura del mismo progreso real, no un jefe con su propio estado.
 */
export function ZoneScene({
  childId,
  scene,
  progressBySkill,
  questModuleIds,
  onSelect,
}: {
  childId: string;
  scene: ZoneSceneDef;
  progressBySkill: Record<string, SkillProgress>;
  questModuleIds: string[];
  onSelect: (interactable: Interactable) => void;
}) {
  const rows = Math.ceil(scene.interactables.length / 2);
  const { mastered, total } = masteredCountForStrand(progressBySkill, scene.strandSlug);
  const guardian = ZONE_GUARDIAN[scene.strandSlug];
  const guardianDefeated = guardian && total > 0 && mastered === total;

  return (
    <div
      className="world-scene-vignette relative w-full overflow-hidden rounded-3xl border border-indigo-500/25 bg-slate-950"
      style={{ height: `${170 + rows * 132}px` }}
    >
      <img
        src={scene.background}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover brightness-[0.55] saturate-125"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/20 to-slate-950/70" />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      >
        {/* pasillo que une los objetos en zigzag */}
        <polyline
          points={scene.interactables.map((it) => `${it.x},${it.y}`).join(" ")}
          fill="none"
          stroke="#6d28d9"
          strokeWidth="0.5"
          strokeDasharray="1.6 1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.55"
        />
      </svg>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="anim-fog absolute top-[6%] h-28 rounded-full bg-violet-500/10 blur-3xl"
          style={{ left: "-10%", right: "-10%" }}
        />
        <div
          className="anim-fog absolute bottom-[4%] h-32 rounded-full bg-cyan-400/10 blur-3xl"
          style={{ left: "-10%", right: "-10%", animationDuration: "32s", animationDelay: "-8s" }}
        />
      </div>

      {guardian && (
        <div
          className={`absolute inset-x-2 top-2 z-20 flex items-center gap-2 rounded-2xl border px-3 py-1.5 backdrop-blur-sm transition-opacity ${
            guardianDefeated
              ? "border-emerald-400/40 bg-emerald-950/70"
              : "border-rose-400/30 bg-rose-950/60"
          }`}
        >
          <img
            src={guardian.art}
            alt=""
            aria-hidden="true"
            className={`size-8 shrink-0 rounded-full border border-white/20 object-cover ${
              guardianDefeated ? "opacity-50 grayscale" : ""
            }`}
          />
          <p className="min-w-0 text-[11px] font-semibold leading-tight text-slate-100">
            <span className={guardianDefeated ? "text-emerald-300" : "text-rose-300"}>
              {guardianDefeated ? `${guardian.name} vencido · ` : `${guardian.name} · `}
            </span>
            {guardianDefeated ? guardian.defeated : guardian.corruption}
          </p>
        </div>
      )}

      {scene.interactables.map((interactable, index) => {
        const mod = getModule(interactable.moduleId);
        if (!mod) return null;
        const state = interactableState(progressBySkill, interactable.moduleId);
        const nullThreat = MINOR_NULL_CYCLE[index % MINOR_NULL_CYCLE.length];
        return (
          <div
            key={interactable.id}
            className="absolute w-28 -translate-x-1/2 -translate-y-1/2 sm:w-32"
            style={{ left: `${interactable.x}%`, top: `${interactable.y}%` }}
          >
            <Hotspot
              kind={interactable.kind}
              label={mod.label}
              state={state}
              pulse={questModuleIds.includes(interactable.moduleId)}
              onSelect={() => onSelect(interactable)}
              nullThreat={nullThreat}
            />
            {state !== "bloqueado" && (
              <Link
                href={moduleHref(childId, mod)}
                aria-label={`Entrar a ${mod.label}`}
                className="mx-auto mt-1 block w-fit rounded-lg border border-white/15 bg-slate-900/90 px-2 py-0.5 text-[10px] font-bold text-indigo-200 hover:border-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Entrar ▸
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
