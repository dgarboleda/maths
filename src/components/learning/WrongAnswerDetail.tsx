import { MathText } from "@/components/MathText";
import { correctText, errorFeedback, responseText, type Question, type ResponseEvidence } from "@/lib/learning/core";

/**
 * Para una respuesta incorrecta: qué respondió el estudiante, cuál era la
 * respuesta y por qué la suya no lo es. En la comprobación no se da
 * feedback al responder, así que la revisión es donde se entiende el error.
 */
export function WrongAnswerDetail({ question, evidence }: { question: Question; evidence?: ResponseEvidence }) {
  if (!evidence || evidence.attempts === 0 || evidence.correct || !evidence.response) return null;
  const given = responseText(question, evidence.response);
  return (
    <div className="mt-2 space-y-1 rounded-lg border border-red-300/30 bg-red-950/30 p-3 text-slate-100">
      {given && (
        <p>
          <span className="font-semibold text-red-200">Tu respuesta: </span>
          <MathText text={given} />
        </p>
      )}
      <p>
        <span className="font-semibold text-emerald-200">Respuesta correcta: </span>
        <MathText text={correctText(question)} />
      </p>
      <p>
        <span className="font-semibold text-amber-200">Por qué no: </span>
        <MathText text={errorFeedback(question, evidence.response)} />
      </p>
    </div>
  );
}
