# Auditoría de rendimiento y accesibilidad

Revisión completa del código de Numerario (Next.js 16 + Firebase, todo en el
cliente) buscando oportunidades de mejora en **rendimiento**, **accesibilidad**
y, de paso, algunos problemas de **corrección** que aparecieron por el camino.

En cada apartado, primero lo que ya está corregido en esta rama y después lo
que queda pendiente, con la propuesta concreta para cada punto.

---

## 1. Rendimiento

### 1.1 Corregido

| # | Hallazgo | Qué se hizo |
|---|---|---|
| P1 | **Cuatro familias tipográficas descargadas, dos usadas.** `app/layout.tsx` cargaba Geist y Geist Mono, `GameShell` cargaba Fredoka y Quicksand, y `globals.css` remataba con `body { font-family: Arial }`, que pisaba las variables de Geist. Ninguna regla del proyecto usaba `--font-geist-sans` ni `--font-geist-mono`. | Quedan solo Fredoka y Quicksand, declaradas una vez en el layout raíz como variables CSS con `display: "swap"`, y el `body` usa esa familia. `/login` pasa de precargar dos ficheros de fuentes que no se pintaban a precargar solo los que sí. |
| P2 | **El saldo de estrellas se recalculaba en O(N).** Cinco pantallas repetían el mismo `onSnapshot` sobre la colección `starLedger` completa y volvían a sumar *todos* los documentos en cada notificación. El libro mayor crece con una entrada por respuesta correcta, así que el costo por respuesta crecía con el historial del niño. | Hook único `useTotalStars` (`src/lib/useTotalStars.ts`): mantiene un acumulador y aplica solo `snap.docChanges()`, de modo que cada actualización cuesta O(cambios). De paso elimina cinco copias del mismo efecto. |
| P3 | **Un canvas y un bucle `requestAnimationFrame` nuevos por cada acierto.** `triggerConfetti()` creaba un `<canvas>` por llamada; respondiendo rápido en el Cohete quedaban varios bucles dibujando a pantalla completa a la vez, y ninguno se cancelaba al salir de la pantalla. | Un único canvas reutilizado, cancelación de la animación anterior con `cancelAnimationFrame` y escala por `devicePixelRatio`. Además no dibuja nada si el sistema pide reducir movimiento. |
| P4 | **La preferencia de sonido se perdía al navegar.** Cada página tenía su propio `useState(true)`: apagar el sonido duraba hasta el siguiente enlace. | `useSoundPreference` (`useSyncExternalStore` + `localStorage`): una sola preferencia, compartida y recordada, sin desajuste de hidratación. |
| P5 | **Temporizadores sin limpiar.** `PracticaTab` dejaba vivos los `setTimeout` de "pasar a la siguiente pregunta" al desmontarse. | Se guardan y se cancelan en el `cleanup` del efecto. |

### 1.2 Pendiente

- **Contador agregado de estrellas.** Aun con P2, abrir cualquier pantalla
  descarga el libro mayor entero (una entrada por cada respuesta correcta de
  toda la vida del perfil). Lo que corresponde es un documento por hijo
  actualizado con `increment(delta)` dentro del mismo `writeBatch` que escribe
  la entrada del libro mayor, y que las pantallas escuchen ese único
  documento. Implica migrar los saldos existentes y añadir la regla
  correspondiente en `firestore.rules`, por eso no se hizo aquí.
- **Cuatro suscripciones por hijo en `/panel`.** `ChildSection` abre cuatro
  `onSnapshot` (estrellas, progreso, canjes, intentos) y ninguno acota el
  resultado salvo el de intentos. Con varios hijos son 4·N suscripciones
  abiertas. Con el contador agregado y una consulta paginada de canjes
  bajarían a dos.
- **Todo es cliente.** Las nueve rutas son `"use client"` y el SDK de Firebase
  entero viaja al navegador. Es coherente con la autenticación actual (todo
  pasa por la sesión del padre en el navegador), pero si en algún momento se
  emiten tokens desde el servidor, los listados (perfiles, panel) podrían
  renderizarse en servidor y ahorrar el bloque de JS más caro.
