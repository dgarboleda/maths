import { isMastered, isUnlocked, modulesForStrand, type ModuleDef } from "@/lib/curriculum";
import { STRANDS } from "@/lib/strands";
import { hasCorrectAttempt } from "@/lib/world/state";
import type { Quest, QuestProgress } from "@/lib/world/quests";
import type { SkillProgress } from "@/lib/types";

/**
 * Misión derivada — Fase 35 (docs/plan-jugabilidad.md §9). `QUESTS`
 * (`src/lib/world/quests.ts`) son 3 misiones fijas, 9 objetivos, todos
 * `d1`-`d3` — contra 53 módulos reales. Un niño las completa en sus
 * primeros aciertos y el diario queda vacío para siempre (`activeQuest`
 * devuelve `null`).
 *
 * El plan proponía convertir `QUESTS` mismo en una función — inviable acá:
 * `src/lib/world/**`/`QuestScene.tsx` no se tocan (coexistencia), y
 * `QUESTS` es un array indexado a mano en varios sitios que si se tocan
 * (`ciudadCentralAsLevel`, `seedExampleWorld`, `QuestScene.tsx`). Esto es
 * un complemento nuevo y separado, solo para `/misiones`: si el diario
 * original (`activeQuest`) ya se completó, esta función arma una misión
 * fresca con los módulos reales más cercanos al frente de avance, y
 * recicla las 3 premisas ya escritas como capa narrativa rotativa — nunca
 * inventa contenido académico nuevo (P5, ningún generador propio).
 */

const PREMISES: { icon: string; title: string; premise: string }[] = [
  {
    icon: "⚡",
    title: "El apagón continúa",
    premise: "El AXIA vuelve a fallar en otro rincón de la ciudad — un nuevo brote de Null se alimenta de lo que todavía no dominas del todo.",
  },
  {
    icon: "🏪",
    title: "Nuevos estantes corrompidos",
    premise: "El inventario de la tienda vuelve a mezclarse: hace falta ordenar estos temas para que el AXIA circule limpio otra vez.",
  },
  {
    icon: "🚧",
    title: "Otro tramo del túnel",
    premise: "Se abrió un tramo nuevo del túnel de servicio — hay que recalibrarlo resolviendo lo que sigue en tu camino.",
  },
];

/** Hasta 3 módulos desbloqueados y todavía no dominados, en orden de
 *  grado — el frente de avance real del niño, sea cual sea el hilo. */
function frontierModules(progressBySkill: Record<string, SkillProgress>): ModuleDef[] {
  return STRANDS.flatMap((s) => modulesForStrand(s.slug))
    .filter((m) => isUnlocked(progressBySkill, m.id) && !isMastered(progressBySkill, m.id))
    .sort((a, b) => a.tier - b.tier || a.difficulty - b.difficulty)
    .slice(0, 3);
}

/**
 * `null` solo cuando de verdad no queda nada por ofrecer (todo dominado o
 * todo bloqueado a la vez, un caso límite) — nunca por agotar las 3
 * misiones fijas: para eso existe esta función.
 */
export function derivedQuestProgress(progressBySkill: Record<string, SkillProgress>): QuestProgress | null {
  const modules = frontierModules(progressBySkill);
  if (modules.length === 0) return null;

  // Rota entre las 3 premisas según cuántos módulos ya se dominaron en
  // total — determinístico, sin ningún contador propio que guardar.
  const masteredCount = Object.values(progressBySkill).filter((p) => p.masteredAt !== null).length;
  const flavor = PREMISES[masteredCount % PREMISES.length];

  const objectives = modules.map((mod) => ({
    id: mod.id,
    label: `Practicar ${mod.label}`,
    moduleId: mod.id,
    moduleLabel: mod.label,
    done: hasCorrectAttempt(progressBySkill, mod.id),
    locked: false, // ya filtrado por isUnlocked arriba
    missing: [] as string[],
  }));
  const doneCount = objectives.filter((o) => o.done).length;

  const quest: Quest = {
    id: `derivada-${modules.map((m) => m.id).join("-")}`,
    icon: flavor.icon,
    title: flavor.title,
    premise: flavor.premise,
    strandSlug: modules[0].strandSlug,
    objectives: objectives.map((o) => ({ id: o.id, label: o.label, moduleId: o.moduleId })),
  };

  return { quest, objectives, doneCount, total: objectives.length, complete: doneCount === objectives.length };
}
