# Plan de minijuegos retro educativos — Fases 36-41

## 0. Dónde va este documento

Documento nuevo, continuando la numeración global de fases desde la **Fase 36** (`docs/plan-jugabilidad.md` cierra en la Fase 35 con su propio "Resumen ejecutivo" — es el registro de una campaña ya cerrada, no un contenedor abierto). Mismo criterio que ya usó `plan-jugabilidad.md §0` para separarse de `plan-salto-producto.md`: el alcance de acá (6 minijuegos arcade + infraestructura compartida nueva) es comparable en tamaño a una campaña completa, y merece su propio documento citable.

**Políticas heredadas (se respetan sin excepción, mismas que `plan-jugabilidad.md §0`):**

- **P1** — Ninguna fase re-bloquea contenido ya dominado.
- **P2** — Campos nuevos siempre opcionales, cero migraciones.
- **P3** — Acceso a Firestore con firma `(firestoreFns, db, …)`.
- **P4** — Cero dependencias nuevas. Nada de acá necesita una librería de animación, de audio ni de físicas: todo se construye con DOM/CSS/Tailwind + `requestAnimationFrame`, igual que el resto del runtime del Mundo (`RuntimeCanvas.tsx` tampoco usa `<canvas>`).
- **P5** — Ningún minijuego inventa contenido académico: el generador de cada `ModuleDef` (`mod.generateProblem()`) sigue siendo la única fuente de problemas.

## 1. Diagnóstico

Math Quest ya tiene, desde la **Fase 33** (`docs/plan-jugabilidad.md §7`), el punto de extensión exacto que un minijuego arcade necesita: `ChallengePlacement.activityId` + un registro (`src/lib/level/activities/registry.ts`) + un despachador único (`LevelActivityOverlay.tsx`). `"cohete"` (`CoheteGeneric.tsx` + `LevelCoheteOverlay.tsx`) demuestra el patrón completo: un componente de juego propio que reporta cada respuesta a `recordModuleAttempt` (el mismo pipeline de progreso/mastery/estrellas que la ficha normal) y guarda su mejor marca vía `records.ts` (Fase 35, ya genérico por `activityId`). Ni `firestore.rules` ni `ChallengePicker.tsx` (editor de niveles) necesitan cambios: ambos ya son genéricos sobre el registro.

## 2. Infraestructura compartida (Fase 36)

Construida una vez, reutilizable por los 6 minijuegos:

- **`src/lib/problem.ts`** — `choiceSet(answer, spread, count = 3)` generalizado (antes fijo a 3 distractores). El default preserva byte a byte todo llamador existente.
- **`src/lib/minigames/useGameLoop.ts`** — envuelve `requestAnimationFrame` con acumulador de delta-time; se pausa si `document.hidden` (evita saltos de física al volver de una pestaña en background).
- **`src/lib/minigames/useArrowKeys.ts`** — entrada de teclado (flechas + WASD + espacio) edge-triggered (`e.repeat` descarta la auto-repetición del SO; el ritmo de movimiento lo decide `useGameLoop`, no el teclado). Deliberadamente NO reutiliza `useKeyboardMovement.ts` (atado al pathfinding del mundo abierto — `walkTo`/`nearestWalkablePoint` — sin sentido para una grilla propia).
- **`src/lib/minigames/difficultyCurve.ts`** — `waveIndex(correctCount, perWave)` + `scaleWithWave(base, step, wave, max)`, aritmética pura para "cada N aciertos, sube la velocidad/cantidad de distractores, con techo". Cada juego es dueño de sus propias constantes.
- **`src/components/level/runtime/PrerequisiteGate.tsx`** — extrae el panel "el sistema no te reconoce todavía" (antes duplicado entre `PuzzleOverlay.tsx` y `LevelCoheteOverlay.tsx`) para que los minijuegos nuevos no lo vuelvan a duplicar. Alcance: overlays "con forma de cohete" (Cohete + minijuegos arcade), no `PuzzleOverlay` (theming propio, compartida con la escena legacy). `LevelCoheteOverlay.tsx` se refactorizó para usarlo.
- **`TouchDPad.tsx`** (`src/components/level/runtime/`) se reutiliza sin cambios — ya es genérico (`onMove(dx, dy)`, sin pathfinding).

