import { describe, expect, it } from 'vitest';
import { ACTIONS, ENCOUNTERS, canUse, fraction, isCorrectFraction, newBattle, playTurn, type Battle } from './fractionFighters';
const action = (id: string) => ACTIONS.find(item => item.id === id)!;

describe('Fraction Fighters', () => {
  it('acepta fracciones equivalentes exactas y rechaza entradas inválidas', () => {
    expect(isCorrectFraction('1/4', 3)).toBe(true); expect(isCorrectFraction('3/12', 3)).toBe(true);
    expect(isCorrectFraction('2/8', 3)).toBe(true); expect(isCorrectFraction('1/0', 3)).toBe(false);
    expect(isCorrectFraction('0.25', 3)).toBe(false); expect(fraction(4)).toBe('1/3');
  });
  it('respeta el coste, la recarga, límites de vida y acciones no disponibles', () => {
    const battle = newBattle(0); expect(canUse(battle, action('curar'))).toBe(false);
    const next = playTurn(battle, action('rayo')); expect(next.energy).toBe(9); expect(next.heroHp).toBe(6); expect(next.enemyHp).toBe(4);
    expect(playTurn({ ...next, energy: 0 }, action('rayo')).energy).toBe(0);
  });
  it('conserva el escudo hasta el siguiente ataque y lo consume', () => {
    const battle = { ...newBattle(0), turn: 2 };
    const shielded = playTurn(battle, action('escudo')); expect(shielded.heroShield).toBe(2);
    const hit = playTurn(shielded, action('descansar')); expect(hit.heroHp).toBe(8); expect(hit.heroShield).toBe(0);
  });
  it('encuentra al menos una estrategia ganadora para cada encuentro', () => {
    for (let index = 0; index < ENCOUNTERS.length; index++) {
      const seen = new Set<string>(); const queue: Battle[] = [newBattle(index)]; let won = false;
      while (queue.length && !won) {
        const state = queue.shift()!; const key = [state.turn, state.energy, state.heroHp, state.heroShield, state.enemyHp, state.enemyShield].join(':');
        if (seen.has(key)) continue; seen.add(key);
        for (const move of ACTIONS.filter(item => canUse(state, item))) { const next = playTurn(state, move); if (next.result === 'won') { won = true; break; } if (next.result === 'playing') queue.push(next); }
      }
      expect(won, ENCOUNTERS[index].name).toBe(true);
    }
  });
  it('finaliza al completar 15 turnos sin victoria', () => {
    const battle = { ...newBattle(0), turn: 15, heroHp: 8 };
    expect(playTurn(battle, action('descansar')).result).toBe('draw');
  });
});
