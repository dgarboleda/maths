import { getFirebaseFunctions } from "@/lib/firebase";
import type { CustomLesson, LessonError, SaveMode } from "../../../functions/src/customLessons/schema";

export type { SaveMode };

/** Otro dispositivo guardó la clase después de abrirla aquí. */
export class LessonConflictError extends Error {
  constructor(readonly updatedAt: number | null) { super("La clase cambió en otro dispositivo."); }
}
/** El servidor rechazó la clase con los mismos errores que muestra el editor. */
export class LessonValidationError extends Error {
  constructor(readonly errors: LessonError[]) { super(errors[0]?.message ?? "La clase no es válida."); }
}

async function call<Req, Res>(name: string, data: Req): Promise<Res> {
  const { functions, functionsFns } = await getFirebaseFunctions();
  try {
    return (await functionsFns.httpsCallable<Req, Res>(functions, name)(data)).data;
  } catch (error) {
    const e = error as { code?: string; details?: { updatedAt?: number; errors?: LessonError[] } };
    if (e.code === "functions/aborted") throw new LessonConflictError(e.details?.updatedAt ?? null);
    if (e.code === "functions/invalid-argument" && Array.isArray(e.details?.errors)) throw new LessonValidationError(e.details.errors);
    throw error;
  }
}

export interface SaveRequest { parentId: string; lessonId: string | null; lesson: CustomLesson; mode: SaveMode; expectedUpdatedAt: number | null }
export const saveLesson = (req: SaveRequest) => call<SaveRequest, { id: string; lesson: CustomLesson }>("saveCustomLesson", req);
export const deleteLesson = (parentId: string, lessonId: string) => call("deleteCustomLesson", { parentId, lessonId });
export const reorderLessons = (parentId: string, ids: string[]) => call("reorderCustomLessons", { parentId, ids });
export const syncLessons = (parentId: string) => call<{ parentId: string }, { published: number }>("syncCustomLessons", { parentId });

export interface AnswerResult { correct: boolean; explanation: string; feedback: string; hint: string; completed: boolean; stars: number }
export interface AnswerRequest { parentId: string; childId: string; lessonId: string; questionId: string; answer: number | string; lessonVersion: number }
export const answerLesson = (req: AnswerRequest) => call<AnswerRequest, AnswerResult>("answerCustomLesson", req);
