"use client";

import { useRef, useState } from "react";
import { Link2, Plus, Trash2 } from "lucide-react";
import type { LevelDefinition } from "@/lib/level/schema";
import type { GameWorld, WorldLink, WorldNode } from "@/lib/gameworld/schema";
import { newLinkId } from "@/lib/gameworld/ids";
import { worldGraphState } from "@/lib/gameworld/progress";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { UnlockRuleEditor, levelOptionsExcluding } from "./UnlockRuleEditor";

const LABEL_CLASS = "mb-1 block text-[11px] font-bold text-slate-400";
const INPUT_CLASS = "w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-fuchsia-400/50";

const STATE_COLOR: Record<string, string> = {
  bloqueado: "border-slate-600 bg-slate-800/80 text-slate-400",
  disponible: "border-cyan-400/60 bg-cyan-950/60 text-cyan-100",
  completado: "border-emerald-400/60 bg-emerald-950/60 text-emerald-100",
};

type Selection = { kind: "node"; levelId: string } | { kind: "link"; id: string } | null;

/**
 * Pestaña "Mapa" del Editor de Mundo — Fase 17 (docs/level-editor-plan-v2.md
 * §4.2). Simplificación deliberada frente al plan original: los nodos se
 * arrastran en un lienzo fijo (sin pan/zoom propio, no hacía falta para la
 * cantidad de niveles esperada hoy) y los enlaces se crean eligiendo
 * "desde/hasta" de un desplegable, no arrastrando desde el borde de un nodo
 * — mismo resultado (un grafo dirigido editable de verdad), bastante menos
 * superficie de gestos que mantener.
 */
