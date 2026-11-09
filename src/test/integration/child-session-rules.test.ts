import { describe, expect, test } from "vitest";
import { deleteApp, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithCustomToken,
  signOut,
} from "firebase/auth";
import * as firestoreFns from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";

/**
 * Verifica contra el emulador REAL de Firestore (reglas incluidas) la
 * frontera de seguridad de "el niño juega desde su propio dispositivo, sin
 * la sesión del padre" (docs/plan-salto-producto.md §8, `functions/src/
 * index.ts`, `firestore.rules`): un hijo con su propia sesión puede leer y
 * escribir SUS datos de juego, puede leer el contenido compartido de la
 * familia (niveles/mundo/currícula), pero no puede tocar los datos de otro
 * hijo ni nada de autoría (niveles, mundo, perfiles).
 *
 * No pasa por `verifyChildPin` (esa Cloud Function no corre en esta suite,
 * que no levanta el emulador de Functions): arma directamente el mismo
 * custom token que esa función emitiría con el Admin SDK — incluye SOLO los
 * campos { uid, claims } que `signInWithCustomToken` necesita. El emulador
 * de Auth (a diferencia de un proyecto real) no verifica la firma, así que
 * no hace falta una clave privada para probar las reglas con estos claims.
 */
function fakeChildCustomToken(uid: string, claims: Record<string, string | number>): string {
  const base64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    iss: "test@example.com",
    sub: "test@example.com",
    aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
    iat: now,
    exp: now + 3600,
    uid,
    claims,
  };
  return `${base64url(header)}.${base64url(payload)}.`;
}

