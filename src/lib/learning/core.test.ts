import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { LESSONS } from "./domain";
import { CONTENT_VERSION, LESSON_INDEX } from "./core";

const ROOT = resolve(__dirname, "../../..");

/** Imports estáticos (no `import()`) alcanzables desde un archivo. */
function staticGraph(entry: string): Set<string> {
  const seen = new Set<string>();
  const pending = [resolve(ROOT, entry)];
  while (pending.length) {
    const file = pending.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, "utf8");
    // `import type` se borra al compilar: no llega al navegador.
    for (const [, spec] of source.matchAll(/(?:^|\n)\s*(?:import|export)\s(?!type\s)[^'"]*?from\s+["']([^"']+)["']/g)) {
      if (!spec.startsWith(".") && !spec.startsWith("@/")) continue;
      const base = spec.startsWith("@/") ? resolve(ROOT, "src", spec.slice(2)) : resolve(dirname(file), spec);
      const found = ["", ".ts", ".tsx", "/index.ts"].map((ext) => base + ext).find((p) => existsSync(p) && !p.endsWith(".css"));
      if (found && /\.tsx?$/.test(found)) pending.push(found);
    }
  }
  return seen;
}

describe("Catálogo dividido", () => {
  test("el índice ligero coincide con el catálogo (regenéralo con `npm run indice:lecciones`)", () => {
    expect(LESSON_INDEX).toEqual(
      LESSONS.map(({ id, unitId, title, prerequisites }) => ({ id, unitId, title, prerequisites })),
    );
    for (const lesson of LESSONS) expect(lesson.version).toBe(CONTENT_VERSION);
  });

  test.each([
    "src/app/jugar/[childId]/aprende/[lessonId]/page.tsx",
  ])("la página de una clase no lleva el catálogo al navegador: %s", (page) => {
    // El servidor resuelve la clase; los componentes de cliente de la página
    // no deben alcanzar el catálogo con imports estáticos.
    for (const entry of ["src/components/learning/LessonPlayer.tsx", "src/components/learning/SessionPlayer.tsx"]) {
      const graph = [...staticGraph(entry)].map((p) => p.slice(ROOT.length + 1));
      expect(graph, entry).not.toContain("functions/src/learning/catalog.ts");
      expect(graph, entry).not.toContain("src/lib/learning/domain.ts");
    }
    expect(readFileSync(resolve(ROOT, page), "utf8")).toContain("lesson={getLesson(lessonId)}");
  });
});
