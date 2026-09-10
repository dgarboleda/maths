import { describe, expect, test } from "vitest";
import { deleteApp, initializeApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import * as firestoreFns from "firebase/firestore";
import * as storageFns from "firebase/storage";
import { deleteAsset, findLevelsUsingAsset, listAssets, renameAsset, uploadAsset } from "@/lib/level/assets/assetRepository";
import { createLevel } from "@/lib/level/persistence/levelRepository";
import type { LevelBackground } from "@/lib/level/schema";
import type { PreparedAssetUpload } from "@/lib/level/assets/imageRules";

/**
 * Persistencia de la biblioteca de imágenes contra los emuladores reales de
 * Firestore + Storage — docs/asset-management-plan.md §G Paso 4, §H.3.
 * Corre bajo `npm run test:integration` (ver `editor-persistencia.test.ts`
 * para el mismo criterio): sin navegador, el build "node" de
 * `firebase/storage` usa `fetch` en vez de `XMLHttpRequest`, así que no hace
 * falta uno para esto. El flujo de subida real por UI (con
 * `createImageBitmap`/`<canvas>` de verdad) sigue necesitando un navegador y
 * quedó fuera de los recorridos núcleo de `e2e/` — esta suite es la que
 * sigue cubriendo `assetRepository` y las reglas de Storage/Firestore.
 */

const BACKGROUND: LevelBackground = {
  src: "/illustrations/city-central.webp",
  width: 1600,
  height: 907,
  alt: "Fondo de prueba",
  projection: "flat",
};

function fakeUpload(overrides: Partial<PreparedAssetUpload> = {}): PreparedAssetUpload {
  const blob = new Blob(["contenido-de-prueba"], { type: "image/webp" });
  return {
    kind: "scene",
    blob,
    thumbBlob: new Blob(["miniatura-de-prueba"], { type: "image/webp" }),
    contentType: "image/webp",
    width: 1600,
    height: 900,
    originalWidth: 1600,
    originalHeight: 900,
    bytes: blob.size,
    hasAlpha: false,
    ...overrides,
  };
}

async function nuevoPadre() {
  const app = initializeApp({ apiKey: "demo-api-key", projectId: "demo-numerario", storageBucket: "demo-numerario.appspot.com" }, `editor-assets-${crypto.randomUUID()}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = firestoreFns.getFirestore(app);
  firestoreFns.connectFirestoreEmulator(db, "127.0.0.1", 8080);
  const storage = storageFns.getStorage(app);
  storageFns.connectStorageEmulator(storage, "127.0.0.1", 9199);
  const { user } = await createUserWithEmailAndPassword(auth, `padre-${crypto.randomUUID()}@ejemplo.test`, "secreto123");
  return { app, db, storage, parentId: user.uid };
}

describe("persistencia — assetRepository", () => {
  test("subir crea el objeto, la miniatura y el documento de Firestore; listar los devuelve ordenados", async () => {
    const { app, db, storage, parentId } = await nuevoPadre();
    try {
      const a = await uploadAsset(storageFns, storage, firestoreFns, db, parentId, fakeUpload(), { label: "Primera", alt: "alt 1" });
      const b = await uploadAsset(storageFns, storage, firestoreFns, db, parentId, fakeUpload({ kind: "layer" }), { label: "Segunda", alt: "alt 2" });

      expect(a.url).toContain(a.storagePath.split("/").pop());
      expect(a.thumbUrl).toBeTruthy();
      expect(a.kind).toBe("scene");
      expect(b.kind).toBe("layer");

      const assets = await listAssets(firestoreFns, db, parentId);
      expect(assets.map((x) => x.id)).toEqual([b.id, a.id]); // más reciente primero
    } finally {
      await deleteApp(app);
    }
  });

  test("renombrar cambia solo label/alt/updatedAt — nunca storagePath ni url", async () => {
    const { app, db, storage, parentId } = await nuevoPadre();
    try {
      const asset = await uploadAsset(storageFns, storage, firestoreFns, db, parentId, fakeUpload(), { label: "Original", alt: "alt" });
      await renameAsset(firestoreFns, db, parentId, asset.id, { label: "Renombrada" });

      const [reloaded] = await listAssets(firestoreFns, db, parentId);
      expect(reloaded.label).toBe("Renombrada");
      expect(reloaded.storagePath).toBe(asset.storagePath);
      expect(reloaded.url).toBe(asset.url);
      expect(reloaded.updatedAt).toBeGreaterThanOrEqual(asset.createdAt);
    } finally {
      await deleteApp(app);
    }
  });

  test("borrar elimina objeto, miniatura y documento", async () => {
    const { app, db, storage, parentId } = await nuevoPadre();
    try {
      const asset = await uploadAsset(storageFns, storage, firestoreFns, db, parentId, fakeUpload(), { label: "A borrar", alt: "alt" });
      await deleteAsset(storageFns, storage, firestoreFns, db, parentId, asset);

      expect(await listAssets(firestoreFns, db, parentId)).toEqual([]);
      await expect(storageFns.getDownloadURL(storageFns.ref(storage, asset.storagePath))).rejects.toMatchObject({ code: "storage/object-not-found" });
    } finally {
      await deleteApp(app);
    }
  });

  test("inmutabilidad: un segundo uploadBytes al mismo storagePath falla (storage/unauthorized)", async () => {
    const { app, db, storage, parentId } = await nuevoPadre();
    try {
      const asset = await uploadAsset(storageFns, storage, firestoreFns, db, parentId, fakeUpload(), { label: "Fija", alt: "alt" });
      const sameRef = storageFns.ref(storage, asset.storagePath);
      await expect(storageFns.uploadBytes(sameRef, new Blob(["otro-contenido"], { type: "image/webp" }))).rejects.toMatchObject({
        code: "storage/unauthorized",
      });
    } finally {
      await deleteApp(app);
    }
  });

  test("aislamiento: un segundo padre no puede listar ni leer los assets del primero", async () => {
    const a = await nuevoPadre();
    const b = await nuevoPadre();
    try {
      const asset = await uploadAsset(storageFns, a.storage, firestoreFns, a.db, a.parentId, fakeUpload(), { label: "De A", alt: "alt" });

      // Firestore: b lee la colección de a con su propia sesión.
      await expect(firestoreFns.getDocs(firestoreFns.collection(b.db, "parents", a.parentId, "levelAssets"))).rejects.toMatchObject({
        code: "permission-denied",
      });

      // Storage: b intenta leer el objeto de a por SDK.
      await expect(storageFns.getDownloadURL(storageFns.ref(b.storage, asset.storagePath))).rejects.toMatchObject({
        code: "storage/unauthorized",
      });
    } finally {
      await deleteApp(a.app);
      await deleteApp(b.app);
    }
  });

  test("reglas de tamaño/tipo: un blob de 5MB o un image/gif fallan por SDK, saltándose la UI", async () => {
    const { app, storage, parentId } = await nuevoPadre();
    try {
      const tooBig = new Blob([new Uint8Array(5 * 1024 * 1024)], { type: "image/webp" });
      await expect(
        storageFns.uploadBytes(storageFns.ref(storage, `parents/${parentId}/level-assets/directo.webp`), tooBig),
      ).rejects.toMatchObject({ code: "storage/unauthorized" });

      const wrongType = new Blob(["gif falso"], { type: "image/gif" });
      await expect(
        storageFns.uploadBytes(storageFns.ref(storage, `parents/${parentId}/level-assets/directo2.gif`), wrongType, { contentType: "image/gif" }),
      ).rejects.toMatchObject({ code: "storage/unauthorized" });
    } finally {
      await deleteApp(app);
    }
  });

  test("findLevelsUsingAsset: encuentra el nivel que usa la imagen como fondo, ninguno si no la usa", async () => {
    const { app, db, storage, parentId } = await nuevoPadre();
    try {
      const asset = await uploadAsset(storageFns, storage, firestoreFns, db, parentId, fakeUpload(), { label: "Usada", alt: "alt" });
      const unused = await uploadAsset(storageFns, storage, firestoreFns, db, parentId, fakeUpload(), { label: "Sin usar", alt: "alt" });

      await createLevel(firestoreFns, db, parentId, "Nivel con fondo subido", { ...BACKGROUND, src: asset.url });

      const usedBy = await findLevelsUsingAsset(firestoreFns, db, parentId, asset.url);
      expect(usedBy).toHaveLength(1);
      expect(usedBy[0].name).toBe("Nivel con fondo subido");

      expect(await findLevelsUsingAsset(firestoreFns, db, parentId, unused.url)).toEqual([]);
    } finally {
      await deleteApp(app);
    }
  });
});
