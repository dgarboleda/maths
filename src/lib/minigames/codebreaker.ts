export type CircuitBlock = { id: 'add' | 'double' | 'subtract'; label: string; amount: number };
export type SequenceMission = { kind: 'sequence'; level: number; rule: string; terms: number[]; answer: number; choices: number[]; hints: [string, string, string] };
export type CircuitMission = { kind: 'circuit'; level: number; start: number; target: number; blocks: CircuitBlock[] };
export type Mission = SequenceMission | CircuitMission;

/** Fixed permutations keep every replay stable without relying on global randomness. */
function rotate<T>(items: T[], by: number): T[] {
  const offset = by % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}
function options(answer: number, level: number): number[] {
  const candidates = [answer, answer + 1, answer + 2, Math.max(0, answer - 1), answer + 3];
  const offset = (Math.imul(level, 1664525) + 1013904223) >>> 16;
  return rotate([...new Set(candidates)].slice(0, 4), offset % 4);
}
export function applyBlock(value: number, block: CircuitBlock): number {
  return block.id === 'double' ? value * 2 : block.id === 'add' ? value + block.amount : value - block.amount;
}
export function circuitValue(mission: CircuitMission, order: CircuitBlock['id'][]): number | null {
  if (order.length > mission.blocks.length || new Set(order).size !== order.length) return null;
  let value = mission.start;
  for (const id of order) {
    const block = mission.blocks.find(item => item.id === id);
    if (!block) return null;
    value = applyBlock(value, block);
    if (!Number.isSafeInteger(value) || value < 0) return null;
  }
  return value;
}
/** Find a completion for the current prefix; any order reaching the target is valid. */
export function solveCircuit(mission: CircuitMission, prefix: CircuitBlock['id'][] = []): CircuitBlock['id'][] | null {
  if (circuitValue(mission, prefix) === null) return null;
  if (prefix.length === mission.blocks.length) return circuitValue(mission, prefix) === mission.target ? prefix : null;
  for (const block of mission.blocks) {
    if (!prefix.includes(block.id)) {
      const result = solveCircuit(mission, [...prefix, block.id]);
      if (result) return result;
    }
  }
  return null;
}

/** Fifty deterministic missions with explicitly stated pattern families. */
export function makeMission(level: number): Mission {
  if (!Number.isInteger(level) || level < 1 || level > 50) throw new RangeError('La misión debe estar entre 1 y 50.');
  const index = Math.floor((level - 1) / 2), sector = Math.floor((level - 1) / 10);
  if (level % 2 === 0) {
    const start = 4 + (index * 3) % 8, add = 2 + index % 5, subtract = 1 + (index + sector) % 3;
    const blocks: CircuitBlock[] = [{ id: 'add', label: `+ ${add}`, amount: add }, { id: 'double', label: '× 2', amount: 2 }, { id: 'subtract', label: `− ${subtract}`, amount: subtract }];
    return { kind: 'circuit', level, start, target: (start + add) * 2 - subtract, blocks: rotate(blocks, index % 3) };
  }
  const start = 3 + (index * 3 + sector) % 9, step = 2 + sector + index % 3;
  let terms: number[], answer: number, rule: string, hints: [string, string, string];
  switch (index % 4) {
    case 0:
      terms = Array.from({ length: 4 }, (_, i) => start + i * step); answer = start + 4 * step;
      rule = 'Cada número aumenta siempre la misma cantidad.';
      hints = ['Compara dos números consecutivos.', `La diferencia entre cada par es ${step}.`, `Suma ${step} al último número: ${answer}.`]; break;
    case 1: {
      const factor = 2 + sector % 2;
      terms = Array.from({ length: 4 }, (_, i) => start * factor ** i); answer = start * factor ** 4;
      rule = 'Cada número se multiplica por el mismo factor entero.';
      hints = ['Compara cada número con el anterior mediante una división.', `El factor es ${factor}.`, `Multiplica el último número por ${factor}: ${answer}.`]; break;
    }
    case 2: {
      const nextStep = step + 2;
      terms = [start, start + step, start + step + nextStep, start + 2 * step + nextStep, start + 2 * step + 2 * nextStep]; answer = terms[4] + step;
      rule = 'Se alternan dos incrementos distintos: A, B, A, B…';
      hints = ['Calcula las diferencias y busca dos saltos alternos.', `Los saltos alternan +${step} y +${nextStep}.`, `El siguiente salto es +${step}: ${answer}.`]; break;
    }
    default: {
      const second = start + 12, otherStep = step + 1;
      terms = [start, second, start + step, second + otherStep, start + 2 * step, second + 2 * otherStep]; answer = start + 3 * step;
      rule = 'Hay dos secuencias intercaladas; cada una aumenta siempre lo mismo.';
      hints = ['Separa las posiciones impares de las pares.', `En las posiciones impares se suma ${step}.`, `Al siguiente número impar le corresponde ${answer}.`]; break;
    }
  }
  return { kind: 'sequence', level, rule, terms, answer, choices: options(answer, level), hints };
}
