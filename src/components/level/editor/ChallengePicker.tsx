"use client";

import { useState } from "react";
import { Link2, Unlink } from "lucide-react";
import { allModules } from "@/lib/curriculum";
import { STRANDS } from "@/lib/strands";
import { newChallengeId } from "@/lib/level/ids";
import { ACTIVITIES, DEFAULT_ACTIVITY_ID } from "@/lib/level/activities/registry";
import type { Problem } from "@/lib/problem";
import { QuestionWidget } from "@/components/topic/QuestionWidget";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useLevelEditor } from "./LevelEditorProvider";
import { help } from "./helpText";

/**
 * Vincula un `ChallengePlacement` a la entidad seleccionada — docs/level-
 * editor-plan.md §9.2. El editor NUNCA define contenido académico: solo
 * elige un `ModuleDef` real (de `MODULES`, o uno personalizado publicado —
 * política P1, docs/level-editor-plan-v2.md §0) y previsualiza
 * `mod.generateProblem()` con el mismo `QuestionWidget` que usa el juego,
 * en modo solo lectura (`disabled`, sin `onSubmit` funcional) — lo que se
 * ve acá es exactamente lo que le va a tocar resolver al jugador, con datos
 * reales.
 *
 * `allModules()` solo hidrata módulos personalizados **publicados**
 * (`useCustomCurriculum`, Fase 20 §7.1) — un borrador nunca aparece acá,
 * así que no hace falta filtrar `published` de nuevo en este componente.
 *
 * Tras confirmar, vuelve a seleccionar la entidad (no el `challenge` recién
 * creado) para no sacar al usuario del panel desde el que abrió el picker.
 */
export function ChallengePicker({ entityId }: { entityId: string }) {
  const { state, dispatch } = useLevelEditor();
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [previewModuleId, setPreviewModuleId] = useState<string | null>(null);
  // Generado UNA vez al elegir el módulo (no en cada render): `generateProblem`
  // devuelve un problema distinto cada vez que se llama, así que el enunciado
  // mostrado y el que resuelve `QuestionWidget` tienen que ser el mismo objeto.
  const [previewProblem, setPreviewProblem] = useState<Problem | null>(null);

  const existing = state.level.challenges.find((c) => c.sourceEntityId === entityId);

  if (existing && !picking) {
    const existingMod = allModules().find((m) => m.id === existing.moduleId);
    return (
      <div className="space-y-2 rounded-lg border border-indigo-500/15 bg-slate-900/40 p-2">
        <p className="text-[11px] text-slate-300">
          <span className="font-bold text-slate-100">{existingMod ? `${existingMod.emoji} ${existingMod.label}` : existing.moduleId}</span>
          {existing.moduleId.startsWith("cst-") && (
            <span className="ml-1.5 rounded bg-cyan-500/15 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cyan-300">Tuyo</span>
          )}
        </p>
        {/* Fase 33 (docs/plan-jugabilidad.md §7): qué actividad presenta este
            desafío — "puzzle" (una ficha) por defecto, o una de las otras
            del registro. `UPDATE_CHALLENGE` ya existía (editorReducer.ts). */}
        <div className="space-y-1">
          <label htmlFor={`actividad-${existing.id}`} className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Actividad
          </label>
          <select
            id={`actividad-${existing.id}`}
            value={existing.activityId}
            onChange={(e) => dispatch({ type: "UPDATE_CHALLENGE", id: existing.id, patch: { activityId: e.target.value } })}
            className="w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-cyan-400/50"
          >
            {ACTIVITIES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-1.5">
          <Tooltip content={help("challenge.change").text} side="top">
            <button
              type="button"
              onClick={() => {
                setPreviewModuleId(existing.moduleId);
                setPreviewProblem(existingMod ? existingMod.generateProblem() : null);
                setPicking(true);
              }}
              className="flex-1 rounded-md bg-slate-800 px-2 py-1.5 font-bold text-slate-300 hover:bg-slate-700"
            >
              Cambiar
            </button>
          </Tooltip>
          <IconButton icon={Unlink} label="Desvincular" tooltip={help("challenge.unlink").text} side="left" tone="danger" onClick={() => dispatch({ type: "DELETE_CHALLENGE", id: existing.id })} />
        </div>
      </div>
    );
  }

  if (!picking) {
    return (
      <Tooltip content={help("challenge.link").text} side="top">
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-800 px-2 py-1.5 font-bold text-slate-300 hover:bg-slate-700"
        >
          <Link2 className="size-3.5" aria-hidden="true" />
          Vincular desafío
        </button>
      </Tooltip>
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = allModules().filter((m) => !q || m.label.toLowerCase().includes(q) || m.id.includes(q));
  const previewMod = allModules().find((m) => m.id === previewModuleId);

  function confirm(moduleId: string) {
    dispatch({ type: "ADD_CHALLENGE", challenge: { id: newChallengeId(), moduleId, activityId: DEFAULT_ACTIVITY_ID, sourceEntityId: entityId } });
    dispatch({ type: "SELECT", selection: { kind: "entity", id: entityId } });
    setPicking(false);
    setPreviewModuleId(null);
    setPreviewProblem(null);
  }

  return (
    <div className="space-y-2 rounded-lg border border-indigo-500/15 bg-slate-900/40 p-2">
      <input
        type="text"
        placeholder="Buscar módulo…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-cyan-400/50"
      />

      <ul className="max-h-40 space-y-0.5 overflow-y-auto">
        {STRANDS.map((strand) => {
          const mods = filtered.filter((m) => m.strandSlug === strand.slug);
          if (mods.length === 0) return null;
          return (
            <li key={strand.slug}>
              <p className="px-1 pt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {strand.emoji} {strand.label}
              </p>
              {mods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setPreviewModuleId(m.id);
                    setPreviewProblem(m.generateProblem());
                  }}
                  className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left ${previewModuleId === m.id ? "bg-cyan-500/15 text-cyan-300" : "text-slate-300 hover:bg-slate-800"}`}
                >
                  <span className="flex-1">
                    {m.emoji} {m.label}
                  </span>
                  {m.id.startsWith("cst-") && (
                    <span className="rounded bg-cyan-500/15 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cyan-300">Tuyo</span>
                  )}
                </button>
              ))}
            </li>
          );
        })}
      </ul>

      {previewMod && previewProblem && (
        <div className="space-y-2 rounded-lg border border-cyan-500/20 bg-slate-950/60 p-2">
          <p className="text-[11px] font-semibold text-slate-100">{previewProblem.prompt}</p>
          <div className="pointer-events-none opacity-70">
            <QuestionWidget problem={previewProblem} disabled onSubmit={() => {}} />
          </div>
          <button type="button" onClick={() => confirm(previewMod.id)} className="w-full rounded-md bg-cyan-600 px-2 py-1.5 font-bold text-white hover:bg-cyan-500">
            Vincular {previewMod.label}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setPicking(false);
          setPreviewModuleId(null);
          setPreviewProblem(null);
        }}
        className="w-full rounded-md px-2 py-1 text-center text-[11px] font-bold text-slate-400 hover:text-slate-200"
      >
        Cancelar
      </button>
    </div>
  );
}