- **Sin presupuesto ni medición de rendimiento.** Ya hay CI (lint, tipos,
  compilación y E2E), pero falta Lighthouse o `@next/bundle-analyzer` para que
  una regresión de peso o de tiempos salte sola.

---

## 2. Accesibilidad

Punto de partida: **cero atributos `aria-*` y cero `role` en todo el código**.
Lo corregido cubre sobre todo lo que impedía usar la aplicación; lo pendiente
son mejoras que piden decisiones de producto o redacción de contenido.

### 2.1 Corregido

**Operable con teclado (WCAG 2.1.1 y 2.5.7 — antes, imposible)**

- `NumberLineInput` respondía solo al arrastre: ahora el punto es un
  `role="slider"` enfocable, con flechas, RePág/AvPág e Inicio/Fin, se puede
  tocar cualquier punto de la recta y se confirma con un botón "Responder".
- `GroupTensInput` respondía solo al arrastre: se añaden los botones "A la
  decena" y "A sueltas", que hacen lo mismo, y el reparto se anuncia en una
  región viva.
- `BalanceWeightInput` respondía solo al arrastre: los pesos ahora son
  `<button>`, así que valen clic, toque y teclado.
- `TablaTab` colgaba el `onClick` de un `<td>` (invisible para el teclado y
  para los lectores de pantalla): ahora cada casilla es un botón dentro de una
  tabla con `<thead>`, `<th scope>` y `<caption>`.

**Foco**

- Se quitó `outline-none` de los once campos que lo llevaban —el único
  indicador de foco era un cambio de color de borde— y hay un estilo
  `:focus-visible` global (WCAG 2.4.7).
- Al contestar desaparece el control de respuesta y el foco se perdía: en la
  ronda de práctica y en la pirámide pasa ahora al botón "Siguiente".
- Enlace "Saltar al contenido" en el layout raíz, apuntando al `<main>` de
  cada pantalla (WCAG 2.4.1).

**Nombres, roles y estados**

- Pestañas con el patrón ARIA completo: `tablist` / `tab` / `tabpanel`,
  `aria-selected`, `aria-controls`, tabulador único y navegación con flechas,
  Inicio y Fin.
- Botón de sonido con `aria-label` y `aria-pressed` (antes, solo un emoji y un
  `title`). Selectores de tabla, operación, figura y tema, con `aria-pressed`.
- Contadores de estrellas y racha con texto para lector de pantalla, y emojis
  decorativos marcados `aria-hidden` para que no se lean en medio de una
  frase.
- Campos de respuesta etiquetados con el enunciado (`aria-labelledby`), y el
  PIN de cada perfil dentro de un `<label>` y de un `<form>` de verdad.
- Ilustraciones SVG de los conceptos marcadas `aria-hidden`: repiten lo que ya
  dice en texto la fórmula que tienen justo debajo.

**Información no transmitida solo por color, y anuncios (WCAG 1.4.1 y 4.1.3)**

- En la práctica de multiplicación el acierto y el error se marcaban solo con
  color: ahora hay texto y región viva.
- Correcciones, resultados de ronda, errores de formulario y estados de carga
  usan `role="status"` o `role="alert"`.
- Barras de avance con `role="progressbar"` y `aria-valuetext`.

**Contraste (WCAG 1.4.3)**

- `text-neutral-400` (2,5:1), `text-slate-400`, `text-slate-300` y
  `text-purple-400` sobre blanco no llegaban al mínimo de 4,5:1; se subieron a
  los tonos 600/700 en toda la aplicación, igual que los estados
  `text-amber-500`, `text-green-600` y `text-emerald-600` sobre fondo claro.

**Movimiento (WCAG 2.3.3)**

- Regla global `prefers-reduced-motion: reduce` que neutraliza animaciones y
  transiciones, y confeti desactivado bajo esa preferencia.

**Títulos de página (anunciador de rutas de Next)**

- Todas las pantallas se anunciaban como "Numerario". Ahora cada ruta tiene el
  suyo (`Entrar`, `Panel de padre`, `Pirámide numérica`, el hilo y el tema
  correspondientes) mediante `layout.tsx` con `metadata` o `generateMetadata`,
  con la plantilla `%s · Numerario` en el layout raíz.

**Tema oscuro roto**

