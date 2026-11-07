import { describe, expect, it } from 'vitest';
import { MISSIONS, simulate, type Command } from './rutaRescate';
const routes: Command[][] = [
  ['forward','forward','left','left','forward','forward'],
  ['left','forward','right','forward','forward','left','left','forward','forward','left','forward'],
  ['forward','forward','left','forward','left','forward','forward','left','forward'],
  ['forward3','left','left','forward3'],
  ['left','forward2','right','forward3','left','left','forward3','left','forward2'],
  ['forward','left','forward','right','forward2','left','left','forward3','left','forward'],
  ['forward','forward3','left','forward3','left','forward','forward3','left','forward3'],
  ['forward','forward3','left','forward3','left','forward','forward3','left','forward3'],
];
describe('rutas de rescate', () => {
  it.each(MISSIONS.map((mission, index) => ({ mission, index })))('permite ganar las tres estrellas en $mission.name', ({ mission, index }) => {
    const route = routes[index], result = simulate(mission, route), final = result.frames.at(-1)!;
    expect(result.success).toBe(true); expect(final.rescued).toHaveLength(mission.explorers.length);
    expect(route.length).toBeLessThanOrEqual(mission.parCommands); expect(final.fuelUsed).toBeLessThanOrEqual(mission.parFuel);
  });
  it('detiene un avance repetido en el obstáculo intermedio', () => {
    const mission = { ...MISSIONS[3], rocks: [[2,4] as const] };
    const result = simulate(mission, ['forward3']);
    expect(result.success).toBe(false); expect(result.message).toMatch(/obstáculo/); expect(result.frames.at(-1)).toMatchObject({ x: 1, y: 4, fuelUsed: 1 });
  });
  it('respeta combustible, orden, bordes y regreso a la base', () => {
    expect(simulate({ ...MISSIONS[0], fuel: 1 }, ['forward','forward']).message).toMatch(/combustible/);
    expect(simulate(MISSIONS[7], ['left','forward3']).message).toMatch(/primero al explorador 1/);
    expect(simulate(MISSIONS[0], ['right','forward']).message).toMatch(/borde/);
    expect(simulate(MISSIONS[0], ['forward','forward']).message).toMatch(/regreso a la base/);
  });
  it('impide las repeticiones antes de desbloquearlas', () => expect(simulate(MISSIONS[0], ['forward3']).message).toMatch(/posterior/));
});
