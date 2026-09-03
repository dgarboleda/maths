export function baseStars(difficulty: number): number {
  return difficulty * 2;
}

export function streakMultiplier(streak: number): number {
  return Math.min(1 + streak * 0.06, 1.5);
}

/**
 * repeatsToday cuenta cuántas veces ya se resolvió este mismo "kind" en la
 * sesión actual. El diseño real (economía en Plan Numerario) es por día
 * calendario vía Firestore; aquí se aproxima con estado de sesión porque
 * aún no existe la agregación diaria persistente.
 */
export function diminishingFactor(repeatsToday: number): number {
  return Math.max(1 - 0.3 * repeatsToday, 0.15);
}

/**
 * Usar una pista reduce la recompensa (25% por nivel, piso de 25%) pero
 * nunca la anula del todo — pedir ayuda no debe impedir completar la
 * misión, solo cuesta un poco menos que resolverlo por cuenta propia.
 */
export function hintPenalty(hintsUsed: number): number {
  return Math.max(1 - 0.25 * hintsUsed, 0.25);
}

export function starsForAnswer(params: {
  difficulty: number;
  streak: number;
  repeatsToday: number;
  hintsUsed?: number;
}): number {
  const raw =
    baseStars(params.difficulty) *
    streakMultiplier(params.streak) *
    diminishingFactor(params.repeatsToday) *
    hintPenalty(params.hintsUsed ?? 0);
  return Math.max(1, Math.round(raw));
}
