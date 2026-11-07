"use client";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { describeCustomLessonErrors, type CustomLesson, type LessonError } from "../../../../functions/src/customLessons/schema";
import { LessonConflictError, LessonValidationError } from "../api";
import { clearDraft, readDraft, writeDraft } from "./draftStorage";
import { editorReducer, initialEditor, isDirty } from "./editorState";
import { LessonForm } from "./LessonForm";
import { LessonList } from "./LessonList";
import { LessonStatsPanel } from "./LessonStatsPanel";
import { groupLessons, type LessonEntry, type TopicGroup } from "./groupLessons";
import { blankLesson, fieldId, moveItem, planSave, type SaveMode } from "./lessonDraft";
import type { Student } from "./lessonStats";
import { TEMPLATES, downloadLesson, duplicateLesson, importLesson } from "./lessonTools";
import { useCustomLessons } from "./useCustomLessons";

const confirmDialog = (text: string) => (typeof window === "undefined" ? true : window.confirm(text));
function withoutId(entry: LessonEntry): CustomLesson {
  const lesson: Partial<LessonEntry> = { ...entry };
  delete lesson.id;
  return lesson as CustomLesson;
}
const SAVED_MESSAGES: Record<SaveMode, string> = {
  publish: "Clase publicada para tus alumnos.",
  unpublish: "Clase retirada: vuelve a ser un borrador.",
  keep: "Cambios guardados. Los alumnos ya ven la nueva versión.",
  draft: "Borrador guardado.",
};
const AUTOSAVE_MS = 800;
/** Hora del guardado (fuera del render: el servidor fija la definitiva). */
const clock = () => Date.now();