Qué NO se comparte (criterio: solo abstraer si se repite igual en 3+ juegos): colisiones específicas (grilla de Snake/Pac-Man vs. física de Breakout vs. carriles de Frogger son algorítmicamente distintas), la lógica de puntaje/vidas de cada juego, el guardado de progreso (ya vive en `attemptRecorder.ts`/`records.ts`, no se toca).

## 3. Fase 36 — Math Snake (completa)

Primer minijuego, elegido por ser el de mecánica más simple y más parecida al patrón de "cohete" (una entrada discreta por evento, sin física continua ni múltiples entidades autónomas).

- **`activityId: "snake"`.**
- **`src/components/topic/SnakeGeneric.tsx`** — mismo contrato que `CoheteGeneric`: `{ moduleId, soundOn, onAnswer, onWin?, bestScore?, onGameOver? }`. Grilla 8×8; `choiceSet(problem.answer, spread, count)` reparte números en celdas libres; `useGameLoop` avanza la serpiente cada `tickMs` (empieza en 450ms, baja hasta un piso de 180ms vía `scaleWithWave`); `useArrowKeys` + `TouchDPad` para dirección.
  - Comer la celda correcta → `onAnswer(true)`, la serpiente crece, ronda nueva.
  - Comer una celda incorrecta → `onAnswer(false)`, la serpiente **no crece** pero la partida sigue — la única "blandura" respecto al género clásico.
  - Chocar contra el borde o su propio cuerpo → fin de partida sin resolver (igual criterio que el Cohete agotando el tiempo).
  - Meta: **5 respuestas correctas** sin chocar (más bajo que el `GOAL=8` del Cohete — acá cada acierto exige navegar la grilla, no solo tipear, así que una partida más corta se siente mejor).
  - Respeta `prefersReducedMotion()`: sin esa preferencia, transición CSS suave entre celdas; con ella, saltos discretos.
- **`src/components/level/runtime/LevelSnakeOverlay.tsx`** — calco de `LevelCoheteOverlay.tsx` usando `PrerequisiteGate`: gate de prerrequisitos, `isSandbox = Boolean(recordAttempt)`, marca personal vía `records.ts` (`activityId: "snake"`), `onAnswer` adapta a `recordModuleAttempt`, `onWin` dispara `onResolved` una sola vez.
- **`ACTIVITIES`** (`registry.ts`) gana `{ id: "snake", label: "Serpiente numérica", hint: "..." }`.
- **`LevelActivityOverlay.tsx`** gana una rama `if (placement.activityId === "snake")`. Con solo dos actividades arcade contempladas hasta ahora (cohete + snake), se mantiene el if-chain existente; la tabla de despacho (`Record<string, ComponentType>`) queda para cuando haya 3+ minijuegos y el archivo lo pida.

**Archivos creados:** `src/lib/minigames/{useGameLoop,useArrowKeys,difficultyCurve}.ts` (+ `.test.ts` cada uno), `src/components/level/runtime/PrerequisiteGate.tsx` (+ `.test.tsx`), `src/components/topic/SnakeGeneric.tsx` (+ `.test.tsx`), `src/components/level/runtime/LevelSnakeOverlay.tsx`, `src/lib/problem.test.ts`, `e2e/fase36-minijuegos-retro.spec.ts`.
**Archivos modificados:** `src/lib/problem.ts` (`choiceSet` generalizado), `src/components/level/runtime/LevelCoheteOverlay.tsx` (usa `PrerequisiteGate`), `src/lib/level/activities/registry.ts`, `src/components/level/runtime/LevelActivityOverlay.tsx` (+ `.test.tsx`).

