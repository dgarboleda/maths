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
 * Pedir ayuda forma parte del aprendizaje. La autonomía se registra como
 * evidencia educativa, separada de la recompensa por completar el trabajo.
 */
export function hintPenalty(hintsUsed: number): number {
  void hintsUsed;
  return 1;
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
