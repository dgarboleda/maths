"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Map, Pencil, Play, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useFamily } from "@/components/family/FamilyProvider";
import { SectionCard, EmptyState, SkeletonRows } from "@/components/family/ui";
import { getFirebase } from "@/lib/firebase";
import { createLevel, deleteLevel, duplicateLevel, listLevels, type LevelSummary } from "@/lib/level/persistence/levelRepository";
import { seedExampleWorld } from "@/lib/level/seedExampleWorld";
import { ensureWorld, saveWorld } from "@/lib/gameworld/persistence/worldRepository";
import type { WorldNode } from "@/lib/gameworld/schema";
import { BackgroundPicker, type ResolvedBackgroundSelection } from "@/components/level/editor/assets/BackgroundPicker";
import { Tooltip } from "@/components/ui/Tooltip";

/** Primera celda libre de una rejilla de 4 columnas (10-90% con 25% de
 *  paso) — cubre el 90% de los casos sin que el padre tenga que acomodar el
 *  nodo a mano apenas crea el nivel (Fase 17, §4.3). */
function nextGridPosition(existingCount: number): { x: number; y: number } {
  const col = existingCount % 4;
  const row = Math.floor(existingCount / 4);
  return { x: 15 + col * 25, y: 15 + row * 25 };
}

/**
 * Lista de niveles del Level Editor — Fase 3 (docs/level-editor-plan.md §17).
 * Todavía no hay editor visual: esta pantalla solo cubre crear / duplicar /
 * borrar / abrir / "Jugar con {hijo}", todo contra Firestore real vía
 * `levelRepository`. "Abrir" y "Jugar" llevan a rutas que las fases
 * siguientes (4 y 9) todavía tienen que construir.
 */
