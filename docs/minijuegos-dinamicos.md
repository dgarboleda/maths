# Dinámica de cuatro minijuegos

## Práctica con rondas continuas

La práctica conserva el juego elegido al pasar entre actividades numéricas de una clase. Se puede cambiar mediante el selector; las preguntas conceptuales conservan su formato propio. Después de avanzar manualmente a una actividad numérica, el mismo juego inicia la ronda cuando termina el guardado y no está en pausa. Los puntos arcade se acumulan en memoria durante la visita y se reinician al cambiar de juego; no sustituyen el avance ni las estrellas. Cada respuesta se guarda por separado mediante el flujo de la lección y se puede revisar su explicación antes de continuar. Al recargar se conserva el avance guardado, no la puntuación de la sesión.

Los aciertos anteriores ajustan el reto: en Invasión aceleran el descenso; en Autopista, la puerta; en Estanque, el cocodrilo y su dirección inicial; en Serpiente y Laberinto, el movimiento; en Topos, la duración de aparición; en Bloques, el recorrido del disparo; en Cajas, se alterna el almacén. Cohete muestra el avance acumulado entre ejercicios y conserva su reloj opcional. Las velocidades tienen un límite; Cajas mantiene deshacer y no tiene reloj.

En Invasión las naves aparecen una por una y no descienden hasta completar la formación. Apuntar y disparar siguen siendo acciones distintas. Si la formación aterriza se pierde una unidad del escudo y no se envía una respuesta; al agotarlo, se repone y se reduce la velocidad para el siguiente intento. Los tableros aprovechan más ancho en escritorio, con límites según la altura de pantalla.

Estas son mejoras de la mecánica existente; no implementan todavía todos los obstáculos y escenarios propuestos para cada juego. El equilibrio de velocidad y la experiencia de lectura requieren pruebas con estudiantes.

La práctica conserva las preguntas de la clase y su corrección en Functions. Estas mejoras cambian la interacción, sin modificar el catálogo, el protocolo 12, la economía de estrellas ni los datos guardados.

| Juego | Dinámica |
| --- | --- |
| Invasión numérica | Guía de puntería, enemigos animados dentro de su columna y rayo visible hasta el impacto. La columna elegida queda fijada al disparar y no se aceptan disparos simultáneos. En clase, la oleada espera el primer movimiento; si aterriza, se puede reintentar sin enviar una respuesta. |
| Autopista de resultados | Vehículo, carretera y puertas que se aproximan. El primer carril inicia la carrera en clase; antes se puede leer sin cuenta atrás. El turbo voluntario acorta el recorrido y permite seguir cambiando de carril. No concede premios por responder más rápido. |
| Estanque | Saltos de 180 ms, un movimiento por toque, cocodrilo que sigue patrullando mientras se espera en la orilla y dirección alterna entre estanques del recorrido anterior. Entrar en su casillero también produce un choque. Se mantienen las tres filas visibles: nenúfares, carril y orilla. |
| Bloques numéricos | En clase, tiro directo o rebote en cualquiera de las dos paredes, con guía de trayectoria y bloque apuntado resaltado. El vuelo conserva el destino elegido; el rebote no introduce una respuesta accidental. El modo anterior conserva su física libre. |

Las pausas detienen vuelos, saltos, desplazamientos y animaciones decorativas. Las animaciones decorativas respetan «reducir movimiento». Los fallos de reflejos de la clase no se registran como respuestas matemáticas. Los sonidos mantienen la preferencia existente.

Al empezar se coloca el enunciado al inicio de la vista y se le da el foco para leerlo y jugar con el teclado. Mover al personaje o pausar no vuelve a desplazar la página. El tablero y los controles quedan a continuación del problema, también en móvil.

La geometría de los rebotes se prueba para las cinco columnas y los tres tiros. Las pruebas de componentes comprueban pausa, respuestas únicas, ausencia de respuestas automáticas antes de actuar, turbo y obstáculos. Los E2E recorren el guardado real con emuladores, en móvil y escritorio, y comprueban accesibilidad.
