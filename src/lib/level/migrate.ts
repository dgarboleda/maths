import { LEVEL_SCHEMA_VERSION, type LevelDefinition } from "./schema";

/** `targetHref` (schemaVersion 1) → `target` tipado (schemaVersion 2) —
 *  docs/level-editor-plan-v2.md §3.4. Mismas 3 reglas con las que el editor
 *  ya interpreta un `targetHref` viejo. */
function migrateExitTarget(targetHref: unknown): { kind: "level"; levelId: string } | { kind: "worldMap" } | { kind: "href"; href: string } {
  if (typeof targetHref !== "string" || targetHref === "" || targetHref === "/panel") return { kind: "worldMap" };
  const match = /^\/jugar\/[^/]+\/nivel\/(.+)$/.exec(targetHref);
  if (match) return { kind: "level", levelId: match[1] };
  return { kind: "href", href: targetHref };
}

/**
 * Cadena de migraciones de esquema, aplicada al leer un nivel desde
 * Firestore (`levelRepository.getLevel`, Fase 3) — nunca al guardar. Cada
 * entrada transforma la forma cruda de la versión `N` a la forma cruda de
 * `N+1`; `migrateLevel` las encadena hasta `LEVEL_SCHEMA_VERSION`.
 *
 * docs/level-editor-plan.md §17 Fase 2, §13 T7: la estructura quedó montada
 * desde la Fase 3 vacía, a propósito, para que el día que el esquema
 * cambiara la migración fuera añadir una entrada acá — la 1→2 (Fase 16) es
 * la primera vez que se usa de verdad.
 */
export const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  // v1 -> v2: cada LevelExit gana `target` tipado; `targetHref` se conserva
  // (deprecado) para no perder el dato crudo, pero nada vuelve a leerlo.
  1: (raw) => {
    const navigation = raw.navigation as Record<string, unknown> | undefined;
    if (!navigation || !Array.isArray(navigation.exits)) return raw;
    const exits = (navigation.exits as Record<string, unknown>[]).map((exit) =>
      exit.target ? exit : { ...exit, target: migrateExitTarget(exit.targetHref) },
    );
    return { ...raw, navigation: { ...navigation, exits } };
  },
};

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
