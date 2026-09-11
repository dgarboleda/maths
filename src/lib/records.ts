import type { Firestore } from "firebase/firestore";

/**
 * Marcas personales — Fase 35 (docs/plan-jugabilidad.md §9). Solo para la
 * carrera contrarreloj (`CoheteGeneric`, actividad "cohete"): guarda el
 * mejor puntaje (respuestas acertadas) por módulo, para mostrar "Tu marca" /
 * "¡Nueva marca!" en la pantalla final. Documento propio (`records/{id}`),
 * no toca `skillsProgress` ni estrellas — puramente informativo, como
 * `streak.ts`. Solo sube (P1): nunca se reduce un valor ya guardado.
 */
export interface PersonalRecord {
  best: number;
  at: number;
}

function recordDocId(activityId: string, moduleId: string): string {
  return `${activityId}:${moduleId}`;
}

export async function getRecord(
  firestoreFns: typeof import("firebase/firestore"),
  db: Firestore,
  parentId: string,
  childId: string,
  activityId: string,
  moduleId: string,
): Promise<PersonalRecord | null> {
  const { doc, getDoc } = firestoreFns;
  const snap = await getDoc(
    doc(db, "parents", parentId, "children", childId, "records", recordDocId(activityId, moduleId)),
  );
  return snap.exists() ? (snap.data() as PersonalRecord) : null;
}

/**
 * Guarda `score` como nueva marca solo si supera la marca previa (o si no
 * había ninguna) — si no la supera, no escribe nada. Devuelve la marca
 * vigente después de la llamada (la nueva si mejoró, la previa si no).
 */
export async function recordIfBest(
  firestoreFns: typeof import("firebase/firestore"),
  db: Firestore,
  parentId: string,
  childId: string,
  activityId: string,
  moduleId: string,
  score: number,
  prev: PersonalRecord | null,
  now: number = Date.now(),
): Promise<PersonalRecord> {
  if (prev && prev.best >= score) return prev;
  const next: PersonalRecord = { best: score, at: now };
  const { doc, setDoc } = firestoreFns;
  await setDoc(
    doc(db, "parents", parentId, "children", childId, "records", recordDocId(activityId, moduleId)),
    next,
  );
  return next;
}
