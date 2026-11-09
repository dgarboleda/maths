/** Tipos y validación de formato para la hoja de trabajo: no calcula ni corrige. */
export const EXACT_OPS = [
  { id: "add", label: "Sumar fracciones" },
  { id: "subtract", label: "Restar fracciones" },
  { id: "multiply", label: "Multiplicar fracciones" },
  { id: "divide", label: "Dividir fracciones" },
  { id: "simplify", label: "Simplificar fracción" },
  { id: "mcm", label: "MCM (mínimo común múltiplo)" },
  { id: "mcd", label: "MCD (máximo común divisor)" },
] as const;
export type ExactOp = (typeof EXACT_OPS)[number]["id"];
export type WorkOp = ExactOp | "expression";
export const MAX_EXACT_VALUES = 8;
export const MAX_WORK_STEPS = 12;
export const MAX_FACTOR_ROWS = 16;

/** Comprueba únicamente la escritura; no simplifica ni compara respuestas. */
export function validManualNumber(raw: string, integerOnly = false): boolean {
  const text = raw.trim().replace(/[−–]/g, "-").replace(/\s*\/\s*/g, "/");
  if (!text || text.length > 64) return false;
  if (integerOnly) return /^[+-]?\d{1,30}$/.test(text);
  const fraction = /^([+-]?\d{1,30})\/([+-]?\d{1,30})$/.exec(text);
  if (fraction) return !/^[+-]?0+$/.test(fraction[2]);
  return /^[+-]?(?:\d{1,30}(?:[.,]\d{1,6})?|[.,]\d{1,6})$/.test(text);
}

/** Comprueba la estructura de una expresión sin evaluar ninguna operación. */
export function validManualExpression(raw: string): boolean {
  if (!raw.trim() || raw.length > 256) return false;
  const text = raw.replace(/[−–]/g, "-").replace(/×/g, "*").replace(/÷/g, "/");
  let pos = 0, depth = 0, numbers = 0, tokens = 0, needsValue = true;
  while (pos < text.length) {
    if (/\s/.test(text[pos])) { pos++; continue; }
    if (++tokens > 96) return false;
    const rest = text.slice(pos);
    const number = /^(?:\d{1,30}(?:[.,]\d{1,6})?|[.,]\d{1,6})/.exec(rest);
    if (number) {
      if (!needsValue || ++numbers > 32) return false;
      pos += number[0].length;
      needsValue = false;
    } else {
      const char = text[pos++];
      if (char === "(") { if (!needsValue || ++depth > 32) return false; }
      else if (char === ")") { if (needsValue || --depth < 0) return false; needsValue = false; }
      else if ("+-".includes(char) && needsValue) { /* signo unario */ }
      else if ("+-*/".includes(char) && !needsValue) needsValue = true;
      else return false;
    }
  }
  return !needsValue && depth === 0 && numbers > 0;
}

export function validateManualSetup(op: WorkOp, values: string[], expression: string): string | null {
  if (op === "expression") return validManualExpression(expression) ? null : "Revisa la expresión: usa números, operaciones y paréntesis completos.";
  if (!EXACT_OPS.some((item) => item.id === op)) return "Elige una operación válida.";
  const needed = op === "simplify" ? values.slice(0, 1) : values;
  if (needed.length < (op === "simplify" ? 1 : 2) || needed.length > MAX_EXACT_VALUES) return `Escribe entre 2 y ${MAX_EXACT_VALUES} números.`;
  const integerOnly = op === "mcm" || op === "mcd";
  const invalid = needed.findIndex((value) => !validManualNumber(value, integerOnly));
  return invalid < 0 ? null : `Revisa el número ${invalid + 1}: ${integerOnly ? "escribe un entero" : "escribe un número o fracción con denominador distinto de cero"}.`;
}
