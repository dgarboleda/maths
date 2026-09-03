import type { Firestore } from "firebase/firestore";

/**
 * Otorga una insignia una sola vez: lee si ya existe y, si no, la escribe.
 * Así un disparador que puede repetirse (ganar el Cohete, dominar otro
 * módulo del mismo hilo) nunca pisa el `earnedAt` original.
 */
export async function awardBadge(
  firestoreFns: typeof import("firebase/firestore"),
  db: Firestore,
  parentId: string,
  childId: string,
  badgeId: string,
): Promise<void> {
  const ref = firestoreFns.doc(db, "parents", parentId, "children", childId, "badges", badgeId);
  const snap = await firestoreFns.getDoc(ref);
  if (!snap.exists()) {
    await firestoreFns.setDoc(ref, { earnedAt: Date.now() });
  }
}
