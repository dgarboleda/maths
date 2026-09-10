import { WORLD_SCHEMA_VERSION, type GameWorld } from "./schema";

/**
 * Cadena de migraciones del Mundo — mismo mecanismo que `src/lib/level/
 * migrate.ts`. Vacía hoy (solo existe la versión 1); queda montada para
 * cuando el esquema del Mundo cambie.
 */
export const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {};

export class UnknownWorldSchemaVersionError extends Error {
  version: unknown;
  constructor(version: unknown) {
    super(`No sé migrar un mundo con schemaVersion ${JSON.stringify(version)} (la versión más nueva conocida es ${WORLD_SCHEMA_VERSION}).`);
    this.name = "UnknownWorldSchemaVersionError";
    this.version = version;
  }
}

export function migrateWorld(raw: Record<string, unknown>): GameWorld {
  let version = typeof raw.schemaVersion === "number" ? raw.schemaVersion : 1;
  let current = raw;

  while (version < WORLD_SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new UnknownWorldSchemaVersionError(version);
    current = step(current);
    version += 1;
  }
  if (version > WORLD_SCHEMA_VERSION) throw new UnknownWorldSchemaVersionError(version);

  return { ...current, schemaVersion: WORLD_SCHEMA_VERSION } as unknown as GameWorld;
}
