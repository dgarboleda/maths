import "@testing-library/jest-dom/vitest";
import { afterEach, expect } from "vitest";
import { cleanup } from "@testing-library/react";
import { toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

// RTL no limpia el DOM entre tests por su cuenta bajo Vitest (a diferencia
// del entorno de Jest, que lo hace vía un hook global implícito) — sin esto,
// un test deja montado lo del anterior y los `getBy*`/`queryBy*` empiezan a
// resolver ambiguo.
afterEach(() => {
  cleanup();
});

// jsdom no implementa layout real: `getBoundingClientRect`/scroll de verdad
// no existen. Varios componentes del editor y de tooltips los llaman para
// posicionar cosas (Tooltip.tsx, EditorCanvas) — sin un valor devuelto
// consistente, esas llamadas explotan en vez de devolver ceros como en un
// navegador real sin layout.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
