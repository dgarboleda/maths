import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PanelShell } from "./PanelShell";

/**
 * Bug real reportado: `/panel/**` (solo del padre) chequeaba únicamente "hay
 * alguien logueado", no el rol — una sesión propia de un hijo (custom token
 * de `/entrar/[parentId]`, p. ej. una pestaña vieja que nunca cerró sesión;
 * la persistencia de Firebase Auth es compartida entre pestañas del mismo
 * origen, así que esa sesión puede pisar silenciosamente la del padre en
 * cualquier otra pestaña) igual tenía `user` no nulo: el panel renderizaba
 * como si fuera el padre y cada lectura de Firestore fallaba después con
 * "Missing or insufficient permissions" — las reglas sí distinguían el rol,
 * esta pantalla no.
 *
 * `FamilyProvider` se mockea como passthrough: lo que se prueba acá es el
 * gate de `PanelShell`, no la carga de datos de la familia.
 */
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/panel/editor",
}));

const signOut = vi.fn(async () => {});
vi.mock("firebase/auth", () => ({
  signOut: () => signOut(),
}));

vi.mock("@/lib/firebase", () => ({
  getFirebase: async () => ({ auth: {} }),
}));

vi.mock("./FamilyProvider", () => ({
  FamilyProvider: ({ children }: { children: React.ReactNode }) => children,
}));

let authValue: { user: { uid: string; email?: string | null } | null; loading: boolean; role: "parent" | "child" | null };
vi.mock("@/lib/AuthProvider", () => ({
  useAuth: () => authValue,
}));

describe("PanelShell — solo el padre entra a /panel/**", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('con role "child" (sesión propia de un hijo), cierra esa sesión y redirige a /login sin renderizar el panel', async () => {
    authValue = { user: { uid: "child:padre-1:hijo-1" }, loading: false, role: "child" };
    render(
      <PanelShell>
        <p>Contenido del panel</p>
      </PanelShell>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Contenido del panel")).not.toBeInTheDocument();
  });

  test('con role "parent", no redirige ni cierra sesión, y renderiza el panel', () => {
    authValue = { user: { uid: "padre-1", email: "padre@test.com" }, loading: false, role: "parent" };
    render(
      <PanelShell>
        <p>Contenido del panel</p>
      </PanelShell>,
    );

    expect(replace).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    expect(screen.getByText("Contenido del panel")).toBeInTheDocument();
  });

  test("sin sesión, redirige a /login sin intentar cerrar sesión", async () => {
    authValue = { user: null, loading: false, role: null };
    render(
      <PanelShell>
        <p>Contenido del panel</p>
      </PanelShell>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(signOut).not.toHaveBeenCalled();
  });
});
