import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { RutaRescate } from './RutaRescate';
const mock = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock('@/lib/minigames/useTargetProgress', () => ({ useTargetProgress: () => ({ setProgress: mock.save, visible: { unlocked: 1, stars: {}, daily: '' }, loaded: true, syncStatus: 'local' }) }));
vi.mock('@/lib/useSoundPreference', () => ({ useSoundPreference: () => [false, vi.fn()] }));
vi.mock('@/lib/gameSound', () => ({ playSound: vi.fn() }));
vi.mock('@/components/learning/LearningShell', () => ({ LearningShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>, primaryButton: '', secondaryButton: '' }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
afterEach(() => { vi.useRealTimers(); mock.save.mockClear(); });
function start() { const result = render(<RutaRescate childId="ana" />); fireEvent.click(screen.getByRole('button', { name: /Misión 1,/ })); return result; }
function add(name: string) { fireEvent.click(screen.getByRole('button', { name })); }
it('ejecuta una ruta y desbloquea la siguiente misión', () => {
  vi.useFakeTimers(); start();
  add('🚙 Avanzar'); add('🚙 Avanzar'); add('↶ Girar a la izquierda'); add('↶ Girar a la izquierda'); add('🚙 Avanzar'); add('🚙 Avanzar'); add('▶ Probar ruta');
  act(() => { vi.runAllTimers(); });
  expect(screen.getByText(/Ganaste 3 de 3 estrellas/)).toBeInTheDocument();
  expect(mock.save.mock.calls.at(-1)?.[0]({ unlocked: 1, stars: {}, daily: '' })).toMatchObject({ unlocked: 2, stars: { 1: 3 } });
  expect(screen.getByRole('button', { name: /Siguiente misión/ })).toHaveFocus();
});
it('permite corregir una ruta y cancelar su animación', () => {
  vi.useFakeTimers(); start(); add('↷ Girar a la derecha'); add('🚙 Avanzar'); add('▶ Probar ruta');
  act(() => { vi.runAllTimers(); }); expect(screen.getByText(/obstáculo o el borde/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar paso 1' }));
  add('▶ Probar ruta'); add('Reiniciar misión'); act(() => { vi.runAllTimers(); });
  expect(screen.getByText(/Añade tu primer bloque/)).toBeInTheDocument(); expect(screen.queryByText(/Ganaste/)).not.toBeInTheDocument();
});
it('presenta un mapa y controles accesibles', async () => {
  const { container } = start(); expect(screen.getByRole('img', { name: /Base en fila 5/ })).toBeInTheDocument(); expect(await axe(container)).toHaveNoViolations();
});
