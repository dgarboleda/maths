# Target Masters: guía de trabajo

Target Masters forma parte de Practicar en Math Quest. El jugador combina todas las fichas para alcanzar un objetivo y abrir un portal. El juego está pensado para estudiantes de 11 años en adelante y funciona con botones táctiles o teclado.

## Experiencia disponible

- Aventura con 100 desafíos deterministas agrupados en cinco mundos; cada vigésimo nivel enfrenta al guardián de las gemelas. Se desbloquea el siguiente nivel al resolver el anterior.
- Las fichas gemelas deben combinarse entre sí; las congeladas se liberan tras otro movimiento; las cambiantes permiten escoger entre dos valores.
- Práctica configurable por operaciones y dificultad; infinito, reto diario común según la fecha de Lima y contrarreloj opcional de 90 segundos.
- Suma, resta, multiplicación y división exacta; se admiten resultados enteros no negativos. Se aceptan todas las soluciones que usen las fichas y cumplan las reglas.
- Pistas calculadas desde el tablero actual, deshacer, reiniciar y laboratorio que busca otra expresión válida con los valores iniciales.
- Hasta tres estrellas: una por terminar, una por hacerlo sin pistas y una por no deshacer ni hacer movimientos inválidos. Las insignias diarias son cosméticas.
- El dispositivo registra por perfil las estrellas, los niveles desbloqueados, inicios de intentos, operaciones, pistas, desafíos completados e insignias. Esta información no acredita dominio de una competencia.

## Pendiente de validación y sincronización

El progreso continúa en el navegador; no se sincroniza entre dispositivos. No se escribe en `learningProgress`, pues esa colección es evidencia académica validada por Functions. Para sincronizar sin perder progreso de dispositivos simultáneos se requiere diseñar un recurso de juego aislado por familia y perfil, una estrategia de combinación de eventos idempotentes, reglas de acceso, migración del historial local y pruebas con emuladores. No se debe considerar al navegador una fuente de dominio académico.

Se necesitan sesiones con estudiantes y revisión pedagógica para evaluar comprensión de reglas, dificultad y diversión. También conviene ampliar los desafíos y la variedad narrativa de guardianes antes de considerar completo el contenido previsto.
