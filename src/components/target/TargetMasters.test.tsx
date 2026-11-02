import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
    fireEvent.click(screen.getAllByRole('button', { name: 'Ficha 2' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar modo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar partida' }));
    expect(screen.getByRole('button', { name: 'Ficha 2, seleccionada' })).toBeInTheDocument();
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

});
