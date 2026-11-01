import { describe, expect, test } from "vitest";
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithCustomToken, signInWithEmailAndPassword } from "firebase/auth";
import * as firestore from "firebase/firestore";
import * as storageFns from "firebase/storage";
import { LEGAL_VERSION } from "@/lib/legal";
import { anonymousApp, call, createFamily, deleteApp } from "./familyFixture";

describe("cuenta familiar — consentimiento y borrado", () => {
  test("el consentimiento lo registra Functions con la versión vigente; el navegador no puede fabricarlo", async () => {
    const family = await createFamily();
    try {
      const parent = firestore.doc(family.db, "parents", family.parentId);
      await expect(firestore.setDoc(parent, { legalConsent: { version: LEGAL_VERSION } }, { merge: true })).rejects.toThrow();
      await expect(call(family.app, "acceptLegalTerms", { version: "2000-01-01" })).rejects.toMatchObject({ code: "functions/failed-precondition" });
      await call(family.app, "acceptLegalTerms", { version: LEGAL_VERSION });
      const consent = (await firestore.getDoc(parent)).data()?.legalConsent;
      expect(consent.version).toBe(LEGAL_VERSION);
      expect(consent.acceptedAt).toBeInstanceOf(firestore.Timestamp);
      // Ni cambiarlo ni borrarlo; el resto del documento sigue editable.
      await expect(firestore.updateDoc(parent, { "legalConsent.version": "otra" })).rejects.toThrow();
      await expect(firestore.updateDoc(parent, { legalConsent: firestore.deleteField() })).rejects.toThrow();
      await firestore.updateDoc(parent, { deviceAccessKey: "z".repeat(43) });
    } finally { await deleteApp(family.app); }
  });

  test("una sesión de hijo no acepta términos ni borra la cuenta", async () => {
    const family = await createFamily();
    const guest = await anonymousApp();
    try {
      const { token } = await call<{ token: string }>(guest, "verifyChildPin", { parentId: family.parentId, childId: family.childId, pin: "1234", accessKey: family.accessKey });
      await signInWithCustomToken(getAuth(guest), token);
      await expect(call(guest, "acceptLegalTerms", { version: LEGAL_VERSION })).rejects.toMatchObject({ code: "functions/permission-denied" });
      await expect(call(guest, "deleteAccount", {})).rejects.toMatchObject({ code: "functions/permission-denied" });
    } finally { await Promise.all([deleteApp(family.app), deleteApp(guest)]); }
  });

  test("borrar la cuenta elimina datos, archivos, la sesión del hijo y el usuario", async () => {
    const app = initializeApp({ apiKey: "demo-api-key", projectId: "demo-numerario", storageBucket: "demo-numerario.appspot.com" }, crypto.randomUUID());
    const guest = await anonymousApp();
    const other = await createFamily();
    try {
      const auth = getAuth(app);
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
      const db = firestore.getFirestore(app);
      firestore.connectFirestoreEmulator(db, "127.0.0.1", 8080);
      const storage = storageFns.getStorage(app);
      storageFns.connectStorageEmulator(storage, "127.0.0.1", 9199);
      const email = `${crypto.randomUUID()}@example.test`;
      const { user } = await createUserWithEmailAndPassword(auth, email, "password123");
      const parentId = user.uid;
      const childId = crypto.randomUUID();
      const accessKey = "k".repeat(43);
      await firestore.setDoc(firestore.doc(db, "parents", parentId), { email, deviceAccessKey: accessKey });
      await firestore.setDoc(firestore.doc(db, "parents", parentId, "children", childId), { name: "Leo", birthDate: "2014-03-02" });
      await firestore.setDoc(firestore.doc(db, "parents", parentId, "children", childId, "skillsProgress", "s1"), { score: 3 });
      await call(app, "setChildPin", { parentId, childId, pin: "4321" });
      const asset = storageFns.ref(storage, `parents/${parentId}/level-assets/fondo.png`);
      await storageFns.uploadBytes(asset, new Blob(["png"], { type: "image/png" }));
      // El hijo abre su propia sesión (crea su usuario de Auth).
      const { token } = await call<{ token: string }>(guest, "verifyChildPin", { parentId, childId, pin: "4321", accessKey });
      await signInWithCustomToken(getAuth(guest), token);

      await call(app, "deleteAccount", {});

      // Comprobación con otra cuenta: no puede leer, así que se verifica por efectos.
      await expect(call(guest, "listChildrenPublic", { parentId, accessKey })).rejects.toMatchObject({ code: "functions/failed-precondition" });
      await expect(signInWithEmailAndPassword(getAuth(guest), email, "password123")).rejects.toMatchObject({ code: "auth/user-not-found" });
      const adminView = await fetch(`http://127.0.0.1:8080/v1/projects/demo-numerario/databases/(default)/documents/parents/${parentId}/children/${childId}/skillsProgress/s1`, { headers: { Authorization: "Bearer owner" } });
      expect(adminView.status).toBe(404);
      const files = await fetch(`http://127.0.0.1:9199/v0/b/demo-numerario.appspot.com/o?prefix=${encodeURIComponent(`parents/${parentId}/`)}`, { headers: { Authorization: "Bearer owner" } });
      expect((await files.json()).items ?? []).toEqual([]);
      // La otra familia sigue intacta.
      expect((await firestore.getDoc(other.profile)).exists()).toBe(true);
    } finally { await Promise.all([deleteApp(app), deleteApp(guest), deleteApp(other.app)]); }
  });
});
