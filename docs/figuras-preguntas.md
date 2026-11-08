# Figuras de apoyo en las preguntas

Hasta ahora el apoyo visual de cada clase vivía en `Lesson.visual`: un
explorador interactivo por clase que solo se muestra en la explicación. Las
preguntas eran solo texto (salvo `Question.column`), aunque cerca del 27 % de
los enunciados describen en prosa una figura, una tabla o un gráfico.

`Question.figure` añade a cada pregunta una figura **estática**, generada con
los mismos parámetros que el enunciado.

## Diseño

| Pieza | Archivo |
|---|---|
| Tipos (`Figure`), `fig()`, `describeFigure()`, `figureLabels()` | `functions/src/learning/figures.ts` |
| Dibujo en SVG (y `<table>` para tablas) | `src/components/learning/QuestionFigure.tsx` |
| Carga bajo demanda en los reproductores | `src/components/learning/QuestionFigureSlot.tsx` |
| Contrato: cobertura, sin filtraciones, coherencia | `src/lib/learning/figures.test.ts` |
| Dibujo de todas las figuras del catálogo + axe por tipo | `src/components/learning/QuestionFigure.test.tsx` |

Se muestra en `LessonPlayer`, `MixedReviewPlayer`, `DailyReviewPlayer` y
`PlacementPlayer`, debajo del enunciado.

Tipos: `table`, `triangle`, `polygon` (incluye forma de L y cometa),
`regular`, `parallels`, `angles`, `circle` (con corona), `solid`, `plane`,
`thales`, `similar`, `chart` (barras, circular y pictograma), `dots`,
`number-line`, `fraction-bar`, `bag`, `dice-grid`, `tree` y `graph`.

## Reglas

1. **La incógnita se rotula «?»** y se resalta en ámbar. La figura nunca
   muestra un dato que el enunciado no diga.
2. **No está a escala** (lo dice la figura): no se puede medir la respuesta en
   la pantalla.
3. **Estática:** sin controles. Un explorador con deslizadores permitiría
   llegar a la respuesta probando.
4. **Sin filtraciones**, comprobado por una prueba: ningún rótulo de una
   figura geométrica es igual a la respuesta numérica, salvo que el enunciado
   ya lo diga (en «el alterno interno de 65°», la respuesta es el dato).
5. **Accesible:** cada SVG lleva un `aria-label` generado por
   `describeFigure()` a partir de los mismos datos; las tablas son `<table>`
   con encabezados.
6. **Cuándo no poner figura:** si la figura resuelve la pregunta (la gráfica
   de una parábola cuando se pregunta su vértice, la forma de y = x²), o si el
   objetivo es pasar del texto a una representación propia.

## Versión del contenido

No se subió `CONTENT_VERSION`. `migrateProgress` vacía las respuestas en
curso de **todas** las clases, y las figuras no cambian enunciados,
respuestas ni identificadores. La calibración (`calibrationData.ts`) está
vacía. Cuando haya datos de dificultad, conviene recalibrar las clases con
figura, porque la figura puede hacer las preguntas más fáciles.

## Cobertura (preguntas con figura sobre 32 por clase)

| Clase | Figuras | Clase | Figuras |
|---|---|---|---|
| areas-poligonos | 30 | tablas-frecuencia | 24 |
| area-superficie | 30 | probabilidad-condicional | 24 |
| volumen-conos-esferas | 29 | graficos-estadisticos | 22 |
| clasificacion-figuras | 26 | media-mediana-moda | 21 |
| trigonometria | 26 | fracciones-unidad | 21 |
| rectas-paralelas | 25 | enteros-recta | 20 |
| circulo | 25 | volumen | 20 |
| distancia-punto-medio | 25 | probabilidad-simple | 19 |
| angulos | 24 | tales-congruencia | 19 |
| pitagoras | 24 | estadistica-dispersion | 18 |
| transformaciones | 24 | proporcionalidad-inversa | 17 |
| perimetro-area | 23 | proporcionalidad | 16 |
| funciones-lineales | 16 | probabilidad-compuesta | 14 |
| semejanza | 13 | funcion-cuadratica | 4 |

En total, 599 preguntas en 28 clases.

## Añadir una figura

```ts
import { fig } from "./figures";

fig(
  n("q1", `Los catetos miden ${a} cm y ${b} cm. ¿Cuánto mide la hipotenusa?`, c, …),
  { kind: "triangle", shape: "right", sides: [`${a} cm`, "?", `${b} cm`] },
),
```

Si una clase nueva depende de una figura, añádela a `COVERAGE` en
`figures.test.ts`.
