import { describe, expect, it } from 'vitest';
import { calculate, makePuzzle, solve } from './targetMasters';

describe('Target Masters', () => {
  it('genera desafíos resolubles para los 100 niveles y semillas diarias', () => {
    for (const seed of [...Array.from({ length: 100 }, (_, i) => i), 20261102, 20261231]) {
      const puzzle = makePuzzle(seed);
      expect(Number.isSafeInteger(puzzle.target)).toBe(true);
      expect(solve(puzzle.numbers, puzzle.target, puzzle.operations)).not.toBeNull();
      expect(puzzle.solution.at(-1)?.result).toBe(puzzle.target);
    }
  });
  it('acepta soluciones alternativas y detecta tableros bloqueados', () => {
    expect(solve([2, 3, 4], 20, ['+', '×'])).not.toBeNull();
    expect(solve([1, 1], 5, ['+'])).toBeNull();
  });
  it('rechaza divisiones por cero, fracciones y resultados negativos', () => {
    expect(calculate(4, '÷', 0)).toBeNull();
    expect(calculate(5, '÷', 2)).toBeNull();
    expect(calculate(2, '−', 3)).toBeNull();
    expect(calculate(12, '÷', 3)).toBe(4);
  });
});