**Criterio de aceptación (cumplido):** todo `LevelDefinition` existente con `activityId: "puzzle"`/`"cohete"` sigue renderizando exactamente igual (regresión en `LevelActivityOverlay.test.tsx`); `"snake"` despacha a `SnakeGeneric`; con `recordAttempt` override (Play Test/sandbox), ninguna partida de Snake escribe Firestore real; ganar/perder/comer-incorrecto están probados de forma determinística en `SnakeGeneric.test.tsx` (grilla controlada vía mocks de `shuffle`/`choiceSet`, sin depender de aleatoriedad real).

## 4. Fase 37 — Math Frogger (completa)

Introduce el patrón "vidas + penalización sin derrota instantánea", que las fases 38-41 reutilizan. A diferencia de Snake, el movimiento del jugador es **inmediato por tecla** (no atado a `useGameLoop`, que acá solo mueve el obstáculo) — más fiel al género y más simple de testear, ya que no depende de un ritmo de tick para desplazarse.

- **`activityId: "frogger"`.**
- **`src/components/topic/FroggerGeneric.tsx`** — el jugador avanza fila por fila hacia arriba desde una fila de partida segura. Las filas impares son un carril con un obstáculo que rebota solo entre `COLS=5` columnas (`useGameLoop`, velocidad `scaleWithWave`); las pares (excepto la de partida) son un estanque con `COLS` nenúfares, uno de ellos con el resultado correcto (`choiceSet(problem.answer, spread, COLS)`, un valor por columna).
  - Pisar el nenúfar correcto → `onAnswer(true)`, avanza y arma una pregunta nueva para el siguiente estanque.
  - Pisar uno incorrecto → `onAnswer(false)`, **retrocede al carril-obstáculo recién cruzado** (nunca termina la partida) y arma una pregunta nueva para reintentar — sin costar una vida.
  - Chocar contra el obstáculo (evento arcade, no matemático — no llama `onAnswer`) cuesta una vida y retrocede a la fila segura; a 0 vidas, fin de partida sin resolver.
  - Meta: cruzar **3 estanques** (`GOAL=3`) para ganar.
- **`src/components/level/runtime/LevelFroggerOverlay.tsx`** — calco de `LevelSnakeOverlay.tsx` (gate de prerrequisitos vía `PrerequisiteGate`, marca personal por `activityId: "frogger"`, `onAnswer`/`onWin` adaptados a `recordModuleAttempt`).
- **`ACTIVITIES`** gana `{ id: "frogger", label: "Estanque de operaciones", ... }`; `LevelActivityOverlay.tsx` gana la rama correspondiente (if-chain, todavía sin tabla de despacho — 3 actividades especiales no ameritan el cambio aún).

**Archivos creados:** `src/components/topic/FroggerGeneric.tsx` (+ `.test.tsx`), `src/components/level/runtime/LevelFroggerOverlay.tsx`, `e2e/fase37-minijuegos-retro.spec.ts`.
**Archivos modificados:** `src/lib/level/activities/registry.ts`, `src/components/level/runtime/LevelActivityOverlay.tsx` (+ `.test.tsx`).

**Nota de testing:** el listener de `useArrowKeys` cambia estado de React (fila/columna), a diferencia de Snake (que solo muta un ref) — un test que despacha `keydown` directo sobre `window` necesita envolverlo en un `act()` **asíncrono** para que el efecto sin dependencias de `useGameLoop` (que sincroniza `onTickRef.current`) alcance a vaciarse antes de que el siguiente tick del bucle de juego lea el estado. Con timers falsos, además, cada llamada a `vi.advanceTimersByTimeAsync` dispara un solo frame de `requestAnimationFrame` — para simular varios ticks hace falta una serie de llamadas separadas, no un único salto grande de tiempo.

**Criterio de aceptación (cumplido):** un nenúfar incorrecto retrocede sin terminar la partida ni tocar las vidas; chocar contra el obstáculo cuesta una vida sin terminar la partida; agotar las vidas termina sin ganar; cruzar los 3 estanques llama a `onWin`/`onGameOver` con los aciertos correctos — los 5 casos probados de forma determinística en `FroggerGeneric.test.tsx`.

