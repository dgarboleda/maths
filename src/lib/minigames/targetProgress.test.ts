import { describe, expect, it } from 'vitest';
import { mergeProgress, normalizeProgress } from './targetProgress';

describe('progreso de Target Masters', () => {
  it('conserva el mayor nivel y estrellas y suma los contadores entre dispositivos', () => {
    const result = mergeProgress([{ unlocked: 8, stars: { '1': 2, '7': 1 }, daily: '2026-01-01', completed: 3, operationsUsed: { '+': 4 } }, { unlocked: 5, stars: { '1': 3, '3': 2 }, daily: '2026-01-02', completed: 2, operationsUsed: { '+': 1 } }]);
    expect(result.unlocked).toBe(8); expect(result.stars).toEqual({ '1': 3, '3': 2, '7': 1 });
    expect(result.daily).toBe('2026-01-02'); expect(result.completed).toBe(5); expect(result.operationsUsed?.['+']).toBe(5);
  });
  it('descarta datos corruptos sin borrar el progreso válido', () => {
    expect(normalizeProgress({ unlocked: 500, stars: { '1': 8, '101': 3 }, daily: 'incorrecto', attempts: -5 })).toMatchObject({ unlocked: 100, stars: { '1': 3 }, daily: '', attempts: 0 });
  });
});

it('combina copias del mismo dispositivo sin duplicar contadores ni perder estrellas', async () => {
  const { mergeSameDevice } = await import('./targetProgress');
  const result = mergeSameDevice({ unlocked: 7, stars: { '1': 3 }, daily: '', completed: 5 }, { unlocked: 4, stars: { '2': 2 }, daily: '', completed: 4 });
  expect(result).toMatchObject({ unlocked: 7, stars: { '1': 3, '2': 2 }, completed: 5 });
  expect(mergeSameDevice(result, result).completed).toBe(5);
});

it('no cuenta dos veces el mismo reto diario en dispositivos distintos', () => {
  const result = mergeProgress([
    { unlocked: 1, stars: {}, daily: '2026-10-01', dailyDates: ['2026-10-01', '2026-10-02'] },
    { unlocked: 1, stars: {}, daily: '2026-10-02', dailyDates: ['2026-10-02', '2026-10-03'] },
  ]);
  expect(result.dailyWins).toBe(3);
});
