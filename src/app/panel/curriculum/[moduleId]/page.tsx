"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CircleAlert, TriangleAlert } from "lucide-react";
import { useFamily } from "@/components/family/FamilyProvider";
import { getFirebase } from "@/lib/firebase";
import { allModules } from "@/lib/curriculum";
import { getCustomModuleDoc, saveCustomModuleDoc } from "@/lib/curriculum/persistence/curriculumRepository";
import { validateCustomModule } from "@/lib/curriculum/validateCustomModule";
import type { CustomModuleDoc } from "@/lib/curriculum/customSchema";
import { DatosTab } from "@/components/curriculum-editor/DatosTab";
import { GeneratorTab } from "@/components/curriculum-editor/GeneratorTab";
import { ConceptoTab } from "@/components/curriculum-editor/ConceptoTab";
import { ExamplesTab } from "@/components/curriculum-editor/ExamplesTab";

const TABS = [
  { id: "datos", label: "Datos" },
  { id: "generador", label: "Generador" },
  { id: "concepto", label: "Concepto" },
  { id: "ejemplos", label: "Ejemplos" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const SAVE_LABEL: Record<string, string> = { idle: "", saving: "Guardando…", saved: "Guardado ✓", error: "Error al guardar" };

/**
 * Editor de un módulo personalizado — Fase 21 (docs/level-editor-plan-v2.md
 * §8.3). Cuatro pestañas sobre un único `CustomModuleDoc`: sin versionado
 * ni deshacer/rehacer (superficie mucho más chica que un nivel) — un botón
 * "Guardar" explícito alcanza, igual que el Editor de Mundo.
 */
export default function CurriculumModuleEditorPage() {
  const { parentId } = useFamily();
  const router = useRouter();
  const params = useParams<{ moduleId: string }>();
  const [doc, setDoc] = useState<CustomModuleDoc | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("datos");

  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore }) => getCustomModuleDoc(firestore, db, parentId, params.moduleId))
      .then((loaded) => {
        if (cancelled) return;
        if (loaded) setDoc(loaded);
        else setNotFound(true);
      })
      .catch((err) => console.error("No se pudo cargar el módulo", err));
    return () => {
      cancelled = true;
    };
  }, [parentId, params.moduleId]);

  function update(next: CustomModuleDoc) {
    setDoc(next);
    setDirty(true);
  }

  async function saveNow() {
    if (!doc || !parentId) return;
    setSaveState("saving");
    setSaveError(null);
    try {
      const { db, firestore } = await getFirebase();
      const saved = await saveCustomModuleDoc(firestore, db, parentId, doc);
      setDoc(saved);
      setDirty(false);
      setSaveState("saved");
      window.setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
      setSaveState("error");
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
  }, [doc]);

  if (notFound) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-slate-950 text-center">
        <p className="text-slate-400">No encontré ese módulo.</p>
        <Link href="/panel/curriculum" className="text-sm text-cyan-300 underline underline-offset-2">
          Volver a Mi currícula
        </Link>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex h-dvh items-center justify-center bg-slate-950">
        <p role="status" className="text-indigo-200">
          Cargando el módulo…
        </p>
      </div>
    );
  }

  const otherModules = allModules().filter((m) => m.id !== doc.id);
  const issues = validateCustomModule(doc, [doc.id]);
  const errorCount = issues.filter((i) => i.severity === "error").length;

  return (
    <div className="flex h-dvh flex-col bg-slate-950">
      <header className="flex min-h-14 flex-wrap items-center gap-3 border-b border-indigo-500/20 bg-slate-900/60 px-3 sm:px-4">
        <button type="button" onClick={() => router.push("/panel/curriculum")} className="flex items-center gap-1.5 text-sm font-bold text-slate-300 hover:text-white">
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">{doc.label || "Módulo"}</span>
        </button>

        <nav aria-label="Secciones del módulo" className="flex gap-1">
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
            <span className="flex items-center gap-1 text-xs font-bold text-rose-300">
              <CircleAlert className="size-3.5" aria-hidden="true" />
              {errorCount} {errorCount === 1 ? "problema" : "problemas"}
            </span>
          )}
          <span role="status" className="hidden text-xs font-semibold text-slate-400 sm:inline">
            {SAVE_LABEL[saveState]}
          </span>
          <button
            type="button"
            onClick={() => void saveNow()}
            disabled={saveState === "saving" || !dirty}
            className="flex min-h-9 items-center rounded-lg border border-indigo-500/25 bg-slate-800/60 px-3 text-xs font-bold text-slate-100 hover:bg-slate-800 disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </header>

      {saveState === "error" && saveError && (
        <p role="alert" className="border-b border-rose-500/30 bg-rose-950/40 px-4 py-2 text-xs text-rose-200">
          {saveError}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "datos" && <DatosTab doc={doc} allOtherModules={otherModules} onChange={update} />}
        {tab === "generador" && <GeneratorTab generator={doc.generator} moduleId={doc.id} onChange={(generator) => update({ ...doc, generator })} />}
        {tab === "concepto" && <ConceptoTab concept={doc.concept} onChange={(concept) => update({ ...doc, concept })} />}
        {tab === "ejemplos" && <ExamplesTab examples={doc.examples} generator={doc.generator} onChange={(examples) => update({ ...doc, examples })} />}
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
    </div>
  );
}