## 5. Fase 38 — Equation Runner (completa)

Primer minijuego de la serie con avance **automático y continuo**: `useGameLoop` ya no mueve solo un obstáculo decorativo (Frogger) sino la propia cuenta regresiva del juego — el jugador nunca detiene el avance, solo elige el carril.

- **`activityId: "runner"`.**
- **`src/components/topic/RunnerGeneric.tsx`** — `LANES=3` carriles horizontales; cada uno muestra, por adelantado, un candidato de `choiceSet(problem.answer, spread, LANES)` para la próxima "puerta". Una cuenta regresiva (`GATE_TIME_BASE_MS=2500`, bajando con `scaleWithWave` hasta un piso de 900ms) determina cuándo se cruza la puerta con el carril donde esté parado el jugador.
  - Cruzar en el carril correcto → `onAnswer(true)`, avanza de ronda (nueva pregunta + nueva cuenta regresiva, más rápida).
  - Cruzar en uno incorrecto → `onAnswer(false)` y **cuesta una vida directamente** (a diferencia de Frogger, acá no hay "retroceso" posible en un avance forzado) — pero nunca termina la partida de inmediato, solo agotar las vidas lo hace.
  - Meta: cruzar **3 puertas** (`GOAL=3`) para ganar.
- **`src/components/level/runtime/LevelRunnerOverlay.tsx`** — calco de `LevelFroggerOverlay.tsx`.
- **`ACTIVITIES`** gana `{ id: "runner", label: "Autopista de resultados", ... }`. Con 4 actividades arcade ya en la tabla (cohete/snake/frogger/runner), `LevelActivityOverlay.tsx` se refactorizó de un if-chain a un `Record<string, ComponentType<ArcadeOverlayProps>>` (`ARCADE_OVERLAYS`) — mismo criterio de "un solo lugar de despacho, sin switch disperso" que ya regía el if-chain, solo cambia el mecanismo de lookup. "puzzle" sigue fuera de la tabla (forma de props distinta: `rules`/`onWaived`).

**Archivos creados:** `src/components/topic/RunnerGeneric.tsx` (+ `.test.tsx`), `src/components/level/runtime/LevelRunnerOverlay.tsx`, `e2e/fase38-minijuegos-retro.spec.ts`.
**Archivos modificados:** `src/lib/level/activities/registry.ts`, `src/components/level/runtime/LevelActivityOverlay.tsx` (refactor a tabla de despacho, + `.test.tsx`).

**Lección de arquitectura (documentada para las fases 39-41):** el contador de la cuenta regresiva **no puede vivir en `useState`** si se decrementa en cada tick del bucle de juego. `requestAnimationFrame` bajo timers falsos (y, en menor medida, en un navegador real bajo carga) puede disparar varios ticks antes de que React vuelva a renderizar y refresque el cierre de `onTick` — si la resta se hace sobre el valor de estado, cada tick de esa tanda resta desde el MISMO valor de partida en vez de acumular, y la cuenta casi no avanza. La solución (ya aplicada en `SnakeGeneric`/`FroggerGeneric` para sus propios acumuladores) es un `useRef` como autoridad real, con el `useState` equivalente actualizado solo para pintar la UI. **Corolario de testing:** un test con timers falsos que usa `waitFor` se cuelga (su sondeo interno depende de un `setTimeout` que también está falseado y nunca avanza solo) — bajo `vi.useFakeTimers()`, afirmar directamente después de los `act()` de avance, nunca con `waitFor`.

**Criterio de aceptación (cumplido):** cruzar en el carril correcto avanza sin perder vidas; cruzar en uno incorrecto cuesta una vida sin terminar la partida; agotar las vidas termina sin ganar; cruzar las 3 puertas llama a `onWin`/`onGameOver` con los aciertos correctos — los 5 casos probados de forma determinística en `RunnerGeneric.test.tsx`.

## 6. Fase 39 — Number Pac (completa)

