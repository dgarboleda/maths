"use client";
import { LIMITS, isNumeric, type CustomGame, type CustomQuestion, type LessonError } from "../../../../functions/src/customLessons/schema";
import { OptionsEditor } from "./OptionsEditor";
import { convertQuestion } from "./lessonDraft";
import { inputClass, smallButton } from "./styles";

interface Props {
  question: CustomQuestion;
  index: number;
  total: number;
  game: CustomGame;
  errors: LessonError[];
  onChange: (next: CustomQuestion) => void;
  onMove: (to: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

export function QuestionEditor({ question, index, total, game, errors, onChange, onMove, onDuplicate, onRemove }: Props) {
  const prefix = `question-${index}`;
  const n = index + 1;
  const numeric = isNumeric(question);
  return (
    <fieldset className={`space-y-3 rounded-xl border p-4 ${errors.length ? "border-amber-300 bg-amber-50/30" : "border-slate-200 bg-slate-50/50"}`}>
      <legend className="px-1 text-sm font-semibold text-slate-900">Pregunta {n}</legend>
      {errors.length > 0 && (
        <ul className="list-disc pl-5 text-sm font-medium text-amber-800">
          {errors.map((e, i) => <li key={i}>{e.message}</li>)}
        </ul>
      )}
      <label className="block text-sm font-medium text-slate-700">
        Tipo de pregunta
        <select id={`${prefix}-kind`} className={`mt-1 ${inputClass}`} value={numeric ? "numeric" : "choice"} onChange={(e) => onChange(convertQuestion(question, e.target.value as "choice" | "numeric"))}>
          <option value="choice">Elegir entre respuestas</option>
          <option value="numeric">Escribir un número</option>
        </select>
      </label>
      {numeric && game !== "write" && <p className="text-sm font-medium text-amber-800">Las preguntas de escribir un número se juegan sin minijuego.</p>}
      <label className="block text-sm font-medium text-slate-700">
        Enunciado
        <input id={`${prefix}-prompt`} className={`mt-1 ${inputClass}`} value={question.prompt} maxLength={LIMITS.prompt} onChange={(e) => onChange({ ...question, prompt: e.target.value })} />
      </label>
      {numeric ? (
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <div>
            <label htmlFor={`${prefix}-value`} className="mb-1 block text-sm font-medium text-slate-700">Respuesta correcta</label>
            <input id={`${prefix}-value`} className={inputClass} inputMode="decimal" value={question.value} maxLength={LIMITS.value} aria-describedby={`${prefix}-value-help`} onChange={(e) => onChange({ ...question, value: e.target.value })} />
            <p id={`${prefix}-value-help`} className="mt-1 text-xs text-slate-500">Se aceptan fracciones y decimales equivalentes: 3/4 = 0,75 = 6/8.</p>
          </div>
          <label className="block">
            Margen aceptado (±)
            <input id={`${prefix}-tolerance`} className={inputClass} type="number" min={0} step="any" value={question.tolerance ?? 0} onChange={(e) => { const t = Number(e.target.value); onChange({ ...question, tolerance: Number.isFinite(t) && t > 0 ? t : undefined }); }} />
          </label>
        </div>
      ) : (
        <OptionsEditor idPrefix={prefix} question={question} game={game} onChange={(patch) => onChange({ ...question, ...patch })} />
      )}
      <label className="block">
        Pista (se muestra tras el primer fallo, opcional)
        <input id={`${prefix}-hint`} className={inputClass} maxLength={LIMITS.hint} value={question.hint ?? ""} onChange={(e) => onChange({ ...question, hint: e.target.value })} />
      </label>
      <label className="block">
        Explicación (se muestra al acertar)
        <textarea id={`${prefix}-explanation`} className={inputClass} maxLength={LIMITS.explanation} value={question.explanation} onChange={(e) => onChange({ ...question, explanation: e.target.value })} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={smallButton} disabled={index === 0} onClick={() => onMove(index - 1)}>Subir pregunta {n}</button>
        <button type="button" className={smallButton} disabled={index === total - 1} onClick={() => onMove(index + 1)}>Bajar pregunta {n}</button>
        <button type="button" className={smallButton} disabled={total >= LIMITS.questions} onClick={onDuplicate}>Duplicar pregunta {n}</button>
        <button type="button" className={smallButton} onClick={onRemove}>Quitar pregunta {n}</button>
      </div>
    </fieldset>
  );
}
