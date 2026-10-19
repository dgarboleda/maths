# Maths: aprender, practicar y aplicar

## Propósito y alcance de esta entrega

El acceso principal ofrece un programa incluido de 12 lecciones y la aventura **El apagón**, sin evaluación obligatoria ni preparación de niveles por parte de la familia. Público de referencia: adolescentes de 12–17 años que necesitan consolidar fundamentos; la entrada se determina por conocimientos y necesidades, no por edad. La adecuación a un currículo nacional queda pendiente de seleccionar el país y realizar su correspondencia curricular.

La entrega implementa el producto y los instrumentos del piloto. **No se ha realizado una revisión docente independiente ni un estudio con adolescentes.** El estado editorial de las lecciones es `pending-teacher-review`. Las comprobaciones automáticas verifican contratos, ejemplos de cálculo, accesibilidad, persistencia y reglas; no acreditan eficacia educativa ni una equivalencia oficial de grados o PISA.

## Recorrido del estudiante

1. Entra a `/jugar/{childId}` y encuentra Continuar, Aprender, Practicar y Aventura.
2. Abre una clase. Tres preguntas breves exploran sus bases; puede ir directamente a la explicación o demostrar lo que ya sabe en la comprobación.
3. Recorre tres ideas con representación, significado y notación; manipula un modelo visual y consulta vocabulario.
4. Sigue dos ejemplos cuyos pasos explican **por qué** se hace cada transformación.
5. Completa tres actividades guiadas y seis de práctica con reintentos, pistas graduales y desarrollo completo.
6. Resuelve cinco tareas de comprobación con primera respuesta registrada, incluidas comprensión conceptual y transferencia.
7. Aplica la idea a una situación de la ciudad. Puede completar el recorrido con apoyo y recibe las mismas cinco estrellas.
8. Consulta lo que ha demostrado, las tareas por reforzar y el repaso programado. El avance se confirma al guardar y se puede retomar desde otro dispositivo.

Las ayudas durante una comprobación, incluida la consulta de la explicación, se registran como apoyo. La práctica guiada y la aplicación con solución disponible no acreditan autonomía. La primera respuesta incorrecta de una comprobación no se sustituye por un acierto posterior. Los minijuegos existentes siguen como actividades adicionales; sus métricas no se convierten en la nueva evidencia de aprendizaje.

## Programa inicial

| Unidad | Lecciones |
| --- | --- |
| Fracciones y representaciones | Unidad y significado; equivalencia y comparación; fracción–decimal–porcentaje; fracción de una cantidad |
| Razones y proporcionalidad | Razones parte-parte y parte-total; tasa unitaria; proporcionalidad directa; cambios porcentuales |
| Álgebra inicial | Igualdad e incógnita; ecuaciones de un paso; ecuaciones de dos pasos; modelación y restricciones |

Cada lección contiene objetivo observable, propósito, prerrequisitos, vocabulario, tres secciones de clase, dos ejemplos razonados, errores habituales y bancos de tareas. Hay 24 ejemplos desarrollados y 324 instancias de actividades, organizadas en familias y formas paralelas; ese conteo no equivale a 324 competencias ni a 324 problemas de estructura distinta. Las dos formas de comprobación alternan datos. El repaso utiliza un banco separado; algunas preguntas conceptuales recuperan el mismo principio con formulaciones similares.

Las representaciones interactivas incluyen barras de fracción y equivalencia, relación con porcentajes, fracción de un total, razones, tasas, tablas proporcionales, cambios de base e igualdad. Las bases se ofrecen como enlaces a otras clases, sin candados nuevos.

## Evidencias y criterios provisionales

- Recorrer la clase se registra por separado de resolver problemas.
- Completar una aplicación con apoyo permite avanzar, sin declarar autonomía.
- Una comprobación se supera con al menos 4/5 respuestas autónomas, al menos una conceptual y la de transferencia. Una respuesta con pistas, consulta, desarrollo o primer intento incorrecto no es autónoma.
- El primer repaso se habilita **tres días después** de superar una comprobación. Se determina con el reloj del servidor.
- El repaso contiene cuatro tareas y exige al menos el 80% (4/4 por redondeo hacia arriba), incluida comprensión y transferencia. Superarlo registra evidencia diferida y programa otro a siete días; necesitar apoyo programa otro a tres.
- Un fallo posterior conserva las fechas y logros históricos, y recomienda refuerzo. No bloquea una aventura ni borra progreso.
- Estos umbrales son hipótesis del piloto, no una prueba estandarizada. Deben calibrarse mediante revisión y observación.

La evaluación curricular ampliada anterior sigue disponible por decisión explícita. Ya no condiciona el acceso ni otorga dominio de módulos inferiores basándose en una respuesta representativa. Sus resultados y logros históricos se conservan.