Primer minijuego con una entidad autónoma además del jugador (un fantasma). **Simplificación deliberada de v1**, ya anotada antes de implementar y confirmada durante la implementación: un único fantasma (no 1-3) cuya velocidad escala con la dificultad en vez de su cantidad — menos piezas moviéndose a la vez es más fácil de razonar, de jugar en pantallas chicas, y sobre todo de probar de forma determinística. También se mantiene la simplificación ya prevista: un único `answer` correcto por ronda, no "varios pellets correctos a la vez" (extender `Problem` con múltiples respuestas válidas es una fase propia, análoga a "pirámide" en la Fase 33 de `plan-jugabilidad.md`).

- **`activityId: "pacman"`.** Nombre de producto "Number Pac" (evita el nombre de la franquicia en el copy visible: título en pantalla "Laberinto de números").
- **`src/components/topic/NumberPacGeneric.tsx`** — grilla 5×5; el jugador se mueve por tick (persiste dirección, igual que Snake) y el fantasma se mueve por su propio tick, **más lento y confinado a rebotar en un solo eje** (mismo criterio que el obstáculo de Frogger, Fase 37: un patrón simple y predecible es más justo para un niño que una IA de persecución, y no exige física nueva).
  - Comer el pellet correcto → `onAnswer(true)`, ronda nueva.
  - Comer uno incorrecto → `onAnswer(false)` y **cuesta una vida** (a diferencia de Snake, que no tiene ninguna penalización más allá de no crecer — acá no hay cuerpo que crezca, así que la vida es la única consecuencia posible).
  - Tocar al fantasma sin invulnerabilidad activa cuesta una vida y reaparece al jugador en la celda de partida (respiro).
  - **Power-up**: una celda especial (⭐) además de los pellets numéricos, que otorga invulnerabilidad temporal (4s) — cumple el pedido explícito de "incluir power-ups" sin tocar el cálculo de la respuesta (es puramente cosmético/de supervivencia).
  - Meta: **3 pellets correctos** (`GOAL=3`) para ganar.
- **`src/components/level/runtime/LevelNumberPacOverlay.tsx`** — calco de `LevelRunnerOverlay.tsx`.
- **`ACTIVITIES`** gana `{ id: "pacman", label: "Laberinto de números", ... }`; `ARCADE_OVERLAYS` gana la entrada correspondiente.

**Archivos creados:** `src/components/topic/NumberPacGeneric.tsx` (+ `.test.tsx`), `src/components/level/runtime/LevelNumberPacOverlay.tsx`, `e2e/fase39-minijuegos-retro.spec.ts`.
**Archivos modificados:** `src/lib/level/activities/registry.ts`, `src/components/level/runtime/LevelActivityOverlay.tsx` (+ `.test.tsx`).

**Lección de testing (documentada para las fases 40-41):** con dos entidades tickeando a ritmos distintos (jugador y fantasma), **no es viable calcular a mano cuántos ticks de cada una caben en una ventana de tiempo fija** — a diferencia de Frogger/Runner (una sola cadencia relevante), acá una ventana "generosa" puede terminar acumulando más eventos de los que el test esperaba (de hecho, el primer intento de este test perdía 2-3 vidas en vez de 1). La solución fue una función `advanceUntil(predicate)` que avanza en pasos chicos y corta apenas se cumple la condición que el test quiere observar, en vez de adivinar una duración fija — patrón a reutilizar en cualquier fase futura con más de una entidad autónoma (Invaders: enemigos + proyectiles; Breakout: pelota + paleta).

**Criterio de aceptación (cumplido):** un pellet incorrecto cuesta exactamente una vida sin terminar la partida; chocar contra el fantasma cuesta una vida sin terminar la partida; agotar las vidas termina sin ganar; acertar los 3 pellets llama a `onWin`/`onGameOver` con los aciertos correctos — los 5 casos probados de forma determinística en `NumberPacGeneric.test.tsx`, estables en corridas repetidas.

## 7. Fase 40 — Math Invaders (completa)

