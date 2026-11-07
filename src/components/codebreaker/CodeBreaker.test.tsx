import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeMission, solveCircuit } from '@/lib/minigames/codebreaker';
import { axe } from 'jest-axe';
import { CodeBreaker } from './CodeBreaker';
const mock = vi.hoisted(() => ({ save: vi.fn(), unlocked: 1 }));
vi.mock('@/lib/minigames/useTargetProgress', () => ({ useTargetProgress: () => ({ setProgress: mock.save, visible: { unlocked: mock.unlocked, stars: {}, daily: '' }, loaded: true, syncStatus: 'local' }) }));
vi.mock('@/lib/useSoundPreference', () => ({ useSoundPreference: () => [false, vi.fn()] }));
vi.mock('@/lib/gameSound', () => ({ playSound: vi.fn() }));
vi.mock('@/components/learning/LearningShell', () => ({ LearningShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>, primaryButton: '', secondaryButton: '' }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

afterEach(() => { mock.unlocked = 1; mock.save.mockClear(); });
describe('CodeBreaker', () => {
  it('desbloquea un sistema tras corregir la respuesta y conserva las reglas de estrellas', () => {
    mock.save.mockClear();
    render(<CodeBreaker childId="ana" />);
    expect(screen.getByRole('button', { name: /Misión 2, bloqueada/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Misión 1,/ }));
    fireEvent.click(screen.getByRole('button', { name: '12' }));
    fireEvent.click(screen.getByRole('button', { name: 'Descifrar' }));
    expect(screen.getByText(/Esa clave no abre/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '11' }));
    fireEvent.click(screen.getByRole('button', { name: 'Descifrar' }));
    expect(screen.getByText(/Sistema desbloqueado/)).toBeInTheDocument();
    const update = mock.save.mock.calls.at(-1)?.[0];
    expect(update({ unlocked: 1, stars: {}, daily: '' })).toMatchObject({ unlocked: 2, stars: { '1': 2 }, completed: 1 });
  });
  it('permite reconstruir un circuito por pasos', () => {
    render(<CodeBreaker childId="ana" />);
    fireEvent.click(screen.getByRole('button', { name: /Misión 1,/ }));
    fireEvent.click(screen.getByRole('button', { name: '11' }));
    fireEvent.click(screen.getByRole('button', { name: 'Descifrar' }));
    fireEvent.click(screen.getByRole('button', { name: /Siguiente misión/ }));
    fireEvent.click(screen.getByRole('button', { name: '+ 2' }));
    fireEvent.click(screen.getByRole('button', { name: '× 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    fireEvent.click(screen.getByRole('button', { name: '× 2' }));
    fireEvent.click(screen.getByRole('button', { name: '− 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Descifrar' }));
    expect(screen.getByText(/Sistema desbloqueado/)).toBeInTheDocument();
  });
  it('presenta controles accesibles en la misión', async () => {
    const { container } = render(<CodeBreaker childId="ana" />);
    fireEvent.click(screen.getByRole('button', { name: /Misión 1,/ }));
    expect(await axe(container)).toHaveNoViolations();
  });
  it('mantiene el foco al terminar una misión y regresar al mapa', () => {
    render(<CodeBreaker childId="ana" />);
    fireEvent.click(screen.getByRole('button', { name: /Misión 1,/ }));
    expect(screen.getByRole('heading', { name: /Misión 1\/50/ })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '11' }));
    fireEvent.click(screen.getByRole('button', { name: 'Descifrar' }));
    expect(screen.getByRole('button', { name: /Siguiente misión/ })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Ver mapa' }));
    expect(screen.getByRole('heading', { name: 'Selecciona una misión' })).toHaveFocus();
  });

  it('orienta cuando una conexión no puede completar el circuito', () => {
    mock.unlocked = 2;
    render(<CodeBreaker childId="ana" />);
    fireEvent.click(screen.getByRole('button', { name: /Misión 2,/ }));
    fireEvent.click(screen.getByRole('button', { name: '× 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pista' }));
    expect(screen.getByText(/Con estas conexiones no se alcanza/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pista' }));
    expect(screen.getByText(/Una siguiente conexión posible es/)).toBeInTheDocument();
  });
  it('termina la misión 50 sin desbloquear una misión inexistente', () => {
    mock.unlocked = 50;
    render(<CodeBreaker childId="ana" />);
    fireEvent.click(screen.getByRole('button', { name: /Misión 50,/ }));
    const mission = makeMission(50);
    if (mission.kind !== 'circuit') throw new Error('Se esperaba un circuito');
    for (const id of solveCircuit(mission)!) fireEvent.click(screen.getByRole('button', { name: mission.blocks.find(block => block.id === id)!.label }));
    fireEvent.click(screen.getByRole('button', { name: 'Descifrar' }));
    expect(screen.getByRole('button', { name: 'Volver al mapa' })).toHaveFocus();
    const update = mock.save.mock.calls.at(-1)?.[0];
    expect(update({ unlocked: 50, stars: {}, daily: '' })).toMatchObject({ unlocked: 50, stars: { '50': 3 } });
  });

});
