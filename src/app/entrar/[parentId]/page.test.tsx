import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EntrarPage from "./page";

/**
 * Bug real reportado: con la sesión propia del hijo (custom token, sin la
 * del padre compartiendo dispositivo), entrar al juego mostraba en consola
 * "FirebaseError: Missing or insufficient permissions" en el primer intento
 * de leer/escribir Firestore desde `/jugar/{childId}`. Causa: el código
 * navegaba apenas resolvía `signInWithCustomToken`, sin esperar a que el ID
 * token trajera los claims `{ role: "child", ... }` — ni `AuthProvider` (que
 * los lee con su propio `getIdTokenResult()`) ni el listener interno de
 * Firestore (que depende del mismo token) llegaban a tenerlos listos a
 * tiempo. Este test prueba el orden, no las reglas de Firestore (ya
 * cubiertas por `child-session-rules.test.ts` contra el emulador real):
 * `getIdTokenResult()` tiene que resolverse ANTES de navegar.
 */
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => ({ parentId: "padre-1" }),
  useRouter: () => ({ push }),
}));

const getIdTokenResult = vi.fn(async () => ({ claims: { role: "child" } }));
const signInWithCustomToken = vi.fn(async () => ({ user: { getIdTokenResult } }));
vi.mock("firebase/auth", () => ({
  signInWithCustomToken: () => signInWithCustomToken(),
}));

const listChildrenPublicFn = vi.fn(async () => ({ data: { children: [{ id: "hijo-1", name: "Ana" }] } }));
const verifyChildPinFn = vi.fn(async () => ({ data: { token: "token-de-prueba" } }));
const httpsCallable = vi.fn((_functions: unknown, name: string) => {
  if (name === "listChildrenPublic") return listChildrenPublicFn;
  if (name === "verifyChildPin") return verifyChildPinFn;
  throw new Error(`Cloud Function inesperada en el test: ${name}`);
});
vi.mock("@/lib/firebase", () => ({
  getFirebase: async () => ({ auth: {} }),
  getFirebaseFunctions: async () => ({ functions: {}, functionsFns: { httpsCallable } }),
}));

describe("EntrarPage — sesión propia del hijo", () => {
  test("espera el ID token con los claims antes de navegar a /jugar/{childId}", async () => {
    const user = userEvent.setup();
    render(<EntrarPage />);

    await user.click(await screen.findByRole("button", { name: "Entrar al perfil de Ana" }));
    for (const digit of ["1", "2", "3", "4"]) {
      await user.click(screen.getByRole("button", { name: digit }));
    }
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(push).toHaveBeenCalledWith("/jugar/hijo-1");
    expect(getIdTokenResult).toHaveBeenCalledTimes(1);
    // El orden es la parte que importa: si `push` se llamara primero, el
    // arreglo no cumpliría su propósito aunque ambos mocks terminen
    // llamándose igual.
    expect(getIdTokenResult.mock.invocationCallOrder[0]).toBeLessThan(push.mock.invocationCallOrder[0]);
  });
});
