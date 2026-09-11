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

export interface ResolvedAvatarResult {
  avatar: ResolvedAvatar | null;
  /** `true` mientras todavía no se sabe si el hijo tiene un avatar elegido
   *  del catálogo del Mundo (Fase 19) — Firestore no respondió ni una vez.
   *  El llamador debe esperar a que sea `false` antes de pintar cualquier
   *  sprite: pintar el de fábrica mientras tanto y después cambiarlo por el
   *  elegido produce el "primero se ve uno, después otro" de un avatar
   *  personalizado apareciendo tarde. */
  loading: boolean;
}

/**
 * Cascada elegido → desbloqueado → predeterminado → sprites de fábrica —
 * Fase 19 (docs/level-editor-plan-v2.md §6.3). Un solo lugar donde se
 * resuelve qué avatar ve de verdad un hijo, para que `LevelRuntime` no
 * repita la lógica de desbloqueo por su cuenta. `avatar: null` = no hay
 * ningún catálogo o nada elegible todavía — el llamador sigue usando los
 * sprites de fábrica de `Avatar.tsx` sin pasarle `bodySrc`/`headshotSrc`.
 */
export function useResolvedAvatar(
  parentId: string | undefined,
  childId: string | undefined,
  progressBySkill: Record<string, SkillProgress>,
  /** Fase 32 (docs/plan-jugabilidad.md §6): cambiar este valor fuerza a
   *  releer el `avatarId` del hijo — el hook lo carga una sola vez al
   *  montar, así que sin esto el hub seguiría mostrando el avatar viejo
   *  después de elegir uno nuevo en `AvatarPickerDialog`, hasta recargar la
   *  página. `undefined` (el único caso hasta esta fase, `LevelRuntime` no
   *  lo pasa) no cambia nada. */
  refreshKey?: unknown,
): ResolvedAvatarResult {
  const totalStars = useTotalStars(parentId, childId);
  const [world, setWorld] = useState<GameWorld | null>(null);
  const [levels, setLevels] = useState<LevelDefinition[]>([]);
  const [worldLoaded, setWorldLoaded] = useState(false);
  const [avatarId, setAvatarId] = useState<string | undefined>(undefined);
  const [avatarIdLoaded, setAvatarIdLoaded] = useState(false);

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
      .catch((err) => console.error("No se pudo cargar el catálogo de avatares", err))
      .finally(() => {
        if (!cancelled) setWorldLoaded(true);
      });
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
      .catch((err) => console.error("No se pudo cargar el perfil del hijo", err))
      .finally(() => {
        if (!cancelled) setAvatarIdLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [parentId, childId, refreshKey]);

  // Sin `parentId`/`childId` no hay ningún fetch en marcha (los efectos de
  // arriba ni arrancan) — `worldLoaded`/`avatarIdLoaded` se quedarían en
  // `false` para siempre si se los tratara como la única fuente de verdad,
  // así que acá se los da por resueltos en vez de forzar un `setState`
  // síncrono dentro del efecto solo para marcarlos.
  const loading = (Boolean(parentId) && !worldLoaded) || (Boolean(parentId) && Boolean(childId) && !avatarIdLoaded);

  if (!world || world.avatars.avatars.length === 0) return { avatar: null, loading };

  function toResolved(a: AvatarDef): ResolvedAvatar {
    return { id: a.id, bodySrc: a.bodySrc, headshotSrc: a.headshotSrc, scale: a.scale };
  }

  const levelsById = Object.fromEntries(levels.map((l) => [l.id, l]));
  const stars = totalStars ?? 0;

  const chosen = world.avatars.avatars.find((a) => a.id === avatarId);
  if (chosen && avatarUnlocked(chosen, world, levelsById, progressBySkill, stars)) return { avatar: toResolved(chosen), loading };

  const fallback = world.avatars.avatars.find((a) => a.id === world.avatars.defaultAvatarId);
  return { avatar: fallback ? toResolved(fallback) : null, loading };
}
