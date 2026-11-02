import { act, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import type { User } from "firebase/auth";
import { AuthProvider, useAuth } from "./AuthProvider";

const { listeners } = vi.hoisted(() => ({ listeners: [] as ((u: User | null) => void)[] }));
vi.mock("@/lib/firebase", () => ({ getFirebase: () => Promise.resolve({ auth: {} }) }));
vi.mock("firebase/auth", () => ({
  onIdTokenChanged: (_auth: unknown, cb: (u: User | null) => void) => {
    listeners.push(cb);
    return () => {};
  },
}));

function fakeUser(uid: string, claims: Record<string, unknown> | Error): User {
  return {
    uid,
    getIdTokenResult: () => (claims instanceof Error ? Promise.reject(claims) : Promise.resolve({ claims })),
  } as unknown as User;
}

function Probe() {
  const { loading, role, childId } = useAuth();
  return <p data-testid="estado">{loading ? "cargando" : `${role}:${childId ?? "-"}`}</p>;
}

describe("AuthProvider", () => {
  test("la renovación del token no vuelve a 'cargando' ni pierde el rol", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await vi.waitFor(() => expect(listeners).toHaveLength(1));
    const emit = listeners[0];
    const estado = () => screen.getByTestId("estado").textContent;

    await act(async () => emit(fakeUser("child:p:h", { role: "child", parentId: "p", childId: "h" })));
    expect(estado()).toBe("child:h");

    // Renovación horaria: mismo uid. Ni un instante en "cargando".
    const seen: string[] = [];
    const observer = new MutationObserver(() => seen.push(estado() ?? ""));
    observer.observe(screen.getByTestId("estado"), { childList: true, characterData: true, subtree: true });
    await act(async () => emit(fakeUser("child:p:h", new Error("sin red"))));
    observer.disconnect();
    expect(seen).not.toContain("cargando");
    expect(estado()).toBe("child:h");

    // Cambio de identidad: se vuelven a leer los claims.
    await act(async () => emit(fakeUser("padre", {})));
    expect(estado()).toBe("parent:-");
  });
});

describe("childHome", () => {
  test("lleva la sesión infantil a su juego y el resto al login", async () => {
    const { childHome } = await import("./AuthProvider");
    const user = {} as User;
    expect(childHome({ user, role: "child", childId: "h 1" })).toBe("/jugar/h%201");
    expect(childHome({ user, role: null, childId: undefined })).toBe("/login");
    expect(childHome({ user: null, role: null, childId: undefined })).toBe("/login");
  });
});
