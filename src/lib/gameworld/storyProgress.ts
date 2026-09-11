import type { GameWorld, StoryBeat } from "./schema";

/**
 * Qué secuencia de `StoryBeat` corresponde mostrar ahora — Fase 30
 * (docs/plan-jugabilidad.md §4). Puro: nunca toca Firestore, nunca decide
 * por sí mismo si algo "ya se vio" — eso lo dice `seenStoryIds`, que el
 * llamador lee del `ChildProfile` real y actualiza al cerrar el overlay.
 */
export interface StoryMoment {
  /** Id sintético para marcar como visto — no es el id de ningún `StoryBeat`
   *  en particular, sino de la secuencia completa. */
  storyId: string;
  beats: StoryBeat[];
}

/**
 * Intro/outro del mundo. El outro solo corresponde con `allNodesComplete`
 * (calculado por el llamador — el mapa ya tiene `worldGraphState` a mano):
 * un mundo sin nodos nunca lo cumple, para no mostrar el cierre de la
 * aventura en un mundo vacío. Prioridad al outro sobre el intro si por
 * algún motivo ambos corresponderían a la vez (un mundo con un único nodo
 * ya completado y el intro nunca visto) — es el momento narrativo "más
 * avanzado" de los dos.
 */
export function currentStoryMoment(world: GameWorld, opts: { seenStoryIds: string[]; allNodesComplete: boolean }): StoryMoment | null {
  const replay = world.rules.replayStoryBeats;
  const seen = (id: string) => !replay && opts.seenStoryIds.includes(id);

  if (opts.allNodesComplete && world.story.outro.length > 0 && !seen("world:outro")) {
    return { storyId: "world:outro", beats: world.story.outro };
  }
  if (world.story.intro.length > 0 && !seen("world:intro")) {
    return { storyId: "world:intro", beats: world.story.intro };
  }
  return null;
}

/**
 * Intro de un capítulo, al entrar por primera vez a un nodo con ese
 * `chapterId`. Lógica lista y probada, pero sin llamador todavía: hoy
 * ningún nodo autorado tiene un `chapterId` real (`panel/editor/page.tsx`
 * lo escribe siempre `null` — corresponde a otra fase asignarlo desde el
 * editor). `chapterId: null` (el caso de hoy) siempre devuelve `null`.
 */
export function currentChapterMoment(world: GameWorld, chapterId: string | null, opts: { seenStoryIds: string[] }): StoryMoment | null {
  if (!chapterId) return null;
  const chapter = world.chapters.find((c) => c.id === chapterId);
  if (!chapter || chapter.intro.length === 0) return null;
  const storyId = `chapter:${chapterId}:intro`;
  if (!world.rules.replayStoryBeats && opts.seenStoryIds.includes(storyId)) return null;
  return { storyId, beats: chapter.intro };
}
