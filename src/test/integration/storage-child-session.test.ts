import { describe, expect, test } from "vitest";
import { deleteApp, initializeApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithCustomToken } from "firebase/auth";
import { connectFirestoreEmulator, deleteDoc, doc, getFirestore, setDoc } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { connectStorageEmulator, getBytes, getStorage, ref, uploadBytes } from "firebase/storage";

function childToken(parentId: string, childId: string, sessionVersion: number): string {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  return `${part({ alg: "none", typ: "JWT" })}.${part({ iss: "test@example.com", sub: "test@example.com", aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit", iat: now, exp: now + 3600, uid: `child:${parentId}:${childId}`, claims: { role: "child", parentId, childId, sessionVersion } })}.`;
}

describe("Storage: acceso infantil y revocación", () => {
  test("la sesión vigente lee el archivo y deja de hacerlo tras cambiar el PIN", async () => {
    const options = { apiKey: "demo-api-key", projectId: "demo-numerario", storageBucket: "demo-numerario.appspot.com" };
    const parentApp = initializeApp(options, `storage-parent-${crypto.randomUUID()}`);
    const childApp = initializeApp(options, `storage-child-${crypto.randomUUID()}`);
    try {
      const parentAuth = getAuth(parentApp);
      connectAuthEmulator(parentAuth, "http://127.0.0.1:9099", { disableWarnings: true });
      const childAuth = getAuth(childApp);
      connectAuthEmulator(childAuth, "http://127.0.0.1:9099", { disableWarnings: true });
      const db = getFirestore(parentApp);
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
      const functions = getFunctions(parentApp);
      connectFunctionsEmulator(functions, "127.0.0.1", 5001);
      const parentStorage = getStorage(parentApp);
      const childStorage = getStorage(childApp);
      connectStorageEmulator(parentStorage, "127.0.0.1", 9199);
      connectStorageEmulator(childStorage, "127.0.0.1", 9199);
      const parent = await createUserWithEmailAndPassword(parentAuth, `storage-${crypto.randomUUID()}@ejemplo.test`, "secreto123");
      const parentId = parent.user.uid;
      const childId = crypto.randomUUID();
      await setDoc(doc(db, "parents", parentId, "children", childId), { name: "Prueba" });
      const setPin = httpsCallable(functions, "setChildPin");
      await setPin({ parentId, childId, pin: "1234" });
      const path = `parents/${parentId}/level-assets/test.png`;
      await uploadBytes(ref(parentStorage, path), new Uint8Array([1, 2, 3]), { contentType: "image/png" });
      await signInWithCustomToken(childAuth, childToken(parentId, childId, 1));
      expect(new Uint8Array(await getBytes(ref(childStorage, path)))).toEqual(new Uint8Array([1, 2, 3]));
      await setPin({ parentId, childId, pin: "5678" });
      await expect(getBytes(ref(childStorage, path))).rejects.toMatchObject({ code: "storage/unauthorized" });
      await signInWithCustomToken(childAuth, childToken(parentId, childId, 2));
      expect(new Uint8Array(await getBytes(ref(childStorage, path)))).toEqual(new Uint8Array([1, 2, 3]));
      await httpsCallable(functions, "rotateChildAccess")();
      await expect(getBytes(ref(childStorage, path))).rejects.toMatchObject({ code: "storage/unauthorized" });
      await signInWithCustomToken(childAuth, childToken(parentId, childId, 3));
      expect(new Uint8Array(await getBytes(ref(childStorage, path)))).toEqual(new Uint8Array([1, 2, 3]));
      await deleteDoc(doc(db, "parents", parentId, "children", childId));
      await expect(getBytes(ref(childStorage, path))).rejects.toMatchObject({ code: "storage/unauthorized" });
    } finally {
      await Promise.all([deleteApp(parentApp), deleteApp(childApp)]);
    }
  });
});
