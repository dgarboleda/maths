"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LevelDefinition, LevelEntity } from "@/lib/level/schema";
import type { SkillProgress } from "@/lib/types";
import { evaluateCondition } from "@/lib/level/events/conditions";
import { useLevelRuntime } from "@/lib/level/runtime/useLevelRuntime";
import { useKeyboardMovement } from "@/lib/level/runtime/useKeyboardMovement";
import { createLiveServices, createSandboxServices } from "@/lib/level/runtime/services";
import { activeMission } from "@/lib/level/runtime/state";
import { LevelHud } from "./LevelHud";
import { RuntimeCanvas } from "./RuntimeCanvas";
import { LevelChallengeOverlay } from "./LevelChallengeOverlay";
import { LevelDialogOverlay } from "./LevelDialogOverlay";
import { TouchDPad } from "./TouchDPad";
import { LevelMissionOverlay } from "./LevelMissionOverlay";

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

/** Envuelto en una función propia para que el linter de pureza de React no
 *  confunda esta llamada (siempre disparada desde un manejador de evento del
 *  bus, nunca durante el render) con una lectura impura del render en sí —
 *  mismo criterio que `now()` en `QuestScene.tsx:41`. */
function now(): number {
  return Date.now();
}

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
  const [missionOpen, setMissionOpen] = useState(false);
  // Solo `stars`/`key`: el evento de GENERATE_AXIA no carga ninguna posición
  // (no sabe qué entidad lo disparó, §8.4), así que la animación se ancla a
  // `runtime.pose` **en el momento de pintar**, no a un snapshot capturado
  // al disparar — evita necesitar un ref con la posición actual dentro del
  // armado de `services` (que corre en cada render, antes de que exista
  // `runtime.pose`: leerlo ahí violaría la regla `react-hooks/refs`).
  const [axiaPulse, setAxiaPulse] = useState<{ stars: number; key: number } | null>(null);

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
    onAxiaPulse: (stars) => {
      const key = now();
      setAxiaPulse({ stars, key });
      window.setTimeout(() => setAxiaPulse((p) => (p?.key === key ? null : p)), 1400);
    },
  });

  const runtime = useLevelRuntime(
    level,
    progressBySkill,
    services,
    sandbox ? () => onExit?.() : (targetHref) => router.push(targetHref),
  );

  const sandboxServices = sandbox ? createSandboxServices() : null;
  const mission = activeMission(level, progressBySkill, runtime.state);

  function onGroundClick(xPct: number, yPct: number) {
    const target = runtime.nearestWalkablePoint({ x: xPct, y: yPct });
    runtime.walkTo(target);
  }

  // Movimiento por teclado (docs/scene-25d-plan.md §G.2/§N Paso 6) — se
  // desactiva mientras hay un diálogo o un desafío abierto, mismo criterio
  // que el resto de la interacción de la escena en esos overlays.
  const movementEnabled = !openDialogId && !openChallengeId;
  useKeyboardMovement({
    enabled: movementEnabled,
    pose: runtime.pose,
    nearestWalkablePoint: runtime.nearestWalkablePoint,
    walkTo: runtime.walkTo,
  });

  function onDPadMove(dx: number, dy: number) {
    const target = runtime.nearestWalkablePoint({ x: runtime.pose.x + dx, y: runtime.pose.y + dy });
    runtime.walkTo(target);
  }

  async function onEntityClick(entity: LevelEntity) {
    if (entity.interaction.mode === "none" || !entity.interaction.standPoint) return;
    // `enabledWhen` (§5.3/§8) queda declarado en el esquema desde la Fase 6
    // pero ningún componente lo leía todavía — acá es donde corresponde:
    // antes de acercarse, no después. Con la condición sin cumplir se avisa
    // con `lockedNote` (si lo tiene) y no pasa nada más, igual que un
    // hotspot bloqueado de Ciudad Central hoy.
    if (!evaluateCondition(entity.interaction.enabledWhen, { flags: runtime.state.flags, entityStates: runtime.state.entityStates })) {
      if (entity.interaction.lockedNote) services.banner(entity.interaction.lockedNote, 3000);
      return;
    }
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
        axiaPulse={axiaPulse ? { ...axiaPulse, x: runtime.pose.x, y: runtime.pose.y } : null}
        onGroundClick={onGroundClick}
        onEntityClick={onEntityClick}
      />

      <LevelHud
        levelName={level.name}
        childId={childId}
        onExit={sandbox ? onExit : undefined}
        mission={mission}
        onOpenMission={() => setMissionOpen(true)}
      />

      {movementEnabled && <TouchDPad onMove={onDPadMove} />}

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
      <p className="sr-only" aria-live="polite">
        {axiaPulse ? `+${axiaPulse.stars} estrellas` : ""}
      </p>

      {activeDialog && (
        <LevelDialogOverlay key={activeDialog.id} dialog={activeDialog} entities={level.entities} onClose={() => setOpenDialogId(null)} />
      )}

      {missionOpen && mission && <LevelMissionOverlay progress={mission} onClose={() => setMissionOpen(false)} />}

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