export function WorldMapTab({
  world,
  levels,
  onChange,
}: {
  world: GameWorld;
  levels: LevelDefinition[];
  onChange: (world: GameWorld) => void;
}) {
  const [selection, setSelection] = useState<Selection>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<string | null>(null);

  const levelsById = new Map(levels.map((l) => [l.id, l]));
  const orphanLevels = levels.filter((l) => !world.nodes.some((n) => n.levelId === l.id));
  // Estado puramente visual: sin niños/progreso real acá, todo se ve como
  // "disponible" salvo lo que ya no tiene desafíos que resolver — no busca
  // reemplazar el mapa del jugador (`/jugar/{childId}/mapa`), solo dar una
  // referencia de color mientras se arma el grafo.
  const previewState = worldGraphState(world, Object.fromEntries(levelsById), {}, 0);

  function updateNode(levelId: string, patch: Partial<WorldNode>) {
    onChange({
      ...world,
      nodes: world.nodes.map((n) => {
        if (n.levelId !== levelId) return patch.isStart ? { ...n, isStart: false } : n; // solo un inicio a la vez
        return { ...n, ...patch };
      }),
    });
  }

  function removeNode(levelId: string) {
    onChange({
      ...world,
      nodes: world.nodes.filter((n) => n.levelId !== levelId),
      links: world.links.filter((l) => l.fromLevelId !== levelId && l.toLevelId !== levelId),
    });
    setSelection(null);
  }

  function addNode(level: LevelDefinition) {
    const node: WorldNode = {
      levelId: level.id,
      chapterId: null,
      position: { x: 20 + (world.nodes.length % 4) * 20, y: 20 + Math.floor(world.nodes.length / 4) * 25 },
      label: level.name,
      icon: "🧩",
      unlock: { kind: "always" },
      isStart: world.nodes.length === 0,
    };
    onChange({ ...world, nodes: [...world.nodes, node] });
  }

  function updateLink(id: string, patch: Partial<WorldLink>) {
    onChange({ ...world, links: world.links.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  }

  function removeLink(id: string) {
    onChange({ ...world, links: world.links.filter((l) => l.id !== id) });
    setSelection(null);
  }

  function chainInOrder() {
    const ordered = world.nodes;
    const newLinks: WorldLink[] = [];
    for (let i = 0; i < ordered.length - 1; i++) {
      const from = ordered[i].levelId;
      const to = ordered[i + 1].levelId;
      if (world.links.some((l) => l.fromLevelId === from && l.toLevelId === to)) continue;
      newLinks.push({ id: newLinkId(), fromLevelId: from, toLevelId: to, exitId: null, label: "" });
    }
    if (newLinks.length > 0) onChange({ ...world, links: [...world.links, ...newLinks] });
  }

  function onNodePointerDown(levelId: string, e: React.PointerEvent) {
    e.stopPropagation();
    setSelection({ kind: "node", levelId });
    dragRef.current = levelId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onCanvasPointerMove(e: React.PointerEvent) {
    const levelId = dragRef.current;
    const canvas = canvasRef.current;
    if (!levelId || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.min(96, Math.max(4, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(92, Math.max(8, ((e.clientY - rect.top) / rect.height) * 100));
    updateNode(levelId, { position: { x: Math.round(x), y: Math.round(y) } });
  }

  function onCanvasPointerUp() {
    dragRef.current = null;
  }

  const selectedNode = selection?.kind === "node" ? world.nodes.find((n) => n.levelId === selection.levelId) : undefined;
  const selectedLink = selection?.kind === "link" ? world.links.find((l) => l.id === selection.id) : undefined;

  return (
    <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_18rem]">
      <div className="space-y-3">
        <div
          ref={canvasRef}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerUp}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelection(null);
          }}
          className="relative h-[420px] w-full overflow-hidden rounded-xl border border-indigo-500/20 bg-[radial-gradient(circle,rgba(99,102,241,0.08)_1px,transparent_1px)] bg-[length:24px_24px] bg-slate-950/60"
        >
          <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ pointerEvents: "none" }}>
            <defs>
              <marker id="world-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#a78bfa" />
              </marker>
            </defs>
            {world.links.map((link) => {
              const from = world.nodes.find((n) => n.levelId === link.fromLevelId);
              const to = world.nodes.find((n) => n.levelId === link.toLevelId);
              if (!from || !to) return null;
              const active = selection?.kind === "link" && selection.id === link.id;
              return (
                <g key={link.id}>
                  {/* Franja invisible más ancha, solo para que el enlace sea fácil de clicar. */}
                  <line
                    x1={from.position.x}
                    y1={from.position.y}
                    x2={to.position.x}
                    y2={to.position.y}
                    stroke="transparent"
                    strokeWidth="3"
                    style={{ pointerEvents: "stroke", cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelection({ kind: "link", id: link.id });
                    }}
                  />
                  <line
                    x1={from.position.x}
                    y1={from.position.y}
                    x2={to.position.x}
                    y2={to.position.y}
                    stroke={active ? "#f0abfc" : "#a78bfa"}
                    strokeWidth={active ? "0.9" : "0.6"}
                    markerEnd="url(#world-arrow)"
                    className={active ? "opacity-100" : "opacity-60"}
                  />
                </g>
              );
            })}
          </svg>

          {world.nodes.length === 0 && (
            <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-slate-500">
              Todavía no hay niveles en el mapa — agregá uno desde &quot;Niveles sin nodo&quot;.
            </p>
          )}

          {world.nodes.map((node) => {
            const level = levelsById.get(node.levelId);
            const active = selection?.kind === "node" && selection.levelId === node.levelId;
            return (
              <button
                key={node.levelId}
                type="button"
                onPointerDown={(e) => onNodePointerDown(node.levelId, e)}
                style={{ left: `${node.position.x}%`, top: `${node.position.y}%` }}
                className={`absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col items-center gap-0.5 rounded-lg border-2 px-2.5 py-1.5 text-center text-[11px] font-bold shadow-lg active:cursor-grabbing ${
                  STATE_COLOR[previewState[node.levelId] ?? "disponible"]
                } ${active ? "ring-2 ring-fuchsia-400" : ""}`}
              >
                <span className="text-base leading-none">{node.icon || "🧩"}</span>
                <span className="max-w-24 truncate">{level?.name ?? node.label}</span>
                {node.isStart && <span className="text-[9px] font-bold uppercase tracking-wide text-amber-300">Inicio</span>}
              </button>
            );
          })}
        </div>

        {orphanLevels.length > 0 && (
          <div className="rounded-lg border border-amber-500/25 bg-amber-950/20 p-2.5">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">Niveles sin nodo</p>
            <div className="flex flex-wrap gap-1.5">
              {orphanLevels.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => addNode(l)}
                  className="flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-200 hover:bg-slate-700"
                >
                  <Plus className="size-3" aria-hidden="true" />
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <CreateLinkForm world={world} levels={levels} onCreate={(link) => onChange({ ...world, links: [...world.links, link] })} onChainInOrder={chainInOrder} />
      </div>

      <div className="space-y-3">
        {selectedNode && (
          <div className="space-y-2 rounded-lg border border-indigo-500/15 bg-slate-900/40 p-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold text-slate-100">{levelsById.get(selectedNode.levelId)?.name ?? selectedNode.label}</h3>
              <IconButton icon={Trash2} label="Quitar del mapa" tooltip="Quita este nivel del mapa (el nivel en sí no se borra)." side="left" tone="danger" onClick={() => removeNode(selectedNode.levelId)} />
            </div>
            <label className="block">
              <span className={LABEL_CLASS}>Icono (emoji)</span>
              <input type="text" className={INPUT_CLASS} value={selectedNode.icon} onChange={(e) => updateNode(selectedNode.levelId, { icon: e.target.value })} />
            </label>
            <label className="flex items-center gap-2 py-1">
              <input type="checkbox" checked={selectedNode.isStart} onChange={(e) => updateNode(selectedNode.levelId, { isStart: e.target.checked })} className="size-4 rounded border-indigo-500/40" />
              <span className="text-[11px] font-bold text-slate-300">Punto de entrada del mundo</span>
            </label>
            {!selectedNode.isStart && (
              <UnlockRuleEditor
                rule={selectedNode.unlock}
                levels={levelOptionsExcluding(levels, selectedNode.levelId)}
                onChange={(unlock) => updateNode(selectedNode.levelId, { unlock })}
              />
            )}
          </div>
        )}

        {selectedLink && (
          <div className="space-y-2 rounded-lg border border-indigo-500/15 bg-slate-900/40 p-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold text-slate-100">
                {levelsById.get(selectedLink.fromLevelId)?.name} → {levelsById.get(selectedLink.toLevelId)?.name}
              </h3>
              <IconButton icon={Trash2} label="Eliminar enlace" tooltip="Elimina este enlace del mapa." side="left" tone="danger" onClick={() => removeLink(selectedLink.id)} />
            </div>
            <label className="block">
              <span className={LABEL_CLASS}>Etiqueta</span>
              <input type="text" className={INPUT_CLASS} value={selectedLink.label} onChange={(e) => updateLink(selectedLink.id, { label: e.target.value })} />
            </label>
            <label className="block">
              <span className={LABEL_CLASS}>Punto de destino del nivel de origen</span>
              <select
                className={INPUT_CLASS}
                value={selectedLink.exitId ?? ""}
                onChange={(e) => updateLink(selectedLink.id, { exitId: e.target.value || null })}
              >
                <option value="">— solo en el mapa —</option>
                {levelsById
                  .get(selectedLink.fromLevelId)
                  ?.navigation.exits.map((exit) => (
                    <option key={exit.id} value={exit.id}>
                      {exit.label}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        )}

        {!selectedNode && !selectedLink && <p className="rounded-lg border border-indigo-500/15 bg-slate-900/20 p-3 text-[11px] text-slate-500">Elegí un nivel o un enlace del mapa para editarlo.</p>}
      </div>
    </div>
  );
}

function CreateLinkForm({
  world,
  levels,
  onCreate,
  onChainInOrder,
}: {
  world: GameWorld;
  levels: LevelDefinition[];
  onCreate: (link: WorldLink) => void;
  onChainInOrder: () => void;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const nodeLevels = levels.filter((l) => world.nodes.some((n) => n.levelId === l.id));

  function submit() {
    if (!from || !to || from === to) return;
    onCreate({ id: newLinkId(), fromLevelId: from, toLevelId: to, exitId: null, label: "" });
    setFrom("");
    setTo("");
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-indigo-500/15 bg-slate-900/30 p-2.5">
      <label className="min-w-32 flex-1">
        <span className={LABEL_CLASS}>Desde</span>
        <select className={INPUT_CLASS} value={from} onChange={(e) => setFrom(e.target.value)}>
          <option value="">— nivel —</option>
          {nodeLevels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-32 flex-1">
        <span className={LABEL_CLASS}>Hasta</span>
        <select className={INPUT_CLASS} value={to} onChange={(e) => setTo(e.target.value)}>
          <option value="">— nivel —</option>
          {nodeLevels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <Tooltip content="Crea un enlace del mapa entre estos dos niveles." side="top">
        <button type="button" onClick={submit} disabled={!from || !to || from === to} className="flex min-h-9 items-center gap-1.5 rounded-md bg-slate-800 px-3 font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-40">
          <Link2 className="size-3.5" aria-hidden="true" />
          Crear enlace
        </button>
      </Tooltip>
      <Tooltip content="Crea enlaces en línea entre todos los niveles del mapa, en el orden en que aparecen." side="top" wide>
        <button type="button" onClick={onChainInOrder} className="flex min-h-9 items-center gap-1.5 rounded-md border border-indigo-500/25 px-3 font-bold text-slate-300 hover:bg-slate-800">
          Encadenar en orden
        </button>
      </Tooltip>
    </div>
  );
}
