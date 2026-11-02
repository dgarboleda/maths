import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FractionFighters } from './FractionFighters';
const mock = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock('@/lib/minigames/useTargetProgress', () => ({ useTargetProgress: () => ({ setProgress: mock.save, visible: { unlocked: 1, stars: {}, daily: '' }, loaded: true, syncStatus: 'local' }) }));
vi.mock('@/lib/useSoundPreference', () => ({ useSoundPreference: () => [false, vi.fn()] }));
vi.mock('@/lib/gameSound', () => ({ playSound: vi.fn() }));
vi.mock('@/components/learning/LearningShell', () => ({ LearningShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>, primaryButton: '', secondaryButton: '' }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

describe('Fraction Fighters', () => {
  it('muestra el mapa y mantiene bloqueados encuentros futuros', () => {
    render(<FractionFighters childId="ana" />);
    expect(screen.getByRole('button', { name: /El primer claro/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /La senda del escudo/ })).toBeDisabled();
  });
  it('permite intentos sin penalización y acepta una fracción equivalente', () => {
    render(<FractionFighters childId="ana" />);
    fireEvent.click(screen.getByRole('button', { name: /El primer claro/ }));
    fireEvent.click(screen.getByRole('button', { name: /Escudo ·/ }));
    fireEvent.click(screen.getByRole('button', { name: /Usar poder/ }));
    fireEvent.click(screen.getByRole('button', { name: /Rayo lunar/ }));
    fireEvent.click(screen.getByRole('button', { name: /Usar poder/ }));
    const input = screen.getByLabelText(/Escribe una fracción/);
    fireEvent.change(input, { target: { value: '1/4' } }); fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Aún no coincide');
    fireEvent.change(input, { target: { value: '6/12' } }); fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText(/Turno 3\/15/)).toBeInTheDocument();
  });
  it('desbloquea el siguiente encuentro al ganar con una respuesta correcta', () => {
    mock.save.mockClear();
    render(<FractionFighters childId="ana" />);
    fireEvent.click(screen.getByRole('button', { name: /El primer claro/ }));
    fireEvent.click(screen.getByRole('button', { name: /Rayo lunar/ }));
    fireEvent.click(screen.getByRole('button', { name: /Usar poder/ }));
    fireEvent.click(screen.getByRole('button', { name: /Rayo lunar/ }));
    fireEvent.click(screen.getByRole('button', { name: /Usar poder/ }));
    fireEvent.change(screen.getByLabelText(/Escribe una fracción/), { target: { value: '1/4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
    fireEvent.click(screen.getByRole('button', { name: /Chispa/ }));
    fireEvent.click(screen.getByRole('button', { name: /Usar poder/ }));
    expect(screen.getByText(/¡Encuentro completado!/)).toBeInTheDocument();
    const update = mock.save.mock.calls.at(-1)?.[0];
    expect(update({ unlocked: 1, stars: {}, daily: '' })).toMatchObject({ unlocked: 2, stars: { '1': 3 }, completed: 1 });
  });

  it('anima la defensa de la guardiana y el ataque anunciado de la criatura', () => {
    render(<FractionFighters childId="ana" />);
    fireEvent.click(screen.getByRole('button', { name: /El primer claro/ }));
    fireEvent.click(screen.getByRole('button', { name: /Escudo ·/ }));
    fireEvent.click(screen.getByRole('button', { name: /Usar poder/ }));
    expect(screen.getByTestId('guardiana-animada')).toHaveAttribute('data-motion', 'defensa');
    expect(screen.getByTestId('criatura-animada')).toHaveAttribute('data-motion', 'ataque');
  });

});
