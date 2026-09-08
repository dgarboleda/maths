/**
 * Botón visual compartido por los `Render` de tipo (§7.2) — mismo lenguaje
 * de halo + icono que `QuestHotspot.tsx:53-87`. Vive en `entities/`, no en
 * `types/`, así que reutilizarlo NO cuenta como "tocar" un archivo cuando se
 * añade un tipo nuevo (§7.5): un tipo nuevo lo importa sin modificarlo.
 */
import type { ComponentType } from "react";
import type { EntityStateDef, LevelEntity } from "@/lib/level/schema";

export function EntityButton({
  entity,
  activeState,
  selected,
  onSelect,
  Icon,
  tone,
}: {
  entity: LevelEntity;
  activeState: EntityStateDef;
  selected: boolean;
  onSelect: () => void;
  Icon: ComponentType<{ className?: string }>;
  /** Color del aro/fondo del icono — cada tipo elige el suyo. */
  tone: "violet" | "rose" | "cyan" | "amber" | "emerald";
}) {
  if (!activeState.visible || !entity.visible) return null;

  const toneClass: Record<typeof tone, string> = {
    violet: "border-violet-300 bg-violet-600/90 world-ring-glow",
    rose: "border-rose-300 bg-rose-600/90",
    cyan: "border-cyan-300 bg-cyan-600/90 world-ring-glow",
    amber: "border-amber-300 bg-amber-600/90 world-ring-glow",
    emerald: "border-emerald-300 bg-emerald-600/90",
  };

  return (
    <button
      type="button"
      data-entity-id={entity.id}
      data-state={activeState.id}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      aria-label={`${entity.name} — ${activeState.label}`}
      className={`group pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 focus-visible:z-30 ${selected ? "editor-selected z-30" : "z-20"}`}
      style={{
        left: `${entity.position.x}%`,
        top: `${entity.position.y}%`,
        transform: `translate(-50%,-50%) rotate(${entity.rotation}deg) scale(${entity.scale})`,
      }}
    >
      <span
        className={`relative grid size-8 place-items-center rounded-full border-2 text-white transition-transform duration-200 group-hover:scale-110 ${toneClass[tone]} ${activeState.className ?? ""}`}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span
        aria-hidden="true"
        className="world-hud-panel pointer-events-none absolute bottom-full left-1/2 mb-1.5 block -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold text-slate-100 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      >
        {entity.name}
        <span className="ml-1 font-normal text-slate-400">· {activeState.label}</span>
      </span>
    </button>
  );
}
