import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { FractionFighters } from './FractionFighters';
const mock = vi.hoisted(() => ({ save: vi.fn(), completed: 0 }));
vi.mock('@/lib/minigames/useTargetProgress', () => ({ useTargetProgress: () => ({ setProgress: mock.save, visible: { unlocked: 1, stars: {}, daily: '', completed: mock.completed }, loaded: true, syncStatus: 'local' }) }));
vi.mock('@/lib/useSoundPreference', () => ({ useSoundPreference: () => [false, vi.fn()] }));
vi.mock('@/lib/gameSound', () => ({ playSound: vi.fn() }));
vi.mock('@/components/learning/LearningShell', () => ({ LearningShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>, primaryButton: '', secondaryButton: '' }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

afterEach(() => { mock.completed = 0; vi.restoreAllMocks(); });
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
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: '1/4' } }); fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Aún no coincide');
    fireEvent.change(input, { target: { value: '6/12' } }); fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Turno 3\/15/ })).toHaveFocus();
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
    expect(screen.getByTestId('efecto-escudo')).toBeInTheDocument();
    expect(screen.getByTestId('proyectil-rival')).toBeInTheDocument();
  });

  it('muestra la reacción al golpe antes del contraataque rival', () => {
    render(<FractionFighters childId="ana" />);
    fireEvent.click(screen.getByRole('button', { name: /El primer claro/ }));
    fireEvent.click(screen.getByRole('button', { name: /Rayo lunar/ }));
    fireEvent.click(screen.getByRole('button', { name: /Usar poder/ }));
    expect(screen.getByTestId('guardiana-animada')).toHaveAttribute('data-motion', 'ataque');
    expect(screen.getByTestId('criatura-animada')).toHaveAttribute('data-motion', 'reaccion-y-ataque');
    expect(screen.getByTestId('proyectil-magico')).toBeInTheDocument();
  });

  it('conserva controles accesibles durante la pregunta', async () => {
    const { container } = render(<FractionFighters childId="ana" />);
    fireEvent.click(screen.getByRole('button', { name: /El primer claro/ }));
    fireEvent.click(screen.getByRole('button', { name: /Escudo ·/ }));
    fireEvent.click(screen.getByRole('button', { name: /Usar poder/ }));
    fireEvent.click(screen.getByRole('button', { name: /Rayo lunar/ }));
    fireEvent.click(screen.getByRole('button', { name: /Usar poder/ }));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('varía las preguntas en una nueva partida y acepta una equivalencia', () => {
    mock.completed = 1;
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.4).mockReturnValueOnce(0);
    render(<FractionFighters childId="ana" />);
    fireEvent.click(screen.getByRole('button', { name: /El primer claro/ }));
    fireEvent.click(screen.getByRole('button', { name: /Escudo ·/ }));
    fireEvent.click(screen.getByRole('button', { name: /Usar poder/ }));
    fireEvent.click(screen.getByRole('button', { name: /Rayo lunar/ }));
    fireEvent.click(screen.getByRole('button', { name: /Usar poder/ }));
    expect(screen.getByText(/consume 6 de las 12 partes/)).toBeInTheDocument();
    expect(screen.queryByText(/En amarillo: gastarás/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Escribe una fracción/), { target: { value: '6/12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
    expect(screen.getByRole('heading', { name: /Turno 3\/15/ })).toBeInTheDocument();
  });

  it('en partidas posteriores puede esperar hasta el tercer turno para preguntar', () => {
    mock.completed = 1;
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.9);
    render(<FractionFighters childId="ana" />);
    fireEvent.click(screen.getByRole('button', { name: /El primer claro/ }));
    fireEvent.click(screen.getByRole('button', { name: /Escudo ·/ }));
    fireEvent.click(screen.getByRole('button', { name: /Usar poder/ }));
    fireEvent.click(screen.getByRole('button', { name: /Chispa/ }));
    fireEvent.click(screen.getByRole('button', { name: /Usar poder/ }));
    expect(screen.getByRole('heading', { name: /Turno 3\/15/ })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Escribe una fracción/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Rayo lunar/ }));
    fireEvent.click(screen.getByRole('button', { name: /Usar poder/ }));
    expect(screen.getByLabelText(/Escribe una fracción/)).toBeInTheDocument();
  });

});
