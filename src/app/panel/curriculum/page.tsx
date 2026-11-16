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

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function remove(id: string) {
    if (!parentId) return;
    const { db, firestore } = await getFirebase();
    await deleteCustomModuleDoc(firestore, db, parentId, id);
    setModules((m) => (m ? m.filter((d) => d.id !== id) : m));
    setConfirmDeleteId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Mi currícula</h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">Crea tus propios ejercicios, con la misma lógica que los del juego.</p>
        </div>
      </div>

      {creating ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <input
            type="text"
            autoFocus
            placeholder="Nombre del módulo (p. ej. Restas hasta 20)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void createModule()}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-600 focus:bg-white"
          />
          <button type="button" onClick={() => void createModule()} className="min-h-10 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Crear
          </button>
          <button type="button" onClick={() => setCreating(false)} className="min-h-10 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <Plus className="size-4" aria-hidden="true" /> Crear módulo
        </button>
      )}

      {modules === null ? (
        <p role="status" className="text-sm text-slate-500">
          Cargando…
        </p>
      ) : modules.length === 0 ? (
        <p className="text-sm text-slate-500">Todavía no creaste ningún módulo personalizado.</p>
      ) : (
        <ul className="space-y-2">
          {modules.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <span className="text-2xl">{m.emoji || "✨"}</span>
              <div className="min-w-0 flex-1">
                <Link href={`/panel/curriculum/${m.id}`} className="font-semibold text-slate-900 hover:text-indigo-600">
                  {m.label || "(sin nombre)"}
                </Link>
                <p className="truncate text-xs text-slate-500">{getStrand(m.strandSlug)?.label ?? m.strandSlug}</p>
              </div>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${m.published ? "border-emerald-200/60 bg-emerald-50 text-emerald-700" : "border-amber-200/60 bg-amber-50 text-amber-700"}`}>
                {m.published ? "Publicado" : "Borrador"}
              </span>
              {confirmDeleteId === m.id ? (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => void remove(m.id)} className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700">
                    Confirmar borrado
                  </button>
                  <button type="button" onClick={() => setConfirmDeleteId(null)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                    Cancelar
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmDeleteId(m.id)} className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Borrar ${m.label}`}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
