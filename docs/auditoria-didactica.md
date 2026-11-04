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

## Resuelto después de la primera entrega

- **Cuarta formulación conceptual:** cada clase tiene una pregunta conceptual reservada a la comprobación B (`functions/src/learning/checkConcepts.ts`, 50 preguntas). La evaluación de ubicación de fracciones, que usa la conceptual de la forma B, también la muestra. El repaso diferido sigue recuperando la formulación de la práctica, días después.
- **Explicaciones de procedimiento:** 182 plantillas tenían un desarrollo de un paso o una explicación de menos de 12 palabras (88 de los bancos y 94 diagnósticos). Ahora cada una dice qué idea se aplica, hace el cálculo y lo comprueba o interpreta, sin cambiar enunciados, respuestas ni pistas. `catalog.test.ts` exige al menos dos pasos y 12 palabras en toda pregunta de procedimiento. Las conceptuales de opción múltiple explican cada error en el feedback de su alternativa.
- **`CONTENT_VERSION` 3:** una ronda en curso con la versión anterior se reinicia sin perder logros, agenda ni resultados.
- **Peso de la página de clase:** el navegador ya no carga el catálogo completo, solo la clase abierta (ver [operación](operacion.md)).

## Pendiente

- La revisión docente debe validar los contextos (precios en soles, «créditos», nombres de cursos), las 50 formulaciones nuevas, las explicaciones ampliadas y la adecuación al CNEB.
