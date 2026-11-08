import { describe, expect, it } from 'vitest';
import { divide, equivalent, measure, MISSIONS, validateEquation, validateOpen } from './laboratorioEquilibrio';
const side = (boxes: number, weights: number) => ({ boxes, weights });
const eq = (lb: number, lw: number, rb: number, rw: number) => ({ left: side(lb,lw), right: side(rb,rw) });
describe('reglas del laboratorio', () => {
  it('comprueba que todos los valores propuestos equilibran sus ecuaciones', () => {
    for (const mission of MISSIONS.filter(m => !m.open)) for (const equation of mission.equations) expect(measure(equation.left, mission.value)).toBe(measure(equation.right, mission.value));
  });
  it('acepta una caja aislada en cualquiera de los lados y conserva equivalencia', () => {
    const original = MISSIONS[0].equations[0];
    expect(validateEquation(original, eq(1,0,0,4))).toBeNull();
    expect(validateEquation(original, eq(0,4,1,0))).toBeNull();
    expect(equivalent(original, eq(2,0,0,8))).toBe(true);
    expect(validateEquation(original, eq(2,0,0,8))).toMatch(/una caja sola/);
  });
  it('rechaza una respuesta aislada incorrecta y una identidad sin solución única', () => {
    const original = MISSIONS[0].equations[0];
    expect(validateEquation(original, eq(1,0,0,5))).toMatch(/relación original cambió/);
    expect(validateEquation(original, eq(0,0,0,0))).toMatch(/relación original cambió/);
  });
  it('divide ambos lados solo cuando todas las cantidades son enteras', () => {
    expect(divide(eq(2,0,0,8),2)).toEqual(eq(1,0,0,4));
    expect(divide(eq(2,1,0,8),2)).toBeNull();
    expect(divide(eq(3,0,0,12),3)).toEqual(eq(1,0,0,4));
  });
  it('admite dos soluciones diferentes en el desafío abierto y rechaza repetidas', () => {
    const mission = MISSIONS[7];
    expect(validateOpen(mission,eq(2,2,0,8),[])).toBeNull();
    expect(validateOpen(mission,eq(2,2,1,5),['0/8'])).toBeNull();
    expect(validateOpen(mission,eq(2,2,0,8),['0/8'])).toMatch(/ya encontraste/i);
    expect(validateOpen(mission,eq(2,2,2,2),[])).toMatch(/diferente/);
    expect(validateOpen(mission,eq(2,2,0,7),[])).toMatch(/no hay equilibrio/);
  });
});
