"use client";
import { LIMITS, parseNumber, type ChoiceQuestion, type CustomGame } from "../../../../functions/src/customLessons/schema";
import { numericDistractors } from "./distractors";
import { addOption, moveOption, removeOption } from "./lessonDraft";
import { inputClass, smallButton } from "./styles";

type Options = Pick<ChoiceQuestion, "options" | "answer" | "optionFeedback">;
interface Props {
  idPrefix: string;
  question: Options;
  game: CustomGame;
  onChange: (next: Options) => void;
}

/** Una fila por respuesta; la marca de correcta y el comentario acompañan a su respuesta al moverla. */
export function OptionsEditor({ idPrefix, question, game, onChange }: Props) {
  const { options, answer } = question;
  const feedback = question.optionFeedback ?? options.map(() => "");
  const needed = game === "write" ? null : LIMITS.gameOptions;
  const max = needed ?? LIMITS.maxOptions;
  const countOk = needed === null ? options.length >= LIMITS.minOptions : options.length === needed;
  const correct = options[answer];
  const canFill = correct !== undefined && parseNumber(correct) !== null && options.length - options.filter((o) => !o.trim()).length < (needed ?? 4);

  function fill() {
    const target = needed ?? 4;
    const filled = options.filter((o, i) => i === answer || o.trim());
    const extra = numericDistractors(correct, target - filled.length, filled) ?? [];
    const kept = options.map((o, i) => ({ o, f: feedback[i] ?? "", correct: i === answer })).filter((x) => x.correct || x.o.trim());
    const next = [...kept, ...extra.map((o) => ({ o, f: "", correct: false }))];
    onChange({ options: next.map((x) => x.o), answer: next.findIndex((x) => x.correct), ...(question.optionFeedback ? { optionFeedback: next.map((x) => x.f) } : {}) });
  }
  const setFeedback = (i: number, text: string) => onChange({ options, answer, optionFeedback: feedback.map((f, n) => (n === i ? text : f)) });

  return (
    <fieldset className="space-y-2">
      <legend className="flex flex-wrap items-center gap-2">
        Respuestas
        <span className={`rounded px-2 text-sm ${countOk ? "bg-emerald-900 text-emerald-200" : "bg-amber-900 text-amber-200"}`} aria-live="polite">
          {needed === null ? `${options.length} (entre ${LIMITS.minOptions} y ${LIMITS.maxOptions})` : `${options.length}/${needed} para el minijuego`}
        </span>
      </legend>
      {options.map((option, i) => (
        <div key={i} className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-sm">
              <input type="radio" id={i === 0 ? `${idPrefix}-answer` : undefined} name={`${idPrefix}-answer`} aria-label={`La respuesta ${i + 1} es la correcta`} checked={answer === i} onChange={() => onChange({ ...question, answer: i })} />
              Correcta
            </label>
            <input
              id={i === 0 ? `${idPrefix}-options` : undefined}
              aria-label={`Respuesta ${i + 1}`}
              className={`${inputClass} min-w-0 flex-1`}
              value={option}
              maxLength={LIMITS.option}
              onChange={(e) => onChange({ ...question, options: options.map((o, n) => (n === i ? e.target.value : o)) })}
            />
            <button type="button" className={smallButton} aria-label={`Subir respuesta ${i + 1}`} disabled={i === 0} onClick={() => onChange(moveOption(question, i, i - 1))}>↑</button>
            <button type="button" className={smallButton} aria-label={`Bajar respuesta ${i + 1}`} disabled={i === options.length - 1} onClick={() => onChange(moveOption(question, i, i + 1))}>↓</button>
            <button type="button" className={smallButton} aria-label={`Quitar respuesta ${i + 1}`} onClick={() => onChange(removeOption(question, i))}>✕</button>
          </div>
          {answer !== i && (
            <input
              id={i === (answer === 0 ? 1 : 0) ? `${idPrefix}-feedback` : undefined}
              aria-label={`Comentario si elige la respuesta ${i + 1}`}
              placeholder="Comentario si elige esta (opcional): «Has sumado los denominadores»"
              className={`${inputClass} ml-6 w-[calc(100%-1.5rem)] text-sm`}
              value={feedback[i] ?? ""}
              maxLength={LIMITS.feedback}
              onChange={(e) => setFeedback(i, e.target.value)}
            />
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={smallButton} disabled={options.length >= max} onClick={() => onChange(addOption(question))}>
          Añadir respuesta
        </button>
        <button type="button" className={smallButton} disabled={!canFill} title={canFill ? undefined : "Marca como correcta una respuesta numérica (12, 0,75, 3/4)"} onClick={fill}>
          Completar con distractores
        </button>
      </div>
    </fieldset>
  );
}
