import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { LaboratorioEquilibrio } from './LaboratorioEquilibrio';
const mock = vi.hoisted(() => ({ save: vi.fn(), unlocked: 8 }));
vi.mock('@/lib/minigames/useTargetProgress', () => ({ useTargetProgress: () => ({ setProgress: mock.save, visible: { unlocked: mock.unlocked, stars: {}, daily: '' }, loaded: true, syncStatus: 'local' }) }));
vi.mock('@/lib/useSoundPreference', () => ({ useSoundPreference: () => [false, vi.fn()] }));
vi.mock('@/lib/gameSound', () => ({ playSound: vi.fn() }));
vi.mock('@/components/learning/LearningShell', () => ({ LearningShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>, primaryButton: '', secondaryButton: '' }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
afterEach(() => mock.save.mockClear());
function start(n: number) { const result = render(<LaboratorioEquilibrio childId="ana" />); fireEvent.click(screen.getByRole('button', { name: new RegExp(`Experimento ${n},`) })); return result; }
function amount(n: number) { fireEvent.change(screen.getByLabelText('Cantidad por acción'), { target: { value: String(n) } }); }
it('inclina al alterar un solo lado y resuelve con operaciones equivalentes', () => {
  start(1); amount(3); fireEvent.click(screen.getByRole('button', { name: 'Quitar pesas a la izquierda' }));
  expect(screen.getByRole('img', { name: /lado derecho pesa más/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Quitar pesas a la derecha' }));
  fireEvent.click(screen.getByRole('button', { name: 'Comprobar solución' }));
  expect(screen.getByText(/La caja vale 4/)).toBeInTheDocument();
  expect(mock.save.mock.calls.at(-1)?.[0]({ unlocked: 1, stars: {}, daily: '' })).toMatchObject({ unlocked: 2, stars: { 1: 1 } });
  expect(screen.getByRole('button', { name: /Siguiente experimento/ })).toHaveFocus();
});
it('pierde la estrella de equilibrio aunque rehaga la balanza a tiempo', () => {
  start(3); amount(2); fireEvent.click(screen.getByRole('button', { name: 'Quitar cajas a la izquierda' }));
  amount(8); fireEvent.click(screen.getByRole('button', { name: 'Quitar pesas a la derecha' }));
  fireEvent.click(screen.getByRole('button', { name: 'Comprobar solución' }));
  expect(screen.getByText(/Ganaste 1 de 3 estrellas/)).toBeInTheDocument();
});
it('resuelve con una acción sobre ambos lados y obtiene tres estrellas', () => {
  start(1); amount(3); fireEvent.click(screen.getByRole('button', { name: '− 💎 Pesas' })); fireEvent.click(screen.getByRole('button', { name: 'Comprobar solución' }));
  expect(screen.getByText(/Ganaste 3 de 3 estrellas/)).toBeInTheDocument();
});
it('resuelve las dos balanzas conectadas', () => {
  start(7); amount(2); fireEvent.click(screen.getByRole('button', { name: '− 💎 Pesas' })); fireEvent.click(screen.getByRole('button', { name: 'Comprobar solución' }));
  expect(screen.getByText(/Primera balanza resuelta/)).toBeInTheDocument();
  amount(1); fireEvent.click(screen.getByRole('button', { name: '− 💎 Pesas' })); fireEvent.click(screen.getByRole('button', { name: '÷ 2 ambos lados' })); fireEvent.click(screen.getByRole('button', { name: 'Comprobar solución' }));
  expect(screen.getByText(/Ganaste 3 de 3 estrellas/)).toBeInTheDocument();
});
it('registra dos diseños diferentes', () => {
  start(8); amount(8); fireEvent.click(screen.getByRole('button', { name: 'Añadir pesas a la derecha' })); fireEvent.click(screen.getByRole('button', { name: 'Registrar combinación' }));
  expect(screen.getByText(/Primera combinación encontrada/)).toBeInTheDocument();
  amount(3); fireEvent.click(screen.getByRole('button', { name: 'Quitar pesas a la derecha' })); amount(1); fireEvent.click(screen.getByRole('button', { name: 'Añadir cajas a la derecha' })); fireEvent.click(screen.getByRole('button', { name: 'Registrar combinación' }));
  expect(screen.getByText(/Ganaste 3 de 3 estrellas/)).toBeInTheDocument();
});
it('ofrece controles y descripción accesibles', async () => { const { container } = start(1); expect(screen.getByRole('img', { name: /Balanza equilibrada/ })).toBeInTheDocument(); expect(await axe(container)).toHaveNoViolations(); });
