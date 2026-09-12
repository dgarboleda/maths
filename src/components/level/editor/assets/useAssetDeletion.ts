"use client";

import { useRef, useState } from "react";
import { deleteAsset, findLevelsUsingAsset, type LevelAsset } from "@/lib/level/assets/assetRepository";
import { getAssetServices } from "./useLevelAssets";

export interface PendingAssetDeletion {
  asset: LevelAsset;
  usedBy: { id: string; name: string }[];
}

/**
 * Borrado de un asset con confirmación — docs/asset-management-plan.md §G
 * riesgo R4: antes de borrar, `findLevelsUsingAsset` comprueba qué niveles
 * la usan (comparación por URL contra `background.src`/`layers[].src`, no
 * por id); si hay alguno, la confirmación los lista por nombre y exige una
 * segunda confirmación explícita ("Borrar de todas formas") en vez de un
 * `window.confirm` genérico.
 *
 * Extraído de `AssetLibrary.tsx` (donde nació) para que `BackgroundPicker`
 * (el selector embebido en "Nuevo nivel"/cambiar fondo) ofrezca el mismo
 * borrado sin duplicar el diálogo ni la lógica de confirmación.
 */
export function useAssetDeletion(parentId: string, onDeleted: (assetId: string) => void) {
  const [pendingDelete, setPendingDelete] = useState<PendingAssetDeletion | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  async function requestDelete(asset: LevelAsset, triggerEl?: HTMLElement | null) {
    setActionError(null);
    setBusyId(asset.id);
    returnFocusRef.current = triggerEl ?? null;
    try {
      const { db, firestore } = await getAssetServices();
      const usedBy = await findLevelsUsingAsset(firestore, db, parentId, asset.url);
      setPendingDelete({ asset, usedBy });
    } catch (err) {
      console.error("No se pudo comprobar en qué niveles se usa la imagen", err);
      setActionError("No se pudo comprobar si esta imagen está en uso.");
    } finally {
      setBusyId(null);
    }
  }

  function cancelDelete() {
    setPendingDelete(null);
    returnFocusRef.current?.focus();
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { asset } = pendingDelete;
    setBusyId(asset.id);
    try {
      const { db, firestore, storage, storageFns } = await getAssetServices();
      await deleteAsset(storageFns, storage, firestore, db, parentId, asset);
      setPendingDelete(null);
      onDeleted(asset.id);
    } catch (err) {
      console.error("No se pudo borrar la imagen", err);
      setActionError("No se pudo borrar la imagen.");
    } finally {
      setBusyId(null);
      returnFocusRef.current?.focus();
    }
  }

  return { pendingDelete, busyId, actionError, requestDelete, confirmDelete, cancelDelete };
}
