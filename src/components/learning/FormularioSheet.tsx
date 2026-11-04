"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { MathText } from "@/components/MathText";
import { LEARNING_UNITS, LESSONS } from "@/lib/learning/domain";
import { formulasFor } from "@/lib/learning/formulas";
import styles from "./formulario.module.css";

/** Unidades con sus clases y fórmulas, en el orden del catálogo. */
export function formularioUnits(unitId?: string) {
  return LEARNING_UNITS
    .filter((unit) => !unitId || unit.id === unitId)
    .map((unit) => ({
      ...unit,
      lessons: LESSONS.filter((lesson) => lesson.unitId === unit.id)
        .map((lesson) => ({ id: lesson.id, title: lesson.title, formulas: formulasFor(lesson.id) }))
        .filter((lesson) => lesson.formulas.length > 0),
    }))
    .filter((unit) => unit.lessons.length > 0);
}

/** Formulario imprimible (A4) de una unidad o de todas. */
export function FormularioSheet({ childId, unitId }: { childId: string; unitId?: string }) {
  const known = LEARNING_UNITS.some((unit) => unit.id === unitId) ? unitId : undefined;
  const units = formularioUnits(known);
  const all = formularioUnits();
  const base = `/jugar/${childId}/formulario`;
  return (
    <main id="contenido" tabIndex={-1} className={styles.page}>
      <div className={styles.toolbar}>
        <Link href={`/jugar/${childId}/aprende`} className={styles.back}><ArrowLeft size={16} aria-hidden="true" />Volver a las clases</Link>
        <button type="button" className={styles.print} onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Imprimir o guardar en PDF</button>
      </div>
      <h1 className={styles.title}>{known ? `Formulario: ${units[0]?.title ?? ""}` : "Formulario de matemáticas"}</h1>
      <nav aria-label="Unidades" className={styles.units}>
        <Link href={base} aria-current={!known ? "page" : undefined}>Todas</Link>
        {all.map((unit) => <Link key={unit.id} href={`${base}?unidad=${unit.id}`} aria-current={unit.id === known ? "page" : undefined}>{unit.title}</Link>)}
      </nav>
      {units.map((unit) => (
        <section key={unit.id} className={styles.unit} aria-labelledby={`unidad-${unit.id}`}>
          {!known && <h2 id={`unidad-${unit.id}`}>{unit.title}</h2>}
          {known && <h2 id={`unidad-${unit.id}`} className="sr-only">{unit.title}</h2>}
          {unit.lessons.map((lesson) => (
            <article key={lesson.id} className={styles.lesson}>
              <h3>{lesson.title}</h3>
              <dl>
                {lesson.formulas.map((formula) => (
                  <div key={formula.key} className={styles.formula}>
                    <dt>{formula.name}</dt>
                    <dd className={styles.expression}><MathText text={formula.expression} /></dd>
                    {formula.legend && <dd className={styles.legend}><MathText text={formula.legend} /></dd>}
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </section>
      ))}
    </main>
  );
}
