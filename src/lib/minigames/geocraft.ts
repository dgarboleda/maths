export const GRID_SIZE = 8;
export type Mission = { name: string; story: string; area: number; perimeter: number; width: number; height: number; icon: string; minimum?: boolean };
export const MISSIONS: Mission[] = [
  { name: 'El primer jardín', story: 'Prepara un jardín para dar la bienvenida a la isla.', area: 6, perimeter: 10, width: 3, height: 2, icon: '🌱' },
  { name: 'Sendero de flores', story: 'Abre un espacio para que florezca un nuevo sendero.', area: 8, perimeter: 12, width: 4, height: 2, icon: '🌼' },
  { name: 'Plaza del sol', story: 'Diseña una plaza para reunirse al sol.', area: 9, perimeter: 12, width: 3, height: 3, icon: '☀️' },
  { name: 'Huerto de sabores', story: 'Construye un huerto junto a la plaza.', area: 12, perimeter: 14, width: 4, height: 3, icon: '🥕' },
  { name: 'Parque de cometas', story: 'Crea un parque para disfrutar del viento.', area: 16, perimeter: 16, width: 4, height: 4, icon: '🪁' },
  { name: 'Mercado junto al mar', story: 'Prepara un lugar para el mercado de la isla.', area: 18, perimeter: 18, width: 6, height: 3, icon: '⛵' },
  { name: 'Bosque de formas', story: 'Traza una reserva para los árboles.', area: 20, perimeter: 18, width: 5, height: 4, icon: '🌳' },
  { name: 'La gran reserva', story: '¡Último desafío! Construye una reserva usando la menor valla posible.', area: 24, perimeter: 20, width: 6, height: 4, icon: '🏰', minimum: true },
];

function neighbors(cell: number): number[] {
  const row = Math.floor(cell / GRID_SIZE), col = cell % GRID_SIZE;
  return [row > 0 ? cell - GRID_SIZE : -1, col < GRID_SIZE - 1 ? cell + 1 : -1, row < GRID_SIZE - 1 ? cell + GRID_SIZE : -1, col > 0 ? cell - 1 : -1].filter(n => n >= 0);
}

/** El perímetro incluye tanto los bordes exteriores como los de los huecos. */
export function analyzeShape(cells: number[]) {
  const selected = new Set(cells.filter(n => Number.isInteger(n) && n >= 0 && n < GRID_SIZE * GRID_SIZE));
  let perimeter = 0;
  for (const cell of selected) perimeter += 4 - neighbors(cell).filter(n => selected.has(n)).length;
  const visited = new Set<number>();
  const first = selected.values().next().value;
  if (first !== undefined) {
    const pending = [first]; visited.add(first);
    while (pending.length) {
      for (const n of neighbors(pending.pop()!)) if (selected.has(n) && !visited.has(n)) { visited.add(n); pending.push(n); }
    }
  }
  return { area: selected.size, perimeter, connected: selected.size > 0 && visited.size === selected.size };
}

export function checkMission(mission: Mission, cells: number[]) {
  const shape = analyzeShape(cells);
  if (!shape.area) return 'Elige algunas casillas para construir.';
  if (!shape.connected) return 'Une todas las casillas por sus lados para formar una sola construcción.';
  if (shape.area !== mission.area) return `Tu construcción tiene área ${shape.area}; necesitas ${mission.area} casillas.`;
  if (mission.minimum ? shape.perimeter > mission.perimeter : shape.perimeter !== mission.perimeter) return `El área coincide. Tu perímetro es ${shape.perimeter}; necesitas ${mission.minimum ? 'como máximo ' : ''}${mission.perimeter} lados. Prueba otra forma.`;
  return null;
}
