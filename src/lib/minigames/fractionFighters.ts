/** Energy is represented in twelfths: integer arithmetic avoids rounding. */
export type ActionId = 'chispa' | 'rayo' | 'escudo' | 'curar' | 'lazo' | 'descansar';
export type Action = { id: ActionId; name: string; cost: number; description: string; icon: string };
export const ACTIONS: Action[] = [
  { id: 'chispa', name: 'Chispa', cost: 3, description: 'Causa 1 de daño', icon: '✦' },
  { id: 'rayo', name: 'Rayo lunar', cost: 6, description: 'Causa 3 de daño', icon: '☾' },
  { id: 'escudo', name: 'Escudo', cost: 3, description: 'Bloquea hasta 2 de daño', icon: '⬡' },
  { id: 'curar', name: 'Curación', cost: 6, description: 'Recupera 2 de vida', icon: '✚' },
  { id: 'lazo', name: 'Lazo estelar', cost: 4, description: 'Causa 2 de daño', icon: '✧' },
  { id: 'descansar', name: 'Descansar', cost: 0, description: 'Conserva tu energía', icon: '☘' },
];
type Intent = { type: 'attack'; damage: number } | { type: 'shield' } | { type: 'prepare' };
export type Encounter = { name: string; title: string; hp: number; pattern: Intent[]; lesson: string; color: string };
const attack = (damage: number): Intent => ({ type: 'attack', damage });
const prepare: Intent = { type: 'prepare' }, shield: Intent = { type: 'shield' };
export const ENCOUNTERS: Encounter[] = [
  { name: 'Brote curioso', title: 'El primer claro', hp: 7, pattern: [attack(2), prepare], lesson: 'Descubre los cuartos de energía.', color: '🌱' },
  { name: 'Brote travieso', title: 'La senda del escudo', hp: 8, pattern: [attack(2), prepare], lesson: 'Anticipa los ataques y usa el escudo.', color: '🍃' },
  { name: 'Zorro de cristal', title: 'El río de luna', hp: 9, pattern: [attack(2), prepare, attack(3), prepare], lesson: 'Combina ataque y recuperación.', color: '🦊' },
  { name: 'Tortuga de musgo', title: 'La cueva de los ecos', hp: 10, pattern: [shield, attack(2), prepare], lesson: 'Busca fracciones equivalentes.', color: '🐢' },
  { name: 'Mariposa estelar', title: 'Jardín de los tercios', hp: 10, pattern: [attack(2), prepare, shield, prepare], lesson: 'Compara tercios, cuartos y mitades.', color: '🦋' },
  { name: 'Zorro de aurora', title: 'El puente brillante', hp: 11, pattern: [attack(3), prepare, attack(2), prepare], lesson: 'Elige el mejor poder para cada turno.', color: '🌟' },
  { name: 'Guardián del bosque', title: 'El corazón del bosque', hp: 12, pattern: [shield, attack(3), prepare, attack(2), prepare], lesson: 'Libera el bosque usando lo aprendido.', color: '🌳' },
];
export type Battle = { encounter: number; turn: number; energy: number; heroHp: number; heroShield: number; enemyHp: number; enemyShield: number; revealed: boolean; result: 'playing' | 'won' | 'lost' | 'draw'; log: string };
export function newBattle(encounter: number): Battle { return { encounter, turn: 1, energy: 12, heroHp: 8, heroShield: 0, enemyHp: ENCOUNTERS[encounter].hp, enemyShield: 0, revealed: false, result: 'playing', log: 'Tu aventura empieza. La criatura anuncia su próximo movimiento.' }; }
export function fraction(twelfths: number): string { if (twelfths === 0) return '0'; const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a; const g = gcd(twelfths, 12); return 12 / g === 1 ? String(twelfths / g) : `${twelfths / g}/${12 / g}`; }
export function isCorrectFraction(input: string, remaining: number): boolean { const match = /^\s*(\d+)\s*(?:\/\s*(\d+))?\s*$/.exec(input); if (!match) return false; const n = Number(match[1]), d = match[2] ? Number(match[2]) : 1; return Number.isSafeInteger(n) && Number.isSafeInteger(d) && d > 0 && n <= 10000 && d <= 10000 && n * 12 === remaining * d; }
export function canUse(battle: Battle, action: Action): boolean { return battle.result === 'playing' && battle.energy >= action.cost && (action.id !== 'curar' || battle.heroHp < 8) && (action.id !== 'lazo' || battle.encounter >= 4); }
export function intentFor(battle: Battle): Intent { const pattern = ENCOUNTERS[battle.encounter].pattern; return pattern[(battle.turn - 1) % pattern.length]; }
export function describeIntent(battle: Battle): string { const intent = intentFor(battle); return intent.type === 'attack' ? `Atacará: ${intent.damage} de daño` : intent.type === 'shield' ? 'Creará un escudo de 2' : 'Se preparará: no atacará'; }
export function playTurn(battle: Battle, action: Action): Battle {
  if (!canUse(battle, action)) return battle;
  const energy = battle.energy - action.cost;
  const damage = action.id === 'rayo' ? 3 : action.id === 'lazo' ? 2 : action.id === 'chispa' ? 1 : 0;
  const actualDamage = Math.max(0, damage - battle.enemyShield);
  const enemyHp = Math.max(0, battle.enemyHp - actualDamage);
  let heroHp = action.id === 'curar' ? Math.min(8, battle.heroHp + 2) : battle.heroHp;
  const notes = [`${action.name}: energía restante ${fraction(energy)}.`];
  if (damage) notes.push(`Causaste ${actualDamage} de daño${battle.enemyShield ? ' tras el escudo rival' : ''}.`);
  const result = { ...battle, energy, enemyHp, heroHp, enemyShield: damage ? 0 : battle.enemyShield, log: notes.join(' ') };
  if (enemyHp === 0) return { ...result, result: 'won', log: `${result.log} ¡Victoria! El bosque recupera su luz.` };
  const intent = intentFor(battle);
  let nextShield = result.enemyShield;
  let heroShield = action.id === 'escudo' ? 2 : battle.heroShield;
  if (intent.type === 'attack') { const hit = Math.max(0, intent.damage - heroShield); heroHp = Math.max(0, heroHp - hit); heroShield = 0; notes.push(`Recibiste ${hit} de daño.`); }
  else if (intent.type === 'shield') { nextShield = 2; notes.push('La criatura creó un escudo de 2 para tu próximo ataque.'); }
  else notes.push('La criatura se prepara.');
  if (heroHp === 0) return { ...result, heroHp, heroShield, enemyShield: nextShield, result: 'lost', log: `${notes.join(' ')} La guardiana necesita descansar.` };
  if (battle.turn >= 15) return { ...result, heroHp, heroShield, enemyShield: nextShield, result: 'draw', log: `${notes.join(' ')} La criatura se retiró. ¡Inténtalo de nuevo!` };
  return { ...result, heroHp, heroShield, enemyShield: nextShield, turn: battle.turn + 1, energy: Math.min(12, energy + 3), log: `${notes.join(' ')} Recuperaste hasta 1/4 de energía.` };
}

