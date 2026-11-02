import { afterEach, describe, expect, it, vi } from 'vitest';
import { playSound } from './gameSound';

afterEach(() => vi.unstubAllGlobals());
describe('sonido opcional', () => {
  it('no interrumpe el juego si Web Audio no está disponible', () => {
    vi.stubGlobal('AudioContext', undefined); vi.stubGlobal('webkitAudioContext', undefined);
    expect(() => playSound('fanfare', true)).not.toThrow();
  });
  it('no interrumpe el juego si el navegador bloquea AudioContext', () => {
    vi.stubGlobal('AudioContext', class { constructor() { throw new Error('audio bloqueado'); } });
    expect(() => playSound('fanfare', true)).not.toThrow();
  });
});
