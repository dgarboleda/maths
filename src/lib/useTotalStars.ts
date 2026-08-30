"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Balance {
  key: string;
  total: number;
}

/**
 * Saldo de estrellas del hijo, en vivo.
 *
 * El saldo es la suma del libro mayor (`starLedger`), que solo crece. En vez
 * de volver a sumar los N documentos en cada notificación, se mantiene un
 * acumulador y solo se aplican los cambios del snapshot (`docChanges()`), que
 * son unos pocos por respuesta contestada: el costo por actualización pasa a
 * ser O(cambios) en vez de O(entradas del libro mayor).
 *
 * Pendiente (ver docs/auditoria-rendimiento-accesibilidad.md): un contador
 * agregado por hijo evitaría además descargar el libro mayor entero al abrir
 * cada pantalla.
 */
export function useTotalStars(
  parentId: string | undefined,
  childId: string | undefined,
): number | null {
  const [balance, setBalance] = useState<Balance | null>(null);
  const key = parentId && childId ? `${parentId}/${childId}` : null;

  useEffect(() => {
    if (!parentId || !childId) return;
    const deltas = new Map<string, number>();
    let sum = 0;

    return onSnapshot(
      collection(db, "parents", parentId, "children", childId, "starLedger"),
      (snap) => {
        for (const change of snap.docChanges()) {
          const id = change.doc.id;
          const previous = deltas.get(id) ?? 0;
          if (change.type === "removed") {
            sum -= previous;
            deltas.delete(id);
          } else {
            const delta = (change.doc.data().delta as number) ?? 0;
            sum += delta - previous;
            deltas.set(id, delta);
          }
        }
        setBalance({ key: `${parentId}/${childId}`, total: sum });
      },
    );
  }, [parentId, childId]);

  // Mientras el saldo que hay en memoria sea de otro hijo (o no haya llegado
  // ninguno), se devuelve null y la interfaz muestra "…".
  return balance && balance.key === key ? balance.total : null;
}
