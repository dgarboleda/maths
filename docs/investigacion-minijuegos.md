# Segunda revisión de los nueve minijuegos

## Método y criterio

Revisión del código, de sus contratos con la práctica y de los recorridos de móvil y escritorio sobre la revisión `03ff80a`. Se contrastaron controles, tiempos de lectura, señales de peligro y animación con documentación de accesibilidad. Las propuestas siguientes son decisiones de diseño comprobadas técnicamente; todavía no se ha realizado una prueba de preferencia o aprendizaje con adolescentes.

La pregunta matemática sigue viniendo de la clase. Elegir una respuesta deliberadamente envía su valor a Functions. Moverse, fallar un salto, que aterrice una oleada, explorar, deshacer o cambiar el ritmo no se convierten en errores matemáticos en la clase. La velocidad no concede premios adicionales y la vía escrita continúa disponible.

## Hallazgos y cambios

| Juego | Hallazgo | Mejora implementada |
| --- | --- | --- |
| Serpiente | Cuadrados sin orientación; dos giros entre avances podían convertirse en una inversión hacia el cuerpo. Faltaba enfocar el problema al empezar. | Cabeza con ojos orientada al movimiento, cuerpo segmentado y jardín con cuadrícula. Una sola orden de giro por avance y posición autoritativa compartida por los eventos. Lectura inicial y controles de una pulsación. |
| Laberinto | No tenía paredes; el fantasma recorría filas sin reaccionar al jugador. El poder no explicaba cuánto duraba. | Paredes que bloquean a ambos, persecución por caminos transitables y huida al recoger un escudo de cuatro segundos, con duración visible y pausada junto al juego. Los empates del recorrido son estables. El fantasma vuelve a su inicio tras alcanzar al jugador. |
| Invasión | Apuntar en móvil exigía varios toques en flechas y el personaje era un emoji pequeño. | Naves y enemigos vectoriales, blancos grandes y seleccionables por toque, foco o teclado. Apuntar no dispara. El valor queda fijado hasta el impacto y los controles permanecen bloqueados durante el guardado. |
| Autopista | Los carriles solo se elegían con controles separados. Se renderizaba toda la carrera en cada fotograma. | Coche ilustrado, carriles que también son botones y elección modificable durante la aproximación. El turbo sigue siendo voluntario. El reloj real decide el cruce y la pintura se actualiza cada 80 ms con interpolación visual. |
| Estanque | El obstáculo era difícil de anticipar visualmente aunque sus colisiones ya estaban probadas. | Agua, nenúfares y orilla diferenciados; rana y cocodrilo propios. Una flecha indica la siguiente casilla real del cocodrilo, incluido el cambio de sentido en los bordes. Se mantienen los saltos separados y la vuelta a la orilla sin respuesta al chocar. |
| Bloques | Seleccionar una columna en móvil exigía desplazar la paleta; los bloques eran blancos pequeños y planos. | Pista con paredes laterales, bloques con relieve y blancos de clase ampliados. Tocar un bloque coloca la paleta sin lanzar; se elige tiro directo o rebote y después se lanza. Se conserva la guía y el valor elegido durante el vuelo. El recorrido anterior mantiene su física libre. |
| Topos | Leer un número y navegar con Tab podía llevar más que los 2,6 segundos del topo. | Topos ilustrados, agujeros con profundidad y señal de permanencia. «Sin prisas» conserva dos opciones visibles y «Siguiente tanda» recorre la cola de valores sin registrar respuestas. El modo automático sigue disponible. |
| Caja numérica | La dinámica de Sokoban ya exigía planificación, pero el personaje y la meta se distinguían poco y descubrir un atasco podía ser frustrante. | Operario y camión propios. «Ver atascos» marca opcionalmente las casillas desde las que la geometría impide entregar una caja. La señal no consulta cuál número es correcto. Se conservan los tres almacenes, deshacer y reiniciar. |
| Cohete | El desplazamiento del recorrido anterior usaba píxeles fijos y podía salirse en pantallas pequeñas. El sonido de fin siempre era de éxito. | Tierra, cohete y Luna vectoriales, ruta de vuelo proporcional al espacio disponible y etapas visuales. El reloj también se detiene al ocultar la pestaña en el recorrido anterior. La derrota tiene su sonido correspondiente. |

