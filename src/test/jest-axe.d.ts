// jest-axe trae sus propios tipos para el `expect` de Jest (@types/jest-axe),
// no para el de Vitest — sin esto, `expect(await axe(container))` no conoce
// `toHaveNoViolations` (el matcher SÍ está registrado en tiempo de
// ejecución, vía `expect.extend` en src/test/setup.ts; esto es solo el tipo).
//
// `export {}` es necesario para que TypeScript trate este archivo como
// módulo: sin eso, `declare module "vitest"` de abajo REEMPLAZA el módulo
// real en vez de ampliarlo (fusión de declaraciones), y desaparecen
// `describe`/`test`/`expect`/etc. de todos los demás archivos de prueba.
export {};

declare module "vitest" {
  interface Assertion<T = unknown> {
    toHaveNoViolations(): T;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}
