import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { GeoCraft } from './GeoCraft';
const mock = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock('@/lib/minigames/useTargetProgress', () => ({ useTargetProgress: () => ({ setProgress: mock.save, visible: { unlocked: 1, stars: {}, daily: '' }, loaded: true, syncStatus: 'local' }) }));
vi.mock('@/lib/useSoundPreference', () => ({ useSoundPreference: () => [false, vi.fn()] }));
vi.mock('@/lib/gameSound', () => ({ playSound: vi.fn() }));
vi.mock('@/components/learning/LearningShell', () => ({ LearningShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>, primaryButton: '', secondaryButton: '' }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
afterEach(() => mock.save.mockClear());
function start() { render(<GeoCraft childId="ana" />); fireEvent.click(screen.getByRole('button', { name: /Misión 1,/ })); }
function rectangle() { for (let row = 1; row <= 2; row++) for (let col = 1; col <= 3; col++) fireEvent.click(screen.getByRole('gridcell', { name: `Fila ${row}, columna ${col}, libre` })); }
it('completa una construcción y desbloquea la siguiente con tres estrellas', () => {
  start(); rectangle(); fireEvent.click(screen.getByRole('button', { name: 'Comprobar construcción' }));
  expect(screen.getByText(/Ganaste 3 de 3 estrellas/)).toBeInTheDocument();
  const update = mock.save.mock.calls.at(-1)?.[0];
  expect(update({ unlocked: 1, stars: {}, daily: '' })).toMatchObject({ unlocked: 2, stars: { '1': 3 } });
  expect(screen.getByRole('button', { name: /Siguiente construcción/ })).toHaveFocus();
});
it('ofrece retroalimentación y resta estrellas por errores y pistas', () => {
  start(); fireEvent.click(screen.getByRole('button', { name: 'Comprobar construcción' }));
  expect(screen.getByText(/Elige algunas casillas/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Pista (0/3)' }));
  expect(screen.getByText(/lados compartidos/)).toBeInTheDocument();
  rectangle(); fireEvent.click(screen.getByRole('button', { name: 'Comprobar construcción' }));
  expect(screen.getByText(/Ganaste 1 de 3 estrellas/)).toBeInTheDocument();
});
it('permite navegar el tablero con las flechas', () => {
  start(); const first = screen.getByRole('gridcell', { name: 'Fila 1, columna 1, libre' }); first.focus();
  fireEvent.keyDown(first, { key: 'ArrowRight' });
  expect(screen.getByRole('gridcell', { name: 'Fila 1, columna 2, libre' })).toHaveFocus();
});
it('presenta un tablero accesible', async () => {
  const { container } = render(<GeoCraft childId="ana" />); fireEvent.click(screen.getByRole('button', { name: /Misión 1,/ }));
  expect(await axe(container)).toHaveNoViolations();
});
