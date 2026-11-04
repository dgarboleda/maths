# Auditoría didáctica del programa (noviembre 2026)

Alcance: las 50 clases de `functions/src/learning` (secciones, vocabulario, 116 ejemplos y 1600 instancias de actividades). Criterios: claridad, lenguaje sencillo, ejemplos explicados paso a paso, sin repeticiones ni ambigüedades, y cobertura de cada idea de la clase con al menos un ejemplo. **No sustituye la revisión docente independiente**, que sigue pendiente (`pending-teacher-review`).

## Resumen

| Aspecto | Estado antes | Acción |
| --- | --- | --- |
| Longitud de las frases | Media de 7–12 palabras; ninguna supera 32 | Sin cambios |
| Ejemplos repetidos | Siete clases repetían números o problemas de la sección o de otra clase (p. ej. 6 ÷ 3/4 y 6 ÷ 0,75 daban 8 envases; dos ejemplos de fracciones con mcm 12) | Ejemplos sustituidos por casos con otra estructura |
| Ideas sin ejemplo | Comparar decimales, números pequeños en notación científica, propiedades de potencias, paréntesis precedido de «−», ángulos suplementarios y opuestos, figuras compuestas, cuadrado de una diferencia, combinaciones sin orden | Ocho ejemplos nuevos (de 108 a 116) |
| Justificaciones vagas | «Comprobamos.», «Multiplicamos.», «Por la altura.», «Unidad cuadrada.» | Cada paso dice qué se hace y por qué |
| Ambigüedades y errores | Paso «7 − 2 = 5 = −(−5)»; estimación incorrecta en 1,25 × 0,4; «·» como separador de fórmulas (en Perú también multiplica); «→» dentro de una frase | Corregidos |
| Validez de la comprobación | En 17 clases, la comprobación A o la B repetía literalmente la pregunta conceptual de la guiada o la práctica; en dos clases, la q4 era la misma en práctica, A y B | Tercera formulación conceptual (rotación `v % 3`) y dos formulaciones nuevas de q4 |

Las pruebas `catalog.test.ts` impiden que vuelvan los dos últimos problemas: las fórmulas no usan «·» como separador y las comprobaciones no repiten enunciados recién vistos.

## Pendiente (requiere decisión o revisión docente)

- **La comprobación B y el repaso diferido** pueden reutilizar la formulación conceptual de la guiada o la práctica. Evitarlo exige una cuarta formulación por clase.
- **893 preguntas tienen un solo paso de desarrollo** (sobre todo diagnósticos y conceptuales) y 135 explicaciones tienen menos de seis palabras («9 − 4 = 5.»). Son aceptables en preguntas de un paso; conviene revisarlas en las de procedimiento.
- **`CONTENT_VERSION` no cambia**: los identificadores de las preguntas se conservan. Una comprobación en curso puede mostrar el enunciado nuevo en una posición ya respondida; la evidencia guardada no se pierde.
- La revisión docente debe validar los contextos (precios en soles, «créditos», nombres de cursos) y la adecuación al CNEB.
