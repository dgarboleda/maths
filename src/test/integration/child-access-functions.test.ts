import { describe, expect, test } from "vitest";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { getDoc, updateDoc } from "firebase/firestore";
import { anonymousApp, call, createFamily, deleteApp } from "./familyFixture";

describe("acceso infantil — callables reales", () => {
  test("la lista pública nunca incluye el hash ni la fecha de nacimiento", async () => {
    const family = await createFamily();
    const guest = await anonymousApp();
    try {
      const data = await call(guest, "listChildrenPublic", { parentId: family.parentId });
      expect(data).toEqual({ children: [{ id: family.childId, name: "Sofía" }] });
    } finally { await Promise.all([deleteApp(family.app), deleteApp(guest)]); }
  });

  test("cinco PIN incorrectos persisten el contador y bloquean incluso el PIN correcto", async () => {
    const family = await createFamily();
    const guest = await anonymousApp();
    const data = { parentId: family.parentId, childId: family.childId };
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
      expect((await user.getIdTokenResult()).claims).toMatchObject({ role: "child", ...data });
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
      const { token } = await call<{ token: string }>(guest, "verifyChildPin", { ...scope, pin: "1234" });
      await signInWithCustomToken(getAuth(guest), token);
      const movement = { ...scope, delta: 3, reason: "problem_solved", operationId: crypto.randomUUID() };
      expect(await call(guest, "updateStarBalance", movement)).toEqual({ total: 3 });
      await expect(call(guest, "updateStarBalance", { ...movement, childId: "otro" })).rejects.toMatchObject({ code: "functions/permission-denied" });
      await expect(call(guest, "updateStarBalance", { ...movement, delta: 999 })).rejects.toMatchObject({ code: "functions/permission-denied" });
      await expect(call(guest, "updateStarBalance", { ...movement, delta: -1, reason: "redemption" })).rejects.toMatchObject({ code: "functions/permission-denied" });
      await expect(call(guest, "initializeStarBalance", { ...scope, reconcile: true })).rejects.toMatchObject({ code: "functions/permission-denied" });
      await updateDoc(family.profile, { deleting: true });
      await expect(call(guest, "updateStarBalance", { ...movement, operationId: crypto.randomUUID() })).rejects.toMatchObject({ code: "functions/failed-precondition" });
      await expect(call(guest, "verifyChildPin", { ...scope, pin: "1234" })).rejects.toMatchObject({ code: "functions/permission-denied" });
    } finally { await Promise.all([deleteApp(family.app), deleteApp(guest)]); }
  });
});
