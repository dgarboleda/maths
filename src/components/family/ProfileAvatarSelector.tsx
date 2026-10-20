"use client";

import { useId } from "react";
import { Check } from "lucide-react";
import { PROFILE_AVATARS } from "@/lib/profileAvatars";
import { Avatar } from "@/components/world/Avatar";

export function ProfileAvatarSelector({ value, onChange, disabled = false }: {
  value: string;
  onChange: (avatarId: string) => void;
  disabled?: boolean;
}) {
  const name = useId();
  return (
    <fieldset disabled={disabled}>
      <legend className="text-sm font-semibold text-indigo-200">Elige su personaje</legend>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
        {PROFILE_AVATARS.map((avatar) => {
          const selected = value === avatar.id;
          return (
            <label key={avatar.id} className={`relative flex min-h-11 min-w-0 cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 px-2 py-3 text-center focus-within:ring-2 focus-within:ring-cyan-300 focus-within:ring-offset-2 focus-within:ring-offset-slate-900 ${selected ? "border-cyan-300 bg-cyan-300/10" : "border-indigo-500/25 bg-slate-950/50 hover:border-indigo-300"} ${disabled ? "cursor-wait opacity-60" : ""}`}>
              <input type="radio" name={name} value={avatar.id} checked={selected}
                onChange={() => onChange(avatar.id)} className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-wait" />
              <Avatar avatarId={avatar.id} title="" className="size-14 rounded-full sm:size-20" />
              <span className="text-xs font-bold text-slate-100 sm:text-sm">{avatar.label}</span>
              {selected && <span className="absolute right-1 top-1 rounded-full bg-cyan-300 p-0.5 text-slate-950"><Check size={14} aria-hidden="true" /></span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
