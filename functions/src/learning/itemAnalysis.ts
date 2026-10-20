import { errorText, eventOutcome, findQuestion, type EvidenceEvent } from "./diagnosis";
import type { CalibrationData } from "./calibration";
import type { Lesson } from "./types";

/** Evento con el perfil al que pertenece (seudónimo: solo se usa para
 *  separar intentos y tiempos; no sale en el informe). */
export interface ProfileEvent extends EvidenceEvent {
  profile: string;
}

export interface ItemStats {
  lessonId: string;
  questionId: string;
  task: number | null;
  stage: string;
  prompt: string;
  /** Primeras respuestas (un perfil cuenta una vez por pregunta). */
  n: number;
  firstCorrect: number;
  /** Primeras respuestas dadas después de pedir al menos una pista. */
  withHints: number;
  /** Respuestas incorrectas (todas) y cuántas coinciden con un error previsto. */
  wrong: number;
  wrongPredicted: number;
  /** Respuestas incorrectas no previstas más repetidas. */
  unexpected: { response: string; count: number }[];
  /** Mediana de segundos desde que se mostró la pregunta (acción anterior
   *  de la misma clase, sin contar pistas) hasta la primera respuesta. */
  medianSeconds: number | null;
  flags: string[];
}

export interface AnalysisOptions {
  /** Mínimo de primeras respuestas para emitir alertas. */
  minResponses?: number;
  /** Pausa máxima (s) para considerar que el tiempo se dedicó a la pregunta. */
  maxGapSeconds?: number;
}

const median = (values: number[]) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Estadística de cada pregunta para calibrar el contenido: dificultad al
 * primer intento, uso de pistas, cobertura de los errores previstos y
 * respuestas incorrectas que el contenido no anticipa.
 */
