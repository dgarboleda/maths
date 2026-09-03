export type InputType =
  | "choice"
  | "integer"
  | "decimal"
  | "numberLine"
  | "groupTens"
  | "balanceWeight";

export interface Problem {
  id: string;
  difficulty: number;
  kind: string;
  prompt: string;
  answer: number;
  choices?: number[];
  /** Etiqueta a mostrar por cada choice, en el mismo orden (para opciones no numéricas: símbolos, formas...). */
  choiceLabels?: string[];
  inputType: InputType;
  /** numberLine: recta de lineMin a lineMax, el token arranca en startValue. */
  lineMin?: number;
  lineMax?: number;
  startValue?: number;
  /** groupTens: total de objetos a repartir entre una decena y sueltas. */
  groupTotal?: number;
  /** balanceWeight: lado izquierdo fijo + una x, lado derecho fijo; balanceWeights son los pesos arrastrables. */
  balanceLeftFixed?: number;
  balanceRightFixed?: number;
  balanceWeights?: number[];
  /** Pistas de 3 niveles (conceptual → primer paso → casi completo), ver hints.ts. */
  hints?: [string, string, string];
}

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Distractores numéricos cercanos a la respuesta correcta, sin negativos. */
export function choiceSet(answer: number, spread: number): number[] {
  const options = new Set<number>([answer]);
  while (options.size < 3) {
    const candidate = answer + randInt(-spread, spread);
    if (candidate >= 0) options.add(candidate);
  }
  return shuffle([...options]);
}

/**
 * Identidad de contenido de una pregunta: categoría (kind) + los parámetros
 * concretos con que se generó (codificados en el prompt). Dos preguntas con
 * la misma firma son, a efectos de "no repetir", la misma pregunta — a
 * diferencia de `Problem.id`, que es un UUID aleatorio por instancia (sirve
 * como key de React para que los widgets se reinicien, pero no identifica
 * el contenido).
 */
export function problemSignature(problem: Problem): string {
  return `${problem.kind}|${problem.prompt}`;
}

/**
 * Arma de una sola vez un vector de `count` preguntas sin firmas repetidas
 * (en vez de generar de a una y reintentar si coincide con el historial
 * reciente). Si el espacio de valores posibles en este nivel es más chico
 * que `count`, completa el resto permitiendo repetidos — no hay forma
 * matemática de evitarlo, pero al menos nunca ocurre pudiendo evitarse.
 */
export function generateUniqueBatch(generate: () => Problem, count: number): Problem[] {
  const batch: Problem[] = [];
  const seen = new Set<string>();
  const maxAttempts = count * 60;
  let attempts = 0;
  while (batch.length < count && attempts < maxAttempts) {
    const candidate = generate();
    const signature = problemSignature(candidate);
    if (!seen.has(signature)) {
      seen.add(signature);
      batch.push(candidate);
    }
    attempts++;
  }
  while (batch.length < count) {
    batch.push(generate());
  }
  return batch;
}

export function isCorrectAnswer(problem: Problem, given: number): boolean {
  if (Number.isNaN(given)) return false;
  if (problem.inputType === "decimal") return Math.abs(given - problem.answer) < 0.05;
  return given === problem.answer;
}

export function suggestedDifficulty(birthDate: string): number {
  const age = ageFromBirthDate(birthDate);
  if (age <= 5) return 1;
  if (age <= 7) return 3;
  if (age <= 9) return 5;
  if (age <= 11) return 7;
  if (age <= 13) return 9;
  return 10;
}

function ageFromBirthDate(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}
