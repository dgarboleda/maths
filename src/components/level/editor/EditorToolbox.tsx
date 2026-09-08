"use client";

import { MapPin, Hexagon, Octagon, LogOut } from "lucide-react";
import { useLevelEditor } from "./LevelEditorProvider";
import type { EditorTool } from "./editorReducer";

/**
 * Caja de herramientas — docs/level-editor-plan.md §5.1. Fase 5 solo llena
 * la sección NAVIGATION (área transitable, zona prohibida, punto de inicio,
 * punto de destino); OBJECTS/GAMEPLAY/EDITING se agregan en fases
 * posteriores cuando sus herramientas existan de verdad.
 */
export function EditorToolbox() {
  const { state, dispatch } = useLevelEditor();

  function isActive(tool: EditorTool): boolean {
    if (tool.kind === "drawPolygon" && state.tool.kind === "drawPolygon") return tool.role === state.tool.role;
    return tool.kind === state.tool.kind;
  }

  function selectTool(tool: EditorTool) {
    // Cambiar de herramienta cancela un dibujo en curso — evita un polígono
    // "colgado" a medio trazar si el usuario cambia de idea.
    if (state.drafting) dispatch({ type: "DRAFT_CANCEL" });
    dispatch({ type: "SET_TOOL", tool });
  }

  const items: { tool: EditorTool; label: string; icon: typeof Hexagon; hint: string }[] = [
    { tool: { kind: "drawPolygon", role: "walkable" }, label: "Área transitable", icon: Hexagon, hint: "W" },
    { tool: { kind: "drawPolygon", role: "blocked" }, label: "Zona prohibida", icon: Octagon, hint: "B" },
    { tool: { kind: "setSpawn" }, label: "Punto de inicio", icon: MapPin, hint: "" },
    { tool: { kind: "setExit" }, label: "Punto de destino", icon: LogOut, hint: "" },
  ];

  return (
    <div className="space-y-4 text-xs">
      <section>
        <h2 className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Navegación</h2>
        <ul className="space-y-1">
          {items.map(({ tool, label, icon: Icon, hint }) => (
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
        </ul>
      </section>

      {state.tool.kind !== "select" && (
        <p className="rounded-lg border border-indigo-500/20 bg-slate-900/60 px-2 py-2 text-[11px] leading-snug text-slate-400">
          {state.tool.kind === "drawPolygon" && "Clic en el lienzo para agregar puntos; \"Cerrar\" con 3 o más."}
          {state.tool.kind === "setSpawn" && "Clic en el lienzo para fijar dónde empieza Alex."}
          {state.tool.kind === "setExit" && "Clic en el lienzo para crear un punto de destino."}
        </p>
      )}
    </div>
  );
}
