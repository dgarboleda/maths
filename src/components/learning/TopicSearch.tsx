"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { searchTopics } from "@/lib/learning/topicSearch";
import styles from "./help.module.css";

/** Buscador de clases para repasar un tema visto en el colegio. */
export default function TopicSearch({ childId, currentLessonId }: { childId: string; currentLessonId?: string }) {
  const [query, setQuery] = useState("");
  const id = useId();
  const results = searchTopics(query);
  const base = `/jugar/${childId}/aprende`;
  return (
    <section className={styles.search} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>Busca un tema</h3>
      <label htmlFor={id}>¿Qué tema viste en el colegio?</label>
      <input id={id} type="search" value={query} onChange={(event) => setQuery(event.target.value)}
        placeholder="Por ejemplo, sucesiones o regla de tres" autoComplete="off" />
      {!query.trim() ? <p>Encuentra la clase de un tema para repasarlo o practicarlo.</p> : (
        <>
          <p role="status">{results.length ? `${results.length} ${results.length === 1 ? "clase" : "clases"}` : "No encontramos ese tema. Prueba con otra palabra, como «fracciones» o «ecuaciones»."}</p>
          <ul className={styles.results}>
            {results.map(({ lesson, unitTitle, matchedBy }) => <li key={lesson.id} className={styles.result}>
              <h4>{lesson.title}</h4>
              <p className={styles.topicMeta}>{unitTitle}{matchedBy && matchedBy !== lesson.title ? ` · ${matchedBy}` : ""}</p>
              {lesson.id === currentLessonId ? <p className={styles.topicMeta}>Estás en esta clase.</p> : (
                <div className={styles.topicLinks}>
                  <Link href={`${base}/${lesson.id}`} aria-label={`Ver la clase: ${lesson.title}`}>Ver la clase</Link>
                  <Link href={`${base}/${lesson.id}?modo=practice`} aria-label={`Practicar: ${lesson.title}`}>Practicar</Link>
                </div>
              )}
            </li>)}
          </ul>
        </>
      )}
    </section>
  );
}
