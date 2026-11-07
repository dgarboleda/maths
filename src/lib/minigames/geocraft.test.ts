import { describe, expect, it } from 'vitest';
import { analyzeShape, checkMission, MISSIONS } from './geocraft';

const rectangle = (height: number, width: number) => Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => row * 8 + col)).flat();
describe('GeoCraft: área, perímetro y misiones', () => {
  it('distingue figuras de la misma área y perímetros diferentes', () => {
    expect(analyzeShape(rectangle(4, 6))).toEqual({ area: 24, perimeter: 20, connected: true });
    expect(analyzeShape(rectangle(3, 8))).toEqual({ area: 24, perimeter: 22, connected: true });
    expect(checkMission(MISSIONS[7], rectangle(3, 8))).toMatch(/perímetro es 22/);
  });
  it('cuenta los lados interiores de los huecos', () => {
    expect(analyzeShape(rectangle(3, 3).filter(cell => cell !== 9))).toEqual({ area: 8, perimeter: 16, connected: true });
  });
  it('admite formas libres y detecta conexiones solo por esquinas', () => {
    expect(analyzeShape([0, 1, 8])).toEqual({ area: 3, perimeter: 8, connected: true });
    expect(analyzeShape([0, 9]).connected).toBe(false);
    expect(checkMission(MISSIONS[0], [0, 9])).toMatch(/Une todas/);
    expect(checkMission(MISSIONS[1], [0, 1, 2, 8, 9, 10, 16, 17])).toBeNull();
  });
  it('ignora duplicados y casillas inválidas', () => {
    expect(analyzeShape([0, 0, -1, 64, 0.5])).toEqual({ area: 1, perimeter: 4, connected: true });
    expect(analyzeShape([])).toEqual({ area: 0, perimeter: 0, connected: false });
  });
  it.each(MISSIONS)('acepta la solución sugerida para $name', mission => {
    expect(checkMission(mission, rectangle(mission.height, mission.width))).toBeNull();
  });
});
