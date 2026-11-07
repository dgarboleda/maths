import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { EstacionProporcion } from './EstacionProporcion';
const mock = vi.hoisted(() => ({ save: vi.fn(), unlocked: 12 }));
vi.mock('@/lib/minigames/useTargetProgress', () => ({ useTargetProgress: () => ({ setProgress: mock.save, visible: { unlocked: mock.unlocked, stars: {}, daily: '' }, loaded: true, syncStatus: 'local' }) }));
vi.mock('@/lib/useSoundPreference', () => ({ useSoundPreference: () => [false, vi.fn()] }));
vi.mock('@/lib/gameSound', () => ({ playSound: vi.fn() }));
vi.mock('@/components/learning/LearningShell', () => ({ LearningShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>, primaryButton: '', secondaryButton: '' }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
afterEach(() => mock.save.mockClear());
function start(n: number) { render(<EstacionProporcion childId="ana" />); fireEvent.click(screen.getByRole('button', { name: new RegExp(`Misión ${n},`) })); }
it('ajusta una carga, corrige errores y desbloquea la misión siguiente', () => {
  start(1); fireEvent.click(screen.getByRole('button', { name: 'Enviar carga' })); expect(screen.getByText(/aún no está lista/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/Ajusta la carga/), { target: { value: '18' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar carga' }));
  expect(screen.getByText(/Ganaste 2 de 3 estrellas/)).toBeInTheDocument();
  expect(screen.getByText(/6 × 3 = 18/)).toBeInTheDocument();
  expect(mock.save.mock.calls.at(-1)?.[0]({ unlocked: 1, stars: {}, daily: '' })).toMatchObject({ unlocked: 2, stars: { 1: 2 } });
  expect(screen.getByRole('button', { name: /Siguiente misión/ })).toHaveFocus();
});
it('activa la máquina con una respuesta seleccionada y usa una pista', () => {
  start(2); fireEvent.click(screen.getByRole('button', { name: 'Pedir pista' })); expect(screen.getByText(/cuánta energía produce/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '15' })); fireEvent.click(screen.getByRole('button', { name: 'Activar máquina' })); expect(screen.getByText(/Ganaste 2 de 3 estrellas/)).toBeInTheDocument();
});
it('elige una oferta por precio unitario', () => {
  start(3); fireEvent.click(screen.getByRole('button', { name: /Nave A/ })); fireEvent.click(screen.getByRole('button', { name: 'Elegir oferta' })); expect(screen.getByText(/Conviene A/)).toBeInTheDocument();
});
it('detecta la carga equivocada', () => {
  start(4); fireEvent.click(screen.getByRole('button', { name: /4 exploradores → 10 raciones/ })); fireEvent.click(screen.getByRole('button', { name: 'Revisar carga' })); expect(screen.getByText(/se necesitan 12/)).toBeInTheDocument();
});
it('presenta controles accesibles', async () => {
  const { container } = render(<EstacionProporcion childId="ana" />); fireEvent.click(screen.getByRole('button', { name: /Misión 1,/ })); expect(await axe(container)).toHaveNoViolations();
});
