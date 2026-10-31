# Dinámica de cuatro minijuegos

## Práctica con rondas continuas

La práctica elige un minijuego al azar para cada actividad numérica; las preguntas conceptuales conservan su formato propio. El resultado del sorteo permanece estable mientras se responde la actividad. Los puntos arcade se acumulan en memoria cuando se repite un mismo juego y se reinician al cambiar; no sustituyen el avance ni las estrellas. Cada respuesta se guarda por separado mediante el flujo de la lección y se puede revisar su explicación antes de continuar. Al recargar se conserva el avance guardado, no la puntuación de la sesión.

Los aciertos anteriores ajustan el reto: en Invasión aceleran el descenso; en Autopista, la puerta; en Estanque, el cocodrilo y su dirección inicial; en Serpiente y Laberinto, el movimiento; en Topos, la duración de aparición; en Bloques, el recorrido del disparo; en Cajas, se alterna el almacén. Cohete muestra el avance acumulado entre ejercicios y conserva su reloj opcional. Las velocidades tienen un límite; Cajas mantiene deshacer y no tiene reloj.

En Invasión las respuestas aparecen de manera escalonada y descienden independientemente; pueden coincidir varias en pantalla. La partida empieza tras pulsar «Empezar», para permitir leer la pregunta. Apuntar y disparar siguen siendo acciones distintas. Si una nave alcanza la misma columna del jugador o se guarda una respuesta incorrecta, se pierde una unidad del escudo; esquivar da puntos y ninguna colisión envía una respuesta. Las alternativas que salen de pantalla vuelven a aparecer, incluida la correcta. Al agotarse el escudo se repone y se reduce la velocidad. Los tableros aprovechan más ancho en escritorio, con límites según la altura de pantalla.

En Autopista un obstáculo señalado aparece antes de la puerta a partir de la segunda ronda: esquivarlo da puntos y chocar reinicia el tramo sin respuesta. En Estanque los nenúfares rotan mientras la rana espera a salvo y se fijan al entrar al río. Serpiente crece entre aciertos, Bloques alterna alturas sin tapar ninguna opción, Topos acelera sus apariciones con un límite y Cajas incorpora un cuarto almacén con recorridos verificados. En Laberinto, explorar después de usar el escudo puede hacer aparecer otro en una casilla accesible sin atravesar una respuesta. Cohete ofrece una maniobra orbital opcional para esquivar meteoritos y recoger cápsulas; los choques afectan su escudo, no la respuesta matemática, y la pausa detiene la maniobra.

Estas son mejoras de la mecánica existente; no implementan todavía todos los obstáculos y escenarios propuestos para cada juego. El equilibrio de velocidad y la experiencia de lectura requieren pruebas con estudiantes.

La práctica conserva las preguntas de la clase y su corrección en Functions. Estas mejoras cambian la interacción, sin modificar el catálogo, el protocolo 12, la economía de estrellas ni los datos guardados.

| Juego | Dinámica |
| --- | --- |
| Invasión numérica | Respuestas que aparecen de forma escalonada y descienden por separado. La columna y el valor quedan fijados al disparar; esquivar suma puntos y un choque daña el escudo sin enviar una respuesta. |
| Autopista de resultados | Vehículo, carretera y puertas que se aproximan. El primer carril inicia la carrera en clase; antes se puede leer sin cuenta atrás. El turbo voluntario acorta el recorrido y permite seguir cambiando de carril. No concede premios por responder más rápido. |
| Estanque | Saltos de 180 ms, un movimiento por toque, cocodrilo que sigue patrullando mientras se espera en la orilla y dirección alterna entre estanques del recorrido anterior. Entrar en su casillero también produce un choque. Se mantienen las tres filas visibles: nenúfares, carril y orilla. |
| Bloques numéricos | En clase, tiro directo o rebote en cualquiera de las dos paredes, con guía de trayectoria y bloque apuntado resaltado. El vuelo conserva el destino elegido; el rebote no introduce una respuesta accidental. El modo anterior conserva su física libre. |

Las pausas detienen vuelos, saltos, desplazamientos y animaciones decorativas. Las animaciones decorativas respetan «reducir movimiento». Los fallos de reflejos de la clase no se registran como respuestas matemáticas. Los sonidos mantienen la preferencia existente.

Al empezar se coloca el enunciado al inicio de la vista y se le da el foco para leerlo y jugar con el teclado. Mover al personaje o pausar no vuelve a desplazar la página. El tablero y los controles quedan a continuación del problema, también en móvil.

La geometría de los rebotes se prueba para las cinco columnas y los tres tiros. Las pruebas de componentes comprueban pausa, respuestas únicas, ausencia de respuestas automáticas antes de actuar, turbo y obstáculos. Los E2E recorren el guardado real con emuladores, en móvil y escritorio, y comprueban accesibilidad.