Los escenarios usan SVG y CSS locales, sin peticiones de imágenes ni dependencias nuevas. Los personajes no llevan texto alternativo redundante: la instrucción, los botones y los avisos transmiten la información. Las alternativas matemáticas conservan sus etiquetas, incluyendo fracciones y signos.

## Reglas técnicas compartidas

- Los botones táctiles responden también a la activación por teclado o tecnología de asistencia. El clic que sigue a un toque no duplica su acción. Desactivar un control cancela la repetición que estuviera en curso.
- Los atajos no capturan escritura, contenido editable, composición ni combinaciones con Ctrl, Cmd o Alt. Espacio conserva la activación nativa del botón enfocado, sin disparar además otra acción del juego.
- El bucle compartido limita a 100 ms el avance de un fotograma tras un bloqueo del hilo y continúa evitando acumular tiempo con la pestaña oculta.
- Las animaciones decorativas se detienen en pausa y respetan reducir movimiento. La lógica y las respuestas no dependen del final de una animación CSS.
- Empezar y reanudar vuelven a mostrar el enunciado y el tablero. Pausar o mover al personaje no desplazan la página ni vuelven a tomar el foco.
- Las elecciones de Laberinto se colocan sin conocer el valor correcto y se comprueba que cada una tiene un camino que no obliga a recoger otra primero. El escudo se elige en una zona accesible sin atravesar el fantasma inicial.
- «Ver atascos» identifica bloqueos geométricos, no todos los bloqueos entre varias cajas. Deshacer y reiniciar siguen resolviendo esos casos.

## Referencias aplicadas

- [Xbox Accessibility Guideline 116: Time limits](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/116): distingue los tiempos de interfaz de las mecánicas centrales del juego. Se adopta como criterio de diseño permitir leer y comprender antes de activar la acción; no se afirma que esta guía prohíba los juegos con tiempo.
- [W3C: Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html): se respeta la preferencia de reducir movimiento para efectos que no comunican una acción esencial. Las pausas detienen también las animaciones decorativas.
- [W3C: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): el mínimo general es de 24 píxeles CSS, con excepciones. Para los controles principales se usan blancos de al menos 44 píxeles de alto y equivalentes de teclado; el tablero visual no exige pulsar una celda diminuta para moverse.

## Validación y alcance

Las pruebas del motor de Laberinto recorren las 420 combinaciones distintas de jugador y fantasma, con dos órdenes de colocación, y verifican las cinco opciones desde cada salida sin respuestas intermedias obligatorias. También se comprueban paredes y pasos del perseguidor, giros de Serpiente, selección sin disparar, selección durante el recorrido, respuesta única durante el guardado, pausa del escudo, tandas sin reloj y controles nativos.

Los E2E usan emuladores para comprobar la petición a `recordLearningAction`, la respuesta guardada y la pantalla resultante. Móvil y escritorio recorren los juegos, la pausa, las etiquetas de fracciones, la vía escrita y accesibilidad. Las comprobaciones automáticas de accesibilidad no sustituyen una prueba con usuarios y tecnologías de asistencia.

No cambian el catálogo de lecciones, el protocolo 12, las reglas de recompensas ni los documentos persistidos. No hay migraciones, escrituras por movimiento, cambios de secretos o IAM ni servicios adicionales. `PIN_PEPPER` permanece en Secret Manager.

# Tercera revisión: capa arcade

## Objetivo

