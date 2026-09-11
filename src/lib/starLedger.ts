import type { Firestore } from "firebase/firestore";

/**
 * Contador agregado de estrellas por hijo
 * (docs/auditoria-rendimiento-accesibilidad.md §1.2): sin esto, cada
 * pantalla que muestra AXIA descargaba el libro mayor entero (una entrada
 * por cada respuesta correcta de toda la vida del perfil) solo para
 * sumarlo. Vive en `starBalance/total`, actualizado con `increment(delta)`
 * dentro del MISMO `writeBatch` que escribe la entrada del libro mayor —
 * atómico sin necesitar una lectura previa. `useTotalStars` escucha nada
 * más este documento.
 */
export async function awardStars(
  firestoreFns: typeof import("firebase/firestore"),
  db: Firestore,
  parentId: string,
  childId: string,
  delta: number,
  reason: string,
  attemptId: string | null = null,
): Promise<void> {
  const { collection, doc, increment, serverTimestamp, writeBatch } = firestoreFns;
  const batch = writeBatch(db);
  const ledgerRef = doc(collection(db, "parents", parentId, "children", childId, "starLedger"));
  batch.set(ledgerRef, { delta, reason, attemptId, createdAt: serverTimestamp() });
  const balanceRef = doc(db, "parents", parentId, "children", childId, "starBalance", "total");
  batch.set(balanceRef, { total: increment(delta) }, { merge: true });
  await batch.commit();
}

/**
 * Migración perezosa, una sola vez por hijo (§1.2: "implica migrar los
 * saldos existentes"): si el contador todavía no existe, se calcula UNA vez
 * sumando el libro mayor completo — el costo que este cambio evita en cada
 * pantalla, pero acá corre una sola vez — y se siembra con una transacción
 * que vuelve a comprobar, justo antes de escribir, que sigue sin existir.
 * Así una estrella ganada en el instante exacto de la migración (el niño
 * jugando en dos pestañas o dispositivos a la vez, por ejemplo) no se
 * pierde: si `awardStars` ya creó el documento mientras tanto, la siembra
 * se cancela sola en vez de pisar ese `increment`.
 */
export async function ensureStarBalanceSeeded(
  firestoreFns: typeof import("firebase/firestore"),
  db: Firestore,
  parentId: string,
  childId: string,
): Promise<void> {
  const { collection, doc, getDocs, runTransaction } = firestoreFns;
  const balanceRef = doc(db, "parents", parentId, "children", childId, "starBalance", "total");

  const alreadyExists = await runTransaction(db, async (tx) => (await tx.get(balanceRef)).exists());
  if (alreadyExists) return;

  const ledgerSnap = await getDocs(collection(db, "parents", parentId, "children", childId, "starLedger"));
  const sum = ledgerSnap.docs.reduce((acc, d) => acc + ((d.data().delta as number | undefined) ?? 0), 0);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(balanceRef);
    if (!snap.exists()) tx.set(balanceRef, { total: sum });
  });
}
