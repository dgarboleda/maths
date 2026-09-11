import { describe, expect, test } from "vitest";
import { validateLevel } from "./validate";
import { buildSalaConTerminal } from "./templates/salaConTerminal";

/** Fase 33 (docs/plan-jugabilidad.md §7): un `activityId` que no está en el
 *  registro (`activities/registry.ts`) se reporta como error clicable —
 *  nunca rompe el juego real (el runtime cae a "puzzle" en silencio), pero
 *  el autor se entera antes de publicar. */
function levelConChallenge() {
  const level = buildSalaConTerminal("padre-1", "Sala de prueba", {
    src: "/illustrations/academia-infinita.webp",
    width: 1024,
    height: 768,
    alt: "Sala de prueba",
    projection: "flat",
  });
  level.challenges = [{ ...level.challenges[0], moduleId: "aritmetica-d1" }];
  return level;
}

describe("validateLevel — activityId (Fase 33)", () => {
  test('activityId "puzzle" (el default) no reporta ningún error de actividad', () => {
    const level = levelConChallenge();
    const issues = validateLevel(level);
    const activityIssues = issues.filter((i) => i.message.includes("actividad desconocida"));
    expect(activityIssues).toHaveLength(0);
  });

  test('un activityId fuera del registro se reporta como error sobre ese desafío', () => {
    const level = levelConChallenge();
    level.challenges[0].activityId = "algo-que-no-existe";
    const issues = validateLevel(level);
    const activityIssue = issues.find((i) => i.target?.kind === "challenge" && i.target.id === level.challenges[0].id);
    expect(activityIssue).toEqual(
      expect.objectContaining({ severity: "error", message: expect.stringContaining("actividad desconocida") }),
    );
  });

  test('"cohete" (la otra actividad del registro) tampoco reporta error', () => {
    const level = levelConChallenge();
    level.challenges[0].activityId = "cohete";
    const issues = validateLevel(level);
    const activityIssues = issues.filter((i) => i.message.includes("actividad desconocida"));
    expect(activityIssues).toHaveLength(0);
  });
});
