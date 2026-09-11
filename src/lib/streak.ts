import type { Firestore } from "firebase/firestore";
import { todayKey } from "./mastery";

/**
 * Racha de días jugados — Fase 35 (docs/plan-jugabilidad.md §9). Solo suma:
 * un día perdido la reinicia a 1, nunca a 0, y nunca quita nada ya ganado
 * (P1 aplicado a economía — ningún mecanismo de este proyecto castiga; ver
 * plan-salto-producto.md §0). No toca `starBalance` ni ningún otro dato:
 * es puramente informativa.
 */
export interface StreakState {
  streakDays: number;
  lastPlayedDay: string;
}

/** El día calendario anterior a `now`, en las mismas unidades locales que
 *  `todayKey` — por componentes de fecha, no restando 24h en milisegundos
 *  (eso se corre mal en el cambio de horario de verano). */
function yesterdayOf(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
}

/**
 * Pura: cuánto debería valer la racha después de esta sesión, dado lo que
 * ya había guardado. `now` inyectable para test determinístico (mismo
 * patrón que `mastery.ts:todayKey`).
 */
export function nextStreak(prev: { streakDays?: number; lastPlayedDay?: string } | undefined, now: Date = new Date()): StreakState {
  const today = todayKey(now);
  if (prev?.lastPlayedDay === today) {
    // Ya se registró hoy (otra sesión, u otro dispositivo el mismo día): no
    // vuelve a sumar.
    return { streakDays: prev.streakDays ?? 1, lastPlayedDay: today };
  }
  const consecutive = prev?.lastPlayedDay === todayKey(yesterdayOf(now));
  return { streakDays: consecutive ? (prev.streakDays ?? 0) + 1 : 1, lastPlayedDay: today };
}

/**
 * Escribe la racha actualizada — un solo `updateDoc` sobre el perfil del
 * hijo, y solo si de verdad cambió (ya jugó hoy = no escribe nada). Firma
 * `(firestoreFns, db, …)` de siempre (P3): el llamador decide la conexión.
 */
export async function recordStreak(
  firestoreFns: typeof import("firebase/firestore"),
  db: Firestore,
  parentId: string,
  childId: string,
  prev: { streakDays?: number; lastPlayedDay?: string },
  now: Date = new Date(),
): Promise<StreakState> {
  const next = nextStreak(prev, now);
  if (prev.lastPlayedDay === next.lastPlayedDay) return next;
  const { doc, updateDoc } = firestoreFns;
  await updateDoc(doc(db, "parents", parentId, "children", childId), {
    streakDays: next.streakDays,
    lastPlayedDay: next.lastPlayedDay,
  });
  return next;
}
