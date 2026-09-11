import { describe, expect, test } from "vitest";
import { createEmptyWorld } from "./defaults";
import { currentChapterMoment, currentStoryMoment } from "./storyProgress";
import type { GameWorld, StoryBeat, WorldChapter } from "./schema";

/** Fase 30 (docs/plan-jugabilidad.md §4). */

function beat(text: string): StoryBeat {
  return { id: `beat-${text}`, speaker: null, portrait: "", text };
}

function worldWith(overrides: Partial<GameWorld>): GameWorld {
  return { ...createEmptyWorld("padre-1"), ...overrides };
}

describe("currentStoryMoment", () => {
  test("con intro sin ver y sin nodos completos, devuelve la intro", () => {
    const world = worldWith({ story: { ...createEmptyWorld("p").story, intro: [beat("hola")] } });
    const moment = currentStoryMoment(world, { seenStoryIds: [], allNodesComplete: false });
    expect(moment).toEqual({ storyId: "world:intro", beats: [beat("hola")] });
  });

  test("con la intro ya vista, no la repite", () => {
    const world = worldWith({ story: { ...createEmptyWorld("p").story, intro: [beat("hola")] } });
    const moment = currentStoryMoment(world, { seenStoryIds: ["world:intro"], allNodesComplete: false });
    expect(moment).toBeNull();
  });

  test("con replayStoryBeats: true, la intro se repite aunque ya se vio", () => {
    const base = createEmptyWorld("p");
    const world = worldWith({ story: { ...base.story, intro: [beat("hola")] }, rules: { ...base.rules, replayStoryBeats: true } });
    const moment = currentStoryMoment(world, { seenStoryIds: ["world:intro"], allNodesComplete: false });
    expect(moment?.storyId).toBe("world:intro");
  });

  test("el outro solo aparece con allNodesComplete: true", () => {
    const world = worldWith({ story: { ...createEmptyWorld("p").story, outro: [beat("fin")] } });
    expect(currentStoryMoment(world, { seenStoryIds: [], allNodesComplete: false })).toBeNull();
    expect(currentStoryMoment(world, { seenStoryIds: [], allNodesComplete: true })?.storyId).toBe("world:outro");
  });

  test("con intro y outro pendientes a la vez, prioriza el outro", () => {
    const base = createEmptyWorld("p");
    const world = worldWith({ story: { ...base.story, intro: [beat("hola")], outro: [beat("fin")] } });
    const moment = currentStoryMoment(world, { seenStoryIds: [], allNodesComplete: true });
    expect(moment?.storyId).toBe("world:outro");
  });

  test("sin intro ni outro autorados, no hay nada que mostrar", () => {
    const world = worldWith({});
    expect(currentStoryMoment(world, { seenStoryIds: [], allNodesComplete: true })).toBeNull();
  });
});

describe("currentChapterMoment", () => {
  const chapter: WorldChapter = { id: "cap-1", order: 0, title: "Capítulo 1", synopsis: "", regionSlug: "aritmetica", intro: [beat("bienvenido")], outro: [] };

  test("chapterId null nunca devuelve nada (el caso de hoy: ningún nodo lo asigna)", () => {
    const world = worldWith({ chapters: [chapter] });
    expect(currentChapterMoment(world, null, { seenStoryIds: [] })).toBeNull();
  });

  test("con un chapterId real y su intro sin ver, la devuelve", () => {
    const world = worldWith({ chapters: [chapter] });
    const moment = currentChapterMoment(world, "cap-1", { seenStoryIds: [] });
    expect(moment).toEqual({ storyId: "chapter:cap-1:intro", beats: [beat("bienvenido")] });
  });

  test("con la intro del capítulo ya vista, no la repite", () => {
    const world = worldWith({ chapters: [chapter] });
    expect(currentChapterMoment(world, "cap-1", { seenStoryIds: ["chapter:cap-1:intro"] })).toBeNull();
  });

  test("un chapterId que no existe en world.chapters no rompe nada", () => {
    const world = worldWith({ chapters: [chapter] });
    expect(currentChapterMoment(world, "cap-inexistente", { seenStoryIds: [] })).toBeNull();
  });
});
