"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LevelDefinition, LevelEntity, LevelExitTarget } from "@/lib/level/schema";
import type { SkillProgress } from "@/lib/types";
import { missingPrerequisites } from "@/lib/curriculum";
import { evaluateCondition } from "@/lib/level/events/conditions";
import { useLevelRuntime } from "@/lib/level/runtime/useLevelRuntime";
import { useKeyboardMovement } from "@/lib/level/runtime/useKeyboardMovement";
import { createLiveServices, createSandboxServices } from "@/lib/level/runtime/services";
import { activeMission } from "@/lib/level/runtime/state";
import { levelCompleted } from "@/lib/gameworld/progress";
import type { WorldRules } from "@/lib/gameworld/schema";
import { useResolvedAvatar } from "@/lib/useResolvedAvatar";
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
  rules,
  sandbox = false,
  onExit,
}: {
  level: LevelDefinition;
  parentId: string;
  childId: string;
  childName: string;
  progressBySkill: Record<string, SkillProgress>;
  soundOn: boolean;
  /** Fase 29 (docs/plan-jugabilidad.md §3) — `undefined` en cualquier sitio
   *  que todavía no carga el `GameWorld` (Play Test incluido, que juega un
   *  nivel suelto sin mundo): mismo comportamiento de siempre. */
  rules?: WorldRules;
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

  // Resuelve un `LevelExitTarget` (Fase 16, docs/level-editor-plan-v2.md
  // §3.4) a una ruta real de `/jugar/**` — la única función del runtime que
  // conoce esa convención de URL, así el resto del motor nunca arma rutas.
  function resolveExitTarget(target: LevelExitTarget) {
    if (target.kind === "level") router.push(`/jugar/${childId}/nivel/${target.levelId}`);
    else if (target.kind === "worldMap") router.push(`/jugar/${childId}/mapa`);
    else router.push(target.href);
  }

  const runtime = useLevelRuntime(level, progressBySkill, services, sandbox ? () => onExit?.() : resolveExitTarget);

  const sandboxServices = sandbox ? createSandboxServices() : null;
  const { avatar: resolvedAvatar, loading: avatarLoading } = useResolvedAvatar(parentId, childId, progressBySkill);
  const mission = activeMission(level, progressBySkill, runtime.state);

  // Fase 29 (docs/plan-jugabilidad.md §3): `ON_MISSION_COMPLETE` y
  // `ON_ITEM_COLLECTED` están declarados en el esquema (validate.ts) desde
  // antes, pero el runtime nunca los emitía — un mundo podía autorar "al
  // completar la misión → mostrar diálogo" y no pasaba nada, en silencio.

  // Misión activa: se dispara cuando la ANTERIOR (guardada en el ref) deja
  // de ser la activa. El ref arranca en `undefined` a propósito — distinto
  // de `null` ("sin misión activa") — así el primer render (que puede
  // encontrar la misión ya completada de una sesión anterior) nunca
  // dispara el evento, solo una transición real dentro de esta sesión.
  const previousMissionIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const prev = previousMissionIdRef.current;
    const currentId = mission?.mission.id ?? null;
    if (prev !== undefined && prev !== null && prev !== currentId) {
      runtime.applyEvent("ON_MISSION_COMPLETE", prev);
    }
    previousMissionIdRef.current = currentId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission?.mission.id]);

  // Coleccionables: se dispara una vez por entidad, la primera vez que su
  // estado vivo deja de ser el inicial de autor — mismo criterio que ya usa
  // `deriveObjectiveDone("collectible", ...)` (runtime/state.ts) para saber
  // si un objetivo de misión está cumplido. El Set se siembra con lo que ya
  // estaba recogido al montar (nunca dispara en el montaje) y se muta en el
  // lugar, mismo patrón que `EventBus.fired` (useLevelRuntime.ts).
  const [collectedIds] = useState<Set<string>>(
    () =>
      new Set(
        level.entities
          .filter((e) => e.type === "collectible" && runtime.state.entityStates[e.id] !== e.state.initial)
          .map((e) => e.id),
      ),
  );
  useEffect(() => {
    for (const entity of level.entities) {
      if (entity.type !== "collectible" || collectedIds.has(entity.id)) continue;
      if (runtime.state.entityStates[entity.id] !== entity.state.initial) {
        collectedIds.add(entity.id);
        runtime.applyEvent("ON_ITEM_COLLECTED", entity.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime.state.entityStates]);

  // `autoAdvance`: "ofrecer, no navegar solo" (docs/plan-jugabilidad.md
  // §3) — un banner con enlace al mapa (Fase 28), nunca un `router.push`
  // automático. El runtime no conoce el grafo del mundo (nodos/
  // desbloqueos), así que no señala un nivel específico — el mapa ya
  // muestra qué sigue disponible. Mismo criterio de "solo en la
  // transición real" que arriba.
  const levelIsComplete = rules ? levelCompleted(level, progressBySkill, rules.levelCompletion) : false;
  const [advanceOffer, setAdvanceOffer] = useState(false);
  const wasCompleteRef = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (rules?.autoAdvance && wasCompleteRef.current === false && levelIsComplete) {
      setAdvanceOffer(true);
    }
    wasCompleteRef.current = levelIsComplete;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelIsComplete]);

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

    const placement = level.challenges.find((c) => c.sourceEntityId === entity.id);
    // Fase 29 (docs/plan-jugabilidad.md §3): `lockedModulePolicy: "hide"`
    // hace que un desafío cuyo módulo no está desbloqueado no responda al
    // clic — mismo tratamiento que un `enabledWhen` sin cumplir, antes de
    // acercarse. Las otras dos políticas ("showLocked"/"allowAnyway") las
    // resuelve `PuzzleOverlay` una vez abierto (ver su prop `rules`).
    if (placement && rules?.lockedModulePolicy === "hide" && missingPrerequisites(progressBySkill, placement.moduleId).length > 0) {
      if (entity.interaction.lockedNote) services.banner(entity.interaction.lockedNote, 3000);
      return;
    }

    await runtime.approach(entity.interaction.standPoint, entity.position);
    // Un desafío asociado se abre directo — §9.3 paso 2: no hace falta
    // ninguna regla de evento autorada para eso, a diferencia de un diálogo
    // (SHOW_DIALOG) u otra consecuencia, que sí dependen de una regla sobre
    // ON_INTERACT.
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

  /** Fase 29: "Salir" sin resolver, con `challengesAreMandatory: false` —
   *  dispara el mismo `ON_CHALLENGE_SUCCESS` que un acierto real (para que
   *  la puerta que dependa de él no quede bloqueada), pero nunca toca
   *  `progressBySkill`/`streak`: no hubo ningún intento real que registrar. */
  function handleChallengeWaived() {
    if (openChallengeId) runtime.applyEvent("ON_CHALLENGE_SUCCESS", openChallengeId, { correct: false, waived: true });
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
        avatar={resolvedAvatar ? { bodySrc: resolvedAvatar.bodySrc, scale: resolvedAvatar.scale } : undefined}
        playerVisible={!avatarLoading}
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

      {advanceOffer && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-30 flex justify-center px-4 sm:top-20">
          <div
            role="status"
            className="anim-rise world-hud-panel pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-100"
          >
            <span aria-hidden="true">🗺️</span>
            ¡Nivel completo!
            <Link
              href={`/jugar/${childId}/mapa`}
              className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1 text-xs font-bold text-white"
            >
              Ir al mapa
            </Link>
            <button
              type="button"
              onClick={() => setAdvanceOffer(false)}
              className="text-xs font-bold text-slate-400 underline underline-offset-2"
            >
              Seguir acá
            </button>
          </div>
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
          rules={rules}
          onClose={() => setOpenChallengeId(null)}
          onResolved={handleChallengeResolved}
          onWaived={handleChallengeWaived}
          recordAttempt={sandboxServices?.recordAttempt}
          awardBadges={sandboxServices?.awardBadges}
        />
      )}
    </div>
  );
}
