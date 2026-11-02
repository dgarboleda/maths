import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { TargetMasters } from './TargetMasters';

vi.mock('@/lib/minigames/useTargetProgress', () => ({ useTargetProgress: () => ({ setProgress: vi.fn(), visible: { unlocked: 1, stars: {}, daily: '' }, loaded: true, syncStatus: 'local' }) }));
vi.mock('@/components/learning/LearningShell', () => ({ LearningShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>, primaryButton: '', secondaryButton: '' }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

afterEach(() => vi.useRealTimers());
describe('selector de modos de Target Masters', () => {
  it('muestra los modos al inicio y permite regresar al tablero sin reiniciarlo', () => {
    render(<TargetMasters childId="ana" />);
    expect(screen.getByRole('heading', { name: 'Elige tu aventura' })).toBeInTheDocument();
    expect(screen.queryByText('Objetivo')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Aventura/ }));
    expect(screen.getByText('Objetivo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Contrarreloj/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ficha 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar modo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar partida' }));
    expect(screen.getByRole('button', { name: 'Ficha 3, seleccionada' })).toBeInTheDocument();
  });
  it('pausa el reloj al elegir modo y lo reanuda al continuar', () => {
    vi.useFakeTimers();
    render(<TargetMasters childId="ana" />);
    fireEvent.click(screen.getByRole('button', { name: /Contrarreloj/ }));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText(/Tiempo: 89 s/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar modo' }));
    act(() => vi.advanceTimersByTime(5000));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar partida' }));
    expect(screen.getByText(/Tiempo: 89 s/)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText(/Tiempo: 88 s/)).toBeInTheDocument();
  });
  it('cuenta el tiempo transcurrido aunque se retrase la actualización del reloj', () => {
    vi.useFakeTimers();
    render(<TargetMasters childId="ana" />);
    fireEvent.click(screen.getByRole('button', { name: /Contrarreloj/ }));
    vi.setSystemTime(Date.now() + 30_000);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText(/Tiempo: 59 s/)).toBeInTheDocument();
  });

  it('presenta un acertijo, las cuatro operaciones y permite revelar el objetivo', () => {
    render(<TargetMasters childId="ana" />);
    fireEvent.click(screen.getByRole('button', { name: /Aventura/ }));
    expect(screen.getByText(/número primo entre 12 y 14/)).toBeInTheDocument();
    for (const name of ['Sumar', 'Restar', 'Multiplicar', 'Dividir']) expect(screen.getByRole('button', { name })).toBeEnabled();
    expect(screen.queryByText('13', { exact: true })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Revelar objetivo/ }));
    expect(screen.getByText('13', { exact: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Objetivo revelado' })).toHaveAttribute('aria-disabled', 'true');
  });
  it('abre el primer portal al resolver el acertijo con las cuatro fichas', () => {
    render(<TargetMasters childId="ana" />);
    fireEvent.click(screen.getByRole('button', { name: /Aventura/ }));
    const move = (a: number, b: number, op: string) => {
      fireEvent.click(screen.getByRole('button', { name: `Ficha ${a}` }));
      fireEvent.click(screen.getByRole('button', { name: `Ficha ${b}` }));
      fireEvent.click(screen.getByRole('button', { name: op }));
      fireEvent.click(screen.getByRole('button', { name: 'Combinar' }));
    };
    move(3, 5, 'Multiplicar'); move(15, 4, 'Sumar'); move(19, 6, 'Restar');
    expect(screen.getByText(/¡Portal abierto!/)).toBeInTheDocument();
    expect(screen.getByText(/\(\(\(3 × 5\) \+ 4\) − 6\) = 13/)).toBeInTheDocument();
  });

  it('mantiene el acertijo accesible en el tablero', async () => {
    const { container } = render(<TargetMasters childId="ana" />);
    fireEvent.click(screen.getByRole('button', { name: /Aventura/ }));
    expect(await axe(container)).toHaveNoViolations();
  });

});
