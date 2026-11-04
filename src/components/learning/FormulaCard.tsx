"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { Calculator, Star, Volume2 } from "lucide-react";
import { MathText } from "@/components/MathText";
import { formatResult, type LessonFormula } from "@/lib/learning/formulas";
import { speak } from "@/lib/math/speak";
import styles from "./help.module.css";

const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;
const noop = () => () => {};

/** Prueba la fórmula con números: cambia un dato y mira cómo cambia el resultado. */
function FormulaCalculator({ formula }: { formula: LessonFormula & { calc: NonNullable<LessonFormula["calc"]> } }) {
  const id = useId();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(formula.calc.inputs.map(({ key, value }) => [key, String(value).replace(".", ",")])));
  const numbers = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value.replace(",", ".").replace("−", "-"))]));
  const valid = Object.values(numbers).every(Number.isFinite) && Object.values(values).every((value) => value.trim() !== "");
  const result = valid ? formula.calc.compute(numbers) : NaN;
  return (
    <fieldset className={styles.calc}>
      <legend>Prueba con tus números</legend>
      <div className={styles.calcInputs}>
        {formula.calc.inputs.map(({ key, label }) => (
          <label key={key} htmlFor={`${id}-${key}`}>
            <span>{label}</span>
            <input id={`${id}-${key}`} inputMode="decimal" value={values[key]} autoComplete="off"
              onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} />
          </label>
        ))}
      </div>
      <p className={styles.calcResult} role="status">
        {Number.isFinite(result)
          ? <><span>{formula.calc.result} = </span><strong>{formatResult(result)}</strong></>
          : "Revisa los valores: con estos datos la fórmula no da un resultado."}
      </p>
    </fieldset>
  );
}

export function FormulaCard({ formula, lessonTitle, saved, onToggleSaved, related }: {
  formula: LessonFormula;
  /** Clase de origen, cuando se muestra fuera de su clase («Mi formulario»). */
  lessonTitle?: string;
  saved: boolean;
  onToggleSaved?: (key: string) => void;
  /** Destaca la fórmula relacionada con el problema actual. */
  related?: boolean;
}) {
  const [calcOpen, setCalcOpen] = useState(false);
  const speech = useSyncExternalStore(noop, canSpeak, () => false);
  const reading = [formula.name, formula.expression, formula.legend].filter(Boolean).join(". ");
  return (
    <li className={`${styles.formula} ${related ? styles.related : ""}`}>
      {related && <p className={styles.relatedLabel}>Útil para este problema</p>}
      <p className={styles.formulaName}>{formula.name}{lessonTitle && <span className={styles.formulaLesson}> · {lessonTitle}</span>}</p>
      <p className={styles.expression}><MathText text={formula.expression} /></p>
      {formula.legend && <p className={styles.legend}><MathText text={formula.legend} /></p>}
      <div className={styles.formulaActions}>
        {formula.calc && (
          <button type="button" aria-expanded={calcOpen} onClick={() => setCalcOpen((open) => !open)}>
            <Calculator size={15} aria-hidden="true" />{calcOpen ? "Ocultar" : "Probar"}
          </button>
        )}
        {speech && (
          <button type="button" aria-label={`Escuchar: ${formula.name}`} onClick={() => speak(reading)}>
            <Volume2 size={15} aria-hidden="true" />Escuchar
          </button>
        )}
        {onToggleSaved && formula.key && (
          <button type="button" aria-pressed={saved} aria-label={`Guardar en Mi formulario: ${formula.name}`}
            onClick={() => onToggleSaved(formula.key!)}>
            <Star size={15} aria-hidden="true" fill={saved ? "currentColor" : "none"} />{saved ? "Guardada" : "Guardar"}
          </button>
        )}
      </div>
      {calcOpen && formula.calc && <FormulaCalculator formula={{ ...formula, calc: formula.calc }} />}
    </li>
  );
}
