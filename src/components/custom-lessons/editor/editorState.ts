import type { CustomLesson, LessonError } from "../../../../functions/src/customLessons/schema";

/**
 * Estado de la edición de una clase. `baseUpdatedAt` es la versión del
 * servidor que se abrió: el servidor rechaza el guardado si otra pestaña u
 * otro dispositivo guardó después (ediciones simultáneas).
 */
export interface EditorState {
  id: string | null;
  draft: CustomLesson;
  baseline: string;
  baseUpdatedAt: number | null;
  /** Al publicar se muestran todos los errores en vivo; al guardar borrador, solo los del intento. */
  showErrors: boolean;
  attemptErrors: LessonError[];
  message: string;
  busy: boolean;
}

export type EditorAction =
  | { type: "open"; id: string | null; lesson: CustomLesson; baseUpdatedAt: number | null; draft?: CustomLesson; message?: string }
  | { type: "change"; update: (draft: CustomLesson) => CustomLesson }
  | { type: "invalid"; errors: LessonError[]; publishing: boolean }
  | { type: "busy" }
  | { type: "saved"; id: string; lesson: CustomLesson; message: string }
  | { type: "deleted"; blank: CustomLesson }
  | { type: "failed"; message: string };

export function initialEditor(lesson: CustomLesson): EditorState {
  return { id: null, draft: lesson, baseline: JSON.stringify(lesson), baseUpdatedAt: null, showErrors: false, attemptErrors: [], message: "", busy: false };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "open":
      // `draft` distinto de `lesson`: se recupera un borrador local sin guardar.
      return { id: action.id, draft: action.draft ?? action.lesson, baseline: JSON.stringify(action.lesson), baseUpdatedAt: action.baseUpdatedAt, showErrors: false, attemptErrors: [], message: action.message ?? "", busy: false };
    case "change":
      return { ...state, draft: action.update(state.draft) };
    case "invalid":
      return { ...state, showErrors: action.publishing, attemptErrors: action.publishing ? [] : action.errors, message: "", busy: false };
    case "busy":
      return { ...state, busy: true, message: "" };
    case "saved":
      return { id: action.id, draft: action.lesson, baseline: JSON.stringify(action.lesson), baseUpdatedAt: action.lesson.updatedAt, showErrors: false, attemptErrors: [], message: action.message, busy: false };
    case "deleted":
      return { ...initialEditor(action.blank), message: "Clase eliminada." };
    case "failed":
      return { ...state, busy: false, message: action.message };
  }
}

export const isDirty = (state: EditorState) => JSON.stringify(state.draft) !== state.baseline;
