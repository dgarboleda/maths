"use client";

import { LevelChallengeOverlay } from "./LevelChallengeOverlay";
import { LevelCoheteOverlay } from "./LevelCoheteOverlay";
import type { PuzzleRules } from "@/components/world/PuzzleOverlay";
import type { ChallengePlacement, LevelEntity } from "@/lib/level/schema";
import type { SkillProgress } from "@/lib/types";
import type { recordModuleAttempt } from "@/lib/attemptRecorder";
import type { awardMasteryBadges } from "@/lib/masteryRewards";

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
  if (placement.activityId === "cohete") {
    return (
      <LevelCoheteOverlay
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
