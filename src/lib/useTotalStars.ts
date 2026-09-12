"use client";

import { useEffect, useState } from "react";
import { getFirebase } from "@/lib/firebase";
import { ensureStarBalanceSeeded } from "@/lib/starLedger";

interface Balance {
  key: string;
  total: number;
}

/**
 * Saldo de estrellas del hijo, en vivo — lee el contador agregado
 * (`starBalance/total`, ver `starLedger.ts`), nunca el libro mayor completo
 * (docs/auditoria-rendimiento-accesibilidad.md §1.2). Si ese documento
 * todavía no existe (un perfil de antes de este cambio), dispara la
 * migración perezosa una sola vez; el propio `onSnapshot` de acá recibe el
 * valor sembrado sin que este hook tenga que hacer nada más.
 */
export function useTotalStars(
  parentId: string | undefined,
  childId: string | undefined,
): number | null {
  const [balance, setBalance] = useState<Balance | null>(null);
  const key = parentId && childId ? `${parentId}/${childId}` : null;

  useEffect(() => {
    if (!parentId || !childId) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    let seeding = false;

    getFirebase()
      .then(({ db, firestore }) => {
        if (cancelled) return;
        const ref = firestore.doc(db, "parents", parentId, "children", childId, "starBalance", "total");
        unsubscribe = firestore.onSnapshot(
          ref,
          (snap) => {
            if (snap.exists()) {
              setBalance({ key: `${parentId}/${childId}`, total: (snap.data().total as number | undefined) ?? 0 });
            } else if (!seeding) {
              seeding = true;
              ensureStarBalanceSeeded(firestore, db, parentId, childId).catch((err) =>
                console.error("No se pudo migrar el saldo de estrellas", err),
              );
            }
          },
          (err) => console.error("No se pudo escuchar el saldo de estrellas", err),
        );
      })
      .catch((err) => console.error("No se pudo cargar el saldo de estrellas", err));

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [parentId, childId]);

  // Mientras el saldo que hay en memoria sea de otro hijo (o no haya llegado
  // ninguno), se devuelve null y la interfaz muestra "…".
  return balance && balance.key === key ? balance.total : null;
}
