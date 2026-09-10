/**
 * Registro hidratado de módulos personalizados — Fase 20
 * (docs/level-editor-plan-v2.md §7.1). Sin React, sin Firebase: un `Map` en
 * memoria que `useCustomCurriculum` llena antes del primer render.
 *
 * La razón de ser de este archivo es que `getModule` (`curriculum.ts`) es
 * **síncrona** y la consumen 29 archivos — convertirla en `async` para leer
 * Firestore rompería media aplicación. En vez de eso, los módulos
 * personalizados se compilan e hidratan acá de antemano, y `getModule` cae
 * a este registro cuando no encuentra el id entre los módulos de código.
 */
import type { ModuleDef } from "@/lib/curriculum";
import { MODULES } from "@/lib/curriculum";
import type { WorkedExample } from "./customSchema";

const customModules = new Map<string, ModuleDef>();
// Los ejemplos resueltos (§8.2) no viven en `ModuleDef` — su contrato es
// exactamente el de los módulos de código (política P1,
// docs/level-editor-plan-v2.md §0) y esos no tienen ejemplos autorales, solo
// `generateProblem()` llamado 3 veces (ver `EjemplosTab.tsx`). Se hidratan
// en un registro paralelo, del mismo tamaño que `customModules`.
const customExamples = new Map<string, WorkedExample[]>();

export function registerCustomModules(defs: ModuleDef[]): void {
  for (const def of defs) customModules.set(def.id, def);
}

export function registerCustomExamples(moduleId: string, examples: WorkedExample[]): void {
  customExamples.set(moduleId, examples);
}

export function getCustomExamples(moduleId: string): WorkedExample[] | undefined {
  return customExamples.get(moduleId);
}

export function getCustomModule(id: string): ModuleDef | undefined {
  return customModules.get(id);
}

export function listCustomModules(): ModuleDef[] {
  return [...customModules.values()];
}

/** Para las pruebas: cada caso arranca con el registro vacío. */
export function clearCustomModules(): void {
  customModules.clear();
  customExamples.clear();
}

/** Todos los módulos jugables: los de código + los personalizados
 *  hidratados. Reemplaza a `MODULES` en todo lo que necesita listar o
 *  recorrer el catálogo completo (`curriculum.ts`). */
export function allModules(): ModuleDef[] {
  return [...MODULES, ...listCustomModules()];
}
