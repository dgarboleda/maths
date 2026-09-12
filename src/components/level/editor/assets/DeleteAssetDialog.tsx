"use client";

import type { PendingAssetDeletion } from "./useAssetDeletion";

/**
 * Confirmación de borrado de un asset — docs/asset-management-plan.md §G
 * riesgo R4. Extraído de `AssetLibrary.tsx`, compartido con
 * `BackgroundPicker`: mismo texto, mismas clases, un solo lugar donde
 * mantenerlos.
 */
export function DeleteAssetDialog({
  pendingDelete,
  onCancel,
  onConfirm,
}: {
  pendingDelete: PendingAssetDeletion;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4">
      <div role="alertdialog" aria-modal="true" aria-labelledby="borrar-asset-titulo" className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-slate-900 p-5">
        <h2 id="borrar-asset-titulo" className="text-sm font-bold text-rose-200">
          ¿Borrar &quot;{pendingDelete.asset.label}&quot;?
        </h2>
        {pendingDelete.usedBy.length > 0 ? (
          <>
            <p className="mt-2 text-xs leading-relaxed text-amber-200">
              Esta imagen se usa en {pendingDelete.usedBy.length === 1 ? "este nivel" : "estos niveles"}:
            </p>
            <ul className="mt-1 list-disc pl-5 text-xs text-slate-300">
              {pendingDelete.usedBy.map((l) => (
                <li key={l.id}>{l.name}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">Si la borrás, esos niveles se quedan sin esa imagen.</p>
          </>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-slate-300">Esta acción no se puede deshacer.</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-500">
            Borrar {pendingDelete.usedBy.length > 0 ? "de todas formas" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
