import { expect, test } from "vitest";
import * as firestore from "firebase/firestore";
import { deleteChildProfile } from "@/lib/deleteChild";
import { createFamily, deleteApp } from "./familyFixture";

test("elimina records y más de un lote de intentos antes de borrar el perfil", async () => {
  const { app, db, parentId, childId, profile } = await createFamily();
  try {
    const batch = firestore.writeBatch(db);
    for (let i = 0; i < 460; i++) {
      batch.set(firestore.doc(firestore.collection(profile, "attempts")), {
        correct: true,
      });
    }
    batch.set(firestore.doc(profile, "records", "cohete:mod-1"), {
      best: 12,
      at: Date.now(),
    });
    batch.set(firestore.doc(profile, "skillsProgress", "mod-1"), {
      recentResults: [],
    });
    await batch.commit();
    await deleteChildProfile(firestore, db, parentId, childId);
    expect((await firestore.getDoc(profile)).exists()).toBe(false);
    for (const name of ["attempts", "records", "skillsProgress"]) {
      expect(
        (await firestore.getDocs(firestore.collection(profile, name))).empty,
      ).toBe(true);
    }
  } finally {
    await deleteApp(app);
  }
});

test("si falta permiso de lectura no bloquea el perfil ni elimina progreso", async () => {
  const family = await createFamily();
  const attempt = firestore.doc(family.profile, "attempts", "conservar");
  try {
    await firestore.setDoc(attempt, { correct: true });
    const denied = {
      ...firestore,
      getDocsFromServer: async () => {
        throw Object.assign(new Error("Reglas sin publicar"), {
          code: "permission-denied",
        });
      },
    };
    await expect(
      deleteChildProfile(denied, family.db, family.parentId, family.childId),
    ).rejects.toMatchObject({ code: "permission-denied" });
    expect(
      (await firestore.getDocFromServer(family.profile)).data()?.deleting,
    ).toBeUndefined();
    expect((await firestore.getDocFromServer(attempt)).exists()).toBe(true);
  } finally {
    await deleteApp(family.app);
  }
});

test("reanuda un borrado interrumpido después de eliminar parte del progreso", async () => {
  const family = await createFamily();
  const skill = firestore.doc(family.profile, "skillsProgress", "una");
  const attempt = firestore.doc(family.profile, "attempts", "uno");
  try {
    await firestore.setDoc(skill, { recentResults: [] });
    await firestore.setDoc(attempt, { correct: true });
    let commits = 0;
    const interrupted = {
      ...firestore,
      writeBatch: (db: firestore.Firestore) => {
        const batch = firestore.writeBatch(db);
        const commit = batch.commit.bind(batch);
        batch.commit = async () => {
          if (++commits === 2) throw new Error("Conexión interrumpida");
          await commit();
        };
        return batch;
      },
    };
    await expect(
      deleteChildProfile(
        interrupted,
        family.db,
        family.parentId,
        family.childId,
      ),
    ).rejects.toThrow("Conexión interrumpida");
    expect(
      (await firestore.getDocFromServer(family.profile)).data()?.deleting,
    ).toBe(true);
    expect((await firestore.getDocFromServer(skill)).exists()).toBe(false);
    expect((await firestore.getDocFromServer(attempt)).exists()).toBe(true);
    await deleteChildProfile(
      firestore,
      family.db,
      family.parentId,
      family.childId,
    );
    expect((await firestore.getDocFromServer(family.profile)).exists()).toBe(
      false,
    );
    expect((await firestore.getDocFromServer(attempt)).exists()).toBe(false);
  } finally {
    await deleteApp(family.app);
  }
});

test("limpia restos aunque el documento del perfil ya no exista", async () => {
  const family = await createFamily();
  const record = firestore.doc(family.profile, "records", "cohete:una");
  try {
    await firestore.setDoc(record, { best: 8 });
    await firestore.deleteDoc(family.profile);
    await deleteChildProfile(
      firestore,
      family.db,
      family.parentId,
      family.childId,
    );
    await deleteChildProfile(
      firestore,
      family.db,
      family.parentId,
      family.childId,
    );
    expect((await firestore.getDocFromServer(record)).exists()).toBe(false);
    expect((await firestore.getDocFromServer(family.profile)).exists()).toBe(
      false,
    );
  } finally {
    await deleteApp(family.app);
  }
});