- `globals.css` invertía el fondo del `body` con `prefers-color-scheme: dark`,
  pero todas las pantallas pintan tarjetas `bg-white`: el texto que heredaba
  color quedaba casi blanco sobre blanco. Se declara `color-scheme: light` y
  se elimina esa inversión a medias.

### 2.2 Pendiente

- **Límite de tiempo del juego "Cohete" (WCAG 2.2.1).** Son 30 segundos sin
  posibilidad de ampliar, pausar ni desactivar el cronómetro, y fallar
  descuenta 3 s. Hace falta una decisión de producto: un modo "sin reloj" o
  una duración ajustable por perfil.
- **Alternativas textuales de las ilustraciones.** Los SVG están ocultos a los
  lectores porque duplican la fórmula; una descripción propia por figura
  ("triángulo de base 6 y altura 4") sería mejor, pero hay que redactarlas.
- **Tema oscuro de verdad**, con tokens de color para superficies y texto en
  lugar de `bg-white` incrustado en cada pantalla.
- **Zonas táctiles (WCAG 2.5.8).** Varias fichas y casillas rondan los 24–36
  px; conviene revisarlas contra el mínimo de 24×24 px reales y sus
  separaciones.
- ~~Sin pruebas automáticas de accesibilidad.~~ **Hecho**: hay pruebas de
  extremo a extremo con Playwright, con análisis de axe-core en todas las
  pantallas, y CI que las ejecuta. Ver `docs/evaluacion-interfaz.md`.

---

## 3. Otros hallazgos

### 3.1 Corregido

- **La partida del Cohete podía terminar dos veces.** `endGame()` (sonido,
  confeti y cambio de fase) se llamaba *dentro del actualizador* de
  `setTimer`, una función que React puede reejecutar; en modo estricto se
  ejecutaba dos veces. El reloj pasa a un efecto atado a la fase y el fin de
  partida ocurre en el callback del intervalo. Afectaba a los dos juegos de
  cohete, el genérico y el de multiplicación.
- **El "día" se calculaba en UTC.** `todayKey()` usaba `toISOString()`, así
  que jugando de tarde-noche al oeste de Greenwich dos sesiones del mismo día
  caían en días UTC distintos y la regla de maestría "en al menos 2 días
  distintos" se podía cumplir en una sola sentada. Ahora usa el día calendario
  local.

### 3.2 Pendiente

- **El PIN es un control blando.** `hashPin` es SHA-256 sin sal y la
  comparación ocurre en el cliente, con el hash a la vista; con 4 dígitos son
  10 000 combinaciones. Como ya explica `firestore.rules`, mientras el niño
  entre dentro de la sesión del padre esto es un "cambio de perfil" y no una
  frontera de seguridad. Si alguna vez debe serlo, hace falta un token
  personalizado emitido desde una Cloud Function.
- **La compilación falla sin variables de entorno.** `src/lib/firebase.ts`
  llama a `getAuth()` al evaluar el módulo, y el prerenderizado de `/` revienta
  con `auth/invalid-api-key` si no hay `.env.local`. Inicializar de forma
  perezosa —o no prerenderizar esas rutas— haría el build reproducible sin
  credenciales; de momento CI le pasa valores de relleno.
- **Sin `error.tsx` ni `not-found.tsx`.** Cualquier fallo de Firestore deja la
  pantalla en blanco, y varias promesas (`getDoc(...).then(...)`) no tienen
  `catch`.
- **`audit-pools.mjs` no se puede ejecutar tal cual**: importa un `.ts` desde
  Node sin cargador.
- **Sin pruebas unitarias.** Los recorridos ya están cubiertos de extremo a
  extremo, pero la lógica pura (`mastery`, `economy`, `problem`, `pyramid`)
  sigue sin pruebas propias, que son más rápidas y precisas para sus casos
  límite.

---

## 4. Cómo verificar

```bash
npm ci
npm run lint    # sin errores
npm run build   # necesita las NEXT_PUBLIC_FIREBASE_* (ver .env.local.example)
```

Comprobaciones manuales recomendadas: recorrer una pantalla de tema entera
solo con el teclado (Tab, flechas, Enter), activar "reducir movimiento" en el
sistema y confirmar que no hay confeti ni rebotes, y pasar un lector de
pantalla por la ronda de práctica.
