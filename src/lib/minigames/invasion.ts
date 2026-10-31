/** Cada alternativa tiene su propio descenso; posiciones negativas están fuera de pantalla. */
export const INVASION_BOTTOM = 70;
const ENTRY_GAP = 7;
const RETURN_GAP = 12;

export function initialInvaders(count: number): number[] {
  return Array.from({ length: count }, (_, index) => -index * ENTRY_GAP);
}

export function advanceInvaders(positions: readonly number[], elapsedMs: number, rowMs: number, shipCol: number) {
  const delta = Math.max(0, elapsedMs) * INVASION_BOTTOM / (Math.max(1, rowMs) * 8);
  const hits: number[] = [];
  const dodged: number[] = [];
  const next = positions.map((position, col) => {
    const y = position + delta;
    if (y < INVASION_BOTTOM) return y;
    (col === shipCol ? hits : dodged).push(col);
    return -RETURN_GAP;
  });
  return { positions: next, hits, dodged };
}