Primer minijuego con disparo. **Simplificación deliberada** respecto al diseño original: la oleada entera desciende como una sola formación (una fila de `COLS=5` candidatos con una posición vertical compartida), no enemigos independientes con física de proyectil real — disparar resuelve la columna al instante. Cero proyectiles/enemigos independientes que sincronizar, cero física nueva, y sigue entregando "disparar al resultado correcto antes de que aterrice" tal como lo pidió el producto.

- **`activityId: "invaders"`.**
- **`src/components/topic/InvadersGeneric.tsx`** — `useGameLoop` mueve solo la posición vertical de la formación (`waveRow`, con `waveTickMs` bajando de 900ms a un piso de 400ms vía `scaleWithWave`); el jugador mueve la nave (`shipCol`) y dispara en cualquier momento (tecla `Space`/botón), sin esperar ningún tick.
  - Disparar la columna correcta → `onAnswer(true)`, gana la oleada.
  - Disparar una incorrecta → `onAnswer(false)` y cuesta una vida.
  - Dejar que la formación llegue abajo (`waveRow` alcanza `ROWS-1`) sin disparar la correcta → **también** cuenta como fallo (mismo `onAnswer(false)` + vida) — así ignorar la pregunta no es gratis.
  - Meta: **3 oleadas correctas** (`GOAL=3`) para ganar.
- **`src/components/level/runtime/HorizontalPad.tsx`** (nuevo, infra planificada desde la Fase 36) — control táctil de un solo eje (izquierda/derecha) + botón de acción opcional, para naves/paletas que no necesitan las 4 direcciones de `TouchDPad`. Segundo y último consumidor previsto: Math Breakout (Fase 41).
- **`src/components/level/runtime/LevelInvadersOverlay.tsx`** — calco de `LevelNumberPacOverlay.tsx`.
- **`ACTIVITIES`**/`ARCADE_OVERLAYS` ganan `"invaders"`.

**Archivos creados:** `src/components/level/runtime/HorizontalPad.tsx`, `src/components/topic/InvadersGeneric.tsx` (+ `.test.tsx`), `src/components/level/runtime/LevelInvadersOverlay.tsx`, `e2e/fase40-minijuegos-retro.spec.ts`.
**Archivos modificados:** `src/lib/level/activities/registry.ts`, `src/components/level/runtime/LevelActivityOverlay.tsx` (+ `.test.tsx`).

**Nota de testing:** a diferencia de toda la serie anterior, disparar es inmediato (no está atado a `useGameLoop`) — la mayoría de los tests no necesita timers falsos en absoluto, solo el caso "la formación llega abajo sin disparar" (que sí depende del descenso por tick, probado con la misma técnica de cortar apenas se cumple la condición esperada, en vez de una ventana fija). Un detalle de jsdom: los dos botones de disparo (el de escritorio y el del `HorizontalPad` táctil) están ambos presentes en el DOM a la vez en un test — jsdom no aplica el CSS responsive (`hidden`/`lg:block`) que en un navegador real oculta uno — así que hay que apuntar al texto exacto de uno de los dos, no a una coincidencia parcial que matchee ambos.

**Criterio de aceptación (cumplido):** disparar correcto avanza sin perder vidas; disparar incorrecto cuesta una vida sin terminar la partida; dejar llegar la formación abajo también cuenta como fallo; agotar las vidas termina sin ganar; repeler las 3 oleadas llama a `onWin`/`onGameOver` con los aciertos correctos — los 6 casos probados de forma determinística en `InvadersGeneric.test.tsx`, estables en corridas repetidas.

## 8. Fase 41 — Math Breakout (completa)

Última fase del plan: el único minijuego con física continua real (posición/velocidad en punto flotante, no grilla ni carriles) — la mecánica más alejada de todo lo que existía en el repo antes de esta serie, por eso quedó para el final.

