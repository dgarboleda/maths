import { LEVEL_SCHEMA_VERSION, type LevelDefinition } from "./schema";

/**
 * Cadena de migraciones de esquema, aplicada al leer un nivel desde
 * Firestore (`levelRepository.getLevel`, Fase 3) — nunca al guardar. Cada
 * entrada transforma la forma cruda de la versión `N` a la forma cruda de
 * `N+1`; `migrateLevel` las encadena hasta `LEVEL_SCHEMA_VERSION`.
 *
 * Hoy solo existe la versión 1, así que la cadena está vacía — pero la
 * estructura queda montada desde esta fase para que el día que el esquema
 * cambie, la migración sea añadir una entrada acá, no diseñar el mecanismo
 * (docs/level-editor-plan.md §17 Fase 2, §13 T7).
 */
export const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {};

export class UnknownSchemaVersionError extends Error {
  version: unknown;
  constructor(version: unknown) {
    super(`No sé migrar un nivel con schemaVersion ${JSON.stringify(version)} (la versión más nueva conocida es ${LEVEL_SCHEMA_VERSION}).`);
    this.version = version;
    this.name = "UnknownSchemaVersionError";
  }
}

/**
 * Migra un objeto crudo (tal como sale de Firestore, sin tipar) a la forma
 * de `LEVEL_SCHEMA_VERSION`. Si ya está en la versión actual, lo devuelve
 * sin tocar. No valida el CONTENIDO del nivel — eso es trabajo de
 * `validateLevel`; esta función solo se ocupa de la FORMA del documento.
 */
export function migrateLevel(raw: Record<string, unknown>): LevelDefinition {
  let version = typeof raw.schemaVersion === "number" ? raw.schemaVersion : 1;
  let current = raw;

  while (version < LEVEL_SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new UnknownSchemaVersionError(version);
    current = step(current);
    version += 1;
  }
  if (version > LEVEL_SCHEMA_VERSION) throw new UnknownSchemaVersionError(version);

  return { ...current, schemaVersion: LEVEL_SCHEMA_VERSION } as unknown as LevelDefinition;
}
