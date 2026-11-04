"use client";
import { CUSTOM_GAMES, LIMITS, type CustomGame, type CustomLesson, type CustomQuestion, type LessonError } from "../../../../functions/src/customLessons/schema";
import { LessonPreview } from "./LessonPreview";
import { QuestionEditor } from "./QuestionEditor";
import { blankQuestion, moveItem, newQuestionId, type SaveMode } from "./lessonDraft";
import { dangerButton, inputClass, primaryButton, secondaryButton } from "./styles";

const GAME_NAMES: Record<CustomGame, string> = { write: "Sin minijuego", frogger: "Estanque", cohete: "Cohete", snake: "Serpiente", runner: "Carrera", numberpac: "Laberinto", invaders: "Invasión", breakout: "Bloques numéricos", topos: "Topos", cajas: "Cajas" };

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-amber-200">{message}</p> : null;
}

interface Props {
  draft: CustomLesson;
  /** Estado guardado: decide qué botones se muestran. */
  savedPublished: boolean;
  isNew: boolean;
  dirty: boolean;
  busy: boolean;
  topics: string[];
  errors: LessonError[];
  message: string;
  onChange: (update: (draft: CustomLesson) => CustomLesson) => void;
  onSave: (mode: SaveMode) => void;
  onDelete: () => void;
  confirm: (text: string) => boolean;
}

export function LessonForm({ draft, savedPublished, isNew, dirty, busy, topics, errors, message, onChange, onSave, onDelete, confirm }: Props) {
  const lessonErrors = errors.filter((e) => e.question === undefined);
  const set = (patch: Partial<CustomLesson>) => onChange((d) => ({ ...d, ...patch }));
  const setQuestions = (update: (questions: CustomQuestion[]) => CustomQuestion[]) => onChange((d) => ({ ...d, questions: update(d.questions) }));
  const fieldError = (field: LessonError["field"]) => lessonErrors.find((e) => e.field === field)?.message;

  return (
    <form className="space-y-4 rounded-xl border border-slate-700 p-4" onSubmit={(e) => e.preventDefault()} aria-label="Editar clase">
      <p className="text-sm text-slate-300">
        {isNew ? "Clase nueva" : savedPublished ? "Publicada: los alumnos la ven." : "Borrador: los alumnos todavía no la ven."}
        {dirty && <span className="ml-2 text-amber-200">· Cambios sin guardar</span>}
      </p>
      {errors.length > 0 && (
        <div role="alert" className="rounded-lg border border-amber-400 p-3 text-amber-100">
          <p className="font-bold">Revisa {errors.length === 1 ? "este punto" : `estos ${errors.length} puntos`} antes de publicar:</p>
          <ul className="list-disc pl-5 text-sm">
            {errors.map((e, i) => <li key={i}>{e.question === undefined ? e.message : `Pregunta ${e.question + 1}: ${e.message}`}</li>)}
          </ul>
        </div>
      )}
      <div>
        <label htmlFor="lesson-topic" className="block">Tema</label>
        <input id="lesson-topic" list="lesson-topics" aria-describedby="lesson-topic-help" className={inputClass} value={draft.topic} maxLength={LIMITS.topic} onChange={(e) => set({ topic: e.target.value })} />
        <datalist id="lesson-topics">{topics.map((t) => <option key={t} value={t} />)}</datalist>
        <p id="lesson-topic-help" className="text-sm text-slate-400">Elige un tema existente para añadir la clase a él, o escribe uno nuevo.</p>
        <FieldError message={fieldError("topic")} />
      </div>
      <div>
        <label htmlFor="lesson-title" className="block">Título de la clase</label>
        <input id="lesson-title" className={inputClass} value={draft.title} maxLength={LIMITS.title} onChange={(e) => set({ title: e.target.value })} />
        <FieldError message={fieldError("title")} />
      </div>
      <div>
        <label htmlFor="lesson-content" className="block">Contenido de la clase</label>
        <textarea id="lesson-content" aria-describedby="lesson-content-help" className={inputClass} rows={8} maxLength={LIMITS.content} value={draft.content} onChange={(e) => set({ content: e.target.value })} />
        <p id="lesson-content-help" className="text-sm text-slate-400">Formato: **negrita**, *cursiva*, # Título, - lista, 1. lista. Fórmulas: 3/4, √(16), x^2 (también en preguntas, respuestas y explicaciones).</p>
        <FieldError message={fieldError("content")} />
      </div>
      <div>
        <label htmlFor="lesson-game" className="block">Minijuego</label>
        <select id="lesson-game" className={inputClass} value={draft.game} onChange={(e) => set({ game: e.target.value as CustomGame })}>
          {CUSTOM_GAMES.map((g) => <option key={g} value={g}>{GAME_NAMES[g]}</option>)}
        </select>
        {draft.game !== "write" && <p className="text-sm text-slate-400">Los minijuegos necesitan {LIMITS.gameOptions} respuestas en cada pregunta.</p>}
      </div>

      <h2 className="text-xl font-bold">Preguntas</h2>
      {draft.questions.map((q, i) => (
        <QuestionEditor
          key={q.id}
          question={q}
          index={i}
          total={draft.questions.length}
          game={draft.game}
          errors={errors.filter((e) => e.question === i)}
          onChange={(patch) => setQuestions((qs) => qs.map((x, n) => (n === i ? { ...x, ...patch } : x)))}
          onMove={(to) => setQuestions((qs) => moveItem(qs, i, to))}
          onDuplicate={() => setQuestions((qs) => [...qs.slice(0, i + 1), { ...qs[i], id: newQuestionId(), options: [...qs[i].options] }, ...qs.slice(i + 1)])}
          onRemove={() => { if (confirm(`¿Quitar la pregunta ${i + 1}?`)) setQuestions((qs) => qs.filter((_, n) => n !== i)); }}
        />
      ))}
      <button id="lesson-questions" type="button" className="rounded-lg border border-cyan-300 px-3 py-2 disabled:opacity-40" disabled={draft.questions.length >= LIMITS.questions} onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}>
        Añadir pregunta
      </button>
      <FieldError message={fieldError("questions")} />

      <LessonPreview lesson={draft} />

      <div className="flex flex-wrap gap-3">
        {savedPublished ? (
          <>
            <button type="button" disabled={busy} className={primaryButton} onClick={() => onSave("keep")}>Guardar cambios</button>
            <button type="button" disabled={busy} className={secondaryButton} onClick={() => onSave("unpublish")}>Retirar de los alumnos</button>
          </>
        ) : (
          <>
            <button type="button" disabled={busy} className={secondaryButton} onClick={() => onSave("draft")}>Guardar borrador</button>
            <button type="button" disabled={busy} className={primaryButton} onClick={() => onSave("publish")}>Publicar para alumnos</button>
          </>
        )}
        {!isNew && <button type="button" disabled={busy} className={dangerButton} onClick={onDelete}>Eliminar clase</button>}
      </div>
      <p role="status">{message}</p>
    </form>
  );
}
