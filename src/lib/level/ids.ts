/**
 * Generación de ids del Level Editor. Mismo criterio que ya usa el resto del
 * proyecto (`crypto.randomUUID()`, ver `src/lib/attemptRecorder.ts:41`),
 * con un prefijo legible por tipo de elemento — así un id que aparece en un
 * mensaje de error o en el inspector del navegador dice de qué es sin tener
 * que buscarlo.
 */
function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function newLevelId(): string {
  return generateId("level");
}
export function newEntityId(): string {
  return generateId("entity");
}
export function newPolygonId(): string {
  return generateId("polygon");
}
export function newZoneId(): string {
  return generateId("zone");
}
export function newDialogId(): string {
  return generateId("dialog");
}
export function newChallengeId(): string {
  return generateId("challenge");
}
export function newMissionId(): string {
  return generateId("mission");
}
export function newObjectiveId(): string {
  return generateId("objective");
}
export function newEventId(): string {
  return generateId("event");
}
export function newExitId(): string {
  return generateId("exit");
}
export function newBackgroundLayerId(): string {
  return generateId("bglayer");
}
export function newBackgroundFilterId(): string {
  return generateId("bgfilter");
}
export function newAssetId(): string {
  return generateId("asset");
}
