# Caja numérica: almacenes tipo Sokoban

El alumno resuelve el problema de la clase y elige qué caja entregar. Debe recorrer un almacén con paredes, cambiar de lado para empujar y, cuando hace falta, recolocar otras cajas. Hay una sola meta: entregar todas las alternativas registraría también respuestas que el alumno no eligió como solución matemática.

Los tres almacenes se eligen de forma estable a partir del identificador del problema. Las cinco opciones conservan su valor y posición al deshacer o reiniciar. Cada almacén tiene recorridos testigo para las cinco cajas: las quince entregas son posibles sin entregar antes otra caja y requieren empujar en al menos dos direcciones. Los recorridos solo se incluyen en las pruebas; el juego no elige una respuesta ni consulta si el número es correcto.

- Las paredes bloquean al personaje y las cajas. Solo se empuja una caja por vez, nunca se tira de ella.
- Las flechas y los botones mueven una casilla por pulsación. No hay reloj.
- «Deshacer» o Z recupera el estado anterior, incluidos los contadores. Se conservan hasta 100 movimientos para deshacer.
- «Reiniciar cajas» restaura el mismo almacén y las mismas opciones, sin registrar respuestas ni descontar estrellas.
- El aviso de una caja sin salida se calcula a partir de la geometría del almacén, sin usar la respuesta correcta. No detecta todos los bloqueos entre varias cajas; deshacer y reiniciar siguen disponibles.
- El foco pasa al enunciado al empezar, mostrando el tablero a continuación también en móvil.
- Pausar o guardar una entrega impide mover, deshacer o reiniciar. La entrega solo se envía al empujar una caja hasta la casilla de meta; caminar sobre ella no cuenta.

En la clase, Functions corrige el valor entregado. Moverse, bloquearse, deshacer y reiniciar no conceden progreso ni premios y no se convierten en errores matemáticos. Una respuesta incorrecta conserva las ayudas y el reintento de la clase. El recorrido anterior mantiene su contrato de tres entregas, vidas y recompensas.

El tablero, su historial y sus contadores son estado local de la partida: no se añaden escrituras por movimiento, datos persistidos, dependencias, migraciones ni servicios. No cambian el catálogo ni el protocolo 12. No se modifica `PIN_PEPPER`.

Las pruebas verifican los quince recorridos completos, las colisiones, la ausencia de arrastre, el destino de entrega, las casillas sin salida, deshacer y reinicio. Los E2E de móvil y escritorio recorren paredes, pausa, entrega incorrecta, reintento y entrega correcta con emuladores, comprobando que solo las entregas envían respuestas y que no conceden dominio ni estrellas de arcade en la clase.
