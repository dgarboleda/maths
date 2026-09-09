import type { Firestore } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";
import type { LevelDefinition } from "../schema";
import { prepareForFirestore } from "../serialize";
import { newAssetId } from "../ids";
import { assetStoragePath, thumbStoragePath, type AcceptedContentType, type AssetKind, type PreparedAssetUpload } from "./imageRules";

/**
 * Acceso a Storage + Firestore para la biblioteca de imágenes del Level
 * Editor — docs/asset-management-plan.md §C/§D/§E.2/§G Paso 4. Mismo estilo
 * que `levelRepository.ts`: funciones puras que reciben `storageFns`/
 * `storage`/`firestoreFns`/`db` como parámetros (nunca llaman a
 * `getFirebase()`/`getFirebaseStorage()` por su cuenta), para que ningún
 * archivo de este módulo importe `firebase/*` de forma estática.
 *
 * El archivo vive en Storage bajo `parents/{parentId}/level-assets/{id}` (ver
 * `imageRules.assetStoragePath`); su ficha vive en Firestore bajo
 * `/parents/{parentId}/levelAssets/{id}` — nombre de colección distinto a
 * propósito (camelCase, como el resto de las colecciones de Firestore de
 * este proyecto) del segmento de ruta de Storage (kebab-case, ya elegido
 * antes de esta fase por el propio SDK de Firebase para otros paths).
 *
 * El objeto de Storage es INMUTABLE (§C.1): renombrar solo toca la ficha de
 * Firestore; sustituir una imagen es subir un asset nuevo, nunca pisar uno
 * existente — storage.rules lo impide (`allow update: if false`).
 */

type FirestoreFns = typeof import("firebase/firestore");
type StorageFns = typeof import("firebase/storage");

export interface LevelAsset {
  id: string;
  label: string;
  alt: string;
  kind: AssetKind;
  storagePath: string;
  url: string;
  thumbPath: string;
  thumbUrl: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  bytes: number;
  contentType: AcceptedContentType;
  hasAlpha: boolean;
  createdAt: number;
  updatedAt: number;
}

export class AssetNotFoundError extends Error {
  assetId: string;
  constructor(assetId: string) {
    super(`La imagen "${assetId}" no existe.`);
    this.name = "AssetNotFoundError";
    this.assetId = assetId;
  }
}

function assetDocRef(firestoreFns: FirestoreFns, db: Firestore, parentId: string, assetId: string) {
  return firestoreFns.doc(db, "parents", parentId, "levelAssets", assetId);
}

/** Assets del padre, más recientes primero — para la biblioteca de `/panel/editor`. */
export async function listAssets(firestoreFns: FirestoreFns, db: Firestore, parentId: string): Promise<LevelAsset[]> {
  const { collection, getDocs, orderBy, query } = firestoreFns;
  const snap = await getDocs(query(collection(db, "parents", parentId, "levelAssets"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => d.data() as LevelAsset);
}

/**
 * Sube un asset ya procesado (`imageProcessing.prepareUpload`, Paso 5):
 * imagen → miniatura → URLs → documento de Firestore, en ese orden. Si el
 * documento falla, intenta borrar lo ya subido en `best-effort` (el error
 * que se propaga es siempre el original, no el de la limpieza) — evita
 * dejar un objeto huérfano sin ficha, aunque no lo garantiza al 100% (§G
 * riesgo R3, documentado como aceptado).
 */
export async function uploadAsset(
  storageFns: StorageFns,
  storage: FirebaseStorage,
  firestoreFns: FirestoreFns,
  db: Firestore,
  parentId: string,
  prepared: PreparedAssetUpload,
  fields: { label: string; alt: string },
  onProgress?: (fraction: number) => void,
): Promise<LevelAsset> {
  const assetId = newAssetId();
  const storagePath = assetStoragePath(parentId, assetId, prepared.contentType);
  const thumbPath = thumbStoragePath(parentId, assetId);
  const mainRef = storageFns.ref(storage, storagePath);
  const thumbRef = storageFns.ref(storage, thumbPath);

  async function cleanupBestEffort(): Promise<void> {
    await Promise.all([
      storageFns.deleteObject(mainRef).catch(() => undefined),
      storageFns.deleteObject(thumbRef).catch(() => undefined),
    ]);
  }

  try {
    await uploadWithProgress(storageFns, mainRef, prepared.blob, prepared.contentType, onProgress);
    await storageFns.uploadBytes(thumbRef, prepared.thumbBlob, { contentType: "image/webp" });
    const [url, thumbUrl] = await Promise.all([storageFns.getDownloadURL(mainRef), storageFns.getDownloadURL(thumbRef)]);

    const now = Date.now();
    const asset: LevelAsset = {
      id: assetId,
      label: fields.label,
      alt: fields.alt,
      kind: prepared.kind,
      storagePath,
      url,
      thumbPath,
      thumbUrl,
      width: prepared.width,
      height: prepared.height,
      originalWidth: prepared.originalWidth,
      originalHeight: prepared.originalHeight,
      bytes: prepared.bytes,
      contentType: prepared.contentType,
      hasAlpha: prepared.hasAlpha,
      createdAt: now,
      updatedAt: now,
    };
    await firestoreFns.setDoc(assetDocRef(firestoreFns, db, parentId, assetId), prepareForFirestore(asset));
    return asset;
  } catch (err) {
    await cleanupBestEffort();
    throw err;
  }
}

/** `uploadBytesResumable` envuelto en una promesa, reportando progreso
 *  0-1 — la única razón de no usar `uploadBytes` (más simple) para el
 *  archivo principal: es el único paso lo bastante grande (hasta ~400KB
 *  objetivo, hasta 4MB en el peor caso) como para que una barra de progreso
 *  real tenga sentido (§D, §E.2 AssetUploader). */
function uploadWithProgress(
  storageFns: StorageFns,
  ref: ReturnType<StorageFns["ref"]>,
  blob: Blob,
  contentType: AcceptedContentType,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const task = storageFns.uploadBytesResumable(ref, blob, { contentType });
    task.on(
      "state_changed",
      (snapshot) => onProgress?.(snapshot.totalBytes === 0 ? 0 : snapshot.bytesTransferred / snapshot.totalBytes),
      (err) => reject(err),
      () => resolve(),
    );
  });
}