export function analyzeItems(
  events: ProfileEvent[],
  getLesson: (id: string) => Lesson | undefined,
  { minResponses = 10, maxGapSeconds = 600 }: AnalysisOptions = {},
): ItemStats[] {
  const items = new Map<string, ItemStats & { seen: Set<string>; times: number[]; misses: Map<string, number> }>();
  const lastAt = new Map<string, number>();
  const hintsBefore = new Map<string, number>();
  const sorted = [...events].sort((a, b) => a.at - b.at);
  for (const event of sorted) {
    const sessionKey = `${event.profile}|${event.lessonId}`;
    const { action } = event;
    // Pedir una pista no cambia de pregunta: el tiempo se mide desde la
    // acción que la mostró (empezar, continuar o la respuesta anterior).
    if (action.kind === "hint" && action.questionId) {
      const key = `${sessionKey}|${action.questionId}`;
      hintsBefore.set(key, (hintsBefore.get(key) ?? 0) + 1);
      continue;
    }
    const previous = lastAt.get(sessionKey);
    lastAt.set(sessionKey, event.at);
    const outcome = eventOutcome(event, getLesson);
    if (!outcome) continue;
    const lesson = getLesson(outcome.lessonId);
    const question = lesson && findQuestion(lesson, outcome.questionId)?.question;
    if (!lesson || !question) continue;
    const itemKey = `${outcome.lessonId}|${outcome.questionId}`;
    let item = items.get(itemKey);
    if (!item) {
      item = {
        lessonId: outcome.lessonId,
        questionId: outcome.questionId,
        task: outcome.task,
        stage: outcome.stage,
        prompt: question.prompt,
        n: 0,
        firstCorrect: 0,
        withHints: 0,
        wrong: 0,
        wrongPredicted: 0,
        unexpected: [],
        medianSeconds: null,
        flags: [],
        seen: new Set(),
        times: [],
        misses: new Map(),
      };
      items.set(itemKey, item);
    }
    if (!item.seen.has(event.profile)) {
      item.seen.add(event.profile);
      item.n++;
      if (outcome.correct) item.firstCorrect++;
      const hints = Math.max(outcome.hintsUsed, hintsBefore.get(`${sessionKey}|${action.questionId}`) ?? 0);
      if (hints > 0) item.withHints++;
      if (previous !== undefined && event.at - previous <= maxGapSeconds * 1000)
        item.times.push((event.at - previous) / 1000);
    }
    if (!outcome.correct) {
      item.wrong++;
      if (outcome.error && (question.format !== "choice" || errorText(question, outcome.error)))
        item.wrongPredicted++;
      else if (action.response) {
        const response = action.response.trim().replace(",", ".");
        item.misses.set(response, (item.misses.get(response) ?? 0) + 1);
      }
    }
  }
  return [...items.values()]
    .map((entry) => {
      const { times, misses } = entry;
      const item: ItemStats = {
        lessonId: entry.lessonId, questionId: entry.questionId, task: entry.task, stage: entry.stage,
        prompt: entry.prompt, n: entry.n, firstCorrect: entry.firstCorrect, withHints: entry.withHints,
        wrong: entry.wrong, wrongPredicted: entry.wrongPredicted, unexpected: [], medianSeconds: null, flags: [],
      };
      const unexpected = [...misses]
        .map(([response, count]) => ({ response, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      const flags: string[] = [];
      if (item.n >= minResponses) {
        const p = item.firstCorrect / item.n;
        if (p > 0.95) flags.push("muy fácil");
        if (p < 0.3) flags.push("muy difícil");
        if (item.withHints / item.n > 0.5) flags.push("mucha ayuda");
        if (item.wrong >= 5 && item.wrongPredicted / item.wrong < 0.4) flags.push("errores no previstos");
        if (unexpected[0] && unexpected[0].count >= 3 && unexpected[0].count / Math.max(1, item.wrong) >= 0.2)
          flags.push(`respuesta frecuente no prevista: ${unexpected[0].response}`);
      }
      return { ...item, unexpected, medianSeconds: median(times), flags };
    })
    .sort((a, b) => b.flags.length - a.flags.length || a.lessonId.localeCompare(b.lessonId) || a.questionId.localeCompare(b.questionId));
}

/** Resumen por etapa: proporción de aciertos al primer intento. */
export function stageSummary(items: ItemStats[]) {
  const byStage = new Map<string, { n: number; firstCorrect: number }>();
  for (const item of items) {
    const s = byStage.get(item.stage) ?? { n: 0, firstCorrect: 0 };
    s.n += item.n;
    s.firstCorrect += item.firstCorrect;
    byStage.set(item.stage, s);
  }
  return [...byStage].map(([stage, s]) => ({ stage, ...s, rate: s.n ? s.firstCorrect / s.n : null }));
}

/** Resumen por clase: dónde el programa resulta más fácil o más difícil. */
export function lessonSummary(items: ItemStats[]) {
  const byLesson = new Map<string, { n: number; firstCorrect: number; withHints: number; flagged: number }>();
  for (const item of items) {
    const s = byLesson.get(item.lessonId) ?? { n: 0, firstCorrect: 0, withHints: 0, flagged: 0 };
    s.n += item.n;
    s.firstCorrect += item.firstCorrect;
    s.withHints += item.withHints;
    if (item.flags.length) s.flagged++;
    byLesson.set(item.lessonId, s);
  }
  return [...byLesson]
    .map(([lessonId, s]) => ({ lessonId, ...s, rate: s.n ? s.firstCorrect / s.n : null }))
    .sort((a, b) => (a.rate ?? 1) - (b.rate ?? 1));
}

/**
 * Datos de calibración para el repaso diario: solo preguntas con al menos
 * `minResponses` primeras respuestas. Devuelve el módulo TypeScript listo
 * para `functions/src/learning/calibrationData.ts`.
 */
export function calibrationData(items: ItemStats[], minResponses: number, generatedAt: string): CalibrationData {
  const entries = items
    .filter((i) => i.n >= minResponses)
    .sort((a, b) => a.lessonId.localeCompare(b.lessonId) || a.questionId.localeCompare(b.questionId))
    .map((i) => [`${i.lessonId}|${i.questionId}`, { n: i.n, p: Math.round((i.firstCorrect / i.n) * 1000) / 1000 }] as const);
  return { generatedAt, minResponses, items: Object.fromEntries(entries) };
}

export function calibrationModule(data: CalibrationData): string {
  return [
    "/* Archivo generado por `npm run analisis:items -- --calibracion <ruta>` a",
    " * partir de `learningEvidence` (solo agregados, sin datos personales). Para",
    " * actualizarlo, copia el archivo generado aquí y publica en un PR.",
    " * Vacío = el repaso diario rota los problemas sin datos de dificultad. */",
    'import type { CalibrationData } from "./calibration";',
    "",
    `export const CALIBRATION: CalibrationData = ${JSON.stringify(data, null, 2)};`,
    "",
  ].join("\n");
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "—");

/** Informe legible (Markdown) sin datos personales: solo agregados. */
export function itemReportMarkdown(items: ItemStats[], profiles: number, generatedAt: string): string {
  const lines = [
    `# Análisis de preguntas · ${generatedAt}`,
    "",
    `Perfiles con respuestas: ${profiles}. Preguntas con datos: ${items.length}. Las alertas solo se emiten con suficientes primeras respuestas.`,
    "",
    "## Por etapa",
    "",
    "| Etapa | Primeras respuestas | Correctas al primer intento |",
    "| --- | --- | --- |",
    ...stageSummary(items).map((s) => `| ${s.stage} | ${s.n} | ${pct(s.firstCorrect, s.n)} |`),
    "",
    "## Por clase (de la más difícil a la más fácil)",
    "",
    "| Clase | Primeras respuestas | Correctas al primer intento | Con pistas | Preguntas con alertas |",
    "| --- | --- | --- | --- | --- |",
    ...lessonSummary(items).map((s) => `| ${s.lessonId} | ${s.n} | ${pct(s.firstCorrect, s.n)} | ${pct(s.withHints, s.n)} | ${s.flagged} |`),
    "",
    "## Preguntas con alertas",
    "",
    "| Clase | Pregunta | Tarea | n | Correctas 1.er intento | Con pistas | Errores previstos | Mediana (s) | Alertas |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...items
      .filter((i) => i.flags.length)
      .map(
        (i) =>
          `| ${i.lessonId} | ${i.questionId} | ${i.task ?? "—"} | ${i.n} | ${pct(i.firstCorrect, i.n)} | ${pct(i.withHints, i.n)} | ${pct(i.wrongPredicted, i.wrong)} | ${i.medianSeconds === null ? "—" : Math.round(i.medianSeconds)} | ${i.flags.join("; ").replace(/\|/g, "\\|")} |`,
      ),
    "",
    "Interpretación: «muy fácil» (>95 %) o «muy difícil» (<30 %) sugiere revisar la pregunta o su posición; «errores no previstos» indica que conviene ampliar `errors` u opciones con las respuestas frecuentes listadas en el CSV.",
  ];
  return lines.join("\n");
}

export function itemReportCsv(items: ItemStats[]): string {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = ["clase", "pregunta", "tarea", "etapa", "n", "correctas_primer_intento", "con_pistas", "incorrectas", "incorrectas_previstas", "mediana_s", "no_previstas", "alertas", "enunciado"];
  return [
    header.join(","),
    ...items.map((i) =>
      [i.lessonId, i.questionId, i.task, i.stage, i.n, i.firstCorrect, i.withHints, i.wrong, i.wrongPredicted,
        i.medianSeconds === null ? "" : Math.round(i.medianSeconds),
        i.unexpected.map((u) => `${u.response}×${u.count}`).join(" "), i.flags.join("; "), i.prompt]
        .map(esc)
        .join(","),
    ),
  ].join("\n");
}
