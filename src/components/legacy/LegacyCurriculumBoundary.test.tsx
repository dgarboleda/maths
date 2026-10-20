import { expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { isLegacyPath, LegacyCurriculumBoundary } from "./LegacyCurriculumBoundary";

vi.mock("next/navigation", () => ({ usePathname: () => "/jugar/alex/aprende/angulos" }));

test("las clases, el plan, los informes y el mapa no necesitan el currículum anterior", () => {
  for (const path of ["/jugar/alex", "/jugar/alex/aprende/angulos", "/jugar/alex/mapa", "/jugar/alex/practicar", "/jugar/alex/aventura", "/panel", "/panel/hijos", "/panel/alex", "/panel/plan", "/panel/progreso", "/panel/ajustes", "/panel/recompensas"])
    expect(isLegacyPath(path), path).toBe(false);
  render(<LegacyCurriculumBoundary parentId="family"><p>La clase está disponible</p></LegacyCurriculumBoundary>);
  expect(screen.getByText("La clase está disponible")).toBeVisible();
});

test("las rutas de compatibilidad siguen hidratando los módulos personalizados", () => {
  for (const path of ["/jugar/alex/nivel/uno", "/jugar/alex/aritmetica/cst-uno", "/jugar/alex/mapa-anterior", "/jugar/alex/evaluacion", "/panel/archivo/alex", "/panel/editor/uno", "/panel/curriculum/cst-uno"])
    expect(isLegacyPath(path), path).toBe(true);
});