export default function EditorPage() {
  const { parentId, selectedChild } = useFamily();
  const [levels, setLevels] = useState<LevelSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `NoLevelsYet` (Fase 18) enlaza acá con `?crear=1` para abrir el
  // formulario directo, sin que el padre tenga que encontrar el botón. Se
  // lee de `window.location` en un efecto (no `useSearchParams`) para no
  // exigirle a esta página un `<Suspense>` solo por un query param que se
  // consulta una vez al montar.
  useEffect(() => {
    const shouldOpen = new URLSearchParams(window.location.search).get("crear") === "1";
    if (shouldOpen) queueMicrotask(() => setCreating(true));
  }, []);

  const reload = useCallback(async () => {
    if (!parentId) return;
    const { db, firestore } = await getFirebase();
    setLevels(await listLevels(firestore, db, parentId));
  }, [parentId]);

  // Carga inicial encadenada directo (mismo patrón que FamilyProvider/
  // useChildDashboard): el `setState` vive dentro del `.then`/`.catch`, no
  // suelto en el cuerpo del efecto.
  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore }) => listLevels(firestore, db, parentId))
      .then((list) => {
        if (!cancelled) setLevels(list);
      })
      .catch((err) => {
        console.error("No se pudo cargar la lista de niveles", err);
        if (!cancelled) setError("No se pudo cargar la lista de niveles.");
      });
    return () => {
      cancelled = true;
    };
  }, [parentId]);

  async function handleDuplicate(levelId: string) {
    if (!parentId) return;
    setBusyId(levelId);
    setError(null);
    try {
      const { db, firestore } = await getFirebase();
      await duplicateLevel(firestore, db, parentId, levelId);
      await reload();
    } catch (err) {
      console.error("No se pudo duplicar el nivel", err);
      setError("No se pudo duplicar el nivel.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(levelId: string, name: string) {
    if (!parentId) return;
    if (!window.confirm(`¿Borrar "${name}"? Esta acción no se puede deshacer.`)) return;
    setBusyId(levelId);
    setError(null);
    try {
      const { db, firestore } = await getFirebase();
      await deleteLevel(firestore, db, parentId, levelId);
      // Sincronización nodo↔nivel (Fase 17, §4.3): borrar un nivel borra su
      // nodo del mapa y los enlaces que lo tocan — nunca queda un nodo
      // "fantasma" apuntando a un nivel que ya no existe.
      const world = await ensureWorld(firestore, db, parentId, parentId);
      if (world.nodes.some((n) => n.levelId === levelId)) {
        await saveWorld(firestore, db, parentId, {
          ...world,
          nodes: world.nodes.filter((n) => n.levelId !== levelId),
          links: world.links.filter((l) => l.fromLevelId !== levelId && l.toLevelId !== levelId),
        });
      }
      await reload();
    } catch (err) {
      console.error("No se pudo borrar el nivel", err);
      setError("No se pudo borrar el nivel.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSeedExample() {
    if (!parentId) return;
    setSeeding(true);
    setError(null);
    try {
      const { db, firestore } = await getFirebase();
      await seedExampleWorld(firestore, db, parentId, parentId);
      await reload();
    } catch (err) {
      console.error("No se pudo cargar el mundo de ejemplo", err);
      setError("No se pudo cargar el mundo de ejemplo.");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Editor de niveles</h1>
          <p className="mt-1 text-sm text-slate-400">Crea escenarios nuevos de Math Quest sin tocar código.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tooltip content="Historia del mundo, relaciones entre niveles y reglas generales." side="bottom" wide>
            <Link
              href="/panel/editor/mundo"
              className="flex min-h-11 items-center gap-1.5 rounded-xl border border-indigo-500/25 bg-slate-800/60 px-4 text-sm font-bold text-slate-100 hover:bg-slate-800"
            >
              <Map className="size-4" aria-hidden="true" />
              Mundo
            </Link>
          </Tooltip>
          <Tooltip content="Crea un nivel vacío desde cero." side="bottom">
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex min-h-11 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 text-sm font-bold text-white transition-colors hover:brightness-110"
            >
              <Plus className="size-4" aria-hidden="true" />
              Nuevo nivel
            </button>
          </Tooltip>
        </div>
      </header>

      {error && (
        <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      {creating && (
        <CreateLevelForm
          onCancel={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false);
            await reload();
          }}
        />
      )}

      <SectionCard title="Tus niveles" icon={<Wand2 className="size-4" aria-hidden="true" />}>
        {levels === null ? (
          <SkeletonRows rows={3} />
        ) : levels.length === 0 ? (
          <div className="space-y-3">
            <EmptyState
              icon={<Wand2 className="size-5" aria-hidden="true" />}
              title="Todavía no creaste ningún nivel"
              text="Usa «Nuevo nivel» para empezar uno — queda listo para jugar desde el minuto cero."
            />
            <div className="flex justify-center">
              <Tooltip content="Crea Ciudad Central como un nivel real, editable, para partir de algo en vez de un lienzo en blanco." side="top" wide>
                <button
                  type="button"
                  onClick={() => void handleSeedExample()}
                  disabled={seeding}
                  className="flex min-h-9 items-center gap-1.5 rounded-lg border border-indigo-500/25 bg-slate-800/60 px-3 text-xs font-bold text-slate-100 hover:bg-slate-800 disabled:opacity-40"
                >
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  {seeding ? "Cargando…" : "Cargar mundo de ejemplo"}
                </button>
              </Tooltip>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {levels.map((level) => (
              <li key={level.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{level.name}</p>
                  <p className="text-xs text-slate-400">
                    versión {level.version} · actualizado {new Date(level.updatedAt).toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Tooltip content="Abre el editor visual de este nivel." side="top">
                    <Link
                      href={`/panel/editor/${level.id}`}
                      className="flex min-h-9 items-center gap-1.5 rounded-lg border border-indigo-500/25 bg-slate-800/60 px-3 text-xs font-bold text-slate-100 hover:bg-slate-800"
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                      Abrir
                    </Link>
                  </Tooltip>
                  {selectedChild && (
                    <Tooltip content={`Juega este nivel tal como lo vería ${selectedChild.name}.`} side="top" wide>
                      <Link
                        href={`/jugar/${selectedChild.id}/nivel/${level.id}`}
                        className="flex min-h-9 items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-950/40 px-3 text-xs font-bold text-emerald-200 hover:bg-emerald-950/70"
                      >
                        <Play className="size-3.5" aria-hidden="true" />
                        Jugar con {selectedChild.name}
                      </Link>
                    </Tooltip>
                  )}
                  <Tooltip content="Crea una copia independiente de este nivel." side="top">
                    <button
                      type="button"
                      disabled={busyId === level.id}
                      onClick={() => handleDuplicate(level.id)}
                      className="flex min-h-9 items-center gap-1.5 rounded-lg border border-indigo-500/25 bg-slate-800/60 px-3 text-xs font-bold text-slate-100 hover:bg-slate-800 disabled:opacity-40"
                    >
                      <Copy className="size-3.5" aria-hidden="true" />
                      Duplicar
                    </button>
                  </Tooltip>
                  <Tooltip content="Borra este nivel de forma permanente." side="top">
                    <button
                      type="button"
                      disabled={busyId === level.id}
                      onClick={() => handleDelete(level.id, level.name)}
                      className="flex min-h-9 items-center gap-1.5 rounded-lg border border-rose-500/25 bg-rose-950/30 px-3 text-xs font-bold text-rose-200 hover:bg-rose-950/60 disabled:opacity-40"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Borrar
                    </button>
                  </Tooltip>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function CreateLevelForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void | Promise<void> }) {
  const { parentId } = useFamily();
  const [name, setName] = useState("");
  const [background, setBackground] = useState<ResolvedBackgroundSelection | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parentId || name.trim() === "" || !background) return;
    setSaving(true);
    setError(null);
    try {
      const { db, firestore } = await getFirebase();
      const level = await createLevel(firestore, db, parentId, name.trim(), {
        src: background.src,
        width: background.width,
        height: background.height,
        alt: background.alt,
        projection: "flat",
      });
      // Sincronización nodo↔nivel (Fase 17, §4.3): todo nivel nuevo aparece
      // solo en el mapa del mundo, en la primera celda libre; el primero que
      // crea el padre queda marcado como punto de entrada.
      const world = await ensureWorld(firestore, db, parentId, parentId);
      const node: WorldNode = {
        levelId: level.id,
        chapterId: null,
        position: nextGridPosition(world.nodes.length),
        label: level.name,
        icon: "🧩",
        unlock: { kind: "always" },
        isStart: world.nodes.length === 0,
      };
      await saveWorld(firestore, db, parentId, { ...world, nodes: [...world.nodes, node] });
      await onCreated();
    } catch (err) {
      console.error("No se pudo crear el nivel", err);
      setError("No se pudo crear el nivel.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="family-panel space-y-4 rounded-2xl p-4 sm:p-5">
      <div>
        <label htmlFor="nombre-nivel" className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
          Nombre del nivel
        </label>
        <input
          id="nombre-nivel"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Mi nivel nuevo"
          className="w-full rounded-xl border border-indigo-500/25 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
        />
      </div>

      {parentId && <BackgroundPicker parentId={parentId} for="scene" value={background?.src ?? ""} onChange={setBackground} autoSelectDefault />}

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || name.trim() === "" || !background}
          className="flex min-h-11 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 text-sm font-bold text-white disabled:opacity-40"
        >
          {saving ? "Creando…" : "Crear nivel"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex min-h-11 items-center rounded-xl bg-slate-800 px-4 text-sm font-bold text-slate-200 hover:bg-slate-700"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
