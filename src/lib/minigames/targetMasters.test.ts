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

describe('reglas especiales y práctica', () => {
  it('mantiene resolubles los tableros especiales de los 100 niveles', async () => {
    const { solveBoard } = await import('./targetMasters');
    for (let level = 11; level <= 100; level++) {
      const puzzle = makePuzzle(level - 1);
      const special = level % 20 === 0 ? 1 : level % 4 === 0 ? 2 : level % 5 === 0 ? 3 : 0;
      const tiles = puzzle.numbers.map((value, i) => ({ id: String(i), value, expression: String(value), special: special === 1 && i < 2 ? 'gemela' as const : special === 2 && i === 2 ? 'congelada' as const : special === 3 && i === 0 ? 'cambiante' as const : 'normal' as const }));
      expect(solveBoard(tiles, puzzle.target, puzzle.operations), `nivel ${level}`).not.toBeNull();
    }
  });
  it('respeta las operaciones elegidas en cada dificultad', async () => {
    const { makePracticePuzzle, OPERATIONS } = await import('./targetMasters');
    for (const op of OPERATIONS) for (let difficulty = 0; difficulty < 3; difficulty++) for (let seed = 0; seed < 50; seed++) {
      const puzzle = makePracticePuzzle(seed, [op], difficulty);
      expect(solve(puzzle.numbers, puzzle.target, puzzle.operations)).not.toBeNull();
      expect(puzzle.solution.every(step => step.op === op)).toBe(true);
    }
  });
  it('impide mezclar gemelas y libera una ficha congelada tras otro movimiento', async () => {
    const { applyMove } = await import('./targetMasters');
    const tiles = [{ id: 'a', value: 2, expression: '2', special: 'gemela' as const }, { id: 'b', value: 3, expression: '3', special: 'gemela' as const }, { id: 'c', value: 4, expression: '4', special: 'congelada' as const }];
    expect(applyMove(tiles, 'a', 'c', '+')).toBeNull();
    expect(applyMove(tiles, 'a', 'b', '+')?.find(tile => tile.id === 'c')?.special).toBe('normal');
  });
});

it('encuentra una expresión alternativa válida en el laboratorio', async () => {
  const { findAlternative } = await import('./targetMasters');
  const tiles = [2, 3, 4].map((value, i) => ({ id: String(i), value, expression: String(value), special: 'normal' as const }));
  const alternative = findAlternative(tiles, 20, ['+', '×'], '((2 + 3) × 4)');
  expect(alternative).not.toBeNull();
  expect(alternative?.expression).not.toBe('((2 + 3) × 4)');
  expect(alternative?.steps.at(-1)?.result).toBe(20);
});

it('crea prácticas sin fichas neutras que regalen una operación', async () => {
  const { makePracticePuzzle, OPERATIONS } = await import('./targetMasters');
  for (const op of OPERATIONS) for (let seed = 0; seed < 100; seed++) {
    expect(makePracticePuzzle(seed, [op], 1).numbers.every(value => value > 1)).toBe(true);
  }
});

describe('acertijos iniciales', () => {
  it('propone cuatro fichas y exige multiplicar o dividir en los diez primeros niveles', async () => {
    const { OPERATIONS } = await import('./targetMasters');
    const targets = [13, 12, 20, 22, 23, 28, 30, 36, 37, 40];
    for (let seed = 0; seed < 10; seed++) {
      const puzzle = makePuzzle(seed);
      expect(puzzle.clue).toBeTruthy();
      expect(puzzle.target).toBe(targets[seed]);
      expect(puzzle.numbers).toHaveLength(4);
      expect(puzzle.operations).toEqual(OPERATIONS);
      expect(solve(puzzle.numbers, puzzle.target, ['+', '−'])).toBeNull();
      expect(solve(puzzle.numbers, puzzle.target, puzzle.operations)).not.toBeNull();
    }
  });
  it('evita que los primeros veinte niveles se resuelvan solo con sumas y restas', () => {
    for (let seed = 0; seed < 20; seed++) {
      const puzzle = makePuzzle(seed);
      expect(solve(puzzle.numbers, puzzle.target, ['+', '−']), `nivel ${seed + 1}`).toBeNull();
    }
  });
  it('genera soluciones coherentes para semillas de aventura y retos diarios', () => {
    for (const seed of [...Array.from({ length: 1000 }, (_, i) => i), 20261102, 20261231]) {
      const p = makePuzzle(seed);
      expect(p.numbers).toHaveLength(4);
      const values = [...p.numbers];
      for (const step of p.solution) {
        const left = values.indexOf(step.left); expect(left).toBeGreaterThanOrEqual(0); values.splice(left, 1);
        const right = values.indexOf(step.right); expect(right).toBeGreaterThanOrEqual(0); values.splice(right, 1);
        expect(calculate(step.left, step.op, step.right)).toBe(step.result);
        values.push(step.result);
      }
      expect(values).toEqual([p.target]);
    }
  });
});
