"use client";

import { useId, useState } from "react";
import { searchGlossary } from "@/lib/learning/glossary";
import { MathText } from "@/components/MathText";
import styles from "./help.module.css";

export default function GlossarySearch() {
  const [query, setQuery] = useState("");
  const id = useId();
  const results = searchGlossary(query);
  return (
    <section className={styles.search} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>Busca una palabra</h3>
      <label htmlFor={id}>¿Qué término quieres entender?</label>
      <input id={id} type="search" value={query} onChange={(event) => setQuery(event.target.value)}
        placeholder="Por ejemplo, pendiente o fusible" autoComplete="off" />
      {!query.trim() ? <p>Busca palabras de las clases y las aventuras.</p> : (
        <>
          <p role="status">{results.length ? `${results.length} ${results.length === 1 ? "resultado" : "resultados"}` : "No encontramos ese término. Prueba otra palabra o una forma más corta."}</p>
          <div className={styles.results}>
            {results.slice(0, 10).map((entry) => <article key={entry.term} className={styles.result}>
              <h4>{entry.term}</h4><p><MathText text={entry.meaning} /></p>
              {entry.example && <p><strong>Por ejemplo:</strong> <MathText text={entry.example} /></p>}
            </article>)}
          </div>
          {results.length > 10 && <p>Escribe más letras para reducir los resultados.</p>}
        </>
      )}
    </section>
  );
}
