import { expect, test } from "vitest";
import * as firestore from "firebase/firestore";
import { deleteChildProfile } from "@/lib/deleteChild";
import { createFamily, deleteApp } from "./familyFixture";

test("elimina records y más de un lote de intentos antes de borrar el perfil", async () => {
  const { app, db, parentId, childId, profile } = await createFamily();
  try {
    const batch = firestore.writeBatch(db);
    for (let i = 0; i < 460; i++) {
      batch.set(firestore.doc(firestore.collection(profile, "attempts")), { correct: true });
    }
    batch.set(firestore.doc(profile, "records", "cohete:mod-1"), { best: 12, at: Date.now() });
    batch.set(firestore.doc(profile, "skillsProgress", "mod-1"), { recentResults: [] });
    await batch.commit();
    await deleteChildProfile(firestore, db, parentId, childId);
    expect((await firestore.getDoc(profile)).exists()).toBe(false);
    for (const name of ["attempts", "records", "skillsProgress"]) {
      expect((await firestore.getDocs(firestore.collection(profile, name))).empty).toBe(true);
    }
  } finally { await deleteApp(app); }
});
