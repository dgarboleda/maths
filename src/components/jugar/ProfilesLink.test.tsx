import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { ProfilesLink } from "./ProfilesLink";

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }));
vi.mock("@/lib/AuthProvider", () => ({ useAuth }));

describe("ProfilesLink", () => {
  test("la familia ve el enlace a perfiles", () => {
    useAuth.mockReturnValue({ role: "parent" });
    render(<ProfilesLink childFallback="Volver al inicio">Perfiles</ProfilesLink>);
    expect(screen.getByRole("link", { name: "Perfiles" })).toHaveAttribute("href", "/perfiles");
  });

  test("una sesión infantil no ve un enlace que no puede usar", () => {
    useAuth.mockReturnValue({ role: "child", childId: "h" });
    render(<ProfilesLink>Perfiles</ProfilesLink>);
    expect(screen.queryByRole("link")).toBeNull();
  });

  test("en pantallas de error la sesión infantil vuelve a su inicio", () => {
    useAuth.mockReturnValue({ role: "child", childId: "h" });
    render(<ProfilesLink childFallback="Volver al inicio">Volver a perfiles</ProfilesLink>);
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/");
  });
});
