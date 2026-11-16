"use client";

import { useRef, useState } from "react";
import { Copy, Download, Upload } from "lucide-react";
import { getFirebase } from "@/lib/firebase";
import { exportBundle, importBundle, NothingToExportError, type ImportResult } from "@/lib/backup/backupRepository";
import { cloneBundle, type CloneResult } from "@/lib/backup/cloneBundle";
import { parseBundle } from "@/lib/backup/bundle";

type Mode = "restaurar" | "clonar";

/**
 * Respaldo del trabajo autoral — Fase 24 (docs/plan-salto-producto.md §2) +
 * clonar/compartir mundos, dejado explícitamente fuera de esa fase (§2.1) y
 * resuelto acá: "Restaurar" usa los ids originales y sobrescribe (pensado
 * para el propio respaldo de esta cuenta); "Sumar como copia nueva" genera
 * ids frescos para todo lo que trae el archivo y lo fusiona con lo que ya
 * hay, sin pisar nada — el mismo archivo exportado sirve para las dos cosas,
 * y para recibir el mundo de otra familia. Vive en Ajustes (operación de la
 * cuenta, no de un nivel en particular), no en el Editor.
 */
export function BackupPanel({ parentId }: { parentId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingMode, setPendingMode] = useState<Mode>("restaurar");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [result, setResult] = useState<
    { mode: "restaurar"; data: ImportResult } | { mode: "clonar"; data: CloneResult } | null
  >(null);

  const [pendingConfirm, setPendingConfirm] = useState<{ mode: Mode; bundle: ReturnType<typeof parseBundle> extends { ok: true; bundle: infer B } ? B : never } | null>(null);

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
    setPendingConfirm(null);

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
    setPendingConfirm({ mode: pendingMode, bundle: parsed.bundle });
  }

  async function confirmImport() {
    if (!pendingConfirm) return;
    const { mode, bundle } = pendingConfirm;
    setPendingConfirm(null);
    setImporting(true);
    try {
      const { db, firestore } = await getFirebase();
      if (mode === "restaurar") {
        setResult({ mode, data: await importBundle(firestore, db, parentId, bundle) });
      } else {
        setResult({ mode, data: await cloneBundle(firestore, db, parentId, bundle) });
      }
    } catch (err) {
      console.error(mode === "restaurar" ? "No se pudo restaurar el respaldo" : "No se pudo clonar el paquete", err);
      setErrors([mode === "restaurar" ? "No se pudo restaurar el respaldo. Intenta de nuevo." : "No se pudo sumar la copia. Intenta de nuevo."]);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Exportá una copia de tu mundo, tus niveles y tu currícula personalizada, o restaurala si algo se borró por
        error. Las imágenes no viajan en el archivo — quedan en esta cuenta, restaurar solo tiene sentido acá.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={exporting || importing}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
        >
          <Download className="size-4" aria-hidden="true" />
          {exporting ? "Exportando…" : "Exportar respaldo"}
        </button>
        <button
          type="button"
          onClick={() => {
            setPendingMode("restaurar");
            fileInputRef.current?.click();
          }}
          disabled={exporting || importing}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
        >
          <Upload className="size-4" aria-hidden="true" />
          {importing && pendingMode === "restaurar" ? "Restaurando…" : "Restaurar desde un archivo"}
        </button>
        <button
          type="button"
          onClick={() => {
            setPendingMode("clonar");
            fileInputRef.current?.click();
          }}
          disabled={exporting || importing}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
        >
          <Copy className="size-4" aria-hidden="true" />
          {importing && pendingMode === "clonar" ? "Sumando…" : "Sumar como copia nueva"}
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
      <p className="text-xs text-slate-500">
        &quot;Sumar como copia nueva&quot; también sirve para recibir el archivo exportado por otra familia: genera
        ids nuevos para todo, así que nunca pisa tu mundo actual.
      </p>

      {pendingConfirm && (
        <div role="alertdialog" aria-label="Confirmar importación" className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-medium">
            {pendingConfirm.mode === "restaurar"
              ? `Se van a sobrescribir ${pendingConfirm.bundle.levels.length} nivel(es), 1 mundo y ${pendingConfirm.bundle.customModules.length} módulo(s) personalizado(s). Lo que ya tenés y no está en este paquete no se borra. ¿Restaurar de todos modos?`
              : `Se van a sumar ${pendingConfirm.bundle.levels.length} nivel(es) nuevo(s) y ${pendingConfirm.bundle.customModules.length} módulo(s) personalizado(s) nuevo(s) a tu mundo actual, con ids nuevos — nada de lo que ya tenés se toca. ¿Sumar esta copia?`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void confirmImport()} className="min-h-9 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800">
              {pendingConfirm.mode === "restaurar" ? "Sí, restaurar" : "Sí, sumar copia"}
            </button>
            <button type="button" onClick={() => setPendingConfirm(null)} className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {errors && (
        <ul role="alert" className="list-disc space-y-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 pl-6 text-xs text-red-700">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      {result && (
        <div className="space-y-2">
          <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            {result.mode === "restaurar"
              ? `Restaurado: ${result.data.levelsRestored} nivel(es) y ${result.data.customModulesRestored} módulo(s) personalizado(s).`
              : `Sumado: ${result.data.levelsCreated} nivel(es) nuevo(s) y ${result.data.customModulesCreated} módulo(s) personalizado(s) nuevo(s).`}
          </p>
          {result.data.missingAssets.length > 0 && (
            <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <p className="font-semibold">
                {result.data.missingAssets.length} imagen(es) del paquete ya no existen en esta cuenta — los niveles que las usan van a mostrarse sin fondo hasta que subas una imagen nueva:
              </p>
              <ul className="ml-4 list-disc">
                {result.data.missingAssets.map(({ asset, usedByLevels }) => (
                  <li key={asset.id}>
                    {asset.label}
                    {usedByLevels.length > 0 && ` — usada en: ${usedByLevels.join(", ")}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.mode === "clonar" &&
            (result.data.issues.world.length > 0 || Object.values(result.data.issues.levels).some((l) => l.length > 0)) && (
              <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <p className="font-semibold">
                  La copia se sumó, pero quedaron {result.data.issues.world.length + Object.values(result.data.issues.levels).reduce((n, l) => n + l.length, 0)} pendiente(s) para revisar desde el editor (por ejemplo, más de un punto de inicio en el mapa, o un desafío sin módulo asignado).
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