/** Solo toca la ficha (`label`/`alt`/`updatedAt`) — nunca `storagePath`/`url`,
 *  el objeto de Storage es inmutable (§C.1). */
export async function renameAsset(
  firestoreFns: FirestoreFns,
  db: Firestore,
  parentId: string,
  assetId: string,
  fields: Partial<Pick<LevelAsset, "label" | "alt">>,
): Promise<void> {
  await firestoreFns.updateDoc(assetDocRef(firestoreFns, db, parentId, assetId), { ...fields, updatedAt: Date.now() });
}

/** Borra imagen + miniatura + documento. El llamador es responsable de
 *  llamar antes a `findLevelsUsingAsset` y confirmar con el autor si hay
 *  niveles que lo usan (§G riesgo R4) — esta función no lo comprueba, para
 *  poder reutilizarse también en la limpieza de un asset huérfano. */
export async function deleteAsset(
  storageFns: StorageFns,
  storage: FirebaseStorage,
  firestoreFns: FirestoreFns,
  db: Firestore,
  parentId: string,
  asset: Pick<LevelAsset, "id" | "storagePath" | "thumbPath">,
): Promise<void> {
  await Promise.all([
    storageFns.deleteObject(storageFns.ref(storage, asset.storagePath)).catch((err) => {
      if ((err as { code?: string })?.code !== "storage/object-not-found") throw err;
    }),
    storageFns.deleteObject(storageFns.ref(storage, asset.thumbPath)).catch((err) => {
      if ((err as { code?: string })?.code !== "storage/object-not-found") throw err;
    }),
  ]);
  await firestoreFns.deleteDoc(assetDocRef(firestoreFns, db, parentId, asset.id));
}

/** Qué niveles del padre usan esta imagen (como fondo principal o como
 *  capa de parallax) — comparación por URL, no por id (§C.7: el nivel no
 *  guarda ningún `assetId`). Lee todos los niveles del padre, igual que ya
 *  hace `listLevels` para su propia lista. */
export async function findLevelsUsingAsset(
  firestoreFns: FirestoreFns,
  db: Firestore,
  parentId: string,
  assetUrl: string,
): Promise<{ id: string; name: string }[]> {
  const { collection, getDocs } = firestoreFns;
  const snap = await getDocs(collection(db, "parents", parentId, "levels"));
  const matches: { id: string; name: string }[] = [];
  for (const d of snap.docs) {
    const level = d.data() as LevelDefinition;
    const usesIt = level.background.src === assetUrl || (level.background.layers ?? []).some((l) => l.src === assetUrl);
    if (usesIt) matches.push({ id: d.id, name: level.name });
  }
  return matches;
}
