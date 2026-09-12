"use client";

import type { ComponentType } from "react";
import { LevelChallengeOverlay } from "./LevelChallengeOverlay";
import { LevelCoheteOverlay } from "./LevelCoheteOverlay";
import { LevelSnakeOverlay } from "./LevelSnakeOverlay";
import { LevelFroggerOverlay } from "./LevelFroggerOverlay";
import { LevelRunnerOverlay } from "./LevelRunnerOverlay";
import { LevelNumberPacOverlay } from "./LevelNumberPacOverlay";
import { LevelInvadersOverlay } from "./LevelInvadersOverlay";
import { LevelBreakoutOverlay } from "./LevelBreakoutOverlay";
import type { PuzzleRules } from "@/components/world/PuzzleOverlay";
import type { ChallengePlacement, LevelEntity } from "@/lib/level/schema";
import type { SkillProgress } from "@/lib/types";
import type { recordModuleAttempt } from "@/lib/attemptRecorder";
import type { awardMasteryBadges } from "@/lib/masteryRewards";

/** Contrato común de todo minijuego arcade "con forma de cohete" (Fases
 *  33/36-38, docs/plan-minijuegos-retro.md) — a diferencia de "puzzle"
 *  (`LevelChallengeOverlay`), ninguno recibe `rules` ni `onWaived`. */
interface ArcadeOverlayProps {
  placement: ChallengePlacement;
  entity: LevelEntity | undefined;
  parentId: string;
  childId: string;
  progressBySkill: Record<string, SkillProgress>;
  streak: number;
  repeatsToday?: number;
  soundOn: boolean;
  onClose: () => void;
  onResolved: (result: { moduleId: string; updated: SkillProgress; correct: boolean; stars: number }) => void;
  recordAttempt?: typeof recordModuleAttempt;
  awardBadges?: typeof awardMasteryBadges;
}

/**
 * Registro de despacho para las actividades arcade — mismo criterio que
 * `ACTIVITIES` (`src/lib/level/activities/registry.ts`): un solo lugar, sin
 * `switch(activityId)` disperso por el código. "puzzle" (el default) queda
 * fuera de esta tabla porque `LevelChallengeOverlay` tiene una forma de
 * props distinta (`rules`, `onWaived`).
 */
const ARCADE_OVERLAYS: Record<string, ComponentType<ArcadeOverlayProps>> = {
  cohete: LevelCoheteOverlay,
  snake: LevelSnakeOverlay,
  frogger: LevelFroggerOverlay,
  runner: LevelRunnerOverlay,
  pacman: LevelNumberPacOverlay,
  invaders: LevelInvadersOverlay,
  breakout: LevelBreakoutOverlay,
};

/**
 * Despacha un `ChallengePlacement` a su actividad (Fase 33, docs/plan-
 * jugabilidad.md §7) — el único sitio que lee `activityId`. `LevelRuntime`
 * monta esto en vez de `LevelChallengeOverlay` directo; para "puzzle" (el
 * default, y cualquier id vacío/desconocido/de un nivel autorado antes de
 * esta fase) el camino es exactamente el de siempre, byte a byte.
 */
export function LevelActivityOverlay({
  placement,
  entity,
  parentId,
  childId,
  progressBySkill,
  streak,
  repeatsToday,
  soundOn,
  rules,
  onClose,
  onResolved,
  onWaived,
  recordAttempt,
  awardBadges,
}: {
  placement: ChallengePlacement;
  entity: LevelEntity | undefined;
  parentId: string;
  childId: string;
  progressBySkill: Record<string, SkillProgress>;
  streak: number;
  repeatsToday?: number;
  soundOn: boolean;
  rules?: PuzzleRules;
  onClose: () => void;
  onResolved: (result: { moduleId: string; updated: SkillProgress; correct: boolean; stars: number }) => void;
  onWaived?: () => void;
  recordAttempt?: typeof recordModuleAttempt;
  awardBadges?: typeof awardMasteryBadges;
}) {
  const ArcadeOverlay = ARCADE_OVERLAYS[placement.activityId];
  if (ArcadeOverlay) {
    return (
      <ArcadeOverlay
        placement={placement}
        entity={entity}
        parentId={parentId}
        childId={childId}
        progressBySkill={progressBySkill}
        streak={streak}
        repeatsToday={repeatsToday}
        soundOn={soundOn}
        onClose={onClose}
        onResolved={onResolved}
        recordAttempt={recordAttempt}
        awardBadges={awardBadges}
      />
    );
  }

  return (
    <LevelChallengeOverlay
      placement={placement}
      entity={entity}
      parentId={parentId}
      childId={childId}
      progressBySkill={progressBySkill}
      streak={streak}
      repeatsToday={repeatsToday}
      soundOn={soundOn}
      rules={rules}
      onClose={onClose}
      onResolved={onResolved}
      onWaived={onWaived}
      recordAttempt={recordAttempt}
      awardBadges={awardBadges}
    />
  );
}
