import type { ModuleDef } from "./curriculum";
import { modulesForStrand, isMastered, nextChallenge, recommendedModule } from "./curriculum";
import type { PlacementStrandRecord, SkillProgress } from "./types";
import { getStrand, STRANDS, type StrandDef } from "./strands";
import { gradeLabel } from "./pisa";

/**
 * Evaluación diagnóstica inicial ("prueba de ubicación"), inspirada en dos
 * prácticas reales de evaluación:
 *  - El patrón basal/techo de pruebas de matemáticas administradas de forma
 *    individual (KeyMath-3, WIAT-III): se arranca en el punto más fácil y se
 *    sube de franja mientras se acierta; dos fallos seguidos cierran el hilo
 *    (techo) y todo lo anterior queda dado por dominado (basal). Arrancar
 *    siempre desde abajo (en vez de "adivinar" un punto de entrada por edad)
 *    evita empezar con un ítem demasiado difícil que desmoralice a un niño
 *    del que no se sabe nada todavía.
 *  - La progresión de dominios de Common Core State Standards for
 *    Mathematics (CCSS-M) y los dominios cognitivos de TIMSS (Conocer /
 *    Aplicar / Razonar) — la misma progresión que ya codifican los "tier" de
 *    curriculum.ts, aquí reutilizados como las franjas de la prueba.
 * No es una prueba normada ni un diagnóstico clínico: es una estimación de
 * ubicación curricular, para arrancar al alumno en el punto correcto y
 * dejar una línea base comparable con evaluaciones futuras.
 */

const CEILING_STREAK = 2;

function distinctTiers(strandSlug: string): number[] {
  return [...new Set(modulesForStrand(strandSlug).map((m) => m.tier))].sort((a, b) => a - b);
}

function representativeModule(strandSlug: string, tier: number): ModuleDef {
  const mod = modulesForStrand(strandSlug).find((m) => m.tier === tier);
  if (!mod) throw new Error(`No hay módulo en "${strandSlug}" para la franja ${tier}`);
  return mod;
}

/** Módulo representativo de una franja, o undefined si no existe — versión
 * pública y sin throw de `representativeModule`, para armar links desde la
 * pantalla de resultados (puntos de mejora, "practicar de nuevo"). */
export function moduleForTier(strandSlug: string, tier: number): ModuleDef | undefined {
  return modulesForStrand(strandSlug).find((m) => m.tier === tier);
}

export interface StrandPlacementState {
  strandSlug: string;
  tiers: number[];
  pointer: number;
  consecutiveIncorrect: number;
  itemsAsked: number;
  itemsCorrect: number;
  highestTierPassed: number; // -1 = ni la franja más fácil se pasó
  /** Franjas falladas a lo largo del recorrido (incluye las del techo). */
  weakTiers: number[];
  /** Franja desde la que arrancó este recorrido (0 = basal puro). */
  startTier: number;
  done: boolean;
}

/**
 * `startTier` permite arrancar más arriba que la franja 0 en una
 * re-evaluación (ver `startTierFor` en la pantalla de evaluación): en vez de
 * volver a probar desde cero franjas ya acreditadas en una evaluación
 * anterior, arranca justo encima de la última franja aprobada. La primera
 * evaluación de un alumno sigue siendo basal puro (startTier=0 por defecto).
 */
export function initStrandPlacement(strandSlug: string, startTier = 0): StrandPlacementState {
  const tiers = distinctTiers(strandSlug);
  const maxTier = tiers.length ? tiers[tiers.length - 1] : 0;
  const clampedStart = Math.max(0, Math.min(startTier, maxTier));
  const pointer = Math.max(0, tiers.findIndex((t) => t >= clampedStart));
  return {
    strandSlug,
    tiers,
    pointer,
    consecutiveIncorrect: 0,
    itemsAsked: 0,
    itemsCorrect: 0,
    highestTierPassed: -1,
    weakTiers: [],
    startTier: clampedStart,
    done: tiers.length === 0,
  };
}

/** El módulo cuyo problema hay que mostrar ahora, o null si el hilo terminó. */
export function currentPlacementModule(state: StrandPlacementState): ModuleDef | null {
  if (state.done || state.pointer >= state.tiers.length) return null;
  return representativeModule(state.strandSlug, state.tiers[state.pointer]);
}

export function answerPlacementItem(state: StrandPlacementState, correct: boolean): StrandPlacementState {
  if (state.done) return state;
  const tier = state.tiers[state.pointer];
  const consecutiveIncorrect = correct ? 0 : state.consecutiveIncorrect + 1;
  const nextPointer = state.pointer + 1;
  return {
    ...state,
    pointer: nextPointer,
    consecutiveIncorrect,
    itemsAsked: state.itemsAsked + 1,
    itemsCorrect: state.itemsCorrect + (correct ? 1 : 0),
    highestTierPassed: correct ? tier : state.highestTierPassed,
    weakTiers: correct ? state.weakTiers : [...state.weakTiers, tier],
    done: consecutiveIncorrect >= CEILING_STREAK || nextPointer >= state.tiers.length,
  };
}