async function nuevaFamiliaConDosHijos(sessionVersion = 0, tokenVersion = 0) {
  const app = initializeApp({ apiKey: "demo-api-key", projectId: "demo-numerario" }, `child-session-${crypto.randomUUID()}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = firestoreFns.getFirestore(app);
  firestoreFns.connectFirestoreEmulator(db, "127.0.0.1", 8080);
  const functions = getFunctions(app);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);

  const { user } = await createUserWithEmailAndPassword(auth, `padre-${crypto.randomUUID()}@ejemplo.test`, "secreto123");
  const parentId = user.uid;
  const childId = crypto.randomUUID();
  const otherChildId = crypto.randomUUID();
  await firestoreFns.setDoc(firestoreFns.doc(db, "parents", parentId, "children", childId), {
    name: "Hijo de prueba",
    birthDate: "2015-01-01",
    createdAt: Date.now(),
  });
  await firestoreFns.setDoc(firestoreFns.doc(db, "parents", parentId, "children", otherChildId), {
    name: "Hermano de prueba",
    birthDate: "2017-01-01",
    createdAt: Date.now(),
  });
  // Saldo de 20 estrellas: tope de las solicitudes de canje del hijo.
  await firestoreFns.setDoc(firestoreFns.doc(db, "parents", parentId, "children", childId, "starBalance", "total"), {
    total: 20,
    schemaVersion: 1,
  });
  if (sessionVersion) {
    await httpsCallable(functions, "setChildPin")({ parentId, childId, pin: "1234" });
  }
  await signOut(auth);

  const uid = `child:${parentId}:${childId}`;
  const token = fakeChildCustomToken(uid, { role: "child", parentId, childId, sessionVersion: tokenVersion });
  await signInWithCustomToken(auth, token);

  return { app, db, functions, parentId, childId, otherChildId };
}

describe("firestore.rules — sesión propia del hijo (custom token)", () => {
  test("una sesión revocada no accede al perfil ni al contenido compartido", async () => {
    const { app, db, functions, parentId, childId } = await nuevaFamiliaConDosHijos(1, 0);
    try {
      await expect(firestoreFns.getDoc(firestoreFns.doc(db, "parents", parentId, "children", childId))).rejects.toThrow();
      await expect(firestoreFns.getDoc(firestoreFns.doc(db, "parents", parentId, "world", "main"))).rejects.toThrow();
      await expect(httpsCallable(functions, "initializeStarBalance")({ parentId, childId })).rejects.toThrow();
    } finally { await deleteApp(app); }
  });

  test("una sesión emitida tras la revocación conserva acceso", async () => {
    const { app, db, parentId, childId } = await nuevaFamiliaConDosHijos(1, 1);
    try {
      await expect(firestoreFns.getDoc(firestoreFns.doc(db, "parents", parentId, "children", childId))).resolves.toBeDefined();
    } finally { await deleteApp(app); }
  });
  test("puede leer y escribir su propio skillsProgress", async () => {
    const { app, db, parentId, childId } = await nuevaFamiliaConDosHijos();
    try {
      const ref = firestoreFns.doc(db, "parents", parentId, "children", childId, "skillsProgress", "mod-1");
      await firestoreFns.setDoc(ref, { recentResults: [], recentAccuracy: 1, masteredAt: null });
      const snap = await firestoreFns.getDoc(ref);
      expect(snap.exists()).toBe(true);
    } finally {
      await deleteApp(app);
    }
  });

  test("sincroniza registros del juego solo en su propio perfil", async () => {
    const { app, db, parentId, childId, otherChildId } = await nuevaFamiliaConDosHijos();
    try {
      const own = firestoreFns.doc(db, "parents", parentId, "children", childId, "records", "target-masters-v1-dispositivo");
      const other = firestoreFns.doc(db, "parents", parentId, "children", otherChildId, "records", "target-masters-v1-dispositivo");
      await firestoreFns.setDoc(own, { unlocked: 12, stars: { "1": 3 }, daily: "" });
      expect((await firestoreFns.getDoc(own)).data()?.unlocked).toBe(12);
      await expect(firestoreFns.getDoc(other)).rejects.toThrow();
      await expect(firestoreFns.setDoc(other, { unlocked: 99 })).rejects.toThrow();
    } finally { await deleteApp(app); }
  });

  test("la tabla de canje la escribe la familia con forma válida y la leen sus hijos", async () => {
    const app = initializeApp({ apiKey: "demo-api-key", projectId: "demo-numerario" }, `catalogo-${crypto.randomUUID()}`);
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    const db = firestoreFns.getFirestore(app);
    firestoreFns.connectFirestoreEmulator(db, "127.0.0.1", 8080);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, `padre-${crypto.randomUUID()}@ejemplo.test`, "secreto123");
      const parentId = user.uid,
        childId = crypto.randomUUID();
      await firestoreFns.setDoc(firestoreFns.doc(db, "parents", parentId, "children", childId), { name: "Hijo", birthDate: "2015-01-01", createdAt: Date.now() });
      const catalog = firestoreFns.collection(db, "parents", parentId, "rewardCatalog");
      const item = await firestoreFns.addDoc(catalog, { label: "Elegir la película", stars: 40, createdAt: firestoreFns.serverTimestamp() });
      await expect(firestoreFns.addDoc(catalog, { label: "Gratis", stars: 0, createdAt: firestoreFns.serverTimestamp() })).rejects.toThrow();
      await expect(firestoreFns.addDoc(catalog, { label: "", stars: 5, createdAt: firestoreFns.serverTimestamp() })).rejects.toThrow();
      await expect(firestoreFns.addDoc(catalog, { label: "Extra", stars: 5, approved: true, createdAt: firestoreFns.serverTimestamp() })).rejects.toThrow();
      await signOut(auth);
      await signInWithCustomToken(auth, fakeChildCustomToken(`child:${parentId}:${childId}`, { role: "child", parentId, childId, sessionVersion: 0 }));
      expect((await firestoreFns.getDocs(catalog)).docs.map((d) => d.data().label)).toEqual(["Elegir la película"]);
      await expect(firestoreFns.updateDoc(item, { stars: 1 })).rejects.toThrow();
      await expect(firestoreFns.addDoc(catalog, { label: "Mío", stars: 1, createdAt: firestoreFns.serverTimestamp() })).rejects.toThrow();
      await expect(firestoreFns.deleteDoc(item)).rejects.toThrow();
    } finally { await deleteApp(app); }
  });

  test("guarda el uso del foco solo en su perfil, con forma válida y hora del servidor", async () => {
    const { app, db, parentId, childId, otherChildId } = await nuevaFamiliaConDosHijos();
    try {
      const own = firestoreFns.doc(db, "parents", parentId, "children", childId, "helpUsage", "resumen");
      const stamp = firestoreFns.serverTimestamp();
      await firestoreFns.setDoc(own, { favorites: firestoreFns.arrayUnion("progresiones#Razón"), opens: { progresiones: firestoreFns.increment(1) }, updatedAt: stamp }, { merge: true });
      await firestoreFns.setDoc(own, { topics: { pitagoras: firestoreFns.increment(1) }, updatedAt: stamp }, { merge: true });
      const data = (await firestoreFns.getDoc(own)).data();
      expect(data).toMatchObject({ favorites: ["progresiones#Razón"], opens: { progresiones: 1 }, topics: { pitagoras: 1 } });
      // Otro documento, campos ajenos, fecha a mano o demasiados favoritos: no.
      await expect(firestoreFns.setDoc(firestoreFns.doc(db, "parents", parentId, "children", childId, "helpUsage", "otro"), { updatedAt: stamp })).rejects.toThrow();
      await expect(firestoreFns.setDoc(own, { stars: 99, updatedAt: stamp }, { merge: true })).rejects.toThrow();
      await expect(firestoreFns.setDoc(own, { opens: { a: 1 }, updatedAt: firestoreFns.Timestamp.fromMillis(0) }, { merge: true })).rejects.toThrow();
      await expect(firestoreFns.setDoc(own, { favorites: Array.from({ length: 61 }, (_, i) => `k${i}`), updatedAt: stamp }, { merge: true })).rejects.toThrow();
      await expect(firestoreFns.deleteDoc(own)).rejects.toThrow();
      const other = firestoreFns.doc(db, "parents", parentId, "children", otherChildId, "helpUsage", "resumen");
      await expect(firestoreFns.setDoc(other, { updatedAt: stamp })).rejects.toThrow();
      await expect(firestoreFns.getDoc(other)).rejects.toThrow();
    } finally { await deleteApp(app); }
  });

  test("la copia de calculadora solo pertenece al propio alumno y tiene tamaño y campos acotados", async () => {
    const { app, db, parentId, childId, otherChildId } = await nuevaFamiliaConDosHijos();
    try {
      const own = firestoreFns.doc(db, "parents", parentId, "children", childId, "calculatorDraft", "actual");
      const copy = { written: "{}", exact: "{}", updatedAt: firestoreFns.serverTimestamp() };
      await firestoreFns.setDoc(own, copy);
      expect((await firestoreFns.getDoc(own)).data()).toMatchObject({ written: "{}", exact: "{}" });
      await expect(firestoreFns.setDoc(own, { ...copy, extra: 1 })).rejects.toThrow();
      await expect(firestoreFns.setDoc(own, { ...copy, exact: "x".repeat(100001) })).rejects.toThrow();
      await expect(firestoreFns.setDoc(firestoreFns.doc(db, "parents", parentId, "children", childId, "calculatorDraft", "otro"), copy)).rejects.toThrow();
      const other = firestoreFns.doc(db, "parents", parentId, "children", otherChildId, "calculatorDraft", "actual");
      await expect(firestoreFns.setDoc(other, copy)).rejects.toThrow();
      await expect(firestoreFns.getDoc(other)).rejects.toThrow();
    } finally { await deleteApp(app); }
  });

  test("puede crear intentos, pero no escribir directamente estrellas ni saldo", async () => {
    const { app, db, parentId, childId } = await nuevaFamiliaConDosHijos();
    try {
      const attemptRef = await firestoreFns.addDoc(
        firestoreFns.collection(db, "parents", parentId, "children", childId, "attempts"),
        { skillId: "x", itemId: "1", correct: true, createdAt: firestoreFns.serverTimestamp() },
      );
      await expect(firestoreFns.updateDoc(attemptRef, { correct: false })).rejects.toThrow();
      // Fecha a mano, campos ajenos o tipos erróneos no entran en la bitácora.
      const attempts = firestoreFns.collection(db, "parents", parentId, "children", childId, "attempts");
      await expect(firestoreFns.addDoc(attempts, { skillId: "x", itemId: "2", correct: true, createdAt: firestoreFns.Timestamp.fromMillis(0) })).rejects.toThrow();
      await expect(firestoreFns.addDoc(attempts, { skillId: "x", itemId: "3", correct: true, createdAt: firestoreFns.serverTimestamp(), stars: 99 })).rejects.toThrow();
      await expect(firestoreFns.addDoc(attempts, { skillId: "x", itemId: "4", correct: "sí", createdAt: firestoreFns.serverTimestamp() })).rejects.toThrow();
      await firestoreFns.addDoc(attempts, { skillId: "x", itemId: "5", correct: false, hintsUsed: 2, createdAt: firestoreFns.serverTimestamp() });

      await expect(firestoreFns.addDoc(
        firestoreFns.collection(db, "parents", parentId, "children", childId, "starLedger"),
        { delta: 3, reason: "problem_solved", attemptId: null, createdAt: firestoreFns.serverTimestamp() },
      )).rejects.toThrow();
      await expect(firestoreFns.setDoc(
        firestoreFns.doc(db, "parents", parentId, "children", childId, "starBalance", "total"),
        { total: 99999 },
      )).rejects.toThrow();
    } finally {
      await deleteApp(app);
    }
  });

  test("solo pide canjes pendientes, enteros, dentro de su saldo y con la hora del servidor", async () => {
    const { app, db, parentId, childId } = await nuevaFamiliaConDosHijos();
    try {
      const requests = firestoreFns.collection(db, "parents", parentId, "children", childId, "redemptionRequests");
      const valid = { starsSpent: 15, rewardLabel: "Una hora de juego", status: "pendiente", createdAt: firestoreFns.serverTimestamp(), resolvedAt: null };
      const created = await firestoreFns.addDoc(requests, valid);
      await expect(firestoreFns.updateDoc(created, { status: "aprobado" })).rejects.toThrow();
      await expect(firestoreFns.addDoc(requests, { ...valid, status: "aprobado" })).rejects.toThrow();
      await expect(firestoreFns.addDoc(requests, { ...valid, starsSpent: 21 })).rejects.toThrow();
      await expect(firestoreFns.addDoc(requests, { ...valid, starsSpent: -5 })).rejects.toThrow();
      await expect(firestoreFns.addDoc(requests, { ...valid, starsSpent: 2.5 })).rejects.toThrow();
      await expect(firestoreFns.addDoc(requests, { ...valid, rewardLabel: "" })).rejects.toThrow();
      await expect(firestoreFns.addDoc(requests, { ...valid, rewardLabel: "x".repeat(121) })).rejects.toThrow();
      await expect(firestoreFns.addDoc(requests, { ...valid, createdAt: firestoreFns.Timestamp.fromMillis(0) })).rejects.toThrow();
      await expect(firestoreFns.addDoc(requests, { ...valid, resolvedAt: firestoreFns.serverTimestamp() })).rejects.toThrow();
      await expect(firestoreFns.addDoc(requests, { ...valid, note: "extra" })).rejects.toThrow();
    } finally {
      await deleteApp(app);
    }
  });

  test("solo puede actualizar placementStatus de su propio perfil, ningún otro campo", async () => {
    const { app, db, parentId, childId } = await nuevaFamiliaConDosHijos();
    try {
      const ref = firestoreFns.doc(db, "parents", parentId, "children", childId);
      await firestoreFns.updateDoc(ref, { placementStatus: "completo" });
      const snap = await firestoreFns.getDoc(ref);
      expect(snap.data()?.placementStatus).toBe("completo");

      await expect(firestoreFns.updateDoc(ref, { pinHash: "hackeado" })).rejects.toThrow();
      await expect(firestoreFns.updateDoc(ref, { name: "Otro nombre" })).rejects.toThrow();
    } finally {
      await deleteApp(app);
    }
  });

  /** Bug real reportado: con la sesión propia del hijo (custom token, no la
   *  del padre compartiendo dispositivo), el login disparaba `recordStreak`
   *  desde el despachador y Firestore devolvía "Missing or insufficient
   *  permissions" en consola — la regla de arriba solo dejaba pasar
   *  `placementStatus`, y para cuando existió no hacía falta nada más.
   *  Fase 30 (`seenStoryIds`), Fase 32 (`avatarId`) y Fase 35 (`streakDays`/
   *  `lastPlayedDay`) agregaron escrituras nuevas al mismo documento sin
   *  agregarlas acá — las pruebas e2e de esas fases nunca lo agarraron
   *  porque corren como sesión del padre (ver e2e/utilidades.ts:
   *  `entrarAlPerfil`), no con un custom token de hijo de verdad. */
  test("también puede actualizar avatarId, seenStoryIds y su racha — nunca varios campos ajenos a la vez", async () => {
    const { app, db, parentId, childId } = await nuevaFamiliaConDosHijos();
    try {
      const ref = firestoreFns.doc(db, "parents", parentId, "children", childId);
      await firestoreFns.updateDoc(ref, { avatarId: "zorro" });
      await firestoreFns.updateDoc(ref, { seenStoryIds: ["intro"] });
      await firestoreFns.updateDoc(ref, { streakDays: 2, lastPlayedDay: "2026-01-16" });

      const snap = await firestoreFns.getDoc(ref);
      expect(snap.data()).toMatchObject({
        avatarId: "zorro",
        seenStoryIds: ["intro"],
        streakDays: 2,
        lastPlayedDay: "2026-01-16",
      });

      // Ninguno de estos campos nuevos abre la puerta a colarse junto con
      // uno prohibido en la misma escritura.
      await expect(firestoreFns.updateDoc(ref, { avatarId: "lobo", pinHash: "hackeado" })).rejects.toThrow();
    } finally {
      await deleteApp(app);
    }
  });

  test("NO puede leer ni escribir los datos de otro hijo de la misma familia", async () => {
    const { app, db, parentId, otherChildId } = await nuevaFamiliaConDosHijos();
    try {
      await expect(
        firestoreFns.getDoc(firestoreFns.doc(db, "parents", parentId, "children", otherChildId)),
      ).rejects.toThrow();
      await expect(
        firestoreFns.setDoc(
          firestoreFns.doc(db, "parents", parentId, "children", otherChildId, "skillsProgress", "mod-1"),
          { recentResults: [], recentAccuracy: 1, masteredAt: null },
        ),
      ).rejects.toThrow();
    } finally {
      await deleteApp(app);
    }
  });

  test("puede leer (no escribir) niveles/mundo/currícula compartidos de la familia", async () => {
    const { app, db, parentId } = await nuevaFamiliaConDosHijos();
    try {
      await expect(firestoreFns.getDoc(firestoreFns.doc(db, "parents", parentId, "world", "main"))).resolves.toBeDefined();
      await expect(
        firestoreFns.setDoc(firestoreFns.doc(db, "parents", parentId, "world", "main"), { nodes: [] }),
      ).rejects.toThrow();
      await expect(
        firestoreFns.setDoc(firestoreFns.doc(db, "parents", parentId, "levels", "nivel-1"), { name: "x" }),
      ).rejects.toThrow();
    } finally {
      await deleteApp(app);
    }
  });

  test("NO puede leer el documento del padre", async () => {
    const { app, db, parentId } = await nuevaFamiliaConDosHijos();
    try {
      await expect(firestoreFns.getDoc(firestoreFns.doc(db, "parents", parentId))).rejects.toThrow();
    } finally {
      await deleteApp(app);
    }
  });
});
