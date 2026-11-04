"use client";
import { useEffect, useMemo, useState } from "react";
import { describeCustomLessonErrors, type CustomLesson, type LessonError } from "../../../../functions/src/customLessons/schema";
import { LessonForm } from "./LessonForm";
import { LessonList } from "./LessonList";
import { groupLessons, type LessonEntry, type TopicGroup } from "./groupLessons";
import { blankLesson, fieldId, moveItem, planSave, type SaveMode } from "./lessonDraft";
import { useCustomLessons } from "./useCustomLessons";

const confirmDialog = (text: string) => (typeof window === "undefined" ? true : window.confirm(text));
function withoutId(entry: LessonEntry): CustomLesson {
  const lesson: Partial<LessonEntry> = { ...entry };
  delete lesson.id;
  return lesson as CustomLesson;
}

/** Panel de la familia para crear, editar, ordenar y publicar sus clases. */
export function CustomLessonsEditor({ parentId }: { parentId: string | null | undefined }) {
  const { items, loadError, save, remove, reorder } = useCustomLessons(parentId);
  const [id, setId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CustomLesson>(() => blankLesson());
  const [baseline, setBaseline] = useState(() => JSON.stringify(draft));
  const [showErrors, setShowErrors] = useState(false);
  const [draftError, setDraftError] = useState<LessonError[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const dirty = JSON.stringify(draft) !== baseline;
  const saved = id ? items.find((item) => item.id === id) : undefined;
  const groups = useMemo(() => groupLessons(items), [items]);
  const topics = useMemo(() => groups.filter((g) => g.key).map((g) => g.topic), [groups]);
  const errors = showErrors ? describeCustomLessonErrors(draft) : draftError;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function open(nextId: string | null, lesson: CustomLesson) {
    if (dirty && !confirmDialog("Hay cambios sin guardar en esta clase. ¿Descartarlos?")) return;
    setId(nextId);
    setDraft(lesson);
    setBaseline(JSON.stringify(lesson));
    setShowErrors(false);
    setDraftError([]);
    setMessage("");
  }

  function focusFirst(list: LessonError[]) {
    if (!list.length) return;
    requestAnimationFrame(() => document.getElementById(fieldId(list[0]))?.focus());
  }

  async function handleSave(mode: SaveMode) {
    if (!parentId || busy) return;
    const previous = saved ? withoutId(saved) : null;
    const plan = planSave(draft, previous, mode, topics, Date.now());
    if (!plan.ok) {
      const publishing = mode === "publish" || mode === "keep";
      setShowErrors(publishing);
      setDraftError(publishing ? [] : plan.errors);
      setMessage("");
      focusFirst(plan.errors);
      return;
    }
    if (plan.resetsProgress && !confirmDialog("Has cambiado preguntas, respuestas o cuál es la correcta. El progreso de los alumnos en esta clase empezará de cero. ¿Guardar?")) return;
    if (mode === "unpublish" && !confirmDialog("Los alumnos dejarán de ver esta clase. ¿Retirarla?")) return;
    setBusy(true);
    setMessage("");
    try {
      const newId = await save(id, plan.lesson);
      setId(newId);
      setDraft(plan.lesson);
      setBaseline(JSON.stringify(plan.lesson));
      setShowErrors(false);
      setDraftError([]);
      setMessage(mode === "publish" ? "Clase publicada para tus alumnos." : mode === "unpublish" ? "Clase retirada: vuelve a ser un borrador." : mode === "keep" ? "Cambios guardados. Los alumnos ya ven la nueva versión." : "Borrador guardado.");
    } catch {
      setMessage("No se pudo guardar. Comprueba la conexión y vuelve a intentarlo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!id || busy) return;
    if (!confirmDialog(`¿Eliminar «${draft.title || "Sin título"}»? No se puede deshacer${saved?.published ? " y los alumnos dejarán de verla" : ""}.`)) return;
    setBusy(true);
    try {
      await remove(id);
      const fresh = blankLesson();
      setId(null);
      setDraft(fresh);
      setBaseline(JSON.stringify(fresh));
      setShowErrors(false);
      setDraftError([]);
      setMessage("Clase eliminada.");
    } catch {
      setMessage("No se pudo eliminar. Comprueba la conexión y vuelve a intentarlo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleMove(group: TopicGroup<LessonEntry>, from: number, to: number) {
    if (busy) return;
    setBusy(true);
    try {
      await reorder(moveItem(group.lessons, from, to).map((lesson) => lesson.id));
    } catch {
      setMessage("No se pudo cambiar el orden. Vuelve a intentarlo.");
    } finally {
      setBusy(false);
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
        <LessonList
          groups={groups}
          selectedId={id}
          busy={busy}
          onSelect={(lesson) => { if (lesson.id !== id) open(lesson.id, withoutId(lesson)); }}
          onNew={(topic) => open(null, blankLesson(topic))}
          onMove={(group, from, to) => void handleMove(group, from, to)}
        />
        <LessonForm
          draft={draft}
          savedPublished={!!saved?.published}
          isNew={!id}
          dirty={dirty}
          busy={busy}
          topics={topics}
          errors={errors}
          message={message}
          onChange={(update) => setDraft(update)}
          onSave={(mode) => void handleSave(mode)}
          onDelete={() => void handleDelete()}
          confirm={confirmDialog}
        />
      </div>
    </div>
  );
}
