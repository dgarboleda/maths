"use client";
import { LIMITS, type CustomGame, type CustomQuestion, type LessonError } from "../../../../functions/src/customLessons/schema";
import { OptionsEditor } from "./OptionsEditor";
import { inputClass, smallButton } from "./styles";

interface Props {
  question: CustomQuestion;
  index: number;
  total: number;
  game: CustomGame;
  errors: LessonError[];
  onChange: (patch: Partial<CustomQuestion>) => void;
  onMove: (to: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

export function QuestionEditor({ question, index, total, game, errors, onChange, onMove, onDuplicate, onRemove }: Props) {
  const prefix = `question-${index}`;
  const n = index + 1;
  return (
    <fieldset className={`space-y-3 rounded-lg border p-3 ${errors.length ? "border-amber-400" : "border-slate-600"}`}>
      <legend className="px-1 font-bold">Pregunta {n}</legend>
      {errors.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-amber-200">
          {errors.map((e, i) => <li key={i}>{e.message}</li>)}
        </ul>
      )}
      <label className="block">
        Enunciado
        <input id={`${prefix}-prompt`} className={inputClass} value={question.prompt} maxLength={LIMITS.prompt} onChange={(e) => onChange({ prompt: e.target.value })} />
      </label>
      <OptionsEditor idPrefix={prefix} options={question.options} answer={question.answer} game={game} onChange={onChange} />
      <label className="block">
        Explicación (se muestra al acertar)
        <textarea id={`${prefix}-explanation`} className={inputClass} maxLength={LIMITS.explanation} value={question.explanation} onChange={(e) => onChange({ explanation: e.target.value })} />
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
