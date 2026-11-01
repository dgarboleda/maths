import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LegalConsentGate, backendBehind } from "./LegalConsentGate";

const accept = vi.fn();
let parentDoc: Record<string, unknown> = {};

vi.mock("@/lib/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "familia" }, role: "parent", loading: false }),
}));
vi.mock("@/lib/firebase", () => ({
  getFirebase: async () => ({
    db: {},
    auth: {},
    firestore: { doc: () => ({}), getDoc: async () => ({ data: () => parentDoc }) },
  }),
}));
vi.mock("@/lib/legal", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/legal")>()),
  acceptLegalTerms: () => accept(),
}));
vi.mock("firebase/auth", () => ({ signOut: vi.fn() }));

function renderGate() {
  render(<LegalConsentGate><p>Panel familiar</p></LegalConsentGate>);
}

async function acceptTerms() {
  await userEvent.click(await screen.findByRole("checkbox", { name: /tutor legal/ }));
  await userEvent.click(screen.getByRole("button", { name: "Aceptar y continuar" }));
}

describe("LegalConsentGate", () => {
  beforeEach(() => { accept.mockReset(); parentDoc = {}; });

  test("con la versión vigente aceptada, muestra el contenido sin preguntar", async () => {
    const { LEGAL_VERSION } = await import("@/lib/legal");
    parentDoc = { legalConsent: { version: LEGAL_VERSION } };
    renderGate();
    expect(await screen.findByText("Panel familiar")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  test("sin aceptación, pide la casilla y continúa cuando el servidor la registra", async () => {
    accept.mockResolvedValue(undefined);
    renderGate();
    expect(await screen.findByRole("button", { name: "Aceptar y continuar" })).toBeDisabled();
    await acceptTerms();
    expect(accept).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Panel familiar")).toBeInTheDocument();
  });

  test("si Functions aún no tiene el callable, no deja a la familia fuera", async () => {
    // Un callable inexistente responde 404 sin CORS: el SDK lo reporta como internal.
    accept.mockRejectedValue(Object.assign(new Error("internal"), { code: "functions/internal" }));
    renderGate();
    await acceptTerms();
    expect(await screen.findByText("Panel familiar")).toBeInTheDocument();
  });

  test("un rechazo de permisos sigue bloqueando y lo explica", async () => {
    accept.mockRejectedValue(Object.assign(new Error("denied"), { code: "functions/permission-denied" }));
    renderGate();
    await acceptTerms();
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar tu aceptación");
    expect(screen.queryByText("Panel familiar")).not.toBeInTheDocument();
  });

  test("clasifica los errores de servidor desactualizado", () => {
    for (const code of ["functions/not-found", "functions/internal", "functions/unavailable", "functions/failed-precondition"])
      expect(backendBehind({ code })).toBe(true);
    for (const code of ["functions/permission-denied", "functions/unauthenticated", undefined])
      expect(backendBehind({ code })).toBe(false);
  });
});
