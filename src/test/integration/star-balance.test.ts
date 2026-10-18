import { describe, expect, test } from "vitest";
import { deleteApp, initializeApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import * as firestoreFns from "firebase/firestore";
import { awardStars, ensureStarBalanceSeeded } from "@/lib/starLedger";
import { call } from "./familyFixture";

/**
 * `awardStars`/`ensureStarBalanceSeeded` (docs/auditoria-rendimiento-
 * accesibilidad.md §1.2) contra el emulador real de Firestore: el contador
 * agregado tiene que reflejar exactamente la suma del libro mayor, tanto
 * para saldos nuevos (escritos siempre vía `awardStars`) como para un perfil
 * "viejo" que ya tenía entradas en `starLedger` antes de que existiera
 * `starBalance` (la migración perezosa).
 */
async function nuevoPadreConHijo() {
  const app = initializeApp({ apiKey: "demo-api-key", projectId: "demo-numerario" }, `star-balance-${crypto.randomUUID()}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = firestoreFns.getFirestore(app);
  firestoreFns.connectFirestoreEmulator(db, "127.0.0.1", 8080);
  const { user } = await createUserWithEmailAndPassword(auth, `padre-${crypto.randomUUID()}@ejemplo.test`, "secreto123");
  const childId = crypto.randomUUID();
  await firestoreFns.setDoc(firestoreFns.doc(db, "parents", user.uid, "children", childId), {
    name: "Hijo de prueba",
    birthDate: "2015-01-01",
    pinHash: "x",
    createdAt: Date.now(),
  });
  return { app, db, parentId: user.uid, childId };
}

function balanceRef(db: firestoreFns.Firestore, parentId: string, childId: string) {
  return firestoreFns.doc(db, "parents", parentId, "children", childId, "starBalance", "total");
}

describe("starLedger — awardStars mantiene el contador agregado", () => {
  test("cada awardStars incrementa el mismo documento, sin volver a leer el libro mayor", async () => {
    const { app, db, parentId, childId } = await nuevoPadreConHijo();
    try {
      await awardStars(firestoreFns, db, parentId, childId, 3, "problem_solved");
      await awardStars(firestoreFns, db, parentId, childId, 5, "problem_solved");
      await awardStars(firestoreFns, db, parentId, childId, -2, "redemption");

      const snap = await firestoreFns.getDoc(balanceRef(db, parentId, childId));
      expect(snap.data()?.total).toBe(6);

      const ledgerSnap = await firestoreFns.getDocs(
        firestoreFns.collection(db, "parents", parentId, "children", childId, "starLedger"),
      );
      expect(ledgerSnap.size).toBe(3);
    } finally {
      await deleteApp(app);
    }
  });
});

describe("starLedger — ensureStarBalanceSeeded (migración de saldos existentes)", () => {
  test("premio concurrente y migración conservan todo el histórico", async () => {
    const { app, db, parentId, childId } = await nuevoPadreConHijo();
    try {
      await firestoreFns.addDoc(firestoreFns.collection(db, "parents", parentId, "children", childId, "starLedger"), { delta: 100 });
      await Promise.all([
        ensureStarBalanceSeeded(firestoreFns, db, parentId, childId),
        awardStars(firestoreFns, db, parentId, childId, 3, "problem_solved"),
        awardStars(firestoreFns, db, parentId, childId, 5, "problem_solved"),
      ]);
      expect((await firestoreFns.getDoc(balanceRef(db, parentId, childId))).data()?.total).toBe(108);
    } finally { await deleteApp(app); }
  });

  test("repara un agregado antiguo incompleto y permite reconciliar un saldo", async () => {
    const { app, db, parentId, childId } = await nuevoPadreConHijo();
    try {
      await firestoreFns.addDoc(firestoreFns.collection(db, "parents", parentId, "children", childId, "starLedger"), { delta: 100 });
      await firestoreFns.setDoc(balanceRef(db, parentId, childId), { total: 3 });
      await ensureStarBalanceSeeded(firestoreFns, db, parentId, childId);
      expect((await firestoreFns.getDoc(balanceRef(db, parentId, childId))).data()).toEqual({ total: 100, schemaVersion: 1 });
      await firestoreFns.updateDoc(balanceRef(db, parentId, childId), { total: 1 });
      await ensureStarBalanceSeeded(firestoreFns, db, parentId, childId, true);
      expect((await firestoreFns.getDoc(balanceRef(db, parentId, childId))).data()?.total).toBe(100);
    } finally { await deleteApp(app); }
  });

  test("el reintento de una operación no duplica estrellas", async () => {
    const { app, db, parentId, childId } = await nuevoPadreConHijo();
    try {
      const operationId = crypto.randomUUID();
      await Promise.all([1, 2].map(() => awardStars(firestoreFns, db, parentId, childId, 3, "problem_solved", null, operationId)));
      expect((await firestoreFns.getDoc(balanceRef(db, parentId, childId))).data()?.total).toBe(3);
      await expect(call(app, "updateStarBalance", { parentId, childId, delta: 4, reason: "problem_solved", operationId })).rejects.toMatchObject({ code: "functions/already-exists" });
      await expect(awardStars(firestoreFns, db, parentId, childId, -4, "redemption")).rejects.toMatchObject({ code: "functions/failed-precondition" });
    } finally { await deleteApp(app); }
  });
  test("un perfil con entradas previas en starLedger pero sin starBalance se siembra con la suma correcta", async () => {
    const { app, db, parentId, childId } = await nuevoPadreConHijo();
    try {
      // Escritas directo, como haría un perfil de antes de este cambio —
      // sin pasar por awardStars, así que starBalance nunca se crea.
      const ledger = firestoreFns.collection(db, "parents", parentId, "children", childId, "starLedger");
      await firestoreFns.addDoc(ledger, { delta: 4, reason: "problem_solved", attemptId: null, createdAt: firestoreFns.serverTimestamp() });
      await firestoreFns.addDoc(ledger, { delta: 7, reason: "problem_solved", attemptId: null, createdAt: firestoreFns.serverTimestamp() });
      await firestoreFns.addDoc(ledger, { delta: -3, reason: "redemption", attemptId: null, createdAt: firestoreFns.serverTimestamp() });

      const before = await firestoreFns.getDoc(balanceRef(db, parentId, childId));
      expect(before.exists()).toBe(false);

      await ensureStarBalanceSeeded(firestoreFns, db, parentId, childId);

      const after = await firestoreFns.getDoc(balanceRef(db, parentId, childId));
      expect(after.data()?.total).toBe(8);
    } finally {
      await deleteApp(app);
    }
  });

  test("si el saldo ya existe, no lo vuelve a tocar (no pisa un increment concurrente)", async () => {
    const { app, db, parentId, childId } = await nuevoPadreConHijo();
    try {
      await awardStars(firestoreFns, db, parentId, childId, 100, "problem_solved");
      await ensureStarBalanceSeeded(firestoreFns, db, parentId, childId);

      const snap = await firestoreFns.getDoc(balanceRef(db, parentId, childId));
      expect(snap.data()?.total).toBe(100);
    } finally {
      await deleteApp(app);
    }
  });

  test("sin ninguna entrada en el libro mayor, siembra en 0", async () => {
    const { app, db, parentId, childId } = await nuevoPadreConHijo();
    try {
      await ensureStarBalanceSeeded(firestoreFns, db, parentId, childId);
      const snap = await firestoreFns.getDoc(balanceRef(db, parentId, childId));
      expect(snap.data()?.total).toBe(0);
    } finally {
      await deleteApp(app);
    }
  });
});
