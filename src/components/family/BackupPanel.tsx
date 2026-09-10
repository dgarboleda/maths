"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { getFirebase } from "@/lib/firebase";
import { exportBundle, importBundle, NothingToExportError, type ImportResult } from "@/lib/backup/backupRepository";
import { parseBundle } from "@/lib/backup/bundle";

/**
 * Respaldo del trabajo autoral — Fase 24 (docs/plan-salto-producto.md §2).
 * v1 "solo restaurar" (§2.1): exporta todo, importa con los ids originales
 * sobrescribiendo — nunca borra lo que ya está en la cuenta y no viene en
 * el paquete. Vive en Ajustes (operación de la cuenta, no de un nivel en
 * particular), no en el Editor.
 */
export function BackupPanel({ parentId }: { parentId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleExport() {
    setExporting(true);
    setErrors(null);
    setResult(null);
    try {
      const { db, firestore } = await getFirebase();
      const bundle = await exportBundle(firestore, db, parentId);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `math-quest-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("No se pudo exportar el respaldo", err);
      setErrors([err instanceof NothingToExportError ? err.message : "No se pudo exportar el respaldo. Intenta de nuevo."]);
    } finally {
      setExporting(false);
    }
  }

  async function handleFileChosen(file: File) {
    setErrors(null);
    setResult(null);

    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      setErrors(["El archivo no es JSON válido."]);
      return;
    }

    const parsed = parseBundle(raw);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    const { bundle } = parsed;

    // Confirmación explícita (§2.5 punto 4): restaurar sobrescribe.
    const confirmed = window.confirm(
      `Se van a sobrescribir ${bundle.levels.length} nivel(es), 1 mundo y ${bundle.customModules.length} módulo(s) personalizado(s). Lo que ya tenés y no está en este paquete no se borra. ¿Restaurar de todos modos?`,
    );
    if (!confirmed) return;

    setImporting(true);
    try {
      const { db, firestore } = await getFirebase();
      setResult(await importBundle(firestore, db, parentId, bundle));
    } catch (err) {
      console.error("No se pudo restaurar el respaldo", err);
      setErrors(["No se pudo restaurar el respaldo. Intenta de nuevo."]);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        Exportá una copia de tu mundo, tus niveles y tu currícula personalizada, o restaurala si algo se borró por
        error. Las imágenes no viajan en el archivo — quedan en esta cuenta, restaurar solo tiene sentido acá.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={exporting || importing}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-indigo-500/25 bg-slate-800/60 px-4 text-sm font-bold text-slate-100 transition-colors hover:bg-slate-800 disabled:opacity-40"
        >
          <Download className="size-4" aria-hidden="true" />
          {exporting ? "Exportando…" : "Exportar respaldo"}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={exporting || importing}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-indigo-500/25 bg-slate-800/60 px-4 text-sm font-bold text-slate-100 transition-colors hover:bg-slate-800 disabled:opacity-40"
        >
          <Upload className="size-4" aria-hidden="true" />
          {importing ? "Restaurando…" : "Restaurar desde un archivo"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="sr-only"
          aria-label="Elegí un archivo de respaldo"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleFileChosen(file);
          }}
        />
      </div>

      {errors && (
        <ul role="alert" className="list-disc space-y-1 rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 pl-6 text-xs text-rose-200">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      {result && (
        <div className="space-y-2">
          <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-xs font-bold text-emerald-200">
            Restaurado: {result.levelsRestored} nivel(es) y {result.customModulesRestored} módulo(s) personalizado(s).
          </p>
          {result.missingAssets.length > 0 && (
            <div role="alert" className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
              <p className="font-bold">
                {result.missingAssets.length} imagen(es) del paquete ya no existen en esta cuenta — los niveles que las usan van a mostrarse sin fondo hasta que subas una imagen nueva:
              </p>
              <ul className="ml-4 list-disc">
                {result.missingAssets.map(({ asset, usedByLevels }) => (
                  <li key={asset.id}>
                    {asset.label}
                    {usedByLevels.length > 0 && ` — usada en: ${usedByLevels.join(", ")}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
