# Pruebas de extremo a extremo

Las pruebas abren la app real en un navegador y la hacen jugar: registrar un
padre, crear un perfil de hijo, entrar con su PIN, resolver problemas y pedir
un canje. No hay mocks del cliente de Firebase — se usan los **emuladores**
oficiales de Auth y Firestore, con el proyecto `demo-numerario`, que Firebase
reserva para uso local y que nunca toca datos reales.

## Ejecutar

```bash
npm run e2e            # todo
npm run e2e -- --ui    # modo interactivo
npm run e2e -- e2e/accesibilidad.spec.ts
```

Playwright levanta por su cuenta los emuladores y `next dev` (y reutiliza los
que ya estén arriba), así que no hace falta arrancar nada antes. La primera
vez descarga el emulador de Firestore, que necesita **Java 11 o superior**.

Para desarrollar a mano contra los emuladores:

```bash
npm run emuladores
NEXT_PUBLIC_FIREBASE_EMULATORS=1 npm run dev
```

Los navegadores se instalan con `npx playwright install chromium`. Si el
entorno ya trae uno (contenedores de CI que lo preinstalan), se puede apuntar
a él sin descargar nada:

```bash
PLAYWRIGHT_CHROMIUM_PATH=/ruta/al/chromium npm run e2e
```

## Qué cubre

| Archivo | Qué comprueba |
|---|---|
| `acceso.spec.ts` | Redirección de la raíz, alta y entrada del padre, errores anunciados, PIN correcto e incorrecto, panel del padre, enlace de saltar al contenido. |
| `juego.spec.ts` | Navegación entre hilo y tema, pestañas con teclado, los tres controles que antes solo respondían al arrastre (recta numérica, balanza, reparto en decenas), tabla 10×10, suma de estrellas, canje, persistencia del sonido y confeti desactivado con "reducir movimiento". |
| `accesibilidad.spec.ts` | Análisis con axe-core (WCAG 2.1 A y AA) de todas las pantallas y de cada pestaña de los dos juegos con pestañas. |

Cada prueba crea su **propia cuenta de padre** (correo aleatorio), así que
pueden correr en paralelo y no dependen del orden ni de datos previos.

## Notas

- Las pruebas se apoyan en roles y nombres accesibles (`getByRole`,
  `getByLabel`) en vez de en clases CSS: si una etiqueta accesible desaparece,
  la prueba falla, que es justo lo que se quiere vigilar.
- Los enunciados son aleatorios; cuando una prueba necesita acertar, resuelve
  la operación leyendo el enunciado (`resolverEnunciado` en `utilidades.ts`).
- El proyecto `móvil` repite el recorrido en un viewport de teléfono; el
  análisis de axe corre solo en escritorio para no duplicarlo.
