import { describe, expect, test } from "vitest";
import { validateLevel } from "../validate";
import type { LevelBackground } from "../schema";
import { LEVEL_TEMPLATES } from "./index";

const BACKGROUND: LevelBackground = {
  src: "/illustrations/city-central.webp",
  width: 1600,
  height: 907,
  alt: "Fondo de prueba",
  projection: "flat",
};

function buildById(id: string) {
  const template = LEVEL_TEMPLATES.find((t) => t.id === id);
  if (!template) throw new Error(`No hay plantilla "${id}"`);
  return template.build("padre-de-prueba", "Mi nivel", BACKGROUND);
}

describe("plantillas de nivel — Fase 25", () => {
  test("hay exactamente 3 plantillas registradas", () => {
    expect(LEVEL_TEMPLATES.map((t) => t.id)).toEqual(["sala-con-terminal", "pasillo-con-puerta", "encuentro-con-npc"]);
  });

  test("sala-con-terminal: exactamente 1 error (moduleId sin asignar), ningún otro", () => {
    const errors = validateLevel(buildById("sala-con-terminal")).filter((i) => i.severity === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].target?.kind).toBe("challenge");
  });

  test("pasillo-con-puerta: exactamente 2 errores (moduleId y destino de la salida), ningún otro", () => {
    const errors = validateLevel(buildById("pasillo-con-puerta")).filter((i) => i.severity === "error");
    expect(errors).toHaveLength(2);
    expect(errors.map((e) => e.target?.kind).sort()).toEqual(["challenge", "exit"]);
  });

  test("encuentro-con-npc: exactamente 1 error (moduleId sin asignar), ningún otro", () => {
    const errors = validateLevel(buildById("encuentro-con-npc")).filter((i) => i.severity === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].target?.kind).toBe("challenge");
  });

  test("cada plantilla usa el nombre y el fondo pasados", () => {
    for (const template of LEVEL_TEMPLATES) {
      const level = template.build("padre-de-prueba", "Mi nivel", BACKGROUND);
      expect(level.name).toBe("Mi nivel");
      expect(level.background).toEqual(BACKGROUND);
      expect(level.navigation.walkablePolygons.length).toBeGreaterThan(0);
    }
  });
});
