"use client";
import { LIMITS, type CustomGame } from "../../../../functions/src/customLessons/schema";
import { moveOption, removeOption } from "./lessonDraft";
import { inputClass, smallButton } from "./styles";

interface Props {
  idPrefix: string;
  options: string[];
  answer: number;
  game: CustomGame;
  onChange: (next: { options: string[]; answer: number }) => void;
}

/** Una fila por respuesta; la marca de correcta acompaña a su respuesta al moverla. */
export function OptionsEditor({ idPrefix, options, answer, game, onChange }: Props) {
  const needed = game === "write" ? null : LIMITS.gameOptions;
  const max = needed ?? LIMITS.maxOptions;
  const countOk = needed === null ? options.length >= LIMITS.minOptions : options.length === needed;
  return (
    <fieldset className="space-y-2">
      <legend className="flex flex-wrap items-center gap-2">
        Respuestas
        <span className={`rounded px-2 text-sm ${countOk ? "bg-emerald-900 text-emerald-200" : "bg-amber-900 text-amber-200"}`} aria-live="polite">
          {needed === null ? `${options.length} (entre ${LIMITS.minOptions} y ${LIMITS.maxOptions})` : `${options.length}/${needed} para el minijuego`}
        </span>
      </legend>
      {options.map((option, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-sm">
            <input type="radio" id={i === 0 ? `${idPrefix}-answer` : undefined} name={`${idPrefix}-answer`} aria-label={`La respuesta ${i + 1} es la correcta`} checked={answer === i} onChange={() => onChange({ options, answer: i })} />
            Correcta
          </label>
          <input
            id={i === 0 ? `${idPrefix}-options` : undefined}
            aria-label={`Respuesta ${i + 1}`}
            className={`${inputClass} min-w-0 flex-1`}
            value={option}
            maxLength={LIMITS.option}
            onChange={(e) => onChange({ options: options.map((o, n) => (n === i ? e.target.value : o)), answer })}
          />
          <button type="button" className={smallButton} aria-label={`Subir respuesta ${i + 1}`} disabled={i === 0} onClick={() => onChange(moveOption(options, answer, i, i - 1))}>↑</button>
          <button type="button" className={smallButton} aria-label={`Bajar respuesta ${i + 1}`} disabled={i === options.length - 1} onClick={() => onChange(moveOption(options, answer, i, i + 1))}>↓</button>
          <button type="button" className={smallButton} aria-label={`Quitar respuesta ${i + 1}`} onClick={() => onChange(removeOption(options, answer, i))}>✕</button>
        </div>
      ))}
      <button type="button" className={smallButton} disabled={options.length >= max} onClick={() => onChange({ options: [...options, ""], answer })}>
        Añadir respuesta
      </button>
    </fieldset>
  );
}
