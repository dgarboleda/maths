import { describe, expect, it } from 'vitest';
import { answerFor, MISSIONS } from './estacionProporcion';

describe('misiones de Estación Proporción', () => {
  it('calcula las soluciones de los doce retos', () => {
    expect(MISSIONS.map(answerFor)).toEqual([18, 15, 0, 1, 15, 28, 1, 2, 21, 15, 0, 2.5]);
  });
  it('ofrece exactamente una respuesta correcta en cada máquina e inspección', () => {
    for (const mission of MISSIONS) {
      if (mission.kind === 'machine') expect(mission.choices.filter(n => n === answerFor(mission))).toHaveLength(1);
      if (mission.kind === 'audit') expect(mission.rows.filter(row => row.amount * mission.basePeople !== row.people * mission.baseAmount)).toHaveLength(1);
      if (mission.kind === 'offer') expect(mission.offers[0].price / mission.offers[0].quantity).not.toBe(mission.offers[1].price / mission.offers[1].quantity);
    }
  });
});
