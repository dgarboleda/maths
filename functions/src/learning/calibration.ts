/** Dificultad observada de cada pregunta: proporción de primeras respuestas
 *  correctas (p) entre `n` perfiles. Clave: `clase|pregunta`. */
export interface CalibrationData {
  generatedAt: string | null;
  minResponses: number;
  items: Record<string, { n: number; p: number }>;
}

/** Acierto esperado según la caja del repaso: al principio, preguntas
 *  accesibles; con la idea afianzada, más exigentes (dificultad deseable). */
export function dailyTarget(box: number): number {
  return box <= 1 ? 0.8 : box === 2 ? 0.7 : 0.6;
}

/** Penalización de una pregunta sin datos: con datos cerca del objetivo se
 *  prefiere la medida; sin datos en ninguna, se respeta la rotación. */
const UNKNOWN_DISTANCE = 0.1;

/**
 * Elige, entre los siguientes `window` problemas de la rotación, el de
 * dificultad observada más cercana al objetivo. Sin calibración devuelve el
 * primero (la rotación de siempre).
 */
export function pickCalibrated<T extends { id: string }>(
  candidates: T[],
  lessonId: string,
  target: number,
  items: CalibrationData["items"],
): T {
  let best = candidates[0];
  let bestDistance = Infinity;
  for (const q of candidates) {
    const stats = items[`${lessonId}|${q.id}`];
    const distance = stats ? Math.abs(stats.p - target) : UNKNOWN_DISTANCE;
    if (distance < bestDistance - 1e-9) {
      best = q;
      bestDistance = distance;
    }
  }
  return best;
}