export type FractionChallenge = { kind: 'remaining' | 'equivalence' | 'recharge'; prompt: string; answer: number; hints: [string, string, string] };

/** A challenge is tied to the selected move, using the same exact energy units as combat. */
export function makeFractionChallenge(battle: Battle, action: Action, variant: number): FractionChallenge {
  const after = battle.energy - action.cost;
  const requested = ((Math.floor(variant) % 3) + 3) % 3;
  // A recharge question must not promise another turn after the fight ends.
  if (requested === 2 && playTurn(battle, action).result === 'playing') {
    const recharged = Math.min(12, after + 3);
    return { kind: 'recharge', answer: recharged,
      prompt: `Después de usar ${action.name} quedarán ${fraction(after)}. Al comenzar el siguiente turno recuperas hasta 1/4, sin superar 1. ¿Cuánta energía tendrás?`,
      hints: ['Suma la recuperación a la energía restante, sin pasar de una unidad.', `${fraction(after)} son ${after}/12 y 1/4 son 3/12. Suma y comprueba el máximo.`, `Quedan ${fraction(recharged)} después de recargar.`] };
  }
  if (requested === 1 && action.cost > 0) {
    return { kind: 'equivalence', answer: action.cost,
      prompt: `${action.name} consume ${action.cost} de las 12 partes de la barra. ¿Qué fracción de una unidad representa ese consumo?`,
      hints: ['Una fracción indica las partes elegidas sobre el total de partes iguales.', 'Coloca las partes consumidas en el numerador y el total de partes en el denominador.', `${action.cost}/12 equivale a ${fraction(action.cost)}.`] };
  }
  return { kind: 'remaining', answer: after,
    prompt: `Tienes ${fraction(battle.energy)} y ${action.name} cuesta ${fraction(action.cost)}. ¿Cuánta energía quedará?`,
    hints: ['Compara partes del mismo tamaño: utiliza los doceavos de la barra.', `${fraction(battle.energy)} son ${battle.energy}/12 y ${fraction(action.cost)} son ${action.cost}/12. Resta los numeradores.`, `Quedan ${after}/12, es decir ${fraction(after)}.`] };
}
