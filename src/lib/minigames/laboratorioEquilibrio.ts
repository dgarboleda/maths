export type Side = { boxes: number; weights: number };
export type Equation = { left: Side; right: Side };
export type Mission = { name: string; story: string; value: number; equations: Equation[]; par: number; hint: string; open?: boolean };
const eq = (lb: number, lw: number, rb: number, rw: number): Equation => ({ left: { boxes: lb, weights: lw }, right: { boxes: rb, weights: rw } });
export const MISSIONS: Mission[] = [
  { name: 'La primera caja', story: 'Descubre qué valor esconde la caja violeta.', value: 4, equations: [eq(1,3,0,7)], par: 1, hint: 'Quita 3 pesas de cada lado. La caja quedará sola.' },
  { name: 'Cajas gemelas', story: 'Las cajas iguales tienen el mismo valor.', value: 4, equations: [eq(2,2,0,10)], par: 2, hint: 'Quita 2 pesas de ambos lados y después divide toda la balanza entre 2.' },
  { name: 'Triple energía', story: 'Comparte la energía por igual entre las tres cajas.', value: 4, equations: [eq(3,0,0,12)], par: 1, hint: 'Divide ambos lados entre 3 para quedarte con una caja.' },
  { name: 'Motor de cristales', story: 'Aísla una caja para encender el motor.', value: 4, equations: [eq(2,5,0,13)], par: 2, hint: 'Primero quita 5 pesas de cada lado; luego divide entre 2.' },
  { name: 'Cajas en ambos lados', story: 'Una caja también aparece a la derecha.', value: 4, equations: [eq(3,2,1,10)], par: 3, hint: 'Quita una caja de cada lado y después 2 pesas de cada lado.' },
  { name: 'La caja cambió de lado', story: 'La caja puede terminar aislada en cualquiera de los lados.', value: 5, equations: [eq(2,6,3,1)], par: 2, hint: 'Quita 2 cajas de cada lado y luego una pesa de cada lado.' },
  { name: 'Balanzas conectadas', story: 'La misma caja aparece en dos balanzas. Resuelve la primera para activar la segunda.', value: 3, equations: [eq(1,2,0,5),eq(2,1,0,7)], par: 3, hint: 'En cada balanza, retira las pesas que acompañan a las cajas y simplifica.' },
  { name: 'Diseño libre', story: 'La caja vale 3. Construye dos combinaciones distintas que equilibren la balanza.', value: 3, equations: [eq(2,2,0,0)], par: 3, open: true, hint: 'La izquierda vale 8: prueba solo pesas o combina una caja con pesas.' },
];
export const MAX_ITEMS = 30;
export function measure(side: Side, boxValue: number) { return side.boxes * boxValue + side.weights; }
/** Las ecuaciones solo son equivalentes si mantienen la misma solución única. */
export function equivalent(original: Equation, current: Equation) {
  const initialCoefficient = original.left.boxes - original.right.boxes;
  const initialConstant = original.right.weights - original.left.weights;
  const coefficient = current.left.boxes - current.right.boxes;
  const constant = current.right.weights - current.left.weights;
  return initialCoefficient !== 0 && coefficient !== 0 && coefficient * initialConstant === initialCoefficient * constant;
}
export function isolated(equation: Equation) {
  const { left, right } = equation;
  return (left.boxes === 1 && left.weights === 0 && right.boxes === 0) || (right.boxes === 1 && right.weights === 0 && left.boxes === 0);
}
export function validateEquation(original: Equation, current: Equation): string | null {
  if (!equivalent(original, current)) return 'La relación original cambió. Revisa las operaciones en ambos lados o reinicia la balanza.';
  if (!isolated(current)) return 'La relación se conserva. Sigue hasta dejar una caja sola en un lado y solo pesas en el otro.';
  return null;
}
export function validateOpen(mission: Mission, current: Equation, found: string[]): string | null {
  const { left, right } = current;
  if (measure(left, mission.value) !== measure(right, mission.value)) return 'Aún no hay equilibrio. Ajusta la combinación del lado derecho.';
  if (left.boxes === right.boxes && left.weights === right.weights) return 'Busca una combinación diferente a la del lado izquierdo.';
  if (found.includes(`${right.boxes}/${right.weights}`)) return 'Ya encontraste esa combinación. Prueba otra distinta.';
  return null;
}
export function divide(equation: Equation, divisor: number): Equation | null {
  const values = [equation.left.boxes, equation.left.weights, equation.right.boxes, equation.right.weights];
  if (!Number.isInteger(divisor) || divisor < 2 || values.some(value => value % divisor !== 0)) return null;
  return { left: { boxes: equation.left.boxes/divisor, weights: equation.left.weights/divisor }, right: { boxes: equation.right.boxes/divisor, weights: equation.right.weights/divisor } };
}