- **`activityId: "breakout"`.**
- **`src/components/topic/breakoutPhysics.ts`** (nuevo, + `.test.ts`) — la colisión en sí (`stepBall`, `hitsPaddle`, `findHitBlock`, `rectsOverlap`) extraída como funciones puras, probadas con números de entrada/salida hechos a mano, **sin** `useGameLoop` ni timers falsos. Separarla fue clave: es la parte más sensible a errores de signo/límite, y la más fácil de blindar sin pelear con temporización simulada.
- **`src/components/topic/BreakoutGeneric.tsx`** — grilla 2×4 de bloques (`choiceSet(problem.answer, spread, 8)`); pelota y paleta arrancan alineadas en la misma columna con velocidad horizontal cero (`vx=0`, nunca cambia — simplificación deliberada: sin ángulo de "puntería" al pegarle con un borde de la paleta, un rebote predecible es más justo para un niño que uno con física de ángulo real, y da una trayectoria determinística también útil para testear).
  - Romper el bloque correcto → `onAnswer(true)`, arma una grilla nueva.
  - Romper uno incorrecto → `onAnswer(false)`, ese bloque desaparece igual (fidelidad del género) pero **sin penalización** — a diferencia de los otros 4 minijuegos con "vidas", acá un bloque incorrecto no cuesta nada.
  - Dejar caer la pelota detrás de la paleta (evento arcade, no matemático — no llama a `onAnswer`) es la única forma de perder una vida.
  - El ancho de la paleta nunca se reduce con la dificultad (por accesibilidad, decisión ya anotada antes de implementar); solo sube la velocidad de la pelota.
  - Meta: **3 bloques correctos** (`GOAL=3`) para ganar.
- **Rendimiento**: la posición de la pelota vive en un `useRef` y se pinta con una actualización imperativa del DOM (`ballElRef.current.style.left/top`), **nunca** vía `setState` — la mitigación de rendimiento que el plan ya anticipaba (§9.1) para la entidad más "caliente" de toda la serie (cambia cada cuadro, no cada tick discreto como en los demás juegos). Bloques y paleta sí son estado de React normal: cambian con tan poca frecuencia (un bloque roto, una tecla) que no repiten el bug de la Fase 38.
- **`src/components/level/runtime/LevelBreakoutOverlay.tsx`** — calco de `LevelInvadersOverlay.tsx`.
- **`ACTIVITIES`**/`ARCADE_OVERLAYS` ganan `"breakout"` — cierra la serie de 6 minijuegos.

**Archivos creados:** `src/components/topic/breakoutPhysics.ts` (+ `.test.ts`), `src/components/topic/BreakoutGeneric.tsx` (+ `.test.tsx`), `src/components/level/runtime/LevelBreakoutOverlay.tsx`, `e2e/fase41-minijuegos-retro.spec.ts`.
**Archivos modificados:** `src/lib/level/activities/registry.ts`, `src/components/level/runtime/LevelActivityOverlay.tsx` (+ `.test.tsx`).

**Criterio de aceptación (cumplido):** romper el bloque correcto avanza sin perder vidas; romper uno incorrecto no cuesta nada ni termina la partida; dejar caer la pelota cuesta una vida sin terminar la partida; agotar las vidas termina sin ganar; romper 3 bloques correctos llama a `onWin`/`onGameOver` con los aciertos correctos — los 6 casos de `BreakoutGeneric.test.tsx` (con `advanceUntil`, no ventanas fijas) más las 15 pruebas puras de `breakoutPhysics.test.ts`, todo estable en corridas repetidas.

## 9. Riesgos transversales

