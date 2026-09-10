"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { getFirebase } from "@/lib/firebase";
import { getWorld } from "@/lib/gameworld/persistence/worldRepository";
import { avatarUnlocked } from "@/lib/gameworld/progress";
import type { GameWorld } from "@/lib/gameworld/schema";
import { getLevel, listLevels } from "@/lib/level/persistence/levelRepository";
import type { LevelDefinition } from "@/lib/level/schema";
import type { SkillProgress } from "@/lib/types";
import { useTotalStars } from "@/lib/useTotalStars";
import { useDialogFocus } from "@/components/world/useDialogFocus";
import type { ChildDoc } from "./FamilyProvider";

/**
 * Elegir el avatar de un hijo — Fase 19 (docs/level-editor-plan-v2.md §6.3).
 * Muestra el catálogo del Mundo con su estado real (bloqueado/desbloqueado)
 * para ESTE hijo — nunca se puede elegir uno bloqueado, mismo criterio que
 * el resto del proyecto ("no hay candado inventado por la narrativa").
 */
export function AvatarPickerDialog({ parentId, child, onClose, onSaved }: { parentId: string; child: ChildDoc; onClose: () => void; onSaved: (avatarId: string) => void }) {
  const { dialogRef, handleKeyDown } = useDialogFocus(onClose);
  const totalStars = useTotalStars(parentId, child.id);
  const [world, setWorld] = useState<GameWorld | null>(null);
  const [levels, setLevels] = useState<LevelDefinition[]>([]);
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFirebase()
      .then(async ({ db, firestore }) => {
        const [w, summaries, progressSnap] = await Promise.all([
          getWorld(firestore, db, parentId),
          listLevels(firestore, db, parentId),
          firestore.getDocs(firestore.collection(db, "parents", parentId, "children", child.id, "skillsProgress")),
        ]);
        const full = await Promise.all(summaries.map((s) => getLevel(firestore, db, parentId, s.id)));
        const progress: Record<string, SkillProgress> = {};
        progressSnap.forEach((d) => (progress[d.id] = d.data() as SkillProgress));
        return { w, levels: full.filter((l): l is LevelDefinition => l !== null), progress };
      })
      .then(({ w, levels: full, progress }) => {
        if (cancelled) return;
        setWorld(w);
        setLevels(full);
        setProgressBySkill(progress);
      })
      .catch((err) => {
        console.error("No se pudo cargar el catálogo de avatares", err);
        if (!cancelled) setError("No se pudo cargar el catálogo de avatares.");
      });
    return () => {
      cancelled = true;
    };
  }, [parentId, child.id]);

  async function choose(avatarId: string) {
    setSaving(avatarId);
    setError(null);
    try {
      const { db, firestore } = await getFirebase();
      await firestore.updateDoc(firestore.doc(db, "parents", parentId, "children", child.id), { avatarId });
      onSaved(avatarId);
      onClose();
    } catch (err) {
      console.error("No se pudo guardar el avatar elegido", err);
      setError("No se pudo guardar el avatar elegido.");
      setSaving(null);
    }
  }

  const avatars = world?.avatars.avatars ?? [];
  const levelsById = Object.fromEntries(levels.map((l) => [l.id, l]));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-picker-titulo"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="w-full max-w-md rounded-2xl border border-indigo-500/30 bg-slate-900 p-5 focus:outline-none"
      >
        <h2 id="avatar-picker-titulo" className="text-sm font-bold text-white">
          Avatar de {child.name}
        </h2>

        {error && (
          <p role="alert" className="mt-2 rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs text-rose-200">
            {error}
          </p>
        )}

        {!world ? (
          <p role="status" className="mt-3 text-xs text-slate-400">
            Cargando…
          </p>
        ) : avatars.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">Todavía no hay avatares en el catálogo del Mundo. Creá alguno desde el Editor de Mundo.</p>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {avatars.map((avatar) => {
              const unlocked = avatarUnlocked(avatar, world, levelsById, progressBySkill, totalStars ?? 0);
              const selected = child.avatarId === avatar.id;
              return (
                <button
                  key={avatar.id}
                  type="button"
                  disabled={!unlocked || saving !== null}
                  onClick={() => void choose(avatar.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition-colors disabled:cursor-not-allowed ${
                    selected ? "border-cyan-400/60 bg-cyan-500/10" : "border-indigo-500/20 bg-slate-800/40 hover:border-indigo-400/40"
                  } ${!unlocked ? "opacity-50" : ""}`}
                >
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de avatar subido por el padre */}
                    <img src={avatar.headshotSrc || avatar.bodySrc} alt="" aria-hidden="true" className="size-14 rounded-full border border-indigo-500/25 object-cover" />
                    {!unlocked && (
                      <span className="absolute -bottom-1 -right-1 rounded-full bg-slate-900 p-1 text-slate-300">
                        <Lock className="size-3" aria-hidden="true" />
                      </span>
                    )}
                  </div>
                  <span className="truncate text-[11px] font-bold text-slate-200">{avatar.label}</span>
                  {saving === avatar.id && <span className="text-[10px] text-slate-400">Guardando…</span>}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
