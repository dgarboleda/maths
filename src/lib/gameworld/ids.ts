/** Mismo criterio que `src/lib/level/ids.ts` (`crypto.randomUUID()` con
 *  prefijo legible por tipo de elemento). */
function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function newChapterId(): string {
  return generateId("chapter");
}
export function newLinkId(): string {
  return generateId("link");
}
export function newBeatId(): string {
  return generateId("beat");
}
export function newAvatarId(): string {
  return generateId("avatar");
}
