import type { Vec2 } from "@/lib/level/schema";

/**
 * Modelo de datos del Mundo del juego — Fase 16 (docs/level-editor-plan-v2.md
 * §3). Vive en un módulo propio, `gameworld` y no `world`, para no colisionar
 * con `src/lib/world/**` (Ciudad Central legacy, que no se toca).
 *
 * Un `LevelDefinition` sigue siendo autocontenido (se carga, valida y juega
 * sin leer nada más, docs/level-editor-plan.md §4); el grafo de niveles, la
 * historia y las reglas generales viven en este documento hermano, propio,
 * para que validar el mundo entero no requiera leer los N niveles.
 */

export const WORLD_SCHEMA_VERSION = 1;

/** Único id de mundo hoy — colección (no doc suelto) para no cerrar la
 *  puerta a varios mundos por padre en el futuro. */
export const MAIN_WORLD_ID = "main";

export interface GameWorld {
  id: string;
  name: string;
  /** Versionado optimista — mismo mecanismo que `LevelDefinition.version`. */
  version: number;
  schemaVersion: number;
  story: WorldStory;
  chapters: WorldChapter[];
  nodes: WorldNode[];
  links: WorldLink[];
  rules: WorldRules;
  avatars: AvatarCatalog;
  metadata: { authorUid: string; createdAt: number; updatedAt: number };
}

/* ════════════════════════════════════════════════════════════════════════
 * HISTORIA
 * ════════════════════════════════════════════════════════════════════════ */

/** Casi igual a `LevelDialogLine` (level/schema.ts), pero con `speaker` como
 *  texto libre: a nivel de mundo no hay entidades de un nivel a las que
 *  referenciar. */
export interface StoryBeat {
  id: string;
  speaker: string | null;
  portrait: string;
  text: string;
}

export interface WorldStory {
  title: string;
  /** ≤240 caracteres — se muestra en el mapa del jugador. */
  logline: string;
  protagonistName: string;
  mentorName: string;
  antagonistName: string;
  energyName: string;
  counterEnergyName: string;
  intro: StoryBeat[];
  outro: StoryBeat[];
}

export interface WorldChapter {
  id: string;
  order: number;
  title: string;
  synopsis: string;
  /** Clave de `STRAND_NARRATIVE` (src/lib/narrative.ts) o un slug libre —
   *  puente entre el diccionario decorativo existente y el mundo real. */
  regionSlug: string;
  intro: StoryBeat[];
  outro: StoryBeat[];
}

/* ════════════════════════════════════════════════════════════════════════
 * GRAFO DE NIVELES
 * ════════════════════════════════════════════════════════════════════════ */

export type WorldUnlockRule =
  | { kind: "always" }
  | { kind: "afterLevels"; levelIds: string[]; mode: "all" | "any" }
  | { kind: "afterModules"; moduleIds: string[]; mode: "all" | "any" } // dominados (isMastered)
  | { kind: "afterStars"; stars: number }; // saldo real de starLedger

export interface WorldNode {
  /** → /parents/{uid}/levels/{levelId}. También el id de nodo (un nivel
   *  aparece a lo sumo una vez en el mapa). */
  levelId: string;
  chapterId: string | null;
  /** % del lienzo del mapa (0-100) — mismo sistema de coordenadas que todo
   *  el editor. */
  position: Vec2;
  label: string;
  /** Emoji, mismo criterio que `ModuleDef.emoji`. */
  icon: string;
  unlock: WorldUnlockRule;
  /** Punto de entrada del mundo — `validateWorld` exige exactamente uno. */
  isStart: boolean;
}

export interface WorldLink {
  id: string;
  fromLevelId: string;
  toLevelId: string;
  /** El `LevelExit` del nivel de origen que materializa esta arista. `null`
   *  = la arista solo existe en el mapa (se viaja por el mapa, no por una
   *  puerta dentro del nivel). */
  exitId: string | null;
  label: string;
}

/* ════════════════════════════════════════════════════════════════════════
 * REGLAS GENERALES
 * ════════════════════════════════════════════════════════════════════════ */

/**
 * `defaultSoundOn` se retiró en la Fase 29 (docs/plan-jugabilidad.md §3): un
 * documento de Mundo viejo puede seguir teniendo ese campo en Firestore —
 * `migrateWorld` no lo toca, y no hace falta: TS simplemente deja de leerlo.
 * Siempre lo pisaba `useSoundPreference` (preferencia de dispositivo), que
 * gana siempre — nunca tuvo efecto real.
 */
export interface WorldRules {
  levelCompletion: "allChallengesCorrect" | "allChallengesMastered" | "anyChallengeCorrect";
  /** Volver a un nivel ya completado. */
  allowReplay: boolean;
  /** Al completar un nivel (según `levelCompletion`), ofrece ir al mapa en
   *  vez de navegar solo — el runtime no conoce el grafo del mundo (nodos/
   *  desbloqueos), así que no apunta a un nivel específico; el mapa
   *  (Fase 28) ya muestra qué sigue disponible. */
  autoAdvance: boolean;
  /** Un desafío bloquea el paso, o solo recompensa. */
  challengesAreMandatory: boolean;
  /** 0 = ilimitado. */
  maxAttemptsPerChallenge: number;
  /** Intentos antes de ofrecer una pista. */
  hintsAfterAttempts: number;
  /** Qué hacer cuando el módulo de un desafío no está desbloqueado
   *  (`isUnlocked` falso) para ese hijo. */
  lockedModulePolicy: "hide" | "showLocked" | "allowAnyway";
  /** Habilita la grilla de nodos en /jugar/{childId}/mapa. Con esto en
   *  `false` esa ruta sigue existiendo como hub (barra superior, zonas,
   *  boss, tienda, diario) — solo se oculta el mapa de niveles en sí, para
   *  mundos lineales que no quieren mostrarlo (Fase 28, docs/plan-
   *  jugabilidad.md §2.5). */
  showWorldMap: boolean;
  /** Volver a mostrar la intro del mundo/capítulo cada vez, o solo la 1.ª. */
  replayStoryBeats: boolean;
}

/* ════════════════════════════════════════════════════════════════════════
 * AVATARES (catálogo — la UI de selección es Fase 19)
 * ════════════════════════════════════════════════════════════════════════ */

export interface AvatarDef {
  id: string;
  label: string;
  /** Sprite de cuerpo entero — reemplaza `/illustrations/explorer.webp`. */
  bodySrc: string;
  /** Retrato — reemplaza `/illustrations/avatar.webp`. */
  headshotSrc: string;
  /** Ajuste para arte de proporciones distintas. */
  scale: number;
  unlock: WorldUnlockRule;
}

export interface AvatarCatalog {
  avatars: AvatarDef[];
  defaultAvatarId: string;
}

/* ════════════════════════════════════════════════════════════════════════
 * VALIDACIÓN
 * ════════════════════════════════════════════════════════════════════════ */

/** A qué clase de elemento del mundo apunta un `WorldIssue` — mismo criterio
 *  que `LevelIssueTargetKind` (level/schema.ts): vocabulario propio, para que
 *  este módulo no tenga que conocer el `Selection` del Editor de Mundo. */
export type WorldIssueTargetKind = "node" | "link" | "chapter" | "story" | "rules";

export interface WorldIssueTarget {
  kind: WorldIssueTargetKind;
  id?: string;
}

export interface WorldIssue {
  severity: "error" | "warning";
  message: string;
  target?: WorldIssueTarget;
}
