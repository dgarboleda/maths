"use client";

import { useEffect, useState } from "react";
import { getFirebase } from "@/lib/firebase";
import { listCustomModuleDocs } from "./persistence/curriculumRepository";
import { compileModule } from "./compileModule";
import { registerCustomModules, registerCustomExamples, clearCustomModules } from "./customRegistry";

/**
 * Hidrata el registro de módulos personalizados antes del primer render que
 * los necesite — Fase 20 (docs/level-editor-plan-v2.md §7.1). Se consume en
 * `FamilyProvider` (todo `/panel/**`) y en el layout de `/jugar/{childId}/**`;
 * el render de contenido se gatea con `ready`, igual que hoy se gatea con
 * el progreso cargado: sin el gate, un `getModule("cst-x")` devolvería
 * `undefined` en el primer render.
 *
 * Solo se hidratan los módulos **publicados**: un borrador nunca debe
 * aparecer jugable ni elegible como prerrequisito de otro módulo mientras
 * el padre lo sigue editando (`ChallengePicker`/Fase 21 filtran por
 * `published` al listar, pero esto lo hace imposible de raíz).
 */
export function useCustomCurriculum(parentId: string | undefined): { ready: boolean } {
  // Guarda a QUÉ `parentId` corresponde el último hidratado, en vez de
  // resetear `ready` a `false` de forma síncrona al arrancar el efecto: así
  // no hay ningún `setState` fuera de los callbacks async de la promesa
  // (`react-hooks/set-state-in-effect`). Mientras `hydratedFor` no coincida
  // con `parentId`, `ready` se deriva en `false` sin necesitar su propio
  // `setState`.
  const [hydratedFor, setHydratedFor] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore }) => listCustomModuleDocs(firestore, db, parentId))
      .then((docs) => {
        if (cancelled) return;
        clearCustomModules();
        const published = docs.filter((d) => d.published);
        const compiled = published
          .map((d) => {
            try {
              return compileModule(d);
            } catch (err) {
              console.error(`No se pudo compilar el módulo personalizado "${d.id}"`, err);
              return null;
            }
          })
          .filter((m) => m !== null);
        registerCustomModules(compiled);
        for (const d of published) registerCustomExamples(d.id, d.examples);
        setHydratedFor(parentId);
      })
      .catch((err) => {
        console.error("No se pudo cargar la currícula personalizada", err);
        if (!cancelled) setHydratedFor(parentId);
      });
    return () => {
      cancelled = true;
    };
  }, [parentId]);

  return { ready: Boolean(parentId) && hydratedFor === parentId };
}
