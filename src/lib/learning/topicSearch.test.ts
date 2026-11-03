import { expect, test } from "vitest";
import { getLesson } from "./domain";
import { SCHOOL_NAME_LESSON_IDS, searchTopics } from "./topicSearch";

const ids = (query: string) => searchTopics(query).map(({ lesson }) => lesson.id);

test("los nombres escolares pertenecen a clases publicadas", () => {
  for (const id of SCHOOL_NAME_LESSON_IDS) expect(getLesson(id), id).toBeDefined();
});

test("encuentra temas por su nombre escolar, sin tildes ni mayúsculas", () => {
  expect(ids("sucesiones")[0]).toBe("progresiones");
  expect(ids("Progresion geometrica")[0]).toBe("progresiones");
  expect(ids("regla de tres")).toEqual(expect.arrayContaining(["tasa-unitaria", "proporcionalidad"]));
  expect(ids("PITAGORAS")[0]).toBe("pitagoras");
  expect(ids("parabola")[0]).toBe("funcion-cuadratica");
  expect(ids("ecuacion de segundo grado")[0]).toBe("ecuaciones-cuadraticas");
});

test("todas las palabras deben coincidir y se explica por qué aparece la clase", () => {
  expect(ids("fracciones")).toEqual(expect.arrayContaining(["fracciones-suma-resta", "fracciones-producto-cociente"]));
  expect(ids("sumar fracciones")[0]).toBe("fracciones-suma-resta");
  expect(searchTopics("hipotenusa")[0]).toMatchObject({ unitTitle: "Geometría y medida", matchedBy: "hipotenusa" });
  expect(ids("")).toEqual([]);
  expect(ids("de la")).toEqual([]);
  expect(ids("zzzz")).toEqual([]);
  expect(searchTopics("a").length).toBe(0);
});
