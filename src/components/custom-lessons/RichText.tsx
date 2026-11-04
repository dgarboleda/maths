import { Fragment, type ReactNode } from "react";
import { MathText } from "@/components/MathText";

/**
 * Formato ligero para el texto que escribe la familia en sus clases: un
 * subconjunto de Markdown (títulos, listas, negrita, cursiva) y, dentro de
 * cada trozo, las fórmulas de `MathText` («3/4», «√(16)», «x^2»).
 *
 * Se pinta con nodos React, nunca con HTML: lo que se escriba entre `<` y `>`
 * se ve tal cual. Un texto sin marcas se ve igual que antes.
 */

export type Inline = { kind: "text" | "strong" | "em"; text: string };
export type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "paragraph"; lines: string[] };

// Negrita `**…**`; cursiva `*…*` o `_…_`. Sin espacios junto a las marcas y
// sin cruzar líneas, para que «2 * 3 * 4» siga siendo una operación.
const INLINE = /\*\*([^\s*](?:[^*\n]*[^\s*])?)\*\*|\*([^\s*](?:[^*\n]*[^\s*])?)\*|_([^\s_](?:[^_\n]*[^\s_])?)_/g;
const isWordChar = (ch: string | undefined) => !!ch && /[\p{L}\p{N}]/u.test(ch);

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let plain = 0;
  INLINE.lastIndex = 0;
  for (let match = INLINE.exec(text); match; match = INLINE.exec(text)) {
    const start = match.index;
    const end = start + match[0].length;
    // Las marcas pegadas a letras o cifras («2*3*4», «snake_case») son texto.
    if (isWordChar(text[start - 1]) || isWordChar(text[end])) {
      INLINE.lastIndex = start + 1;
      continue;
    }
    if (start > plain) out.push({ kind: "text", text: text.slice(plain, start) });
    out.push(match[1] !== undefined ? { kind: "strong", text: match[1] } : { kind: "em", text: match[2] ?? match[3] });
    plain = end;
  }
  if (plain < text.length) out.push({ kind: "text", text: text.slice(plain) });
  return out;
}

const HEADING = /^(#{1,3})\s+(.+)$/;
const UL = /^[-*]\s+(.+)$/;
const OL = /^\d+[.)]\s+(.+)$/;

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    const last = blocks[blocks.length - 1];
    if (!line) {
      // Una línea vacía cierra el bloque abierto.
      if (last && last.kind !== "heading") blocks.push({ kind: "paragraph", lines: [] });
      continue;
    }
    const heading = HEADING.exec(line);
    const ul = UL.exec(line);
    const ol = OL.exec(line);
    if (heading) blocks.push({ kind: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2].trim() });
    else if (ul || ol) {
      const kind = ul ? "ul" : "ol";
      const item = (ul ?? ol)![1];
      if (last?.kind === kind) last.items.push(item);
      else blocks.push({ kind, items: [item] });
    } else if (last?.kind === "paragraph") last.lines.push(line);
    else blocks.push({ kind: "paragraph", lines: [line] });
  }
  return blocks.filter((b) => b.kind !== "paragraph" || b.lines.length > 0);
}

/** Una línea con negrita, cursiva y fórmulas (enunciados, explicaciones). */
export function InlineText({ text }: { text: string }): ReactNode {
  return parseInline(text).map((part, i) =>
    part.kind === "strong" ? (
      <strong key={i}><MathText text={part.text} /></strong>
    ) : part.kind === "em" ? (
      <em key={i}><MathText text={part.text} /></em>
    ) : (
      <Fragment key={i}><MathText text={part.text} /></Fragment>
    ),
  );
}

const headingClass = ["text-2xl font-bold", "text-xl font-bold", "text-lg font-semibold"];

/** Texto de varios párrafos: el contenido de una clase. */
export function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-3">
      {parseBlocks(text).map((block, i) => {
        if (block.kind === "heading") {
          // El título de la página es el h1 de LearningShell.
          const Tag = (["h2", "h3", "h4"] as const)[block.level - 1];
          return <Tag key={i} className={headingClass[block.level - 1]}><InlineText text={block.text} /></Tag>;
        }
        if (block.kind === "paragraph")
          return <p key={i}>{block.lines.map((line, n) => <Fragment key={n}>{n > 0 && <br />}<InlineText text={line} /></Fragment>)}</p>;
        const List = block.kind;
        return (
          <List key={i} className={`space-y-1 pl-6 ${List === "ul" ? "list-disc" : "list-decimal"}`}>
            {block.items.map((item, n) => <li key={n}><InlineText text={item} /></li>)}
          </List>
        );
      })}
    </div>
  );
}
