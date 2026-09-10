"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useFamily } from "@/components/family/FamilyProvider";
import { getFirebase } from "@/lib/firebase";
import { listLevels, type LevelSummary } from "@/lib/level/persistence/levelRepository";
import type { LevelExitTarget } from "@/lib/level/schema";
import { IconButton } from "@/components/ui/IconButton";
import { useLevelEditor } from "./LevelEditorProvider";
import { FieldLabel } from "./fields/PropertyFields";
import { help } from "./helpText";

const LABEL_CLASS = "mb-1 flex items-center gap-1 text-[11px] font-bold text-slate-400";
const INPUT_CLASS = "w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-cyan-400/50";

/**
 * Panel del punto de destino seleccionado — Fase 16 (docs/level-editor-plan-v2.md
 * §3.4). Único punto del editor donde se elige `LevelExitTarget`: siempre de
 * un desplegable (niveles reales del padre, o "Mapa del mundo"), nunca
 * tecleando una ruta — elimina de raíz la clase de bug de una URL mal escrita.
 */
export function ExitEditor() {
  const { parentId } = useFamily();
  const { state, dispatch } = useLevelEditor();
  const [levels, setLevels] = useState<LevelSummary[] | null>(null);

  const { selection } = state;
  const exit = selection.kind === "exit" ? state.level.navigation.exits.find((e) => e.id === selection.id) : undefined;

  useEffect(() => {
    if (!parentId || !exit) return;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore }) => listLevels(firestore, db, parentId))
      .then((list) => {
        if (!cancelled) setLevels(list);
      })
      .catch((err) => console.error("No se pudo cargar la lista de niveles", err));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId, !!exit]);

  if (selection.kind !== "exit" || !exit) return null;

  function setTarget(target: LevelExitTarget) {
    dispatch({ type: "UPDATE_EXIT", id: exit!.id, patch: { target } });
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-100">Punto de destino</h2>
        <IconButton icon={Trash2} label="Eliminar" tooltip={help("exit.delete").text} side="left" tone="danger" onClick={() => dispatch({ type: "DELETE_EXIT", id: exit.id })} />
      </div>

      <label className="block">
        <span className={LABEL_CLASS}>Etiqueta</span>
        <input
          key={exit.id}
          type="text"
          defaultValue={exit.label}
          onBlur={(e) => dispatch({ type: "UPDATE_EXIT", id: exit.id, patch: { label: e.target.value } })}
          className={INPUT_CLASS}
        />
      </label>

      <div>
        <FieldLabel label="Lleva a" hint={help("exit.target").text} />
        <select
          className={INPUT_CLASS}
          value={exit.target.kind}
          onChange={(e) => {
            const kind = e.target.value as LevelExitTarget["kind"];
            if (kind === "worldMap") setTarget({ kind: "worldMap" });
            else if (kind === "level") setTarget({ kind: "level", levelId: levels?.[0]?.id ?? "" });
            else setTarget({ kind: "href", href: "" });
          }}
        >
          <option value="worldMap">Mapa del mundo</option>
          <option value="level">Otro nivel</option>
          <option value="href">Ruta manual (avanzado)</option>
        </select>
      </div>

      {exit.target.kind === "level" && (
        <label className="block">
          <span className={LABEL_CLASS}>Nivel</span>
          <select className={INPUT_CLASS} value={exit.target.levelId} onChange={(e) => setTarget({ kind: "level", levelId: e.target.value })}>
            <option value="">— elegí un nivel —</option>
            {levels?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {exit.target.kind === "href" && (
        <label className="block">
          <span className={LABEL_CLASS}>Ruta</span>
          <input
            type="text"
            placeholder="/jugar/…"
            value={exit.target.href}
            onChange={(e) => setTarget({ kind: "href", href: e.target.value })}
            className={INPUT_CLASS}
          />
        </label>
      )}
    </div>
  );
}
