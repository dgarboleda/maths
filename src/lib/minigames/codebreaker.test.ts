import { describe, expect, it } from 'vitest';
import { circuitValue, makeMission, solveCircuit } from './codebreaker';

describe('CodeBreaker', () => {
  it('genera 50 misiones estables, con opciones únicas y circuitos resolubles', () => {
    for (let level = 1; level <= 50; level++) {
      const mission = makeMission(level);
      expect(makeMission(level)).toEqual(mission);
      if (mission.kind === 'sequence') {
        expect(mission.choices).toHaveLength(4);
        expect(new Set(mission.choices).size).toBe(4);
        expect(mission.choices).toContain(mission.answer);
        const index = Math.floor((level - 1) / 2);
        if (index % 4 === 0) expect(mission.answer - mission.terms.at(-1)!).toBe(mission.terms[1] - mission.terms[0]);
        if (index % 4 === 1) expect(mission.answer / mission.terms.at(-1)!).toBe(mission.terms[1] / mission.terms[0]);
        if (index % 4 === 2) expect(mission.answer - mission.terms.at(-1)!).toBe(mission.terms[1] - mission.terms[0]);
        if (index % 4 === 3) expect(mission.answer - mission.terms[4]).toBe(mission.terms[2] - mission.terms[0]);
      } else {
        const solution = solveCircuit(mission);
        expect(solution).toHaveLength(3);
        expect(circuitValue(mission, solution!)).toBe(mission.target);
        expect(solveCircuit(mission, solution!.slice(0, 1))).toEqual(solution);
        expect(circuitValue(mission, [solution![0], solution![0]])).toBeNull();
      }
    }
  });
  it('evita repetir secuencias y reparte la respuesta entre distintas posiciones', () => {
    const sequences = Array.from({ length: 25 }, (_, index) => makeMission(index * 2 + 1))
      .filter(mission => mission.kind === 'sequence');
    expect(new Set(sequences.map(mission => mission.terms.join(','))).size).toBe(sequences.length);
    expect(new Set(sequences.map(mission => mission.choices.indexOf(mission.answer))).size).toBe(4);
  });
  it('permite deshacer una conexión sin salida y encuentra otra ruta', () => {
    const mission = makeMission(2);
    if (mission.kind !== 'circuit') throw new Error('Se esperaba un circuito');
    expect(circuitValue(mission, ['double', 'add', 'subtract'])).not.toBe(mission.target);
    expect(solveCircuit(mission, ['double'])).toBeNull();
    expect(solveCircuit(mission)).toEqual(['add', 'double', 'subtract']);
  });
  it('acepta diferentes órdenes cuando ambos alcanzan el objetivo', () => {
    const mission = { kind: 'circuit' as const, level: 2, start: 3, target: 6, blocks: [
      { id: 'add' as const, label: '+ 2', amount: 2 },
      { id: 'double' as const, label: '× 2', amount: 2 },
      { id: 'subtract' as const, label: '− 2', amount: 2 },
    ] };
    expect(circuitValue(mission, ['add', 'subtract', 'double'])).toBe(6);
    expect(circuitValue(mission, ['subtract', 'add', 'double'])).toBe(6);
    expect(solveCircuit(mission, ['subtract', 'add'])).toEqual(['subtract', 'add', 'double']);
  });
  it('rechaza números de misión fuera de la colección', () => {
    expect(() => makeMission(0)).toThrow(RangeError);
    expect(() => makeMission(51)).toThrow(RangeError);
  });
});
