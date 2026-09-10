import type { LevelBackground, LevelDefinition } from "../schema";
import { buildSalaConTerminal } from "./salaConTerminal";
import { buildPasilloConPuerta } from "./pasilloConPuerta";
import { buildEncuentroConNpc } from "./encuentroConNpc";

/**
 * Plantillas de nivel — Fase 25 (docs/plan-salto-producto.md §3). Recomendación
 * §10.1 del plan anterior: la única alternativa al lienzo en blanco era
 * sembrar Ciudad Central entera. Cada plantilla es un `LevelDefinition`
 * literal, construido sobre `createEmptyLevel` — dato, no un concepto nuevo
 * en el esquema.
 */
export interface LevelTemplateDef {
  id: string;
  label: string;
  description: string;
  build: (authorUid: string, name: string, background: LevelBackground) => LevelDefinition;
}

export const LEVEL_TEMPLATES: LevelTemplateDef[] = [
  {
    id: "sala-con-terminal",
    label: "Sala con terminal",
    description: "Una terminal con un desafío — la forma más simple de un nivel jugable.",
    build: buildSalaConTerminal,
  },
  {
    id: "pasillo-con-puerta",
    label: "Pasillo con puerta",
    description: "Resolver un desafío abre una puerta que lleva a la salida del nivel.",
    build: buildPasilloConPuerta,
  },
  {
    id: "encuentro-con-npc",
    label: "Encuentro con NPC",
    description: "Un personaje habla con el jugador y así habilita un desafío.",
    build: buildEncuentroConNpc,
  },
];
