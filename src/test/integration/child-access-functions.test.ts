import { describe, expect, test } from "vitest";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { anonymousApp, call, createFamily, deleteApp } from "./familyFixture";

describe("acceso infantil — callables reales", () => {
  test("el enlace comparte solo avatares incluidos y descarta URLs o identificadores privados", async () => {
    const family = await createFamily();
    const guest = await anonymousApp();
    try {
      for (const avatarId of ["maths-animo", "maths-sonrisa", "maths-saludo"]) {
        await updateDoc(family.profile, { avatarId });
        expect(await call(guest, "listChildrenPublic", { parentId: family.parentId, accessKey: family.accessKey }))
          .toEqual({ children: [{ id: family.childId, name: "Sofía", avatarId }] });
      }
      for (const avatarId of ["https://privado.test/foto.jpg", "avatar-personalizado"]) {
        await updateDoc(family.profile, { avatarId });
        expect(await call(guest, "listChildrenPublic", { parentId: family.parentId, accessKey: family.accessKey }))
          .toEqual({ children: [{ id: family.childId, name: "Sofía" }] });
      }
    } finally { await Promise.all([deleteApp(family.app), deleteApp(guest)]); }
  });

  test("la lista pública exige la clave del enlace y nunca incluye el hash ni la fecha de nacimiento", async () => {
    const family = await createFamily();
    const guest = await anonymousApp();
    try {
      const { parentId, accessKey } = family;
      await expect(call(guest, "listChildrenPublic", { parentId })).rejects.toMatchObject({ code: "functions/failed-precondition" });
      await expect(call(guest, "listChildrenPublic", { parentId, accessKey: "x".repeat(43) })).rejects.toMatchObject({ code: "functions/failed-precondition" });
      const data = await call(guest, "listChildrenPublic", { parentId, accessKey });
      expect(data).toEqual({ children: [{ id: family.childId, name: "Sofía" }] });
      // Rotar la clave invalida los enlaces anteriores.
      await setDoc(doc(family.db, "parents", parentId), { deviceAccessKey: "n".repeat(43) });
      await expect(call(guest, "listChildrenPublic", { parentId, accessKey })).rejects.toMatchObject({ code: "functions/failed-precondition" });
    } finally { await Promise.all([deleteApp(family.app), deleteApp(guest)]); }
  });

  test("sin la clave nadie gasta intentos de PIN; el PIN se guarda como HMAC v2", async () => {
    const family = await createFamily();
    const guest = await anonymousApp();
    const data = { parentId: family.parentId, childId: family.childId };
    try {
      const profile = (await getDoc(family.profile)).data();
      expect(profile?.pinHashVersion).toBe(2);
      expect(profile?.pinHash).toMatch(/^[0-9a-f]{64}$/);
      await expect(call(guest, "verifyChildPin", { ...data, pin: "0000" })).rejects.toMatchObject({ code: "functions/failed-precondition" });
      expect((await getDoc(family.profile)).data()?.pinFailCount ?? 0).toBe(0);
      // La familia confirma el PIN sin clave y sin recibir un token infantil.
      expect(await call(family.app, "verifyChildPin", { ...data, pin: "1234" })).toEqual({ ok: true });
    } finally { await Promise.all([deleteApp(family.app), deleteApp(guest)]); }
  });

  test("solo Functions escribe el hash; solo la familia puede fijar el PIN", async () => {
    const family = await createFamily();
    const guest = await anonymousApp();
    const data = { parentId: family.parentId, childId: family.childId };
    try {
      await expect(updateDoc(family.profile, { pinHash: "0".repeat(64) })).rejects.toThrow();
      await expect(updateDoc(family.profile, { pinHashVersion: 1 })).rejects.toThrow();
      await expect(setDoc(doc(family.db, "parents", family.parentId, "children", "nuevo"), { name: "X", pinHash: "y" })).rejects.toThrow();
      await expect(call(guest, "setChildPin", { ...data, pin: "9999" })).rejects.toMatchObject({ code: "functions/unauthenticated" });
      const { token } = await call<{ token: string }>(guest, "verifyChildPin", { ...data, pin: "1234", accessKey: family.accessKey });
      await signInWithCustomToken(getAuth(guest), token);
      await expect(call(guest, "setChildPin", { ...data, pin: "9999" })).rejects.toMatchObject({ code: "functions/permission-denied" });
      await call(family.app, "setChildPin", { ...data, pin: "4321" });
      await expect(call(family.app, "verifyChildPin", { ...data, pin: "1234" })).rejects.toMatchObject({ code: "functions/permission-denied" });
      expect(await call(family.app, "verifyChildPin", { ...data, pin: "4321" })).toEqual({ ok: true });
    } finally { await Promise.all([deleteApp(family.app), deleteApp(guest)]); }
  });

  test("cinco PIN incorrectos persisten el contador y bloquean incluso el PIN correcto", async () => {
    const family = await createFamily();
    const guest = await anonymousApp();
    const data = { parentId: family.parentId, childId: family.childId, accessKey: family.accessKey };
    try {
      for (let i = 1; i <= 5; i++) {
        await expect(call(guest, "verifyChildPin", { ...data, pin: "0000" })).rejects.toMatchObject({ code: "functions/permission-denied" });
        expect((await getDoc(family.profile)).data()?.pinFailCount).toBe(i);
      }
      expect((await getDoc(family.profile)).data()?.pinLockedUntil).toBeGreaterThan(Date.now());
      await expect(call(guest, "verifyChildPin", { ...data, pin: "1234" })).rejects.toMatchObject({ code: "functions/resource-exhausted" });
      // Expiración sin esperar un minuto real.
      await updateDoc(family.profile, { pinLockedUntil: Date.now() - 1 });
      const { token } = await call<{ token: string }>(guest, "verifyChildPin", { ...data, pin: "1234" });
      const { user } = await signInWithCustomToken(getAuth(guest), token);
      expect((await user.getIdTokenResult()).claims).toMatchObject({ role: "child", parentId: data.parentId, childId: data.childId });
      const profile = (await getDoc(family.profile)).data();
      expect(profile?.pinFailCount).toBe(0);
      expect(profile?.pinLockedUntil).toBeUndefined();
    } finally { await Promise.all([deleteApp(family.app), deleteApp(guest)]); }
  });

  test("PIN correcto tras un fallo limpia el contador; datos inválidos no lo alteran", async () => {
    const family = await createFamily();
    try {
      const data = { parentId: family.parentId, childId: family.childId };
      await expect(call(family.app, "verifyChildPin", { ...data, pin: "0000" })).rejects.toThrow();
      await expect(call(family.app, "verifyChildPin", { ...data, pin: "1" })).rejects.toMatchObject({ code: "functions/invalid-argument" });
      expect((await getDoc(family.profile)).data()?.pinFailCount).toBe(1);
      await call(family.app, "verifyChildPin", { ...data, pin: "1234" });
      expect((await getDoc(family.profile)).data()?.pinFailCount).toBe(0);
    } finally { await deleteApp(family.app); }
  });

  test("la sesión infantil solo puede premiar su perfil, con importes acotados", async () => {
    const family = await createFamily();
    const guest = await anonymousApp();
    const scope = { parentId: family.parentId, childId: family.childId };
    try {
      await expect(call(guest, "initializeStarBalance", scope)).rejects.toMatchObject({ code: "functions/unauthenticated" });
      const { token } = await call<{ token: string }>(guest, "verifyChildPin", { ...scope, pin: "1234", accessKey: family.accessKey });
      await signInWithCustomToken(getAuth(guest), token);
      const movement = { ...scope, delta: 3, reason: "problem_solved", operationId: crypto.randomUUID() };
      expect(await call(guest, "updateStarBalance", movement)).toEqual({ total: 3 });
      await expect(call(guest, "updateStarBalance", { ...movement, childId: "otro" })).rejects.toMatchObject({ code: "functions/permission-denied" });
      await expect(call(guest, "updateStarBalance", { ...movement, delta: 999 })).rejects.toMatchObject({ code: "functions/permission-denied" });
      await expect(call(guest, "updateStarBalance", { ...movement, delta: -1, reason: "redemption" })).rejects.toMatchObject({ code: "functions/permission-denied" });
      await expect(call(guest, "initializeStarBalance", { ...scope, reconcile: true })).rejects.toMatchObject({ code: "functions/permission-denied" });
      await updateDoc(family.profile, { deleting: true });
      await expect(call(guest, "updateStarBalance", { ...movement, operationId: crypto.randomUUID() })).rejects.toMatchObject({ code: "functions/failed-precondition" });
      await expect(call(guest, "verifyChildPin", { ...scope, pin: "1234", accessKey: family.accessKey })).rejects.toMatchObject({ code: "functions/permission-denied" });
    } finally { await Promise.all([deleteApp(family.app), deleteApp(guest)]); }
  });

  test("la sesión infantil tiene un tope diario; la familia y las lecciones no", async () => {
    const family = await createFamily();
    const guest = await anonymousApp();
    const scope = { parentId: family.parentId, childId: family.childId };
    try {
      const { token } = await call<{ token: string }>(guest, "verifyChildPin", { ...scope, pin: "1234", accessKey: family.accessKey });
      await signInWithCustomToken(getAuth(guest), token);
      // Cupo casi agotado hoy (lo escribe la familia para no hacer 34 llamadas).
      const today = new Date().toISOString().slice(0, 10);
      await setDoc(doc(family.db, "parents", family.parentId, "children", family.childId, "starBalance", "childDaily"), { day: today, awarded: 990 });
      const award = (delta: number) => call(guest, "updateStarBalance", { ...scope, delta, reason: "problem_solved", operationId: crypto.randomUUID() });
      expect(await award(10)).toEqual({ total: 10 });
      expect(await award(1)).toEqual({ total: 10, limited: true });
      expect(await call(family.app, "updateStarBalance", { ...scope, delta: 5, reason: "problem_solved", operationId: crypto.randomUUID() })).toEqual({ total: 15 });
      // Un cupo de otro día no cuenta.
      await setDoc(doc(family.db, "parents", family.parentId, "children", family.childId, "starBalance", "childDaily"), { day: "2000-01-01", awarded: 1000 });
      expect(await award(3)).toEqual({ total: 18 });
    } finally { await Promise.all([deleteApp(family.app), deleteApp(guest)]); }
  });
});
