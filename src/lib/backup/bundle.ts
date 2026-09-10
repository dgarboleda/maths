import type { GameWorld } from "@/lib/gameworld/schema";
import type { LevelDefinition } from "@/lib/level/schema";
import type { LevelAsset } from "@/lib/level/assets/assetRepository";
import type { CustomModuleDoc } from "@/lib/curriculum/customSchema";

/**
 * Formato del paquete de respaldo — Fase 24 (docs/plan-salto-producto.md
 * §2.2). `formatVersion` desde el día uno: un paquete es un archivo que el
 * padre puede guardar durante años y abrir con una versión de la app que ya
 * no existe hoy.
 */
export const BUNDLE_FORMAT = "math-quest-bundle" as const;
export const BUNDLE_FORMAT_VERSION = 1;

export interface WorldBundle {
  format: typeof BUNDLE_FORMAT;
  formatVersion: number;
  exportedAt: number;
  /** Solo informativo: de qué cuenta salió. No se usa al importar (§2.1: v1
   *  solo restaura en la misma cuenta, nunca compara contra `parentId`). */
  sourceParentId: string;
  world: GameWorld;
  levels: LevelDefinition[];
  customModules: CustomModuleDoc[];
  /** Fichas de los assets — los BYTES no viajan (§2.3): viven en Cloud
   *  Storage, no en este JSON. */
  assets: LevelAsset[];
}

export function buildBundle(params: {
  sourceParentId: string;
  world: GameWorld;
  levels: LevelDefinition[];
  customModules: CustomModuleDoc[];
  assets: LevelAsset[];
}): WorldBundle {
  return {
    format: BUNDLE_FORMAT,
    formatVersion: BUNDLE_FORMAT_VERSION,
    exportedAt: Date.now(),
    ...params,
  };
}

export type ParseBundleResult = { ok: true; bundle: WorldBundle } | { ok: false; errors: string[] };

/**
 * Valida la forma de un paquete leído de un `.json` — nunca lanza, misma
 * convención que `validateLevel`/`validateWorld`. Solo valida el sobre del
 * paquete (formato, versión, presencia y tipo de cada sección): la
 * validación semántica profunda del mundo/niveles restaurados la sigue
 * haciendo `validateWorld`/`validateLevel` después de importar.
 */
export function parseBundle(raw: unknown): ParseBundleResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ["El archivo no es un paquete válido: se esperaba un objeto JSON."] };
  }
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];

  if (obj.format !== BUNDLE_FORMAT) {
    errors.push(`Este archivo no es un respaldo de Math Quest (formato "${String(obj.format)}" desconocido).`);
  }
  if (typeof obj.formatVersion !== "number") {
    errors.push("Al paquete le falta la versión del formato.");
  } else if (obj.formatVersion > BUNDLE_FORMAT_VERSION) {
    errors.push(
      `Este paquete es de una versión más nueva (${obj.formatVersion}) que la que esta app sabe leer (${BUNDLE_FORMAT_VERSION}). Actualizá la app antes de restaurar.`,
    );
  }
  if (typeof obj.sourceParentId !== "string") errors.push('Al paquete le falta "sourceParentId".');
  if (typeof obj.exportedAt !== "number") errors.push('Al paquete le falta "exportedAt".');
  if (typeof obj.world !== "object" || obj.world === null) errors.push('Al paquete le falta el "mundo".');
  if (!Array.isArray(obj.levels)) errors.push('Al paquete le falta la lista de "niveles".');
  if (!Array.isArray(obj.customModules)) errors.push('Al paquete le falta la lista de "módulos personalizados".');
  if (!Array.isArray(obj.assets)) errors.push('Al paquete le falta la lista de "imágenes".');

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    bundle: {
      format: BUNDLE_FORMAT,
      formatVersion: obj.formatVersion as number,
      exportedAt: obj.exportedAt as number,
      sourceParentId: obj.sourceParentId as string,
      world: obj.world as GameWorld,
      levels: obj.levels as LevelDefinition[],
      customModules: obj.customModules as CustomModuleDoc[],
      assets: obj.assets as LevelAsset[],
    },
  };
}
