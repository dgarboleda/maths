import { MAIN_WORLD_ID, WORLD_SCHEMA_VERSION, type GameWorld, type WorldRules } from "./schema";

export const DEFAULT_WORLD_RULES: WorldRules = {
  levelCompletion: "allChallengesCorrect",
  allowReplay: true,
  autoAdvance: false,
  challengesAreMandatory: true,
  maxAttemptsPerChallenge: 0,
  hintsAfterAttempts: 2,
  lockedModulePolicy: "showLocked",
  showWorldMap: true,
  replayStoryBeats: false,
};

/** Mundo vacío — se crea con `ensureWorld` la primera vez que hace falta
 *  (crear el primer nivel, o abrir el Editor de Mundo). Sin nodos, sin
 *  historia todavía: el padre la completa desde el Editor de Mundo. */
export function createEmptyWorld(authorUid: string): GameWorld {
  const now = Date.now();
  return {
    id: MAIN_WORLD_ID,
    name: "Math Quest",
    version: 1,
    schemaVersion: WORLD_SCHEMA_VERSION,
    story: {
      title: "Math Quest",
      logline: "",
      protagonistName: "Alex",
      mentorName: "Dra. Nia",
      antagonistName: "Khaos",
      energyName: "AXIA",
      counterEnergyName: "NEXUS",
      intro: [],
      outro: [],
    },
    chapters: [],
    nodes: [],
    links: [],
    rules: { ...DEFAULT_WORLD_RULES },
    avatars: { avatars: [], defaultAvatarId: "" },
    metadata: { authorUid, createdAt: now, updatedAt: now },
  };
}
