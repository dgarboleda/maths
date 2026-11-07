import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTargetProgress } from './useTargetProgress';

const mock = vi.hoisted(() => ({ receive: null as null | ((snapshot: unknown) => void), writes: [] as unknown[], paths: [] as unknown[][] }));
vi.mock('@/lib/AuthProvider', () => ({ useAuth: () => ({ parentId: 'familia', user: { uid: 'familia' } }) }));
vi.mock('@/lib/firebase', () => ({ getFirebase: async () => ({ db: {}, firestore: {
  collection: () => ({}), query: () => ({}), where: () => ({}), documentId: () => ({}), doc: (...args: unknown[]) => { mock.paths.push(args); return {}; },
  onSnapshot: (_q: unknown, _opts: unknown, receive: (snapshot: unknown) => void) => { mock.receive = receive; return () => {}; },
  runTransaction: async (_db: unknown, callback: (transaction: unknown) => Promise<void>) => callback({ get: async () => ({ exists: () => false }), set: (_ref: unknown, data: unknown) => { mock.writes.push(data); } }),
} }) }));

describe('sincronización del juego', () => {
  beforeEach(() => { localStorage.clear(); mock.receive = null; mock.writes = []; mock.paths = []; });
  it('importa el progreso local, combina otro dispositivo y no lo sobrescribe', async () => {
    localStorage.setItem('numerario:target-masters:ana', JSON.stringify({ unlocked: 4, stars: { '1': 2 }, daily: '', completed: 2 }));
    const { result } = renderHook(() => useTargetProgress('ana'));
    await waitFor(() => expect(mock.receive).not.toBeNull());
    act(() => mock.receive?.({ docs: [{ id: 'target-masters-v1-otro', data: () => ({ unlocked: 8, stars: { '1': 3, '7': 1 }, daily: '', completed: 3 }) }], metadata: { fromCache: false, hasPendingWrites: false } }));
    await waitFor(() => expect(result.current.visible.unlocked).toBe(8));
    expect(result.current.visible.stars).toEqual({ '1': 3, '7': 1 });
    expect(result.current.visible.completed).toBe(5);
    await waitFor(() => expect(mock.writes.length).toBeGreaterThan(0));
    expect(mock.writes.at(-1)).toMatchObject({ unlocked: 4, completed: 2 });
  });
  it('espera datos del servidor antes de escribir y conserva el avance sin conexión', async () => {
    const { result } = renderHook(() => useTargetProgress('ana'));
    await waitFor(() => expect(mock.receive).not.toBeNull());
    act(() => mock.receive?.({ docs: [], metadata: { fromCache: true, hasPendingWrites: false } }));
    act(() => result.current.setProgress({ unlocked: 3, stars: { '1': 3 }, daily: '' }));
    expect(result.current.syncStatus).toBe('pendiente');
    expect(mock.writes).toHaveLength(0);
    await waitFor(() => expect(JSON.parse(localStorage.getItem('numerario:target-masters:ana')!).unlocked).toBe(3));
    act(() => mock.receive?.({ docs: [], metadata: { fromCache: false, hasPendingWrites: false } }));
    await waitFor(() => expect(mock.writes.length).toBeGreaterThan(0));
    expect(mock.writes.at(-1)).toMatchObject({ unlocked: 3 });
  });
  it('mantiene las copias locales de Fraction Fighters separadas de Target Masters', async () => {
    localStorage.setItem('numerario:target-masters:ana', JSON.stringify({ unlocked: 90, stars: {}, daily: '' }));
    localStorage.setItem('numerario:fraction-fighters:ana', JSON.stringify({ unlocked: 3, stars: { '1': 2 }, daily: '' }));
    const { result } = renderHook(() => useTargetProgress('ana', 'fraction-fighters'));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.visible.unlocked).toBe(3);
    expect(result.current.visible.stars['1']).toBe(2);
    await waitFor(() => expect(mock.receive).not.toBeNull());
    act(() => mock.receive?.({ docs: [], metadata: { fromCache: false, hasPendingWrites: false } }));
    await waitFor(() => expect(mock.paths.some(path => String(path.at(-1)).startsWith('fraction-fighters-v1-'))).toBe(true));
  });

  it('mantiene CodeBreaker aislado de los otros juegos y usa su propia clave remota', async () => {
    localStorage.setItem('numerario:target-masters:ana', JSON.stringify({ unlocked: 90, stars: {}, daily: '' }));
    localStorage.setItem('numerario:codebreaker:ana', JSON.stringify({ unlocked: 3, stars: { '1': 2 }, daily: '' }));
    const { result } = renderHook(() => useTargetProgress('ana', 'codebreaker'));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.visible.unlocked).toBe(3);
    await waitFor(() => expect(mock.receive).not.toBeNull());
    act(() => mock.receive?.({ docs: [], metadata: { fromCache: false, hasPendingWrites: false } }));
    await waitFor(() => expect(mock.paths.some(path => String(path.at(-1)).startsWith('codebreaker-v1-'))).toBe(true));
  });

  it.each(['geocraft', 'estacion-proporcion'] as const)('aísla el progreso local y remoto de %s', async game => {
    localStorage.setItem('numerario:target-masters:ana', JSON.stringify({ unlocked: 90, stars: {}, daily: '' }));
    localStorage.setItem(`numerario:${game}:ana`, JSON.stringify({ unlocked: 3, stars: { '1': 2 }, daily: '' }));
    const { result } = renderHook(() => useTargetProgress('ana', game));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.visible.unlocked).toBe(3);
    await waitFor(() => expect(mock.receive).not.toBeNull());
    act(() => mock.receive?.({ docs: [], metadata: { fromCache: false, hasPendingWrites: false } }));
    await waitFor(() => expect(mock.paths.some(path => String(path.at(-1)).startsWith(`${game}-v1-`))).toBe(true));
  });

});
