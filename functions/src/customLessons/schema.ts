/** Contenido creado por una familia. Las opciones se identifican por posición para poder usar texto en los minijuegos. */
export const CUSTOM_GAMES = ["write", "frogger", "cohete", "snake", "runner", "numberpac", "invaders", "breakout", "topos", "cajas"] as const;
export type CustomGame = typeof CUSTOM_GAMES[number];
export interface CustomQuestion { id: string; prompt: string; answer: number; options: string[]; explanation: string }
export interface CustomLesson { title: string; topic: string; content: string; game: CustomGame; questions: CustomQuestion[]; published: boolean; updatedAt: number }
export function validateCustomLesson(value: unknown): value is CustomLesson {
  if (!value || typeof value !== "object") return false;
  const v = value as CustomLesson;
  const text = (x: unknown, max: number) => typeof x === "string" && x.trim().length > 0 && x.length <= max;
  return text(v.title, 120) && text(v.topic, 120) && text(v.content, 10000) && CUSTOM_GAMES.includes(v.game) && typeof v.published === "boolean" && Number.isSafeInteger(v.updatedAt) && Array.isArray(v.questions) && v.questions.length > 0 && v.questions.length <= 30 && new Set(v.questions.map((q) => q?.id)).size === v.questions.length && v.questions.every((q) => q && typeof q.id === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(q.id) && text(q.prompt, 500) && Number.isSafeInteger(q.answer) && q.answer >= 0 && Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 5 && (v.game === "write" || q.options.length === 5) && q.options.every((option) => text(option, 120)) && new Set(q.options).size === q.options.length && q.answer < q.options.length && typeof q.explanation === "string" && q.explanation.length <= 1000);
}
