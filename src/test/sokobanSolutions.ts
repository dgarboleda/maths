/** Recorridos testigo: cada caja llega a la meta sin entregar antes otra.
 * Solo se importan desde pruebas; el juego no conoce una solución numérica. */
export const SOKOBAN_SOLUTIONS: Record<string, readonly string[]> = {
  giro: ["LLUURUURULDLU", "RRUULURULLLRRDDRDDLLLLUUUUU", "RRUULLLRDDLLUUUUU", "ULDLUUUUU", "LUDRRRULLLDLUUUUU"],
  centro: ["LLUUURURRRDDLLUUU", "UURURULDLUU", "LLUURLDDRRUUUUU", "LLURDRUUUUU", "RURULDLUUUU"],
  espejo: ["LLUURULURRRLLDDLDDRRRRUUUUU", "RRUULUULURDRU", "LLUURRRLDDRRUUUUU", "RUDLLLURRRDRUUUUU", "URDRUUUUU"],
};
