# Fraction Fighters

Aventura individual por turnos en Practicar. La guardiana ayuda a restaurar un bosque mágico en seis encuentros y un guardián. La vida empieza en 8; la energía empieza en 1 unidad, expresada en doceavos exactos, y recupera hasta 1/4 al principio de cada turno después del primero.

Las acciones cuestan 1/4 (Chispa y Escudo), 1/2 (Rayo lunar y Curación), 1/3 (Lazo estelar, en encuentros 5 a 7) o cero (Descansar). El escudo bloquea hasta dos puntos del siguiente ataque; el del rival bloquea hasta dos del siguiente ataque que reciba. No se acumulan. Las criaturas muestran su próximo movimiento y sus patrones son deterministas.

La primera partida introduce una pregunta guiada en el segundo turno; después las preguntas aparecen con intervalos variables de dos o tres turnos. Alternan entre energía restante, equivalencias y energía tras la recarga, siempre usando los datos reales de la acción. No se pregunta por un siguiente turno cuando el combate termina. Se aceptan fracciones equivalentes exactas y enteros; hay tres pistas y el error no consume turno. Los combates duran hasta 15 turnos. La victoria concede hasta tres estrellas: terminar, no revelar la respuesta y conservar al menos 3 de vida.

El mapa, estrellas y contador de victorias se guardan por perfil y se sincronizan mediante el sistema de registros de juego existente, separado de los logros de clase. Sin conexión se conservan en el dispositivo. Para finalizar la validación educativa se necesitan sesiones con estudiantes y revisión pedagógica.

Los personajes se presentan en capas independientes del escenario y ejecutan animaciones de ataque, defensa, curación y reacción, acompañadas por proyectiles, impactos y efectos de escudo; se desactivan cuando el sistema solicita movimiento reducido. La prueba `e2e/fraction-fighters-sync.spec.ts` verifica la sincronización con dos sesiones y almacenamiento aislado usando emuladores de Auth y Firestore; no sustituye la comprobación en dispositivos físicos. El guion para sesiones con estudiantes está en `docs/fraction-fighters-validacion.md`.
