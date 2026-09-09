"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LevelDefinition, LevelEntity } from "@/lib/level/schema";
import type { SkillProgress } from "@/lib/types";
import { useLevelRuntime } from "@/lib/level/runtime/useLevelRuntime";
import { createLiveServices } from "@/lib/level/runtime/services";
import { LevelHud } from "./LevelHud";
import { RuntimeCanvas } from "./RuntimeCanvas";

/**
 * Punto de entrada del runtime — docs/level-editor-plan.md §9 (Fase 9).
 * NUNCA importa nada de `src/components/level/editor/**` (regla ESLint de
 * aislamiento, Fase 11 §11.4): el editor modifica datos, esto los
 * interpreta, y son dos árboles de componentes completamente separados
 * aunque lean el mismo `LevelDefinition`.
 *
 * Todavía sin desafíos ni Play Test (Fase 10/11 — "No hacer" de la Fase 9):
 * clicar una entidad interactuable hace que Alex se acerque y la encare,
 * nada más — sin ningún overlay.
 */
export function LevelRuntime({
  level,
  childId,
  childName,
  progressBySkill,
  soundOn,
}: {
  level: LevelDefinition;
  childId: string;
  childName: string;
  progressBySkill: Record<string, SkillProgress>;
  soundOn: boolean;
}) {
  const router = useRouter();
  const [banner, setBanner] = useState<string | null>(null);
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const hasFlag = new URLSearchParams(window.location.search).has("debug");
    queueMicrotask(() => setDebug(hasFlag));
  }, []);

  const services = createLiveServices({
    soundOn,
    onBanner: (text, ms) => {
      setBanner(text);
      window.setTimeout(() => setBanner((b) => (b === text ? null : b)), ms);
    },
  });

  const runtime = useLevelRuntime(level, progressBySkill, services, (targetHref) => router.push(targetHref));

  function onGroundClick(xPct: number, yPct: number) {
    const target = runtime.nearestWalkablePoint({ x: xPct, y: yPct });
    runtime.walkTo(target);
  }

  function onEntityClick(entity: LevelEntity) {
    if (entity.interaction.mode === "none" || !entity.interaction.standPoint) return;
    void runtime.approach(entity.interaction.standPoint, entity.position);
  }

  return (
    <div className="relative h-full w-full">
      <RuntimeCanvas
        level={level}
        runtimeState={runtime.state}
        pose={runtime.pose}
        walking={runtime.walking}
        childName={childName}
        debug={debug}
        onGroundClick={onGroundClick}
        onEntityClick={onEntityClick}
      />

      <LevelHud levelName={level.name} childId={childId} />

      {banner && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-4">
          <p role="status" className="anim-rise world-hud-panel max-w-md rounded-full px-4 py-2 text-center text-sm font-semibold text-slate-100">
            {banner}
          </p>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {runtime.unreachableAnnouncement}
      </p>
    </div>
  );
}
