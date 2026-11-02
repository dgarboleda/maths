import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import Home from "./page";

const { replace, useAuth } = vi.hoisted(() => ({ replace: vi.fn(), useAuth: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/lib/AuthProvider", () => ({ useAuth }));

beforeEach(() => { replace.mockReset(); });

describe("inicio de la aplicación", () => {
  test.each([
    [{ user: null, loading: false, role: null }, "/login"],
    [{ user: {}, loading: false, role: "parent" }, "/perfiles"],
    [{ user: {}, loading: false, role: "child", childId: "hijo-1" }, "/jugar/hijo-1"],
    [{ user: {}, loading: false, role: null }, "/login"],
  ])("dirige la sesión a su destino", async (auth, destination) => {
    useAuth.mockReturnValue(auth);
    render(<Home />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith(destination));
  });

  test("espera a que se cargue la sesión", () => {
    useAuth.mockReturnValue({ user: null, loading: true, role: null });
    render(<Home />);
    expect(replace).not.toHaveBeenCalled();
  });
});
