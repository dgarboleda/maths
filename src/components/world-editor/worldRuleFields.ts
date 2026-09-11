import type { PropertyFieldDef } from "@/lib/level/entities";
import { DEFAULT_WORLD_RULES } from "@/lib/gameworld/defaults";

/**
 * Descriptores de `WorldRules` (Fase 16, docs/level-editor-plan-v2.md §3.3)
 * — se pintan con el mismo `PropertyField` que ya usa el panel de entidades
 * y de acciones de evento: cero componentes de campo nuevos, y los tooltips
 * de la Fase 15 (`hint`) aplican gratis.
 */
export const WORLD_RULE_FIELDS: PropertyFieldDef[] = [
  {
    kind: "select",
    key: "levelCompletion",
    label: "Un nivel se da por completado cuando…",
    default: DEFAULT_WORLD_RULES.levelCompletion,
    hint: "Determina cuándo un nodo del mapa pasa a mostrarse como completado.",
    options: [
      { value: "allChallengesCorrect", label: "Se acertaron todos sus desafíos al menos una vez" },
      { value: "allChallengesMastered", label: "Se dominaron todos sus desafíos" },
      { value: "anyChallengeCorrect", label: "Se acertó cualquiera de sus desafíos" },
    ],
  },
  {
    kind: "boolean",
    key: "allowReplay",
    label: "Permitir volver a jugar un nivel ya completado",
    default: DEFAULT_WORLD_RULES.allowReplay,
  },
  {
    kind: "boolean",
    key: "autoAdvance",
    label: "Saltar automáticamente al siguiente nivel desbloqueado",
    default: DEFAULT_WORLD_RULES.autoAdvance,
    hint: "Al completar un nivel, lleva directo al próximo disponible en vez de mostrar el mapa.",
  },
  {
    kind: "boolean",
    key: "challengesAreMandatory",
    label: "Un desafío bloquea el paso hasta resolverse",
    default: DEFAULT_WORLD_RULES.challengesAreMandatory,
    hint: "Si está apagado, los desafíos solo dan recompensa — no impiden seguir jugando.",
  },
  {
    kind: "number",
    key: "maxAttemptsPerChallenge",
    label: "Intentos máximos por desafío (0 = ilimitado)",
    default: DEFAULT_WORLD_RULES.maxAttemptsPerChallenge,
    min: 0,
  },
  {
    kind: "number",
    key: "hintsAfterAttempts",
    label: "Ofrecer pista después de esta cantidad de intentos",
    default: DEFAULT_WORLD_RULES.hintsAfterAttempts,
    min: 0,
  },
  {
    kind: "select",
    key: "lockedModulePolicy",
    label: "Si el módulo de un desafío todavía no está desbloqueado…",
    default: DEFAULT_WORLD_RULES.lockedModulePolicy,
    hint: "Qué pasa cuando el hijo llega a un desafío cuyo prerrequisito académico no cumplió todavía.",
    options: [
      { value: "hide", label: "Ocultar esa entidad" },
      { value: "showLocked", label: "Mostrarla bloqueada, con su mensaje" },
      { value: "allowAnyway", label: "Dejar jugarlo igual" },
    ],
  },
  {
    kind: "boolean",
    key: "showWorldMap",
    label: "Habilitar el mapa del mundo para el jugador",
    default: DEFAULT_WORLD_RULES.showWorldMap,
    hint: "Apagado esconde solo la grilla de niveles; el resto de la pantalla (zonas, boss, tienda, diario) sigue disponible.",
  },
  {
    kind: "boolean",
    key: "defaultSoundOn",
    label: "Sonido activado por defecto",
    default: DEFAULT_WORLD_RULES.defaultSoundOn,
  },
  {
    kind: "boolean",
    key: "replayStoryBeats",
    label: "Repetir la intro del mundo/capítulo cada vez",
    default: DEFAULT_WORLD_RULES.replayStoryBeats,
    hint: "Si está apagado, la intro solo se muestra la primera vez.",
  },
];