Hacer los nueve juegos más dinámicos y con sensación de recreativo sin tocar el contrato con la clase: solo una decisión deliberada envía una respuesta, el servidor decide la corrección y la velocidad no concede premios.

## Capa compartida (`ArcadeFx.tsx`, `arcadeScore.ts`)

- **Marcador arcade**: PUNTOS, COMBO y RÉCORD con cinco cifras. Es local al dispositivo (`numerario:arcade:<juego>`), no se envía a Functions ni concede estrellas o dominio.
- **Combo**: las acciones seguidas sin fallo de reflejos multiplican ×2, ×3 y ×4 (a las 3, 6 y 10). Un fallo de reflejos corta la cadena, sin restar puntos.
- **Efectos**: textos flotantes, partículas, carteles («¡YA!», «¡Combo ×2!») y sacudida de la máquina con la Web Animations API. Con «reducir movimiento» no hay partículas ni sacudida y los textos aparecen sin desplazarse; la pausa congela las animaciones.
- **Sonido**: cinco efectos sintetizados nuevos (`coin`, `combo`, `crash`, `pop`, `whoosh`). En la clase el juego recibía `soundOn={false}`; ahora sigue la preferencia global y hay un botón «Sonido del juego».
- **Cierre**: al resolver el ejercicio (clase) o ganar la partida se suma un bonus de meta, se celebra con fanfarria y confeti y se muestra «¡Nuevo récord!» si corresponde.

## Mecánicas nuevas por juego

Todas dan solo puntos arcade; ninguna envía respuestas ni cambia las opciones.

| Juego | Novedad |
| --- | --- |
| Serpiente | Monedas doradas en casillas libres. Cada moneda acelera un poco la serpiente (con piso de 260 ms por paso). |
| Laberinto | Las migas del suelo se recogen. El escudo da puntos y, con él activo, alcanzar al fantasma lo devuelve a su casa. |
| Invasión | Cápsulas doradas que caen por una columna: se recogen colocando la nave debajo. Explosión y sacudida al impactar. |
| Autopista | Volantazos con puntos de estilo, estela al rodar y llamarada con el turbo (el turbo no da puntos). |
| Estanque | Puntos por cada salto seguro al río y bonus «¡Por poco!» al esquivar al cocodrilo por una casilla. |
| Bloques | Peloteo encadenado en el recorrido libre; en la clase, «¡Carambola!» al usar un tiro con rebote. |
| Topos | Topo dorado sin número que aparece y se esconde; no sale con «Sin prisas». |
| Caja numérica | Polvo al empujar, aviso al dejar una caja atascada y bonus de «par» por entregar con pocos pasos. Sigue sin reloj. |
| Cohete | Estela del motor, «¡Despegue!» y combo por respuestas seguidas en el recorrido con tiempo. |

## Validación

Pruebas unitarias de la puntuación (tramos de combo, récord, valores inválidos) y del hook (combo, retirada de efectos, corte de cadena, bonus y récord, celebración solo al resolver en la clase, sonido desactivado). Las pruebas existentes de los nueve juegos y de `LessonGames` siguen pasando sin cambios.

# Cuarta revisión: congruencia entre preguntas y alternativas

Auditoría de las 245 preguntas numéricas de práctica de las clases y de los 67 módulos del currículo que los niveles pueden asignar a cualquier minijuego. Queda fijada en `src/lib/minigames/arcadeCongruence.test.ts`.

