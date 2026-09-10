"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { useFamily } from "@/components/family/FamilyProvider";
import { getFirebase } from "@/lib/firebase";
import { getLevel, listLevels } from "@/lib/level/persistence/levelRepository";
import type { LevelDefinition } from "@/lib/level/schema";
import { useWorldDoc } from "@/lib/gameworld/persistence/useWorldDoc";
import { StaleWorldError } from "@/lib/gameworld/persistence/worldRepository";
import { validateWorld } from "@/lib/gameworld/validate";
import type { GameWorld } from "@/lib/gameworld/schema";
import { Tooltip } from "@/components/ui/Tooltip";
import { WorldMapTab } from "./WorldMapTab";
import { WorldStoryTab } from "./WorldStoryTab";
import { WorldRulesTab } from "./WorldRulesTab";
import { AvatarsTab } from "./AvatarsTab";

const SAVE_LABEL: Record<string, string> = {
  idle: "",
  saving: "Guardando…",
  saved: "Guardado ✓",
  error: "Error al guardar",
};

const TABS = [
  { id: "mapa", label: "Mapa" },
  { id: "historia", label: "Historia" },
  { id: "reglas", label: "Reglas" },
  { id: "avatares", label: "Avatares" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/**
 * Editor de Mundo — Fase 17 (docs/level-editor-plan-v2.md §4). Reducer
 * hermano del editor de nivel, pero deliberadamente más simple: sin
 * historial de deshacer/rehacer ni autosave/borrador local (superficie más
 * chica, edición mucho menos frecuente que un nivel) — un botón "Guardar"
 * explícito con el mismo versionado optimista alcanza.
 */
export function WorldEditorScreen() {
  const { parentId } = useFamily();
  const { world: loadedWorld, loading: worldLoading, saveState, saveError, save, reload } = useWorldDoc(parentId);
  const [world, setWorld] = useState<GameWorld | null>(null);
  const [dirty, setDirty] = useState(false);
  const [levels, setLevels] = useState<LevelDefinition[] | null>(null);
  const [tab, setTab] = useState<TabId>("mapa");
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    if (loadedWorld && !world) queueMicrotask(() => setWorld(loadedWorld));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedWorld]);

  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    getFirebase()
      .then(async ({ db, firestore }) => {
        const summaries = await listLevels(firestore, db, parentId);
        const full = await Promise.all(summaries.map((s) => getLevel(firestore, db, parentId, s.id)));
        return full.filter((l): l is LevelDefinition => l !== null);
      })
      .then((list) => {
        if (!cancelled) setLevels(list);
      })
      .catch((err) => console.error("No se pudieron cargar los niveles", err));
    return () => {
      cancelled = true;
    };
  }, [parentId]);

  function updateWorld(next: GameWorld) {
    setWorld(next);
    setDirty(true);
  }

  async function saveNow() {
    if (!world) return;
    try {
      const saved = await save(world);
      setWorld(saved);
      setDirty(false);
    } catch (err) {
      if (err instanceof StaleWorldError) setConflict(true);
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveNow();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world]);

  const issues = world && levels ? validateWorld(world, levels) : [];
  const errorCount = issues.filter((i) => i.severity === "error").length;

  if (worldLoading || !world || !levels) {
    return (
      <div className="flex h-dvh items-center justify-center bg-slate-950">
        <p role="status" className="text-indigo-200">
          Cargando el mundo…
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-slate-950">
      <header className="flex min-h-14 flex-wrap items-center gap-3 border-b border-indigo-500/20 bg-slate-900/60 px-3 sm:px-4">
        <Link href="/panel/editor" className="flex items-center gap-1.5 text-sm font-bold text-slate-300 hover:text-white">
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Math Quest · Mundo</span>
        </Link>

        <nav aria-label="Secciones del mundo" className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`min-h-9 rounded-lg px-3 text-xs font-bold ${tab === t.id ? "bg-cyan-500/15 text-cyan-200" : "text-slate-300 hover:bg-slate-800"}`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {errorCount > 0 && (
            <Tooltip content={issues.find((i) => i.severity === "error")?.message ?? ""} side="bottom" wide>
              <span className="flex items-center gap-1 text-xs font-bold text-rose-300">
                <CircleAlert className="size-3.5" aria-hidden="true" />
                {errorCount} {errorCount === 1 ? "problema" : "problemas"}
              </span>
            </Tooltip>
          )}
          <span role="status" className="hidden text-xs font-semibold text-slate-400 sm:inline">
            {SAVE_LABEL[saveState]}
          </span>
          <Tooltip content="Guarda los cambios del mundo." shortcut="Ctrl+S" side="bottom">
            <button
              type="button"
              onClick={() => void saveNow()}
              disabled={saveState === "saving" || !dirty}
              className="flex min-h-9 items-center rounded-lg border border-indigo-500/25 bg-slate-800/60 px-3 text-xs font-bold text-slate-100 hover:bg-slate-800 disabled:opacity-40"
            >
              Guardar
            </button>
          </Tooltip>
        </div>
      </header>

      {saveState === "error" && saveError && !conflict && (
        <p role="alert" className="border-b border-rose-500/30 bg-rose-950/40 px-4 py-2 text-xs text-rose-200">
          {saveError}
        </p>
      )}

      {conflict && (
        <div className="flex flex-wrap items-center gap-2 border-b border-amber-500/30 bg-amber-950/40 px-4 py-2 text-xs text-amber-200">
          <span>Se guardó una versión más nueva del mundo desde otra sesión.</span>
          <button
            type="button"
            onClick={async () => {
              await reload();
              setConflict(false);
              setDirty(false);
            }}
            className="rounded-md bg-amber-500/20 px-2 py-1 font-bold hover:bg-amber-500/30"
          >
            Recargar
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "mapa" && <WorldMapTab world={world} levels={levels} onChange={updateWorld} />}
        {tab === "historia" && <WorldStoryTab world={world} onChange={updateWorld} />}
        {tab === "reglas" && <WorldRulesTab world={world} onChange={updateWorld} />}
        {tab === "avatares" && parentId && <AvatarsTab world={world} levels={levels} parentId={parentId} onChange={updateWorld} />}
      </div>

      {issues.length > 0 && (
        <footer className="max-h-28 overflow-y-auto border-t border-indigo-500/20 bg-slate-900/60 px-3 py-2 text-[11px] sm:px-4">
          <ul className="space-y-1">
            {issues.map((issue, i) => (
              <li key={i} className={`flex items-center gap-1.5 ${issue.severity === "error" ? "text-rose-300" : "text-amber-300"}`}>
                {issue.severity === "error" ? <CircleAlert className="size-3 shrink-0" aria-hidden="true" /> : <TriangleAlert className="size-3 shrink-0" aria-hidden="true" />}
                {issue.message}
              </li>
            ))}
          </ul>
        </footer>
      )}
      {issues.length === 0 && (
        <footer className="flex items-center gap-1.5 border-t border-indigo-500/20 bg-slate-900/60 px-3 py-2 text-[11px] font-bold text-emerald-300 sm:px-4">
          <CircleCheck className="size-3.5" aria-hidden="true" />
          Sin problemas
        </footer>
      )}
    </div>
  );
}
