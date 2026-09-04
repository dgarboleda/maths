import { getStrand } from "@/lib/strands";

/** Traduce un `skillId` ("aritmetica-topico-aritmetica-d3") a una etiqueta
 * legible. Compartido entre el panel de padres y el resumen familiar. */
export function describeSkill(skillId: string): string {
  const parts = skillId.split("-");
  const strandLabel = getStrand(parts[0])?.label ?? parts[0];
  const kind = parts.slice(1, -1).join(" ").replaceAll("_", " ");
  const level = parts[parts.length - 1]?.replace("d", "nivel ");
  return `${strandLabel} · ${kind} · ${level}`;
}
