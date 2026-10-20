# Dinámica de cuatro minijuegos

La práctica conserva las preguntas de la clase y su corrección en Functions. Estas mejoras cambian la interacción, sin modificar el catálogo, el protocolo 12, la economía de estrellas ni los datos guardados.

| Juego | Dinámica |
| --- | --- |
| Invasión numérica | Guía de puntería, enemigos animados dentro de su columna y rayo visible hasta el impacto. La columna elegida queda fijada al disparar y no se aceptan disparos simultáneos. En clase, la oleada espera el primer movimiento; si aterriza, se puede reintentar sin enviar una respuesta. |
| Autopista de resultados | Vehículo, carretera y puertas que se aproximan. El primer carril inicia la carrera en clase; antes se puede leer sin cuenta atrás. El turbo voluntario acorta el recorrido y permite seguir cambiando de carril. No concede premios por responder más rápido. |
| Estanque | Saltos de 180 ms, un movimiento por toque, cocodrilo que sigue patrullando mientras se espera en la orilla y dirección alterna entre estanques del recorrido anterior. Entrar en su casillero también produce un choque. Se mantienen las tres filas visibles: nenúfares, carril y orilla. |
| Bloques numéricos | En clase, tiro directo o rebote en cualquiera de las dos paredes, con guía de trayectoria y bloque apuntado resaltado. El vuelo conserva el destino elegido; el rebote no introduce una respuesta accidental. El modo anterior conserva su física libre. |

Las pausas detienen vuelos, saltos, desplazamientos y animaciones decorativas. Las animaciones decorativas respetan «reducir movimiento». Los fallos de reflejos de la clase no se registran como respuestas matemáticas. Los sonidos mantienen la preferencia existente.

La geometría de los rebotes se prueba para las cinco columnas y los tres tiros. Las pruebas de componentes comprueban pausa, respuestas únicas, ausencia de respuestas automáticas antes de actuar, turbo y obstáculos. Los E2E recorren el guardado real con emuladores, en móvil y escritorio, y comprueban accesibilidad.
