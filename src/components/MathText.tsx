import { Fragment, type ReactNode } from "react";
import { hasMath, parseMath, type MathNode, type MathPart } from "@/lib/math/parseMath";

/** Vuelve a escribir un nodo como se lee en línea, para lectores de pantalla. */
function source(part: MathPart): string {
  if (typeof part === "string") return part;
  const all = (parts: MathPart[]) => parts.map(source).join("");
  const group = (parts: MathPart[]) => (parts.length === 1 && typeof parts[0] === "string" && !/\s/.test(parts[0]) ? all(parts) : `(${all(parts)})`);
  if (part.kind === "frac") return `${group(part.num)}/${group(part.den)}`;
  if (part.kind === "sqrt") return `√${group(part.body)}`;
  return `${all(part.base)}^${part.exp}`;
}

/** El dibujo pinta su texto con CSS (`content: attr(data-t)`): así el texto
 *  del documento —el que se copia, se busca o se lee— es solo el original. */
function Glyphs({ text }: { text: string }) {
  return <span className="math-t" data-t={text} />;
}

function Parts({ parts }: { parts: MathPart[] }) {
  return parts.map((part, i) => (typeof part === "string" ? <Glyphs key={i} text={part} /> : <Visual key={i} node={part} />));
}

function Visual({ node }: { node: MathNode }) {
  if (node.kind === "frac")
    return (
      <span className="math-frac">
        <span className="math-num"><Parts parts={node.num} /></span>
        <span className="math-den"><Parts parts={node.den} /></span>
      </span>
    );
  if (node.kind === "sqrt")
    return (
      <span className="math-sqrt">
        {/* Trazo propio: se estira con el contenido y se une a la barra superior. */}
        <svg className="math-radical" viewBox="0 0 10 20" preserveAspectRatio="none" focusable="false">
          <path d="M0.5 12.5 L3 11 L6 19.5 L9.6 0.6" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="math-radicand"><Parts parts={node.body} /></span>
      </span>
    );
  return (
    <span>
      <Parts parts={node.base} />
      <sup className="math-sup"><Glyphs text={node.exp} /></sup>
    </span>
  );
}

/**
 * Texto con las fórmulas escritas como en papel: «3/4» apilada, «√(81 + 144)»
 * bajo el signo radical, «10^?» como exponente. Lo demás queda igual.
 *
 * El dibujo es decorativo para tecnologías de asistencia; cada fórmula
 * conserva su texto original, oculto a la vista, para que se lea, se copie y
 * se busque igual que antes. Un texto sin fórmulas se devuelve sin envoltorios.
 */
export function MathText({ text }: { text: string | null | undefined }): ReactNode {
  if (!text || !hasMath(text)) return text ?? null;
  return parseMath(text).map((part, i) =>
    typeof part === "string" ? (
      <Fragment key={i}>{part}</Fragment>
    ) : (
      <span key={i} className="math">
        <span className="sr-only">{source(part)}</span>
        <span aria-hidden="true" className="math-visual">
          <Visual node={part} />
        </span>
      </span>
    ),
  );
}
