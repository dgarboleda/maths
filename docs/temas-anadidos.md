# Temas añadidos al programa

El programa tenía MCD y MCM, pero no enseñaba qué es un número primo, y le faltaban otros temas de la secundaria peruana (CNEB). Se añaden 18 clases completas en `functions/src/learning/` (`numberTopics.ts`, `algebraTopics.ts`, `geometryTopics.ts`, `dataTopics.ts`). Siguen la misma plantilla que las demás: tres secciones, ejemplos resueltos, diagnóstico, seis formas paralelas de siete tareas, una formulación conceptual propia para la comprobación B (`checkConcepts.ts`) y una aplicación.

| Clase | Unidad | Bases | CNEB | Modelo |
| --- | --- | --- | --- | --- |
| `divisibilidad` | Números | — | Cantidad, 1.° | `equal-groups` |
| `numeros-primos` | Números | divisibilidad | Cantidad, 1.° | `sieve` (nuevo) |
| `numeros-romanos` | Números | — | Cantidad, 1.° (base opcional) | `roman` (nuevo) |
| `numeros-reales` | Números | potencias-raices, fraccion-decimal-porcentaje | Cantidad, 3.° | `square-root` |
| `radicales` | Números | numeros-primos, numeros-reales | Cantidad, 3.° | `square-root` |
| `numeros-mixtos` | Fracciones | fracciones-unidad, fracciones-suma-resta | Cantidad, 1.° | `fraction` |
| `regla-tres-compuesta` | Proporcionalidad | proporcionalidad, proporcionalidad-inversa | Regularidad, 2.° | `inverse` |
| `factorizacion` | Expresiones | productos-notables | Regularidad, 3.° | `trinomial` (nuevo) |
| `fracciones-algebraicas` | Expresiones | factorizacion, fracciones-suma-resta | Regularidad, 4.° | `trinomial` |
| `logaritmos` | Expresiones | funciones-exponenciales | Regularidad, 5.° | `exponential` |
| `sistema-metrico` | Geometría | operaciones-decimales | Cantidad, 1.° | `metric` (nuevo) |
| `clasificacion-figuras` | Geometría | angulos | Forma, 1.° | `angles` |
| `rectas-paralelas` | Geometría | angulos | Forma, 1.° | `angles` |
| `areas-poligonos` | Geometría | perimetro-area | Forma, 1.° | `area` |
| `area-superficie` | Geometría | volumen | Forma, 2.° | `net` (nuevo) |
| `tales-congruencia` | Geometría | semejanza | Forma, 3.° | `similarity` |
| `tablas-frecuencia` | Datos | fraccion-decimal-porcentaje | Datos, 1.° | `frequency` (nuevo) |
| `graficos-estadisticos` | Datos | tablas-frecuencia | Datos, 1.° | `frequency` |

Un modelo existente se reutiliza solo si sus retos corresponden al tema (por ejemplo, «construye un triángulo isósceles» en `angles`). Para seis temas no había ninguno adecuado, así que se crearon en `src/components/learning/TopicVisuals.tsx`. Ese archivo se carga solo en las clases que lo usan.

## Cambios en clases existentes

- `mcd-mcm` exige `numeros-primos`: su tabla pide primos que antes no se explicaban. Su definición de «número primo» se unifica con la de la clase nueva.
- `ecuaciones-cuadraticas` exige `factorizacion`.
- Los prerrequisitos no bloquean ninguna clase (el alumno conserva acceso a todas); solo ordenan las recomendaciones. Los bancos de las clases existentes no cambian, así que `CONTENT_VERSION` sigue en 4.
- El grado CNEB alcanzado exige ahora también las clases nuevas de cada grado. Un alumno que ya tenía, por ejemplo, Forma 1.° lo verá pendiente hasta completar `clasificacion-figuras`, `rectas-paralelas` y `areas-poligonos`.
- En la búsqueda, «Tales» lleva a `tales-congruencia` y deja de apuntar a `semejanza`, que no lo enseña.

## Auditoría de consistencia

Pruebas automáticas (todas pasan):

- `catalog.test.ts`: estructura, formas paralelas sin respuestas repetidas, comprobaciones que no repiten enunciados, conceptual B única, desarrollos con porqué y sin «:» ambiguo.
- `contentArithmetic.test.ts`: toda igualdad numérica es verdadera. La regla ahora trata un subíndice como índice o base (`log₂ 8 = 3`, `a₁ = 5`); un caso de prueba comprueba que una igualdad falsa sigue detectándose.
- `arcadeCongruence.test.ts`: las alternativas de los minijuegos se leen y se corrigen igual que la respuesta escrita.
- `placement.test.ts`: cada clase tiene competencia y grado del CNEB.
- `LearningVisual.test.tsx`: los modelos nuevos se dibujan, pasan axe, ningún reto empieza conseguido y no hay valores rotos en los extremos de los controles.

Revisión independiente con un script aparte de las pruebas: la respuesta numérica de cada pregunta aparece en su desarrollo; ninguna clase exige una base de un grado CNEB superior al suyo; no hay punto decimal, guion como signo menos ni valores rotos; cada tarea cambia de enunciado entre las seis formas; los términos del glosario que se repetían con otro sentido («base», «escala») se distinguen.

**La revisión docente independiente sigue pendiente**, como en el resto del programa (`pending-teacher-review`).

## Despliegue

El servidor valida las respuestas con el mismo catálogo. Hay que publicar Functions antes que el Worker: `check:functions` lo exige, y una clase que el servidor no conoce responde 400.
