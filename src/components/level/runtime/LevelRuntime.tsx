"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LevelDefinition, LevelEntity } from "@/lib/level/schema";
import type { SkillProgress } from "@/lib/types";
import { useLevelRuntime } from "@/lib/level/runtime/useLevelRuntime";
import { createLiveServices, createSandboxServices } from "@/lib/level/runtime/services";
import { LevelHud } from "./LevelHud";
import { RuntimeCanvas } from "./RuntimeCanvas";
import { LevelChallengeOverlay } from "./LevelChallengeOverlay";
import { LevelDialogOverlay } from "./LevelDialogOverlay";

/**
 * Punto de entrada del runtime — docs/level-editor-plan.md §9 (Fase 9) + §10
 * (integración académica). NUNCA importa nada de
 * `src/components/level/editor/**` (regla ESLint de aislamiento, Fase 11
 * §11.4): el editor modifica datos, esto los interpreta, y son dos árboles
 * de componentes completamente separados aunque lean el mismo
 * `LevelDefinition`.
 *
 * Clicar una entidad interactuable hace que Alex se acerque, la encare y
 * dispare `ON_INTERACT` — de ahí en más es el propio nivel (reglas de
 * evento de Fase 8) quien decide si eso abre un diálogo (`SHOW_DIALOG`),
 * arranca un desafío (`START_CHALLENGE`) o ninguna de las dos cosas.
 */
export function LevelRuntime({
  level,
  parentId,
  childId,
  childName,
  progressBySkill: initialProgressBySkill,
  soundOn,
  sandbox = false,
  onExit,
}: {
  level: LevelDefinition;
  parentId: string;
  childId: string;
  childName: string;
  progressBySkill: Record<string, SkillProgress>;
  soundOn: boolean;
  /** Play Test (Fase 11, §11.2): mismo componente, misma UI, pero
   *  `recordAttempt`/`awardBadges` quedan interceptados (cero escrituras a
   *  Firestore) y cruzar un `LevelExit` vuelve al editor en vez de navegar
   *  de verdad. `false` en el juego real — comportamiento sin cambios. */
  sandbox?: boolean;
  /** Solo se usa con `sandbox`: vuelve al modo edición (botón "Salir" del
   *  HUD y cruzar un punto de destino), nunca navega el navegador. */
  onExit?: () => void;
}) {
  const router = useRouter();
  const [banner, setBanner] = useState<string | null>(null);
  const [debug, setDebug] = useState(false);
  const [progressBySkill, setProgressBySkill] = useState(initialProgressBySkill);
  const [streak, setStreak] = useState(0);
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);
  const [openChallengeId, setOpenChallengeId] = useState<string | null>(null);

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
    onOpenDialog: setOpenDialogId,
    onOpenChallenge: setOpenChallengeId,
  });

  const runtime = useLevelRuntime(
    level,
    progressBySkill,
    services,
    sandbox ? () => onExit?.() : (targetHref) => router.push(targetHref),
  );

  const sandboxServices = sandbox ? createSandboxServices() : null;

  function onGroundClick(xPct: number, yPct: number) {
    const target = runtime.nearestWalkablePoint({ x: xPct, y: yPct });
    runtime.walkTo(target);
  }

  async function onEntityClick(entity: LevelEntity) {
    if (entity.interaction.mode === "none" || !entity.interaction.standPoint) return;
    await runtime.approach(entity.interaction.standPoint, entity.position);
    // Un desafío asociado se abre directo — §9.3 paso 2: no hace falta
    // ninguna regla de evento autorada para eso, a diferencia de un diálogo
    // (SHOW_DIALOG) u otra consecuencia, que sí dependen de una regla sobre
    // ON_INTERACT.
    const placement = level.challenges.find((c) => c.sourceEntityId === entity.id);
    if (placement) {
      runtime.applyEvent("ON_CHALLENGE_STARTED", placement.id, { moduleId: placement.moduleId });
      setOpenChallengeId(placement.id);
      return;
    }
    runtime.applyEvent("ON_INTERACT", entity.id);
  }

  const activeDialog = openDialogId ? level.dialogs.find((d) => d.id === openDialogId) : undefined;
  const activePlacement = openChallengeId ? level.challenges.find((c) => c.id === openChallengeId) : undefined;

  function handleChallengeResolved(result: { moduleId: string; updated: SkillProgress; correct: boolean; stars: number }) {
    setProgressBySkill((prev) => ({ ...prev, [result.moduleId]: result.updated }));
    setStreak((s) => (result.correct ? s + 1 : 0));
    if (openChallengeId) {
      runtime.applyEvent(result.correct ? "ON_CHALLENGE_SUCCESS" : "ON_CHALLENGE_FAILED", openChallengeId, {
        correct: result.correct,
        stars: result.stars,
        moduleId: result.moduleId,
      });
    }
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

      <LevelHud levelName={level.name} childId={childId} onExit={sandbox ? onExit : undefined} />

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

      {activeDialog && (
        <LevelDialogOverlay key={activeDialog.id} dialog={activeDialog} entities={level.entities} onClose={() => setOpenDialogId(null)} />
      )}

      {activePlacement && (
        <LevelChallengeOverlay
          key={activePlacement.id}
          placement={activePlacement}
          entity={level.entities.find((e) => e.id === activePlacement.sourceEntityId)}
          parentId={parentId}
          childId={childId}
          progressBySkill={progressBySkill}
          streak={streak}
          soundOn={soundOn}
          onClose={() => setOpenChallengeId(null)}
          onResolved={handleChallengeResolved}
          recordAttempt={sandboxServices?.recordAttempt}
          awardBadges={sandboxServices?.awardBadges}
        />
      )}
    </div>
  );
}
