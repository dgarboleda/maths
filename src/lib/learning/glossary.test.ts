import { expect, test } from "vitest";
import { searchGlossary } from "./glossary";

test("encuentra palabras de las aventuras y variantes sin tildes o en plural", () => {
  expect(searchGlossary("FUSIBLES")[0]).toMatchObject({ term: "Fusible" });
  expect(searchGlossary("pendiente")[0].meaning).toContain("gráfica");
  expect(searchGlossary("ecuacion")[0].term).toBe("Ecuación");
  expect(searchGlossary("inclinacion")[0].term).toBe("Pendiente");
});

test("incluye vocabulario de las clases y explica cuando no hay coincidencias", () => {
  expect(searchGlossary("número entero").some((entry) => entry.meaning.length > 0)).toBe(true);
  expect(searchGlossary("palabralargainexistente")).toEqual([]);
  expect(searchGlossary("  ")).toEqual([]);
});
