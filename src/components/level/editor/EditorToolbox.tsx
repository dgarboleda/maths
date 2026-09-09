"use client";

import type { ComponentType } from "react";
import { MapPin, Hexagon, Octagon, LogOut, Shapes, Circle, MessageSquarePlus, Target, Zap } from "lucide-react";
import { listEntityTypes } from "@/lib/level/entities";
import { newDialogId, newEventId, newMissionId } from "@/lib/level/ids";
import { useLevelEditor } from "./LevelEditorProvider";
import type { EditorTool } from "./editorReducer";

type ToolIcon = ComponentType<{ className?: string }>;

/**
 * Caja de herramientas — docs/level-editor-plan.md §5.1. NAVIGATION (Fase 5)
 * + OBJECTS (Fase 6, un botón por cada `EntityTypeDef` registrado — nunca
 * hardcodeado, así un tipo nuevo aparece solo con registrarlo, §7.5) +
 * GAMEPLAY (Fase 7: zonas + diálogos nuevos; el `ChallengePicker` vive en
 * `EditorPropertyPanel`, atado a la entidad seleccionada, no acá).
 * EDITING se agrega en fases posteriores.
 */
export function EditorToolbox() {
  const { state, dispatch } = useLevelEditor();

  function isActive(tool: EditorTool): boolean {
    if (tool.kind === "drawPolygon" && state.tool.kind === "drawPolygon") return tool.role === state.tool.role;
    if (tool.kind === "placeEntity" && state.tool.kind === "placeEntity") return tool.entityType === state.tool.entityType;
    return tool.kind === state.tool.kind;
  }

  function selectTool(tool: EditorTool) {
    // Cambiar de herramienta cancela un dibujo en curso — evita un polígono
    // "colgado" a medio trazar si el usuario cambia de idea.
    if (state.drafting) dispatch({ type: "DRAFT_CANCEL" });
    dispatch({ type: "SET_TOOL", tool });
  }

  const navItems: { tool: EditorTool; label: string; icon: ToolIcon; hint: string }[] = [
    { tool: { kind: "drawPolygon", role: "walkable" }, label: "Área transitable", icon: Hexagon, hint: "W" },
    { tool: { kind: "drawPolygon", role: "blocked" }, label: "Zona prohibida", icon: Octagon, hint: "B" },
    { tool: { kind: "setSpawn" }, label: "Punto de inicio", icon: MapPin, hint: "" },
    { tool: { kind: "setExit" }, label: "Punto de destino", icon: LogOut, hint: "" },
  ];

  const objectItems: { tool: EditorTool; label: string; icon: ToolIcon; hint: string }[] = listEntityTypes().map((typeDef) => ({
    tool: { kind: "placeEntity", entityType: typeDef.id },
    label: typeDef.label,
    icon: typeDef.Icon,
    hint: "",
  }));

  const gameplayItems: { tool: EditorTool; label: string; icon: ToolIcon; hint: string }[] = [
    { tool: { kind: "drawPolygon", role: "zone" }, label: "Zona (polígono)", icon: Shapes, hint: "" },
    { tool: { kind: "drawCircleZone", center: null }, label: "Zona (círculo)", icon: Circle, hint: "" },
  ];

  function newDialog() {
    dispatch({ type: "ADD_DIALOG", dialog: { id: newDialogId(), name: "Diálogo nuevo", lines: [] } });
  }

  function newMission() {
    dispatch({ type: "ADD_MISSION", mission: { id: newMissionId(), title: "Misión nueva", premise: "", objectives: [] } });
  }

  function newRule() {
    dispatch({
      type: "ADD_EVENT",
      rule: { id: newEventId(), name: "Regla nueva", trigger: { type: "ON_INTERACT" }, when: { kind: "always" }, once: true, actions: [] },
    });
  }

  return (
    <div className="space-y-4 text-xs">
      <ToolSection title="Navegación" items={navItems} isActive={isActive} onSelect={selectTool} />
      <ToolSection title="Objetos" items={objectItems} isActive={isActive} onSelect={selectTool} />
      <section>
        <h2 className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Gameplay</h2>
        <ul className="space-y-1">
          {gameplayItems.map(({ tool, label, icon: Icon, hint }) => (
            <li key={label}>
              <button
                type="button"
                aria-pressed={isActive(tool)}
                onClick={() => selectTool(tool)}
                className={`flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-left font-bold transition-colors ${
                  isActive(tool) ? "bg-cyan-500/15 text-cyan-300" : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {hint && <kbd className="rounded bg-slate-800 px-1 text-[10px] text-slate-400">{hint}</kbd>}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={newDialog}
              className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-left font-bold text-slate-300 transition-colors hover:bg-slate-800"
            >
              <MessageSquarePlus className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">Diálogo nuevo</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={newRule}
              className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-left font-bold text-slate-300 transition-colors hover:bg-slate-800"
            >
              <Zap className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">Regla nueva</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={newMission}
              className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-left font-bold text-slate-300 transition-colors hover:bg-slate-800"
            >
              <Target className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">Misión nueva</span>
            </button>
          </li>
        </ul>

        {/* Ni un diálogo, ni una regla de evento, ni una misión tienen
            representación espacial en el canvas (a diferencia de
            zonas/entidades/polígonos, que se re-seleccionan haciendo clic en
            el mapa) — sin esta lista, solo se podrían editar justo después
            de crearlos. */}
        {state.level.dialogs.length > 0 && (
          <ul className="mt-2 space-y-0.5 border-t border-indigo-500/10 pt-2">
            {state.level.dialogs.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "SELECT", selection: { kind: "dialog", id: d.id } })}
                  className={`block w-full truncate rounded-md px-2 py-1 text-left ${
                    state.selection.kind === "dialog" && state.selection.id === d.id ? "bg-cyan-500/15 text-cyan-300" : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {d.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {state.level.events.length > 0 && (
          <ul className="mt-2 space-y-0.5 border-t border-indigo-500/10 pt-2">
            {state.level.events.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "SELECT", selection: { kind: "event", id: r.id } })}
                  className={`block w-full truncate rounded-md px-2 py-1 text-left ${
                    state.selection.kind === "event" && state.selection.id === r.id ? "bg-cyan-500/15 text-cyan-300" : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {r.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {state.level.missions.length > 0 && (
          <ul className="mt-2 space-y-0.5 border-t border-indigo-500/10 pt-2">
            {state.level.missions.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "SELECT", selection: { kind: "mission", id: m.id } })}
                  className={`block w-full truncate rounded-md px-2 py-1 text-left ${
                    state.selection.kind === "mission" && state.selection.id === m.id ? "bg-cyan-500/15 text-cyan-300" : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {m.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {state.tool.kind !== "select" && (
        <p className="rounded-lg border border-indigo-500/20 bg-slate-900/60 px-2 py-2 text-[11px] leading-snug text-slate-400">
          {state.tool.kind === "drawPolygon" && "Clic en el lienzo para agregar puntos; \"Cerrar\" con 3 o más."}
          {state.tool.kind === "drawCircleZone" && !state.tool.center && "Clic en el lienzo para fijar el centro."}
          {state.tool.kind === "drawCircleZone" && state.tool.center && "Clic de nuevo para fijar el radio."}
          {state.tool.kind === "setSpawn" && "Clic en el lienzo para fijar dónde empieza Alex."}
          {state.tool.kind === "setExit" && "Clic en el lienzo para crear un punto de destino."}
          {state.tool.kind === "placeEntity" && "Clic en el lienzo para colocarla."}
          {state.tool.kind === "pickStandPoint" && "Clic en el lienzo para fijar dónde se detiene Alex."}
        </p>
      )}
    </div>
  );
}

function ToolSection({
  title,
  items,
  isActive,
  onSelect,
}: {
  title: string;
  items: { tool: EditorTool; label: string; icon: ToolIcon; hint: string }[];
  isActive: (tool: EditorTool) => boolean;
  onSelect: (tool: EditorTool) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</h2>
      <ul className="space-y-1">
        {items.map(({ tool, label, icon: Icon, hint }) => (
          <li key={label}>
            <button
              type="button"
              aria-pressed={isActive(tool)}
              onClick={() => onSelect(tool)}
              className={`flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-left font-bold transition-colors ${
                isActive(tool) ? "bg-cyan-500/15 text-cyan-300" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {hint && <kbd className="rounded bg-slate-800 px-1 text-[10px] text-slate-400">{hint}</kbd>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