## El apagón

Una ciudad sin energía presenta una central y tres edificios explorables. Al inspeccionar se conocen las condiciones: reserva original de 120, hospital 3/4, radio 1/6 y taller al menos 10 unidades. El estudiante visita los edificios, planifica suministros con controles accesibles y prueba la red.

Las decisiones tienen consecuencias: sobrecarga desconecta la red; energía insuficiente mantiene un edificio en emergencia; un reparto válido ilumina las conexiones y restablece servicios. El mensaje distingue usar la fracción de la reserva original de usarla sobre el resto. La clase de fracción de una cantidad está disponible desde la aventura.

Se guarda cada prueba, se puede volver a experimentar y el premio de diez estrellas se entrega una sola vez. La misión es evidencia de participación y aplicación asistible, separada de la comprobación autónoma. Esta entrega incluye **una** aventura completa; las otras lecciones aportan situaciones de aplicación, no once capítulos completos adicionales.

## Arquitectura y datos

- `functions/src/learning/`: catálogo, contratos, validación numérica y motor educativo puros, compartidos con Next mediante `src/lib/learning/domain.ts`. No importan Firebase, React ni APIs de Node.
- `functions/src/learning.ts`: callable `recordLearningAction`. Verifica sesión y perfil, evalúa respuestas, controla revisión y confirma evidencia, agregado y recompensa en una transacción.
- `src/components/learning/`: inicio, biblioteca, clase, modelos, aventura e informe familiar.
- `learningProgress/{lessonId}`: versión de contenido, posición, respuestas actuales, apoyos, comprobaciones y fechas de repaso.
- `learningEvidence/{operationId}`: acciones inmutables para el cliente, versión y premio. Conserva el historial aunque se reinicie una ronda.
- `learningMissions/apagon`: inspección, suministros probados, consecuencias y logro.

El navegador lee solo datos de su perfil. Ningún cliente, incluido el de la familia, puede escribir los nuevos agregados o fabricar eventos directamente por Firestore. Functions valida y actualiza. La familia puede borrar los documentos al eliminar el perfil; el borrado incluye las tres colecciones.

Cada acción lleva un identificador idempotente y la revisión esperada. Un reintento idéntico no duplica evidencia ni estrellas. Dos pestañas con revisiones distintas no se sobrescriben: la interfaz permite cargar el avance confirmado. El error de guardado se muestra y ofrece reintento de la misma operación. No se ofrece funcionamiento completamente desconectado: hace falta conexión para confirmar acciones.

La evaluación de respuestas en servidor impide aceptar un booleano de acierto fabricado por el navegador. No convierte el producto en un examen vigilado: el catálogo y sus soluciones son contenido de enseñanza accesible al estudiante.

Las métricas educativas nuevas se muestran primero en `/panel/progreso`; la actividad anterior permanece como histórico. No se mezclan las estrellas o la precisión de los minijuegos con las comprobaciones autónomas.

## Minijuegos dentro de las clases

En la etapa **Práctica** la aplicación sortea, en cada ejercicio numérico, uno
de los nueve minijuegos: **Estanque** (Frogger), **Cohete**, **Serpiente
numérica**, **Autopista de resultados**, **Laberinto de números**, **Invasión
numérica**, **Bloques numéricos**, **Topos numéricos** (se responde tocando el
topo, sin cruceta) o **Caja numérica** (Sokoban por turnos, sin reloj). El
estudiante no tiene que elegir. Las doce
clases ofrecen ejercicios numéricos para todos. Cada pregunta conserva su
enunciado, respuesta, pistas y desarrollo del catálogo educativo compartido.
Las preguntas de elección conceptual se responden en su formato habitual.
«Prefiero escribir la respuesta» ofrece siempre la vía escrita (accesibilidad o
preferencia) y conserva la evidencia de la pregunta; recargar conserva el
avance y vuelve a sortear el juego.

Los seis juegos de reflejos (estanque, serpiente, carrera, laberinto,
invasores y bloques) conservan su **mecánica real** dentro de las clases, pero solo una decisión
deliberada envía una respuesta: llegar a un nenúfar, comer un número, disparar a una columna,
cruzar una puerta después de pulsar una flecha o romper el bloque correcto.
Los fallos de reflejos —chocar con el obstáculo o con el borde, que alcance el fantasma, que la oleada
aterrice, perder la pelota, llegar a una puerta sin decidir o un rebote contra
un bloque incorrecto— no se registran, no restan vidas y la partida sigue con
el mismo ejercicio (`src/lib/minigames/lessonArcade.tsx`). En los bloques, qué
bloque toca la pelota depende del rebote, así que solo el correcto cuenta y
ese juego no registra errores. Las vidas, estrellas y marcas solo existen en
niveles y mundos. Para que lo que se registra sea siempre una decisión, en la
clase la serpiente y el laberinto no avanzan solos hasta la primera flecha
(al empezar, tras un fallo de reflejos y tras cada respuesta), y en la carrera
cada puerta empieza fuera de los carriles: hay que elegir uno con las flechas.

