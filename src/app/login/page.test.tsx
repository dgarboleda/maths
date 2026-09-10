import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import LoginPage from "./page";

/**
 * Accesibilidad de la pantalla de entrada — antes
 * `e2e/accesibilidad.spec.ts` ("pantalla de entrada"), un escaneo de axe
 * contra un navegador real. `getFirebase()` no se llama hasta enviar el
 * formulario, así que alcanza con mockear `next/navigation`.
 */
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

describe("LoginPage — accesibilidad", () => {
  test("sin violaciones de WCAG 2.1 A/AA", async () => {
    const { container } = render(<LoginPage />);
    expect(screen.getByRole("heading", { name: "Math Quest" })).toBeVisible();
    expect(await axe(container)).toHaveNoViolations();
  });
});
