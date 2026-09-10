import { describe, expect, test } from "vitest";
import { BUNDLE_FORMAT, BUNDLE_FORMAT_VERSION, buildBundle, parseBundle } from "./bundle";

const MINIMAL_BUNDLE = {
  format: BUNDLE_FORMAT,
  formatVersion: BUNDLE_FORMAT_VERSION,
  exportedAt: 1000,
  sourceParentId: "padre-1",
  world: { id: "main" },
  levels: [],
  customModules: [],
  assets: [],
};

describe("parseBundle", () => {
  test("acepta un paquete bien formado", () => {
    const result = parseBundle(MINIMAL_BUNDLE);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.bundle.sourceParentId).toBe("padre-1");
  });

  test("rechaza un valor que no es un objeto", () => {
    const result = parseBundle("no soy un paquete");
    expect(result).toEqual({ ok: false, errors: expect.arrayContaining([expect.any(String)]) });
  });

  test("rechaza un formato desconocido, sin lanzar", () => {
    const result = parseBundle({ ...MINIMAL_BUNDLE, format: "otra-cosa" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.includes("no es un respaldo de Math Quest"))).toBe(true);
  });

  test("rechaza una formatVersion futura, sin lanzar", () => {
    const result = parseBundle({ ...MINIMAL_BUNDLE, formatVersion: BUNDLE_FORMAT_VERSION + 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.includes("versión más nueva"))).toBe(true);
  });

  test("rechaza un JSON sin las claves obligatorias, listando cada una", () => {
    const result = parseBundle({ format: BUNDLE_FORMAT });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors.some((e) => e.includes("mundo"))).toBe(true);
      expect(result.errors.some((e) => e.includes("niveles"))).toBe(true);
    }
  });
});

describe("buildBundle", () => {
  test("arma el sobre con el formato y la fecha actuales", () => {
    const bundle = buildBundle({
      sourceParentId: "padre-1",
      world: { id: "main" } as never,
      levels: [],
      customModules: [],
      assets: [],
    });
    expect(bundle.format).toBe(BUNDLE_FORMAT);
    expect(bundle.formatVersion).toBe(BUNDLE_FORMAT_VERSION);
    expect(bundle.exportedAt).toBeGreaterThan(0);
  });
});
