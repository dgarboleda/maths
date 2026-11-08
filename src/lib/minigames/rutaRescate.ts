export const GRID_SIZE = 5;
export type Point = readonly [number, number];
export type Command = 'forward' | 'left' | 'right' | 'forward2' | 'forward3';
export type Mission = { name: string; story: string; explorers: Point[]; rocks: Point[]; fuel: number; parFuel: number; parCommands: number; repeat: boolean; ordered: boolean; hint: string };
export const BASE: Point = [0, 4];
export const MISSIONS: Mission[] = [
  { name: 'Primer rescate', story: 'El explorador espera al este de la base.', explorers: [[2,4]], rocks: [], fuel: 6, parFuel: 4, parCommands: 6, repeat: false, ordered: false, hint: 'Avanza dos casillas. Gira dos veces para regresar por el mismo camino.' },
  { name: 'Rodea la roca', story: 'Una roca bloquea la salida. Busca un camino alrededor.', explorers: [[2,3]], rocks: [[1,4]], fuel: 8, parFuel: 6, parCommands: 11, repeat: false, ordered: false, hint: 'Desde la base mira hacia arriba, rodea la roca y vuelve por el mismo camino.' },
  { name: 'Dos viajeros', story: 'Rescata a los dos exploradores antes de regresar.', explorers: [[1,4],[2,3]], rocks: [], fuel: 10, parFuel: 6, parCommands: 9, repeat: false, ordered: false, hint: 'Recoge al explorador cercano primero y traza una vuelta corta pasando por el otro.' },
  { name: 'Motor de repetición', story: 'Ahora puedes repetir avances en un solo bloque.', explorers: [[3,4]], rocks: [], fuel: 8, parFuel: 6, parCommands: 4, repeat: true, ordered: false, hint: 'Usa Avanzar ×3 para ir, gira dos veces y repite el avance para volver.' },
  { name: 'Cañón de cristal', story: 'Los bloques de repetición ayudan a rodear el cañón.', explorers: [[3,2]], rocks: [[1,4],[2,3]], fuel: 14, parFuel: 10, parCommands: 9, repeat: true, ordered: false, hint: 'Sube antes de la primera roca y busca un camino por la fila superior.' },
  { name: 'Rescate en orden', story: 'Recoge primero al explorador 1 y después al 2.', explorers: [[1,4],[3,3]], rocks: [[2,4]], fuel: 12, parFuel: 8, parCommands: 10, repeat: true, ordered: true, hint: 'Visita al primero, sube para rodear la roca y busca la ruta de regreso.' },
  { name: 'Valle de meteoritos', story: 'Dos exploradores esperan entre los meteoritos.', explorers: [[4,2],[1,1]], rocks: [[2,3],[3,3]], fuel: 20, parFuel: 14, parCommands: 9, repeat: true, ordered: false, hint: 'Puedes elegir a quién visitar primero. Compara los recorridos antes de programar.' },
  { name: 'Gran expedición', story: 'Rescata a los tres exploradores en orden y regresa a la base.', explorers: [[2,4],[4,1],[0,1]], rocks: [[2,3],[3,2]], fuel: 24, parFuel: 14, parCommands: 9, repeat: true, ordered: true, hint: 'Divide el viaje en tres tramos. Guarda combustible para el regreso desde el explorador 3.' },
];
export const LABELS: Record<Command, string> = { forward: 'Avanzar', left: 'Girar a la izquierda', right: 'Girar a la derecha', forward2: 'Avanzar ×2', forward3: 'Avanzar ×3' };
export type Frame = { x: number; y: number; direction: number; fuelUsed: number; rescued: number[]; commandIndex: number; note: string };
export type Result = { frames: Frame[]; success: boolean; message: string };
const same = (a: Point, b: Point) => a[0] === b[0] && a[1] === b[1];
const vectors = [[0,-1],[1,0],[0,1],[-1,0]] as const;

/** Simula cada casilla por separado: las repeticiones no atraviesan obstáculos. */
export function simulate(mission: Mission, commands: Command[]): Result {
  let state: Frame = { x: BASE[0], y: BASE[1], direction: 1, fuelUsed: 0, rescued: [], commandIndex: -1, note: 'Listos para salir.' };
  const frames: Frame[] = [state];
  const fail = (message: string): Result => ({ frames, success: false, message });
  for (const [index, command] of commands.entries()) {
    if ((command === 'forward2' || command === 'forward3') && !mission.repeat) return fail('Este bloque se desbloquea en una misión posterior.');
    if (command === 'left' || command === 'right') {
      state = { ...state, direction: (state.direction + (command === 'left' ? 3 : 1)) % 4, commandIndex: index, note: LABELS[command] };
      frames.push(state); continue;
    }
    const count = command === 'forward3' ? 3 : command === 'forward2' ? 2 : 1;
    for (let step = 0; step < count; step++) {
      const [dx, dy] = vectors[state.direction], x = state.x + dx, y = state.y + dy;
      if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE || mission.rocks.some(rock => same(rock, [x,y]))) return fail('El vehículo encontró un obstáculo o el borde del mapa. Ajusta la ruta.');
      if (state.fuelUsed >= mission.fuel) return fail('Se agotó el combustible. Busca una ruta más corta.');
      const explorer = mission.explorers.findIndex(point => same(point, [x,y]));
      if (explorer >= 0 && !state.rescued.includes(explorer) && mission.ordered && explorer !== state.rescued.length) return fail(`Debes rescatar primero al explorador ${state.rescued.length + 1}.`);
      const rescued = explorer >= 0 && !state.rescued.includes(explorer) ? [...state.rescued, explorer] : state.rescued;
      state = { x, y, direction: state.direction, fuelUsed: state.fuelUsed + 1, rescued, commandIndex: index, note: rescued.length > state.rescued.length ? `Explorador ${explorer + 1} rescatado.` : 'Avanzando.' };
      frames.push(state);
    }
  }
  if (state.rescued.length < mission.explorers.length) return fail(`Aún faltan ${mission.explorers.length - state.rescued.length} exploradores. Modifica la ruta y vuelve a probar.`);
  if (!same([state.x,state.y], BASE)) return fail('Ya rescataste a todos. Ahora programa el regreso a la base.');
  return { frames, success: true, message: '¡Todos a salvo en la base!' };
}