| Hallazgo | Alcance | Corrección |
| --- | --- | --- |
| Los módulos con opciones de texto (figuras, fracciones, lógica) guardan la respuesta como índice. En los minijuegos de los niveles se mostraban números sin relación con la pregunta (0, 3, 7…). | 10 módulos | `arcadeValues` usa las opciones propias del problema y `choiceLabel` muestra su texto. |
| Con respuesta negativa, todas las alternativas generadas eran positivas: el signo delataba la correcta. | `aritmetica-d10`, `geometria-d8` | `choiceSet` admite negativos si la respuesta lo es y garantiza al menos otro. |
| «Escribe como decimal la fracción 2/5» mostraba la opción correcta como «2/5», copiada del enunciado y en la forma contraria a la pedida. | Clases que piden decimal | `lessonProblem` respeta «como decimal» salvo «fracción o decimal». |
| Los decimales del modo legado se mostraban con punto («22.1») y sin signo tipográfico. | 3 módulos | Misma presentación que las clases: coma decimal y «−». |
| Un problema con menos opciones que casillas dejaba nenúfares o carriles vacíos que contaban como respuesta incorrecta. | Estanque, Autopista | Saltar a un nenúfar vacío no responde; hay tantos carriles como opciones. |

Comprobaciones permanentes: cada etiqueta se corrige igual que el valor enviado, una sola opción correcta, sin etiquetas repetidas, se respeta la forma pedida (decimal o fracción), convertir no se resuelve copiando el enunciado, no hay negativos ni probabilidades fuera de [0, 1] inventados y, en el modo legado, la respuesta siempre está entre las opciones y su texto es el del problema.

Se mantienen a propósito:

- Los errores razonados del contenido, aunque estén fuera del dominio (−14 como lado, 9,6 unidades), porque su retroalimentación trabaja ese error.
- Errores razonados que no se pueden escribir con exactitud (1/6 en una respuesta entera, 16,67 %), que siguen fuera de las alternativas.
- Errata corregida: la vía escrita sí muestra la unidad («Tu respuesta (cm²)»). Los juegos la muestran ahora bajo el enunciado («Respuesta en cm²») en las 21 preguntas que la indican aparte.

# Fórmulas escritas como en papel

La notación en línea del contenido («3/4», «(1 × 2)/(2 × 2)», «√(81 + 144)», «10^?») se dibuja con fracciones apiladas, raíces con vínculo y exponentes (`src/lib/math/parseMath.ts`, `src/components/MathText.tsx`). No hace falta reescribir el contenido.

- Se reconocen fracciones de números, letras con coeficiente («4x/4»), huecos («?/9», «__/12»), grupos entre paréntesis y raíces anidadas, como en la fórmula general de segundo grado. Las razones entre palabras («opuesto/hipotenusa») solo se apilan dentro de una fórmula, después de «=».
- Quedan como texto las unidades («km/h», «L/min», «S/ 2000», «créditos/sensor»), las fechas, las razones en prosa y «f(x)/2». Se contrastó con los 16 535 textos que ve el estudiante.
- Se usa HTML y CSS propios en lugar de MathML o KaTeX: se ve igual en todos los navegadores, no depende de una fuente matemática instalada y no añade dependencias.
- Accesibilidad y pruebas: el dibujo es `aria-hidden` y pinta sus caracteres con `content: attr()`. El texto del documento sigue siendo el original («1/5»), así que lectores de pantalla, copiar y pegar y las búsquedas de las pruebas no cambian.
- La raíz se dibuja con un trazo SVG que se estira con el contenido y se une a la barra superior; el contenido conserva la línea base del texto.
- Explicación de las clases: párrafos, fórmula de cada idea y ejemplos, además de los textos de las ilustraciones interactivas (suma, producto y cociente de fracciones, fracciones equivalentes, cantidades, razones, probabilidad, raíces, Pitágoras, decimales, distancia y volúmenes). Esos textos combinaban JSX con valores (`{a}/{b}`) y ahora se arman como una sola cadena. En el diagrama de árbol, la probabilidad de cada rama se apila dentro del SVG. Las fórmulas ya no usan fuente monoespaciada, que separaba los símbolos.
- Se aplica en clases (secciones, fórmulas, ejemplos, preguntas, opciones, pistas, retroalimentación y razonamiento), repasos, ubicación, ayuda de símbolos, los nueve minijuegos (enunciado y alternativas), la ronda de práctica, el cohete y las fichas del mundo.
