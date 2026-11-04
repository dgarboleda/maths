import { parseMath, type MathPart } from "./parseMath";

const SUPER: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "ⁿ": "n", "ᵐ": "m", "ᵗ": "t", "⁺": " más ", "⁻": " menos " };
const SUB: Record<string, string> = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9", "ₙ": "n", "ᵥ": "v", "₊": " más ", "₋": " menos " };
const SUP_CHARS = Object.keys(SUPER).join("");
const SUB_CHARS = Object.keys(SUB).join("");

const SYMBOLS: [RegExp, string][] = [
  [/⇔/g, " si y solo si "], [/⇒/g, " entonces "], [/→/g, " da "], [/≠/g, " distinto de "], [/≤/g, " menor o igual que "], [/≥/g, " mayor o igual que "],
  [/≈/g, " aproximadamente "], [/</g, " menor que "], [/>/g, " mayor que "], [/=/g, " es igual a "], [/±/g, " más o menos "],
  [/[×·]/g, " por "], [/÷/g, " entre "], [/\+/g, " más "], [/[−-]/g, " menos "], [/π/g, " pi "], [/°/g, " grados "], [/%/g, " por ciento "],
  [/…/g, " y así sucesivamente "], [/α/g, " alfa "], [/β/g, " beta "], [/γ/g, " gamma "],
  [/\bsen\b/g, " seno de "], [/\bcos\b/g, " coseno de "], [/\btan\b/g, " tangente de "], [/\|/g, " dado que "], [/′/g, " prima "], [/√/g, " raíz cuadrada de "], [/!/g, " factorial "],
];

/** Exponentes y subíndices Unicode en palabras: «a²» → «a al cuadrado», «aₙ» → «a sub n». */
function scripts(text: string): string {
  return text
    .replace(new RegExp(`[${SUP_CHARS}]+`, "g"), (run) => {
      const exp = [...run].map((c) => SUPER[c]).join("").replace(/\s+/g, " ").trim();
      return exp === "2" ? " al cuadrado " : exp === "3" ? " al cubo " : ` elevado a ${exp} `;
    })
    .replace(new RegExp(`[${SUB_CHARS}]+`, "g"), (run) => ` sub ${[...run].map((c) => SUB[c]).join("").trim()} `);
}

function words(part: MathPart): string {
  if (typeof part === "string") return part;
  const all = (parts: MathPart[]) => parts.map(words).join("");
  if (part.kind === "frac") return ` ${all(part.num)}, dividido entre ${all(part.den)}, `;
  if (part.kind === "sqrt") return ` raíz cuadrada de ${all(part.body)}, `;
  return ` ${all(part.base)} elevado a ${part.exp} `;
}

/** Convierte una fórmula escrita en línea en una frase para leer en voz alta. */
export function speakable(text: string): string {
  let out = parseMath(text).map(words).join("");
  out = scripts(out);
  for (const [pattern, word] of SYMBOLS) out = out.replace(pattern, word);
  // «P(A)» es «P de A»; un paréntesis agrupa: se anuncia y se cierra con una pausa.
  out = out.replace(/\bP\(([^()]*)\)/g, " P de $1 ").replace(/\(/g, " paréntesis ").replace(/\)/g, ", ");
  return out.replace(/[[\]]/g, " ").replace(/\s+,/g, ",").replace(/,\s*,/g, ",").replace(/\s+/g, " ").replace(/^[\s,]+|[\s,]+$/g, "");
}

/** Lee el texto con la voz del navegador, si la hay. Devuelve si pudo. */
export function speak(text: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(speakable(text));
  utterance.lang = "es-PE";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
  return true;
}