/** La franja de un módulo ya es su grado escolar de referencia (progresión CCSS-M, ver pisa.ts). */
export function gradeBandForTier(tier: number): string {
  if (tier < 0) return "por reforzar las bases";
  return gradeLabel(tier);
}

/**
 * Si arrancó por encima de la franja 0 (`startTier`), las franjas de abajo
 * quedan acreditadas por la evaluación anterior aunque no se vuelvan a
 * probar acá — de lo contrario un alumno que ya iba bien y esta vez arranca
 * fuerte pero falla temprano vería su nivel "caer a cero" en vez de quedar
 * en lo que ya tenía. `weakTiers` solo incluye franjas falladas de forma
 * aislada (con una franja más arriba aprobada después) — no las del techo,
 * que ya se reflejan en "próximo módulo recomendado".
 */
export function strandResultFrom(state: StrandPlacementState): PlacementStrandRecord {
  const highestTierPassed = Math.max(state.startTier - 1, state.highestTierPassed);
  return {
    itemsAsked: state.itemsAsked,
    itemsCorrect: state.itemsCorrect,
    highestTierPassed,
    gradeBand: gradeBandForTier(highestTierPassed),
    weakTiers: state.weakTiers.filter((t) => t < state.highestTierPassed),
  };
}

export function maxTierForStrand(strandSlug: string): number {
  const tiers = distinctTiers(strandSlug);
  return tiers.length ? tiers[tiers.length - 1] : 0;
}

export interface PlacementSummary {
  overallScore: number; // 0-100
  overallGradeBand: string;
}

export function summarizePlacement(perStrand: Record<string, PlacementStrandRecord>): PlacementSummary {
  const entries = Object.entries(perStrand);
  if (entries.length === 0) return { overallScore: 0, overallGradeBand: gradeBandForTier(-1) };

  const scoreSum = entries.reduce((sum, [strandSlug, r]) => {
    const max = maxTierForStrand(strandSlug);
    return sum + ((r.highestTierPassed + 1) / (max + 1)) * 100;
  }, 0);
  const avgTier =
    entries.reduce((sum, [, r]) => sum + Math.max(r.highestTierPassed, 0), 0) / entries.length;

  return {
    overallScore: Math.round(scoreSum / entries.length),
    overallGradeBand: gradeBandForTier(Math.round(avgTier)),
  };
}

/**
 * Módulos a otorgar como "dominados por evaluación": todo lo que quede en o
 * por debajo de la franja alcanzada en cada hilo y que el alumno todavía no
 * tuviera dominado por su cuenta. Al no tocar los módulos ya dominados por
 * práctica real, nunca se pisa un logro genuino con uno "testeado fuera".
 */
export function grantsFromPlacement(
  perStrand: Record<string, PlacementStrandRecord>,
  progressBySkill: Record<string, SkillProgress>,
): string[] {
  const grants: string[] = [];
  for (const [strandSlug, r] of Object.entries(perStrand)) {
    if (r.highestTierPassed < 0) continue;
    for (const mod of modulesForStrand(strandSlug)) {
      if (mod.tier <= r.highestTierPassed && !isMastered(progressBySkill, mod.id)) {
        grants.push(mod.id);
      }
    }
  }
  return grants;
}

export const PLACEMENT_STRAND_ORDER = STRANDS.map((s) => s.slug);

export interface PersonalizedPlan {
  strand: StrandDef;
  module: ModuleDef;
}

/**
 * Plan personalizado de la pantalla de resultados: arranca por el hilo con
 * menor avance relativo (franja alcanzada / franja máxima del hilo), pero
 * ese hilo puede no tener ya ningún módulo recomendable —lo dominó todo en
 * la propia evaluación, o su siguiente módulo está bloqueado por un
 * prerrequisito de otro hilo (ver "los otorgamientos resuelven
 * prerrequisitos cruzados" más abajo)—. En ese caso, en vez de no mostrar
 * ningún plan, se prueba con el siguiente hilo en la lista de prioridad; si
 * ninguno de los hilos evaluados tiene nada, se cae al siguiente desafío
 * general (`nextChallenge`), que sí mira toda la currícula.
 */
export function pickPersonalizedPlan(
  perStrand: Record<string, PlacementStrandRecord>,
  progressBySkill: Record<string, SkillProgress>,
): PersonalizedPlan | null {
  const priorityOrder = Object.entries(perStrand)
    .map(([slug, r]) => ({ slug, ratio: (r.highestTierPassed + 1) / (maxTierForStrand(slug) + 1) }))
    .sort((a, b) => a.ratio - b.ratio);

  for (const candidate of priorityOrder) {
    const strand = getStrand(candidate.slug);
    const mod = strand ? recommendedModule(progressBySkill, strand.slug) : null;
    if (strand && mod) return { strand, module: mod };
  }

  const fallback = nextChallenge(progressBySkill);
  const fallbackStrand = fallback ? getStrand(fallback.strandSlug) : undefined;
  return fallback && fallbackStrand ? { strand: fallbackStrand, module: fallback } : null;
}
