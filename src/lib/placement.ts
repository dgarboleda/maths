import type { ModuleDef } from "./curriculum";
import { modulesForStrand, isMastered } from "./curriculum";
import type { PlacementStrandRecord, SkillProgress } from "./types";
import { STRANDS } from "./strands";

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

export interface StrandPlacementState {
  strandSlug: string;
  tiers: number[];
  pointer: number;
  consecutiveIncorrect: number;
  itemsAsked: number;
  itemsCorrect: number;
  highestTierPassed: number; // -1 = ni la franja más fácil se pasó
  done: boolean;
}

export function initStrandPlacement(strandSlug: string): StrandPlacementState {
  const tiers = distinctTiers(strandSlug);
  return {
    strandSlug,
    tiers,
    pointer: 0,
    consecutiveIncorrect: 0,
    itemsAsked: 0,
    itemsCorrect: 0,
    highestTierPassed: -1,
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
    done: consecutiveIncorrect >= CEILING_STREAK || nextPointer >= state.tiers.length,
  };
}

const GRADE_BAND_BY_TIER: Record<number, string> = {
  0: "preescolar–1.º",
  1: "1.º",
  2: "1.º–2.º",
  3: "2.º–3.º",
  4: "3.º",
  5: "3.º–4.º",
  6: "4.º–5.º",
  7: "5.º–6.º",
  8: "6.º–7.º",
  9: "7.º–8.º",
};

/** Aproxima una franja de currícula a un grado escolar equivalente (progresión CCSS-M). */
export function gradeBandForTier(tier: number): string {
  if (tier < 0) return "por reforzar las bases";
  return GRADE_BAND_BY_TIER[tier] ?? `franja ${tier + 1}`;
}

export function strandResultFrom(state: StrandPlacementState): PlacementStrandRecord {
  return {
    itemsAsked: state.itemsAsked,
    itemsCorrect: state.itemsCorrect,
    highestTierPassed: state.highestTierPassed,
    gradeBand: gradeBandForTier(state.highestTierPassed),
  };
}

function maxTierForStrand(strandSlug: string): number {
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
