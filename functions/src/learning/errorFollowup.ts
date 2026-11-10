import { numeric } from "./questions";
import type { Question } from "./types";

/** Aplicación independiente posterior a la pregunta conceptual de práctica. */
export function errorFollowup(prompt: string, answer: number, first: string, second: string): Question {
  return numeric("followup", prompt, answer, [first, second], [
    "Recuerda la idea que acabas de revisar y observa qué pide el problema.",
    "Identifica los datos y decide qué operación o relación necesitas.",
    first,
  ]);
}
