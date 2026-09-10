"use client";

import { useEffect, useState } from "react";
import { getFirebase } from "./firebase";
import { getWorld } from "./gameworld/persistence/worldRepository";
import { avatarUnlocked } from "./gameworld/progress";
import type { AvatarDef, GameWorld } from "./gameworld/schema";
import { getLevel, listLevels } from "./level/persistence/levelRepository";
import type { LevelDefinition } from "./level/schema";
import type { ChildProfile, SkillProgress } from "./types";
import { useTotalStars } from "./useTotalStars";

export interface ResolvedAvatar {
  id: string;
  bodySrc: string;
  headshotSrc: string;
  scale: number;
}

/**
 * Cascada elegido → desbloqueado → predeterminado → sprites de fábrica —
 * Fase 19 (docs/level-editor-plan-v2.md §6.3). Un solo lugar donde se
 * resuelve qué avatar ve de verdad un hijo, para que `LevelRuntime` no
 * repita la lógica de desbloqueo por su cuenta. `null` = no hay ningún
 * catálogo o nada elegible todavía — el llamador sigue usando los sprites
 * de fábrica de `Avatar.tsx` sin pasarle `bodySrc`/`headshotSrc`.
 */
export function useResolvedAvatar(
  parentId: string | undefined,
  childId: string | undefined,
  progressBySkill: Record<string, SkillProgress>,
): ResolvedAvatar | null {
  const totalStars = useTotalStars(parentId, childId);
  const [world, setWorld] = useState<GameWorld | null>(null);
  const [levels, setLevels] = useState<LevelDefinition[]>([]);
  const [avatarId, setAvatarId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    getFirebase()
      .then(async ({ db, firestore }) => {
        const [w, summaries] = await Promise.all([getWorld(firestore, db, parentId), listLevels(firestore, db, parentId)]);
        const full = await Promise.all(summaries.map((s) => getLevel(firestore, db, parentId, s.id)));
        return { w, levels: full.filter((l): l is LevelDefinition => l !== null) };
      })
      .then(({ w, levels: full }) => {
        if (cancelled) return;
        setWorld(w);
        setLevels(full);
      })
      .catch((err) => console.error("No se pudo cargar el catálogo de avatares", err));
    return () => {
      cancelled = true;
    };
  }, [parentId]);

  useEffect(() => {
    if (!parentId || !childId) return;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore: { doc, getDoc } }) => getDoc(doc(db, "parents", parentId, "children", childId)))
      .then((snap) => {
        if (!cancelled && snap.exists()) setAvatarId((snap.data() as ChildProfile).avatarId);
      })
      .catch((err) => console.error("No se pudo cargar el perfil del hijo", err));
    return () => {
      cancelled = true;
    };
  }, [parentId, childId]);

  if (!world || world.avatars.avatars.length === 0) return null;

  function toResolved(a: AvatarDef): ResolvedAvatar {
    return { id: a.id, bodySrc: a.bodySrc, headshotSrc: a.headshotSrc, scale: a.scale };
  }

  const levelsById = Object.fromEntries(levels.map((l) => [l.id, l]));
  const stars = totalStars ?? 0;

  const chosen = world.avatars.avatars.find((a) => a.id === avatarId);
  if (chosen && avatarUnlocked(chosen, world, levelsById, progressBySkill, stars)) return toResolved(chosen);

  const fallback = world.avatars.avatars.find((a) => a.id === world.avatars.defaultAvatarId);
  return fallback ? toResolved(fallback) : null;
}