/** Panel de la familia para crear, editar, ordenar, asignar y publicar sus clases. */
export function CustomLessonsEditor({ parentId, students = [] }: { parentId: string | null | undefined; students?: readonly Student[] }) {
  const { items, loadError, save, remove, reorder } = useCustomLessons(parentId);
  const [state, dispatch] = useReducer(editorReducer, undefined, () => initialEditor(blankLesson()));
  const [listBusy, setListBusy] = useState(false);
  const [listMessage, setListMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const { id, draft, busy } = state;

  const dirty = isDirty(state);
  const saved = id ? items.find((item) => item.id === id) : undefined;
  const groups = useMemo(() => groupLessons(items), [items]);
  const topics = useMemo(() => groups.filter((g) => g.key).map((g) => g.topic), [groups]);
  const otherLessons = useMemo(() => items.filter((i) => i.id !== id).map((i) => ({ id: i.id, title: i.title, topic: i.topic })), [items, id]);
  const errors: LessonError[] = state.showErrors ? describeCustomLessonErrors({ ...draft, published: true }) : state.attemptErrors;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Copia local de lo que no se ha guardado, por si se cierra la pestaña.
  useEffect(() => {
    if (!parentId || !dirty) return;
    const timer = setTimeout(() => writeDraft(parentId, id, { draft, baseUpdatedAt: state.baseUpdatedAt, savedAt: clock() }), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [parentId, id, draft, dirty, state.baseUpdatedAt]);

  /** Abre una clase; si hay una copia local sin guardar de ella, ofrece recuperarla. */
  function open(nextId: string | null, lesson: CustomLesson, baseUpdatedAt: number | null, { checkStored = true } = {}) {
    if (dirty && !confirmDialog("Hay cambios sin guardar en esta clase. ¿Descartarlos?")) return false;
    if (dirty && parentId) clearDraft(parentId, id);
    const stored = checkStored && parentId ? readDraft(parentId, nextId) : null;
    if (stored && JSON.stringify(stored.draft) !== JSON.stringify(lesson)) {
      const when = new Date(stored.savedAt).toLocaleString("es");
      const stale = nextId !== null && stored.baseUpdatedAt !== baseUpdatedAt;
      if (confirmDialog(`Hay cambios sin guardar de esta clase (${when})${stale ? ", hechos sobre una versión anterior" : ""}. ¿Recuperarlos?`)) {
        dispatch({ type: "open", id: nextId, lesson, baseUpdatedAt, draft: stored.draft, message: "Cambios recuperados: revísalos y guarda." });
        return true;
      }
      clearDraft(parentId!, nextId);
    }
    dispatch({ type: "open", id: nextId, lesson, baseUpdatedAt });
    return true;
  }

  function focusFirst(list: LessonError[]) {
    if (!list.length) return;
    requestAnimationFrame(() => document.getElementById(fieldId(list[0]))?.focus());
  }

  /** `overwriteAt`: versión del servidor que se acepta sobrescribir tras un conflicto. */
  async function handleSave(mode: SaveMode, overwriteAt?: number) {
    const overwrite = overwriteAt !== undefined;
    if (!parentId || busy) return;
    const previous = saved ? withoutId(saved) : null;
    const plan = planSave(draft, previous, mode, topics, clock());
    if (!plan.ok) {
      dispatch({ type: "invalid", errors: plan.errors, publishing: mode === "publish" || mode === "keep" });
      focusFirst(plan.errors);
      return;
    }
    if (!overwrite && plan.resetsProgress && !confirmDialog("Has cambiado preguntas, respuestas o cuál es la correcta. El progreso de los alumnos en esta clase empezará de cero. ¿Guardar?")) return;
    if (!overwrite && mode === "unpublish" && !confirmDialog("Los alumnos dejarán de ver esta clase. ¿Retirarla?")) return;
    dispatch({ type: "busy" });
    const expected = overwrite ? overwriteAt : state.baseUpdatedAt;
    try {
      const result = await save(id, plan.lesson, mode, id ? expected : null);
      clearDraft(parentId, id);
      dispatch({ type: "saved", id: result.id, lesson: result.lesson, message: SAVED_MESSAGES[mode] });
    } catch (error) {
      if (error instanceof LessonConflictError) {
        if (confirmDialog("Esta clase se guardó desde otro dispositivo o pestaña mientras la editabas. ¿Sobrescribir con tus cambios? (Cancelar: cargar la versión guardada y descartar los tuyos)")) {
          dispatch({ type: "failed", message: "" });
          if (error.updatedAt !== null) await handleSave(mode, error.updatedAt);
          return;
        }
        if (saved) { clearDraft(parentId, id); dispatch({ type: "open", id: saved.id, lesson: withoutId(saved), baseUpdatedAt: saved.updatedAt, message: "Se cargó la versión guardada." }); }
        else dispatch({ type: "failed", message: "La clase ya no existe." });
        return;
      }
      if (error instanceof LessonValidationError) {
        dispatch({ type: "invalid", errors: error.errors, publishing: false });
        focusFirst(error.errors);
        return;
      }
      dispatch({ type: "failed", message: "No se pudo guardar. Comprueba la conexión y vuelve a intentarlo." });
    }
  }

  async function handleDelete() {
    if (!id || busy || !parentId) return;
    if (!confirmDialog(`¿Eliminar «${draft.title || "Sin título"}»? No se puede deshacer${saved?.published ? " y los alumnos dejarán de verla" : ""}. También se borra el progreso de los alumnos en ella.`)) return;
    dispatch({ type: "busy" });
    try {
      await remove(id);
      clearDraft(parentId, id);
      dispatch({ type: "deleted", blank: blankLesson() });
    } catch {
      dispatch({ type: "failed", message: "No se pudo eliminar. Comprueba la conexión y vuelve a intentarlo." });
    }
  }

  async function handleMove(group: TopicGroup<LessonEntry>, from: number, to: number) {
    if (listBusy) return;
    setListBusy(true);
    setListMessage("");
    try {
      await reorder(moveItem(group.lessons, from, to).map((lesson) => lesson.id));
    } catch {
      setListMessage("No se pudo cambiar el orden. Vuelve a intentarlo.");
    } finally {
      setListBusy(false);
    }
  }

  async function handleImport(file: File) {
    const result = importLesson(await file.text());
    if (!result.ok) { setListMessage(result.message); return; }
    if (open(null, blankLesson(), null, { checkStored: false })) dispatch({ type: "change", update: () => result.lesson });
    setListMessage(`Importada «${result.lesson.title}» como borrador nuevo: revísala y guárdala.`);
  }

  function startFrom(lesson: CustomLesson, message: string) {
    if (open(null, blankLesson(lesson.topic), null, { checkStored: false })) {
      dispatch({ type: "change", update: () => lesson });
      setListMessage(message);
    }
  }

  return (
    <div className="space-y-6 text-white">
      <header>
        <h1 className="text-2xl font-bold">Crear clases</h1>
        <p className="text-slate-300">Escribe una clase, agrúpala en un tema y prepara preguntas para tus alumnos.</p>
      </header>
      {loadError && <p role="alert">No se pudieron cargar las clases.</p>}
      <div className="grid gap-6 lg:grid-cols-[minmax(16rem,1fr)_2fr]">
        <div className="space-y-3">
          <LessonList
            groups={groups}
            selectedId={id}
            busy={listBusy}
            onSelect={(lesson) => { if (lesson.id !== id) open(lesson.id, withoutId(lesson), lesson.updatedAt); }}
            onNew={(topic) => open(null, blankLesson(topic), null)}
            onMove={(group, from, to) => void handleMove(group, from, to)}
          />
          <div className="space-y-2 rounded-xl border border-slate-700 p-3">
            <label className="block text-sm">
              Empezar desde una plantilla
              <select className="mt-1 w-full rounded-lg border border-slate-500 bg-slate-900 px-2 py-2" value="" onChange={(e) => { const t = TEMPLATES.find((x) => x.id === e.target.value); if (t) startFrom(t.build(), `Plantilla «${t.name}» lista: adáptala y guárdala.`); }}>
                <option value="">Elige una plantilla…</option>
                {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <button type="button" className="rounded-lg border border-slate-500 px-3 py-2 text-sm" onClick={() => fileInput.current?.click()}>Importar clase (JSON)</button>
            <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" aria-label="Archivo de clase para importar" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void handleImport(f); }} />
            <p role="status" className="text-sm">{listMessage}</p>
          </div>
        </div>
        <LessonForm
          parentId={parentId}
          draft={draft}
          savedPublished={!!saved?.published}
          isNew={!id}
          dirty={dirty}
          busy={busy}
          topics={topics}
          errors={errors}
          message={state.message}
          students={students}
          otherLessons={otherLessons}
          stats={id && saved && parentId ? <LessonStatsPanel parentId={parentId} lessonId={id} lesson={withoutId(saved)} students={students} /> : null}
          onChange={(update) => dispatch({ type: "change", update })}
          onSave={(mode) => void handleSave(mode)}
          onDelete={() => void handleDelete()}
          onDuplicate={() => startFrom(duplicateLesson(draft), "Copia lista como borrador nuevo.")}
          onExport={() => downloadLesson(draft)}
          confirm={confirmDialog}
        />
      </div>
    </div>
  );
}
