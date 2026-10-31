import { Check, TriangleAlert, X } from "lucide-react";
import { independent, type ResponseEvidence } from "@/lib/learning/domain";

/** El texto acompaña al icono para que el resultado no dependa del color. */
export function AnswerResult({ evidence }: { evidence?: ResponseEvidence }) {
  if (independent(evidence)) return (
    <p className="mt-2 inline-flex items-center gap-2 font-semibold text-emerald-300">
      <Check size={18} strokeWidth={3} aria-hidden="true" /> Correcta · resuelta de forma autónoma
    </p>
  );
  if (evidence && evidence.attempts > 0 && !evidence.correct) return (
    <p className="mt-2 inline-flex items-center gap-2 font-semibold text-red-300">
      <X size={18} strokeWidth={3} aria-hidden="true" /> Incorrecta · repasa el razonamiento
    </p>
  );
  return (
    <p className="mt-2 inline-flex items-center gap-2 font-semibold text-orange-300">
      <TriangleAlert size={18} strokeWidth={2.5} aria-hidden="true" />
      {evidence?.correct ? "Correcta con apoyo · puedes seguir practicando" : "Sin respuesta registrada · puedes seguir practicando"}
    </p>
  );
}
