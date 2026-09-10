"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { useFamily } from "@/components/family/FamilyProvider";
import { getFirebase } from "@/lib/firebase";
import { listCustomModuleDocs, createCustomModuleDoc, deleteCustomModuleDoc } from "@/lib/curriculum/persistence/curriculumRepository";
import { slugForLabel } from "@/lib/curriculum/defaults";
import { getStrand } from "@/lib/strands";
import type { CustomModuleDoc } from "@/lib/curriculum/customSchema";

/**
 * `/panel/curriculum` — lista de módulos personalizados (borrador y
 * publicado) — Fase 21 (docs/level-editor-plan-v2.md §8.3). Editor de
 * Currícula: crea módulos con exactamente el mismo contrato que los de
 * código (política P1, §0).
 */
export default function CurriculumListPage() {
  const { parentId } = useFamily();
  const router = useRouter();
  const [modules, setModules] = useState<CustomModuleDoc[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore }) => listCustomModuleDocs(firestore, db, parentId))
      .then((docs) => {
        if (!cancelled) setModules(docs);
      })
      .catch((err) => console.error("No se pudieron cargar los módulos personalizados", err));
    return () => {
      cancelled = true;
    };
  }, [parentId]);

  async function createModule() {
    if (!parentId || !newLabel.trim()) return;
    const existingIds = new Set((modules ?? []).map((m) => m.id));
    let id = slugForLabel(newLabel);
    let suffix = 2;
    while (existingIds.has(id)) {
      id = `${slugForLabel(newLabel)}-${suffix}`;
      suffix++;
    }
    const { db, firestore } = await getFirebase();
    const doc = await createCustomModuleDoc(firestore, db, parentId, parentId, id);
    router.push(`/panel/curriculum/${doc.id}`);
  }

  async function remove(id: string) {
    if (!parentId) return;
    if (!window.confirm("¿Borrar este módulo personalizado? El progreso de los hijos que ya lo jugaron no se borra.")) return;
    const { db, firestore } = await getFirebase();
    await deleteCustomModuleDoc(firestore, db, parentId, id);
    setModules((m) => (m ? m.filter((d) => d.id !== id) : m));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Mi currícula</h1>
          <p className="text-sm text-slate-400">Crea tus propios ejercicios, con la misma lógica que los del juego.</p>
        </div>
      </div>

      {creating ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-500/20 bg-slate-900/40 p-3">
          <input
            type="text"
            autoFocus
            placeholder="Nombre del módulo (p. ej. Restas hasta 20)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void createModule()}
            className="min-w-0 flex-1 rounded-md border border-indigo-500/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/50"
          />
          <button type="button" onClick={() => void createModule()} className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-bold text-white hover:bg-cyan-500">
            Crear
          </button>
          <button type="button" onClick={() => setCreating(false)} className="rounded-md px-3 py-2 text-sm font-bold text-slate-400 hover:text-slate-200">
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white"
        >
          <Plus className="size-4" aria-hidden="true" /> Crear módulo
        </button>
      )}

      {modules === null ? (
        <p role="status" className="text-sm text-slate-400">
          Cargando…
        </p>
      ) : modules.length === 0 ? (
        <p className="text-sm text-slate-400">Todavía no creaste ningún módulo personalizado.</p>
      ) : (
        <ul className="space-y-2">
          {modules.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-xl border border-indigo-500/20 bg-slate-900/40 p-3">
              <span className="text-2xl">{m.emoji || "✨"}</span>
              <div className="min-w-0 flex-1">
                <Link href={`/panel/curriculum/${m.id}`} className="font-bold text-slate-100 hover:text-cyan-300">
                  {m.label || "(sin nombre)"}
                </Link>
                <p className="truncate text-xs text-slate-400">{getStrand(m.strandSlug)?.label ?? m.strandSlug}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${m.published ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                {m.published ? "Publicado" : "Borrador"}
              </span>
              <button type="button" onClick={() => void remove(m.id)} className="rounded-md p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400" aria-label={`Borrar ${m.label}`}>
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