El cohete empieza sin límite de tiempo y permite activar un reto de 30 segundos. Se puede
pausar; el reloj se detiene durante el guardado, al ocultar la pestaña y al
revisar un error. Cada error pausa la partida hasta que el estudiante decide
reanudar, para leer la orientación y pedir pistas antes de reintentar el mismo
ejercicio. Agotar el tiempo no envía una respuesta ni resta progreso matemático.

Los juegos envían la **respuesta concreta** a `recordLearningAction`, igual
que la práctica escrita. Functions valida y guarda los intentos y apoyos;
la interfaz celebra únicamente un acierto confirmado en el avance guardado.
Los reintentos de red conservan el identificador de operación. No se usa el
registro antiguo de intentos, marcas o premios y no se añaden estrellas por
partida. La comprobación conceptual y de transferencia sigue después de la
práctica: ganar un juego no acredita autonomía ni completa la clase.

Se reutilizan `FroggerGeneric` y `CoheteGeneric` mediante un contrato opcional
de ejercicio de clase; los modos arcade anteriores conservan su funcionamiento.
Los componentes de juego se cargan bajo demanda. Esta integración usa el
contrato educativo existente del protocolo 3 y no cambia funciones, reglas,
colecciones ni versiones del contenido. Las preguntas mantienen su estado de
revisión docente pendiente. Snake, Runner, Number Pac, Invaders y Breakout siguen
disponibles en los niveles anteriores; su incorporación a las clases queda fuera
de esta entrega.

## Auditoría del catálogo anterior

El [inventario de los 67 módulos](auditoria-contenido.md) señala cobertura, cambios y trabajo editorial pendiente. Se corrigieron la representación de 10/10 como decimal y las soluciones reales de x² = c. También se explicitó la familia afín y = mx + b antes de extrapolar una tabla y la inversión de la desigualdad al multiplicar o dividir por un número negativo. Los ejemplos de los módulos vinculados usan los nuevos desarrollos autorales; el resto muestra pasos de sus pistas existentes y respeta las etiquetas de respuestas de opción múltiple.

Los casos de uso, grado y PISA de los módulos anteriores siguen siendo referencias históricas que necesitan revisión pedagógica. El inventario no equivale a declarar correctos todos sus enunciados o a reescribir cada módulo como una clase completa.

## Revisión docente y piloto: trabajo externo pendiente

Para cada lección, una persona docente distinta de su autor debe registrar nombre, fecha, versión revisada y observaciones, comprobando:

1. Exactitud de las definiciones, procedimientos, resultados y unidades, incluidos cero, signos y casos límite.
2. Que los prerrequisitos bastan y cada objetivo tiene una tarea que lo comprueba.
3. Que se explica el significado antes de abreviar los procedimientos.
4. Que las alternativas y respuestas a errores identifican ideas relevantes.
5. Que las formas de diagnóstico, comprobación y repaso permiten interpretar la evidencia sin atribuir habilidades no observadas.
6. Que el lenguaje, contexto y apoyos son adecuados para adolescentes con distintos puntos de partida.

El piloto propuesto comienza con sesiones observadas de 5–8 adolescentes para localizar problemas de comprensión y uso, con las autorizaciones familiares correspondientes. Después se ensaya el recorrido con una muestra más amplia para explorar aprendizaje. Las sesiones deben recoger punto de partida, resolución autónoma inmediata, explicación de estrategias, transferencia y desempeño diferido a 3–7 días mediante formas equivalentes. Un piloto pequeño orienta ajustes; no demuestra eficacia causal.

La edición posterior conservará las versiones de los eventos. Antes de incrementar `Lesson.version`, se deberá implementar una transición explícita del avance: el motor actual rechaza una versión incompatible para evitar mezclar evidencias de contenidos distintos.

## Publicación coordinada

Se requiere Functions, reglas de Firestore y frontend de la misma revisión, con **protocolo 3** (protocolo 4 desde el endurecimiento del acceso infantil, ver [operación](operacion.md#acceso-infantil)). Usar el despliegue completo existente, que publica Firebase antes del Worker. No se ha desplegado esta entrega a producción.

La validación técnica comprende tipos, lint, pruebas del motor y contenido, reglas y callables con sesiones reales en emuladores, recorridos de navegador de escritorio/móvil y presupuestos de producción para login, clase, aventura, nivel familiar y editor.
