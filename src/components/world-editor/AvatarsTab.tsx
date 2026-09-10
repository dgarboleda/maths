"use client";

import { Plus, Star, Trash2 } from "lucide-react";
import { newAvatarId } from "@/lib/gameworld/ids";
import type { AvatarDef, GameWorld } from "@/lib/gameworld/schema";
import type { LevelDefinition } from "@/lib/level/schema";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { BackgroundPicker } from "@/components/level/editor/assets/BackgroundPicker";
import { UnlockRuleEditor, levelOptionsExcluding } from "./UnlockRuleEditor";

const LABEL_CLASS = "mb-1 block text-[11px] font-bold text-slate-400";
const INPUT_CLASS = "w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-fuchsia-400/50";

/**
 * Pestaña "Avatares" del Editor de Mundo — Fase 19 (docs/level-editor-plan-v2.md
 * §6). Gestiona el catálogo (`AvatarCatalog`): cada `AvatarDef` tiene un
 * sprite de cuerpo entero, un retrato, una escala y una regla de
 * desbloqueo — el mismo `UnlockRuleEditor` que ya usan los nodos del mapa.
 * La elección real por hijo (`ChildProfile.avatarId`) se hace en
 * `/panel/ajustes`, no acá: esto solo define QUÉ avatares existen.
 */
export function AvatarsTab({ world, levels, parentId, onChange }: { world: GameWorld; levels: LevelDefinition[]; parentId: string; onChange: (world: GameWorld) => void }) {
  const { avatars, defaultAvatarId } = world.avatars;

  function setAvatars(next: AvatarDef[]) {
    onChange({ ...world, avatars: { ...world.avatars, avatars: next } });
  }

  function addAvatar() {
    const avatar: AvatarDef = {
      id: newAvatarId(),
      label: `Avatar ${avatars.length + 1}`,
      bodySrc: "",
      headshotSrc: "",
      scale: 1,
      unlock: { kind: "always" },
    };
    const nextAvatars = [...avatars, avatar];
    onChange({ ...world, avatars: { avatars: nextAvatars, defaultAvatarId: defaultAvatarId || avatar.id } });
  }

  function updateAvatar(id: string, patch: Partial<AvatarDef>) {
    setAvatars(avatars.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function removeAvatar(id: string) {
    const nextAvatars = avatars.filter((a) => a.id !== id);
    onChange({
      ...world,
      avatars: { avatars: nextAvatars, defaultAvatarId: defaultAvatarId === id ? (nextAvatars[0]?.id ?? "") : defaultAvatarId },
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 text-xs sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white">Avatares</h2>
          <p className="mt-0.5 text-[11px] text-slate-400">Los personajes que puede elegir cada hijo. El predeterminado es el que se usa hasta que el padre elija otro.</p>
        </div>
        <IconButton icon={Plus} label="Añadir avatar" tooltip="Crea un avatar nuevo en el catálogo." side="left" tone="accent" onClick={addAvatar} />
      </div>

      {avatars.length === 0 && <p className="text-[11px] text-slate-500">Sin avatares personalizados todavía — se sigue usando el sprite de fábrica.</p>}

      {avatars.map((avatar) => (
        <div key={avatar.id} className="space-y-3 rounded-lg border border-indigo-500/15 bg-slate-900/40 p-3">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              className={`${INPUT_CLASS} flex-1 font-bold`}
              value={avatar.label}
              onChange={(e) => updateAvatar(avatar.id, { label: e.target.value })}
            />
            <Tooltip content={defaultAvatarId === avatar.id ? "Este es el avatar predeterminado." : "Convertir en el avatar predeterminado."} side="left">
              <button
                type="button"
                onClick={() => onChange({ ...world, avatars: { ...world.avatars, defaultAvatarId: avatar.id } })}
                aria-pressed={defaultAvatarId === avatar.id}
                className={`shrink-0 rounded-md p-1.5 ${defaultAvatarId === avatar.id ? "text-amber-300" : "text-slate-500 hover:bg-slate-800"}`}
              >
                <Star className="size-4" aria-hidden="true" fill={defaultAvatarId === avatar.id ? "currentColor" : "none"} />
              </button>
            </Tooltip>
            <IconButton icon={Trash2} label={`Eliminar ${avatar.label}`} tooltip="Elimina este avatar del catálogo." side="left" tone="danger" onClick={() => removeAvatar(avatar.id)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className={LABEL_CLASS}>Cuerpo entero (para el nivel)</span>
              <BackgroundPicker parentId={parentId} for="avatar" compact value={avatar.bodySrc} onChange={(s) => updateAvatar(avatar.id, { bodySrc: s.src })} />
            </div>
            <div>
              <span className={LABEL_CLASS}>Retrato (para paneles)</span>
              <BackgroundPicker parentId={parentId} for="avatar" compact value={avatar.headshotSrc} onChange={(s) => updateAvatar(avatar.id, { headshotSrc: s.src })} />
            </div>
          </div>

          <label className="block max-w-32">
            <span className={LABEL_CLASS}>Escala</span>
            <input
              type="number"
              step="0.05"
              min="0.1"
              className={INPUT_CLASS}
              value={avatar.scale}
              onChange={(e) => updateAvatar(avatar.id, { scale: Number(e.target.value) })}
            />
          </label>

          <UnlockRuleEditor rule={avatar.unlock} levels={levelOptionsExcluding(levels, "")} onChange={(unlock) => updateAvatar(avatar.id, { unlock })} />
        </div>
      ))}
    </div>
  );
}
