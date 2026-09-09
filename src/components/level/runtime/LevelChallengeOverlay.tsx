"use client";

import { useRef } from "react";
import { PuzzleOverlay } from "@/components/world/PuzzleOverlay";
import { getModule } from "@/lib/curriculum";
import type { InteractionKind } from "@/lib/world/scenes";
import type { ChallengePlacement, LevelEntity } from "@/lib/level/schema";
import type { SkillProgress } from "@/lib/types";

/** Icono/tono más cercano de cada tipo de entidad — solo estilo, no cambia
 *  qué desafío se resuelve ni cómo (docs/level-editor-plan.md §9.3). */
const KIND_BY_ENTITY_TYPE: Record<string, InteractionKind> = {
  npc: "npc",
  door: "puerta",
  terminal: "terminal",
  collectible: "objeto",
  interactive: "objeto",
  enemy: "mecanismo",
};

/**
 * Envuelve `PuzzleOverlay` (el mismo componente que usa Ciudad Central, sin
 * copiarlo — §9.3/§9.4) para un `ChallengePlacement` de un nivel del editor.
 * `label`/`clue`/`reward` salen de la entidad y su tipo, nunca de contenido
 * académico nuevo: el módulo real (`mod`) sigue siendo la única fuente de
 * verdad del problema.
 *
 * `PuzzleOverlay.onResolved` y `.onStars` llegan en dos llamadas separadas
 * (mismo orden que `submit()`, en el mismo tick sin await de por medio) —
 * `pendingRef` las junta en un solo `onResolved` hacia el runtime, que es
 * quien de verdad necesita `stars` para emitir `ON_CHALLENGE_SUCCESS`.
 */
export function LevelChallengeOverlay({
  placement,
  entity,
  parentId,
  childId,
  progressBySkill,
  streak,
  soundOn,
  onClose,
  onResolved,
}: {
  placement: ChallengePlacement;
  entity: LevelEntity | undefined;
  parentId: string;
  childId: string;
  progressBySkill: Record<string, SkillProgress>;
  streak: number;
  soundOn: boolean;
  onClose: () => void;
  onResolved: (result: { moduleId: string; updated: SkillProgress; correct: boolean; stars: number }) => void;
}) {
  const pendingRef = useRef<{ moduleId: string; updated: SkillProgress; correct: boolean } | null>(null);
  const mod = getModule(placement.moduleId);
  if (!mod) return null;

  const kind: InteractionKind = (entity && KIND_BY_ENTITY_TYPE[entity.type]) ?? "objeto";

  return (
    <PuzzleOverlay
      parentId={parentId}
      childId={childId}
      interactable={{
        id: entity?.id ?? placement.id,
        moduleId: mod.id,
        kind,
        label: entity?.name ?? mod.label,
        clue: entity?.interaction.prompt || "Interactuar",
        reward: "¡Resuelto!",
        x: entity?.position.x ?? 0,
        y: entity?.position.y ?? 0,
      }}
      mod={mod}
      progressBySkill={progressBySkill}
      streak={streak}
      soundOn={soundOn}
      onClose={onClose}
      onResolved={(moduleId, updated, correct) => {
        pendingRef.current = { moduleId, updated, correct };
      }}
      onStars={(stars) => {
        if (!pendingRef.current) return;
        onResolved({ ...pendingRef.current, stars });
        pendingRef.current = null;
      }}
    />
  );
}
