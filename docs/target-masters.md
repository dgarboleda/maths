# Target Masters: guía de trabajo

Target Masters forma parte de Practicar en Math Quest. El jugador combina todas las fichas para alcanzar un objetivo y abrir un portal. El juego está pensado para estudiantes de 11 años en adelante y funciona con botones táctiles o teclado.

## Experiencia disponible

- Aventura con 100 desafíos deterministas agrupados en cinco mundos; cada vigésimo nivel enfrenta al guardián de las gemelas. Se desbloquea el siguiente nivel al resolver el anterior.
- Las fichas gemelas deben combinarse entre sí; las congeladas se liberan tras otro movimiento; las cambiantes permiten escoger entre dos valores.
- Al entrar se elige un modo; dentro del tablero, «Cambiar modo» abre el selector y permite volver a la partida sin perderla. El contrarreloj se pausa mientras el selector está abierto.
- Práctica configurable por operaciones y dificultad; infinito, reto diario común según la fecha de Lima y contrarreloj opcional de 90 segundos.
- Suma, resta, multiplicación y división exacta; se admiten resultados enteros no negativos. Se aceptan todas las soluciones que usen las fichas y cumplan las reglas.
- Pistas calculadas desde el tablero actual, deshacer, reiniciar y laboratorio que busca otra expresión válida con los valores iniciales.
- Hasta tres estrellas: una por terminar, una por hacerlo sin pistas y una por no deshacer ni hacer movimientos inválidos. Las insignias diarias son cosméticas.
- El juego registra por perfil las estrellas, los niveles desbloqueados, inicios de intentos, operaciones, pistas, desafíos completados e insignias. Esta información no acredita dominio de una competencia.
- Con una sesión autorizada, el progreso se sincroniza mediante los registros de juego del perfil. Cada dispositivo mantiene una copia; al combinarlas se conserva el mayor nivel y la mejor puntuación de cada nivel y se suman los contadores. Los retos diarios se identifican por fecha para evitar duplicados entre dispositivos. El progreso local previo se importa automáticamente.
- Sin conexión, se guarda en el dispositivo y se sincroniza al volver a conectar. La interfaz informa si la sincronización está pendiente o no se puede realizar.

## Validación pendiente

Se necesitan sesiones con estudiantes y revisión pedagógica para evaluar comprensión de reglas, dificultad y diversión. También conviene ampliar los desafíos y la variedad narrativa de guardianes antes de considerar completo el contenido previsto.

Los datos sincronizados viven en la subcolección `records` existente del perfil, separados de la evidencia académica validada por Functions. Al eliminar el perfil, los registros se borran mediante el procedimiento de eliminación existente. Los contadores simultáneos de varias pestañas en el mismo dispositivo se combinan por máximo; niveles y estrellas no retroceden.