1. **Rendimiento.** Juegos con muchas entidades en movimiento simultáneo (Pac-Man, Invaders, Breakout) no deben promover cada posición a `useState` — usar `useRef` + actualización imperativa de `style.transform` para las entidades "calientes" (balas, fantasmas, pelota), reservando `useState` para eventos discretos (puntaje, vidas, fin de ronda). Techo duro de entidades simultáneas por juego para no depender de que la optimización sea perfecta.
2. **Accesibilidad de un juego de reflejos.** Vidas en vez de derrota instantánea en Frogger/Runner/Pac-Man/Invaders (Snake es la excepción deliberada, ver §3; Breakout tiene su propia variante: un bloque incorrecto no cuesta nada, solo dejar caer la pelota cuesta una vida); todo control por teclado tiene equivalente táctil (`TouchDPad` para grilla/carriles, `HorizontalPad` para un solo eje — Invaders y Breakout); ninguna mecánica exige simultaneidad de teclas con timing de milisegundos.
3. **`prefers-reduced-motion`.** `triggerConfetti` ya lo respeta; el movimiento propio de cada juego debe consultar `prefersReducedMotion()` (`src/lib/motion.ts`) y sustituir transiciones CSS suaves por saltos discretos cuando está activo (la lógica del juego no se desactiva, solo el "tween" visual).
4. **Mobile.** Cada tablero se define en unidades relativas (`aspect-square`/`aspect-video`, `max-w-*`), igual criterio que el resto del runtime; validar manualmente en ~360px de ancho.
5. **Riesgo de marca.** "Pac-Man"/"Invaders"/"Breakout"/"Frogger" son términos de género muy asociados a franquicias registradas — los `activityId` internos no son visibles al usuario, pero el copy de cara al jugador (labels, títulos dentro del componente) debe usar nombres descriptivos propios en vez del nombre de la franquicia.

## 10. Plan de verificación (aplicado en las 6 fases)

Por minijuego: (a) test de componente que ganar llama `onWin` una sola vez con las estrellas correctas; (b) un fallo no termina la partida (excepto el caso deliberado de Snake, donde chocar sí la termina); (c) con `recordAttempt` override inyectado, ninguna escritura real a Firestore (probado también a nivel de despacho en `LevelActivityOverlay.test.tsx`, una vez por `activityId`); (d) un `e2e/fase3N-minijuegos-retro.spec.ts` por fase, con un recorrido real (sin apuntar a ganar, solo a que el cableado no rompa) contra los emuladores — sin poder correrse en este entorno de desarrollo puntual por un problema preexistente de arranque de emuladores en Windows, no relacionado con el código de esta serie.

## 11. Resumen ejecutivo

Los 6 minijuegos arcade quedaron implementados como actividades más del `ChallengePlacement` existente (Fase 33), sin tocar Firebase, autenticación, progreso ni economía de estrellas — cada uno reporta por el mismo `recordModuleAttempt` que ya usa la ficha normal, y cada partida es, en los hechos, una forma más vistosa de responder preguntas del `ModuleDef` real del módulo. **Fase 36** sentó la infraestructura compartida (`useGameLoop`, `useArrowKeys`, `difficultyCurve`, `PrerequisiteGate`) y el primer juego (Snake); **37-40** repitieron el patrón con complejidad creciente (vidas sin derrota instantánea en Frogger, avance automático continuo en Runner, una entidad autónoma en Number Pac, disparo en Invaders); **41** cerró con el único juego de física continua real, aislando esa física en funciones puras (`breakoutPhysics.ts`) para poder probarla sin pelear con temporización simulada.

**Dos lecciones de arquitectura, verificadas en más de un juego, quedan quizás como el activo más reutilizable de esta serie para trabajo futuro similar:** (1) cualquier contador que se decremente en cada tick de `useGameLoop` tiene que vivir en un `useRef`, nunca en `useState` — un `requestAnimationFrame` puede disparar varios ticks antes de que React vuelva a renderizar, y una resta hecha sobre estado recalcula siempre desde el mismo valor de partida en vez de acumular (encontrado y corregido en la Fase 38, aplicado preventivamente desde la 39 en adelante); (2) con más de una entidad moviéndose sola (Fase 39 en adelante), no es viable calcular a mano cuánto tiempo hace falta para un evento — `advanceUntil(predicate)` (avanzar en pasos chicos y cortar apenas se cumple la condición) reemplazó a las ventanas de tiempo fijas en todos los tests que lo necesitaron, sin un solo caso de comportamiento intermitente en corridas repetidas.
