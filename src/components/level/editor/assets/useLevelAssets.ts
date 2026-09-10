"use client";

import { useCallback, useEffect, useState } from "react";
import { getFirebase, getFirebaseStorage } from "@/lib/firebase";
import { listAssets, type LevelAsset } from "@/lib/level/assets/assetRepository";

/**
 * Biblioteca de imágenes del padre — carga y recarga compartida entre
 * `BackgroundPicker` y `AssetLibrary` (docs/asset-management-plan.md §E.2).
 * Mismo patrón de carga que el resto del editor (`useLevelDoc`, `page.tsx`
 * de la lista de niveles): `getFirebase()`/`getFirebaseStorage()` perezosos,
 * `setState` solo dentro de `.then`/`.catch`.
 */
export function useLevelAssets(parentId: string | null) {
  const [assets, setAssets] = useState<LevelAsset[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!parentId) return;
    try {
      const { db, firestore } = await getFirebase();
      setAssets(await listAssets(firestore, db, parentId));
      setError(null);
    } catch (err) {
      console.error("No se pudo cargar la biblioteca de imágenes", err);
      setError("No se pudo cargar tu biblioteca de imágenes.");
    }
  }, [parentId]);

  // Carga inicial encadenada directo (mismo patrón que page.tsx de la lista
  // de niveles): el `setState` vive dentro del `.then`/`.catch`, no suelto
  // en el cuerpo del efecto — `reload` (arriba) queda para recargas
  // manuales después de subir/renombrar/borrar, no para el montaje inicial.
  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore }) => listAssets(firestore, db, parentId))
      .then((list) => {
        if (!cancelled) setAssets(list);
      })
      .catch((err) => {
        console.error("No se pudo cargar la biblioteca de imágenes", err);
        if (!cancelled) setError("No se pudo cargar tu biblioteca de imágenes.");
      });
    return () => {
      cancelled = true;
    };
  }, [parentId]);

  const totalBytes = assets?.reduce((sum, a) => sum + a.bytes, 0) ?? 0;

  return { assets, loading: assets === null, error, reload, totalBytes };
}

/** Punto único de acceso a Storage+Firestore ya resueltos, para no repetir
 *  el `Promise.all` en cada componente que sube/borra un asset. */
export async function getAssetServices() {
  const [{ db, firestore }, { storage, storageFns }] = await Promise.all([getFirebase(), getFirebaseStorage()]);
  return { db, firestore, storage, storageFns };
}
