/**
 * Registro de actividades de un `ChallengePlacement` — Fase 33 (docs/plan-
 * jugabilidad.md §7). `ChallengePlacement.activityId` está en el esquema
 * desde la Fase 6 ("por ahora siempre 'puzzle'... reservado para más
 * adelante"): esto es "más adelante". Mismo patrón que `entities/registry.ts`
 * — el editor y el runtime solo conocen esta lista, cero `switch
 * (activityId)` disperso.
 *
 * "puzzle" es el default absoluto: un `activityId` vacío, desconocido, o de
 * un nivel autorado antes de esta fase, cae siempre en `PuzzleOverlay` — el
 * comportamiento de todo nivel existente no cambia un bit.
 *
 * "piramide" queda deliberadamente fuera (docs/plan-jugabilidad.md §7):
 * `generatePyramid` no recibe un módulo — fabrica sus propios números con
 * dificultad fija por operación y guarda sus intentos con `skillId:
 * "piramide"`, que no corresponde a ningún módulo real. Meterla acá exige
 * rehacerla sobre `mod.generateProblem()`, que es una fase propia.
 *
 * "ronda" (`PracticeRoundGeneric`) tampoco entra en esta fase: su paleta es
 * clara (`bg-purple-50`, `bg-white`) pensada para la pantalla de tema, no
 * para el runtime del Mundo, que es oscuro de punta a punta — verla montada
 * ahí desentonaría. "cohete" (`CoheteGeneric`) ya es oscura de fábrica
 * (`bg-slate-900`, `border-indigo-500`) y encaja sin retocar nada.
 */
export interface ActivityDef {
  id: string;
  label: string;
  hint: string;
}

export const ACTIVITIES: ActivityDef[] = [
  {
    id: "puzzle",
    label: "Ficha (una pregunta)",
    hint: "Una sola pregunta del módulo, con pistas — la actividad de siempre.",
  },
  {
    id: "cohete",
    label: "Cohete (contrarreloj)",
    hint: "Responder rápido antes de que se acabe el tiempo, para llegar a la meta.",
  },
];

export const DEFAULT_ACTIVITY_ID = "puzzle";

/** `undefined`/vacío/desconocido siempre cae en "puzzle" — nunca revienta
 *  por un nivel viejo o un id mal escrito. */
export function getActivity(activityId: string): ActivityDef {
  return ACTIVITIES.find((a) => a.id === activityId) ?? ACTIVITIES[0];
}

export function isKnownActivityId(activityId: string): boolean {
  return ACTIVITIES.some((a) => a.id === activityId);
}
