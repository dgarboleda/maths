# Plan técnico — Ciudad Central a escena 2.5D viva

> **Nota de autoría y alcance.** Este documento es una **especificación de planificación**, no una entrega de código. Fue redactado por Sonnet 5 tras inspeccionar el repositorio real (código fuente, no solo `docs/level-editor-plan.md`) tal como está después de las Fases 1-10 del Level Editor (commit `976a5c0`, "Level Editor Fase 10: integración académica"). Cita archivo:línea siempre que fue posible verificarlo en el código; donde el código no fue leído línea por línea se indica explícitamente. Es la base para que un modelo de ejecución (Sonnet 5, en una sesión de implementación futura) construya esta fase paso a paso, en el orden indicado en la §N.

---

## Resumen ejecutivo y decisión arquitectónica central

**Hallazgo que condiciona todo el plan:** la Ciudad Central que juegan los niños hoy (`src/components/world/QuestScene.tsx` + `src/lib/world/questScene.ts`) es un sistema **totalmente independiente** del Level Editor. El Level Editor (Fases 1-10, ya en producción) tiene su propio runtime (`src/components/level/runtime/LevelRuntime.tsx`) que sí es dirigido por datos (`LevelDefinition` en Firestore) y sí reutiliza `useCameraBox`, `Avatar`, `PuzzleOverlay`, `WorldDialog` — pero **Ciudad Central no pasa por ahí**. Existe un adaptador de solo-test (`src/lib/level/legacy/ciudadCentral.ts`) que demuestra que el `LevelDefinition` puede expresar Ciudad Central sin perder geometría, pero el propio código lo marca explícitamente como *"nunca para producción"* (`ciudadCentral.ts:12-27`), y el plan original dejó su activación como **"Fase 14 — OPCIONAL, no comprometida"** (`docs/level-editor-plan.md:1449-1450`).

Esto importa porque el encargo pide explícitamente: *"quiero que un diseñador pueda configurar una escena 2.5D desde el editor existente, en lugar de tener posiciones y propiedades hardcodeadas en componentes React"* y *"el editor de niveles debe ser la fuente de configuración de la escena"*. Esos dos requisitos, tomados en serio, tienen una sola lectura técnica: **la profundidad/parallax/escala 2.5D se implementa una sola vez, dentro del modelo de datos y del runtime del Level Editor** (porque ahí es donde "configurar desde el editor" es literalmente cierto) — **y Ciudad Central tiene que empezar a jugarse a través de ese mismo runtime** para que el objetivo del encargo ("evolucionar el HUB actual") se cumpla de verdad, en vez de construir la escena 2.5D en un sistema nuevo que el jugador real nunca ve.

La alternativa — añadir profundidad/parallax directamente a `QuestScene.tsx` sin tocar el Level Editor — violaría dos restricciones explícitas del encargo a la vez: *"no crear un segundo editor"* / *"no duplicar sistemas"* (se estaría construyendo un segundo motor de profundidad, uno hardcodeado en `QuestScene` y otro en el Level Editor, para el mismo problema) y *"aprovechar al máximo el editor de niveles existente"*.

**Por tanto, este plan recomienda formalmente activar la Fase 14 del plan original** (migrar Ciudad Central para que se juegue a través de `LevelRuntime`, usando el adaptador `ciudadCentralAsLevel` ya existente, detrás de un flag), como **prerrequisito de bajo riesgo** de esta fase — no como una migración especulativa, sino como la única forma de que la inversión en profundidad 2.5D llegue al HUB real. El riesgo es bajo y ya estaba anticipado en el propio plan del editor: el adaptador ya existe y ya pasa `validateLevel` con cero errores (criterio de la Fase 2 del plan del editor), el motor de navegación (`navmesh.ts`) es el mismo para ambos sistemas, y el flag (`NEXT_PUBLIC_LEVELS_V2`) permite rollback instantáneo. Se detalla en la §N, Paso 0.

**Todo lo demás de este documento asume esa decisión tomada.** Si en algún momento se decide NO migrar Ciudad Central, el resto de la arquitectura (schema, runtime, movimiento, profundidad) sigue siendo válido tal cual — simplemente el resultado visible solo se vería en niveles nuevos creados con el editor, no en el HUB actual. Se deja como nota explícita en cada sección donde aplica.

---

## A. Diagnóstico actual

### A.1 Stack técnico

- **Next.js 16.3.3**, App Router (`src/app/`), **React 19.2.8**, **Tailwind CSS 4**.
- **Firebase 12** (`firebase.ts`), cargado exclusivamente con `import()` dinámico — nunca estático fuera de `src/lib/firebase.ts` — porque `firebase/firestore` usa `protobufjs`, que compila código con `new Function()`, prohibido en el runtime SSR de Cloudflare Workers (`firebase.ts:22-32`; reforzado con alias de resolución en `next.config.ts:1-16` que fuerzan los builds "browser" de Firestore/Auth). Esta restricción es de **build/SSR**, no afecta a Canvas/WebGL/CSS en el cliente.
- **Deploy target: Cloudflare Workers** vía `@opennextjs/cloudflare`.
- **Cero librerías de animación o gráficos**: no hay Framer Motion, GSAP, Three.js/React Three Fiber, PixiJS ni Konva en `package.json`. Toda animación actual es CSS/Tailwind puro.
- **Cero estado global tipo Redux/Zustand**: el patrón es React Context puntual (`AuthProvider`, `FamilyProvider`, `LevelEditorProvider`) + Firestore como fuente de verdad, hooks locales para todo lo demás.
- No se añadió ninguna dependencia nueva durante las 10 fases del Level Editor (criterio A3 del plan original, verificado: `package.json` sigue con las mismas 5 dependencies de producción).

### A.2 Dos sistemas de escena coexistentes

**1) HUB legado — Ciudad Central (`src/components/world/`, `src/lib/world/`)**

Es el que juegan los niños hoy en `/jugar/[childId]`. Arquitectura confirmada por lectura directa:

- Una sola imagen de fondo (`/illustrations/city-central.webp`, 1600×907px, `questScene.ts:113`) + una cámara "cover+follow" (`useCameraBox.ts`) que centra un rectángulo recortado sobre el foco (la posición de Alex), clampado a los bordes.
- Dentro de esa cámara, capas HTML absolutas en **% de la imagen completa** (no del viewport): fondo (`<img>`) + `SceneFx` (partículas decorativas hardcodeadas) + avatar (`div absolute z-20`) + hotspots (`div absolute z-20`) + flecha guía (`z-10`) + partícula de estrella (`z-30`) (`QuestScene.tsx:396-477`).
- **Cero profundidad real**: no hay parallax, no hay escala por posición Y, no hay z-sorting dinámico. El "delante/detrás" entre avatar y hotspots lo decide el orden de montaje en el DOM dentro del mismo `z-20`, no ninguna lógica de profundidad (`QuestScene.tsx:422` vs `QuestHotspot.tsx:51`).
- Datos 100% hardcodeados: `CIUDAD_CENTRAL_WALKABLE`, `CIUDAD_CENTRAL_HOTSPOTS`, `PLAYER_START` como constantes TS en `questScene.ts:110-282`.
- Movimiento: point-and-click únicamente. `wander()`/`approach()` calculan ruta con `findPath` (motor de navegación, ver A.3) y la animan con un único `requestAnimationFrame`, interpolación lineal, `segmentMs = clamp(420, 1500, dist*30)` ms por tramo (`QuestScene.tsx:157-159, 176-234`). **Sin teclado, sin controles táctiles dedicados** (el tap funciona porque el navegador sintetiza `click` desde touch, pero no hay D-pad ni gestos).
- `prefers-reduced-motion` ya soportado: colapsa `segmentMs` a 0 (salto directo, sin animación) (`QuestScene.tsx:158`).

**2) Level Editor + su runtime (`src/lib/level/`, `src/components/level/`)**

Sistema nuevo, completo (Fases 1-10), que corre **en paralelo**, sin sustituir a Ciudad Central:

- Modelo de datos dirigido (`LevelDefinition`, ver A.4), persistido en Firestore bajo `/parents/{parentId}/levels/{levelId}` con versionado optimista inmutable.
- Editor visual completo: canvas por capas (fondo/grid/navegación/zonas/entidades/selección), herramientas de dibujo de polígonos (port de `WalkDebugOverlay`), panel de propiedades **100% dirigido por datos** (cero `switch` por tipo de entidad — `EditorPropertyPanel.tsx:14-19`), editor de cadenas de eventos, selector de desafíos con vista previa real.
- Runtime del nivel (`LevelRuntime.tsx`) que **reutiliza fuertemente** el sistema legado: `useCameraBox` (`RuntimeCanvas.tsx:4,39`), `Avatar` (`RuntimePlayer.tsx:1,13`), `PuzzleOverlay` (`LevelChallengeOverlay.tsx:4,61`), `WorldDialog` (`LevelDialogOverlay.tsx:4,38`) — no son copias, son los mismos componentes.
- Integración académica completa (Fase 10, commit `976a5c0`): resolver un desafío en el runtime del nivel escribe `attempts`/`skillsProgress`/`starLedger` exactamente igual que Ciudad Central, vía `PuzzleOverlay` con dos props opcionales (`recordAttempt?`, `onStars?`) que no alteran el comportamiento existente. Cero colección de progreso paralela: `deriveInitialState` reconstruye el estado del mundo (puertas abiertas, terminales activas) re-emitiendo eventos contra `skillsProgress` real, sin persistir nada aparte.
- **Cero profundidad real tampoco aquí**: mismo hallazgo que en Ciudad Central. `LevelEntity.layer` es explícitamente "desempate del y-sort", no un eje de profundidad; `LevelEntity.scale` es un escalar fijo sin relación con la posición; `LevelBackground` es una única imagen; `projection: "flat"|"isometric"` del fondo **solo afecta la rejilla decorativa del editor**, nunca las coordenadas ni el render (`GridLayer.tsx:6-9`, comentario explícito).

### A.3 Sistema de movimiento y navegación (compartido por ambos)

`src/lib/world/navmesh.ts` es el único motor de pathfinding, y ya fue generalizado durante el Level Editor para servir a ambos sistemas sin romper el comportamiento observable de Ciudad Central: `WalkableArea`/`isWalkable`/`findPath`/`nearestWalkablePoint` (los que usa `QuestScene`) son ahora adaptadores de una línea sobre `NavigationMesh`/`buildVisibilityGraph`/`findPathInMesh` (el modelo multi-polígono que necesita el Level Editor para niveles con varias salas). Es la única pieza técnicamente unificada entre ambos sistemas hoy — y es la base sobre la que se apoyará también el movimiento por teclado/táctil de esta fase.

### A.4 Modelo de datos del Level Editor — lo que soporta hoy

`LevelDefinition` (`src/lib/level/schema.ts:24-44`): `background`, `navigation`, `entities`, `zones`, `dialogs`, `challenges`, `missions`, `events`, `metadata`.

- **Navegación**: `walkablePolygons`/`blockedPolygons: NavPolygon[]` — multi-polígono real, cada uno activable/desactivable por evento. `spawn: Vec2`. `exits: LevelExit[]`.
- **Entidades**: 6 tipos registrados hoy (`npc`, `enemy`, `door`, `terminal`, `collectible`, `interactive`), extensibles a un 7º tocando exactamente 2 archivos. Cada `LevelEntity` tiene `position: Vec2` (2D puro, % de imagen), `rotation`, `scale` (escalar fijo), `layer` (desempate y-sort manual), `interaction`, `state` (máquina de estados discreta con `activeBlockerIds` — así una puerta cambia la malla de navegación real, no solo el sprite), `properties` (dirigidas por `EntityTypeDef.properties`).
- **El mismo componente `Render` de cada tipo de entidad se usa en el editor y en el runtime** — WYSIWYG real, y es el punto de extensión correcto para lo que añada esta fase.
- **Eventos**: bus completo con 8 tipos de trigger, condiciones booleanas (`all`/`any`/`not`), 14 tipos de acción con `delayMs` encadenado, guardia anti-ciclo (`MAX_CHAIN_DEPTH = 32`).
- **Persistencia**: `/parents/{parentId}/levels/{levelId}` + `/versions/{n}` inmutable, `firestore.rules:55-65` ya desplegadas.
- **Lo que NO existe, confirmado por lectura directa del schema**: ningún campo de profundidad/z, ningún fondo multi-capa, ningún cálculo de escala o parallax por posición, ningún objeto "puramente decorativo" sin la maquinaria completa de `LevelEntity` (aunque `interactive` con `interaction.mode: "none"` ya cubre ese caso sin cambios de esquema).

### A.5 Personaje

- Asset: `explorer.webp` (cuerpo completo, usado en escena) y `avatar.webp` (retrato, usado en HUD) — **imágenes bitmap estáticas únicas**, no spritesheet, no SVG con partes animables (`Avatar.tsx:1-31`).
- Animación: puramente CSS. `anim-idle` (bob vertical 3.4s) y `anim-walk` (bob + rotación leve 0.5s), definidas en `globals.css:224-242,286-291`. Es un "bobbing", no un ciclo de piernas real.
- Orientación izq/der: `transform: scaleX(-1)` sobre el mismo bitmap (`QuestScene.tsx:430`) — no hay arte distinto por dirección.
- No hay animación de correr, ni de reacción/interacción, ni estados adicionales.

### A.6 Assets disponibles

`public/illustrations/` — 27-30 archivos `.webp`, todos planos (sin subcarpetas), cada fondo de zona/mundo es **una única ilustración monolítica** (`city-central.webp` y 7 fondos más de zonas temáticas — bosque, cumbres, desierto, islas, laboratorio, valle, academia). **No existe ningún asset que sugiera capas separadas** (no hay `city-central-buildings.webp`, `-sky.webp`, `-fg.webp`, etc.). Esto es un dato duro para la §F: cualquier parallax con capas independientes requiere producir arte nuevo; la profundidad por escala (personaje/entidades más grandes cerca, más pequeños lejos) no requiere ningún asset nuevo.

---

## B. Evaluación del editor de niveles

### B.1 Qué puede reutilizarse directamente (sin tocar)

- El motor de navegación multi-polígono completo (`navmesh.ts`): pathfinding, `nearestWalkablePointInMesh`, malla activa dinámica (`buildRuntimeMesh`). El movimiento por teclado/táctil de esta fase se apoya en él sin cambios.
- El bus de eventos completo (`events/bus.ts`, `actions.ts`, `conditions.ts`, `catalog.ts`) — no necesita ningún tipo de trigger/acción nuevo para esta fase.
- El contrato `EntityTypeDef`/`Render` compartido editor↔runtime (`entities/registry.ts`) — es exactamente el punto de extensión correcto para que la profundidad se calcule en un solo sitio y se vea igual editando y jugando.
- `useCameraBox.ts` — cover+follow genérico, ya pensado para móvil vertical (`MIN_VISIBLE_FRACTION`), no acoplado a profundidad; sirve tal cual para una cámara 2.5D si las capas siguen siendo planas dentro de la misma caja.
- `Avatar.tsx`, `PuzzleOverlay.tsx`, `WorldDialog.tsx` — genéricos por diseño, ya reutilizados por Fase 10.
- Persistencia completa (`levelRepository.ts`, versionado optimista, `firestore.rules`) — no hace falta ninguna colección ni regla nueva.
- El patrón de panel de propiedades 100% dirigido por datos (`PropertyFields.tsx`, `PropertyFieldDef.kind`) — los campos de profundidad nuevos encajan sin añadir ningún `kind` nuevo (ver §E).
- Todo el sistema académico (`curriculum.ts`, `problem.ts`, `attemptRecorder.ts`, `economy.ts`, `mastery.ts`, `badges.ts`) — cero relación con esta fase.

### B.2 Qué puede extenderse

- `LevelBackground` (`schema.ts:59-74`): añadir un campo opcional `layers` para capas decorativas de parallax (fondo/lejano/cercano), **sin tocar** `src/width/height/alt/projection/filters` existentes.
- `LevelDefinition`: añadir un campo top-level opcional `depth` con la configuración de la curva profundidad→escala, sombra y rango. Opcional y con default "desactivado" para no invalidar ningún nivel ya guardado.
- `BackgroundLayer.tsx` (editor) y la sección de fondo de `RuntimeCanvas.tsx`: pasan de pintar una sola `<img>` a iterar la pila de capas con un `transform: translate()` proporcional al desplazamiento de la cámara.
- `EntityLayer.tsx` (editor) y `RuntimeEntity.tsx`/`RuntimePlayer.tsx` (runtime): multiplican el `scale` de autor por un factor de profundidad derivado de `position.y` — un solo punto de cálculo (`src/lib/level/depth.ts`, función pura) consumido por ambos.
- `GridLayer.tsx`: el flag `projection: "isometric"` ya es el gancho decorativo pensado para sugerir profundidad en el editor — se le puede añadir una previsualización opcional de las bandas de profundidad (cerca/lejos) sin tocar su semántica actual ("solo afecta la rejilla, nunca las coordenadas").
- El panel de propiedades del nivel (selección `{ kind: "level" }`, ya existe como sección de propiedades globales de fondo/nombre): gana una sección "Profundidad" con 4-6 campos numéricos — reutiliza el `kind: "number"` ya existente en `PropertyFieldDef`, **cero tipo de campo nuevo**.

### B.3 Qué NO debería tocarse

- El algoritmo de `navmesh.ts` (grafo de visibilidad, Dijkstra, `edgeGrid`) — la profundidad es puramente visual, nunca debe alterar qué es transitable.
- El bus de eventos y su catálogo de acciones — no se necesita ninguna acción nueva tipo `SET_DEPTH` ni similar; la profundidad se deriva de la posición, no es un estado que un evento deba mutar.
- `PuzzleOverlay.tsx`, `WorldDialog.tsx`, `attemptRecorder.ts`, `economy.ts`, `mastery.ts`, `badges.ts`, `curriculum.ts` — cero relación con profundidad/movimiento.
- `firestore.rules` — no se necesita ninguna colección ni regla nueva; todo vive dentro del mismo documento `LevelDefinition` ya cubierto por las reglas existentes.
- El contrato "cero `switch` por tipo de entidad" del panel de propiedades y del registro — la profundidad debe calcularse de forma genérica (por posición), nunca como un `if (entity.type === "npc")` en ningún componente core.
- El sistema de y-sort actual (`layer` + `position.y` para orden de pintado) — la profundidad visual (escala) es una preocupación **separada** del orden de pintado; no deben mezclarse ni el uno debe recalcular el otro.

### B.4 Qué capacidades nuevas necesita para 2.5D

1. Fondo multi-capa con factor de parallax por capa (hoy: una sola imagen).
2. Una curva profundidad→escala configurable por nivel (hoy: `scale` fijo por entidad, sin relación con posición).
3. Sombra de contacto bajo personaje/entidades, con opacidad/tamaño derivados de la profundidad (hoy: no existe ninguna sombra).
4. Movimiento por teclado y control táctil explícito (hoy: solo point-and-click/tap).
5. **Ciudad Central jugándose a través de `LevelRuntime`** (ver decisión central, arriba) — sin esto, ninguna de las 4 capacidades anteriores llega al HUB real.

### B.5 Qué cambios mínimos serían necesarios (resumen, detalle en §E/§N)

- 2 campos opcionales nuevos en `schema.ts` (`LevelBackground.layers`, `LevelDefinition.depth`), con default neutro — **retrocompatibles, no requieren migración de datos** (los niveles existentes siguen viéndose exactamente igual hasta que un autor active la profundidad explícitamente).
- 1 archivo nuevo de lógica pura (`src/lib/level/depth.ts`).
- Extender 3 componentes de renderizado ya existentes (fondo del editor, fondo del runtime, entidad/jugador del runtime) para consumir esa lógica — no crear ningún renderer paralelo.
- 1 sección nueva en el panel de propiedades del nivel (editor).
- 1 hook nuevo de movimiento por teclado + 1 componente nuevo de D-pad táctil, ambos construidos **sobre** `useAlexMovement`/`findPath`, no reemplazándolo.
- Activar la Fase 14 (flag `NEXT_PUBLIC_LEVELS_V2`, adaptador `ciudadCentralAsLevel`, adaptación de `e2e/aventura.spec.ts`) ya prevista en el plan original.

### B.6 Verificación uno por uno: capacidades futuras que el encargo pide dejar preparadas

El encargo pide explícitamente que la arquitectura quede lista para NPCs, puertas, terminales, cofres, hotspots, mecanismos, objetos interactivos, zonas bloqueadas y misiones **futuras**, sin implementarlas ahora. Verificación honesta, capacidad por capacidad, de qué ya existe hoy en el Level Editor (Fases 1-10) y qué no necesita ningún cambio de esta fase:

| Capacidad futura | ¿Ya tiene camino hoy? | Dónde |
|---|---|---|
| NPC | Sí, tipo de entidad ya registrado (`npc.tsx`) | `entities/types/npc.tsx` |
| Puerta | Sí, con bloqueo de navegación real vía `activeBlockerIds` | `entities/types/door.tsx` |
| Terminal | Sí, ya registrado, con estados `off`/`on` | `entities/types/terminal.tsx` |
| Cofre (nuevo, no existe hoy) | Parcial: encaja como una variación de `collectible` (estados `available`/`collected`) o como un 7º tipo nuevo si se quiere arte/lógica distinta — el contrato de "2 archivos" (§7.5 del plan del editor, verificado en Fase 6) lo cubre sin tocar el core | `entities/types/collectible.tsx` como base, o nuevo tipo siguiendo el mismo patrón |
| Hotspot genérico | Sí, es literalmente el tipo `interactive` con `interaction.mode` configurable (`click`/`proximity`/`none`) | `entities/types/interactive.tsx` |
| Mecanismo (palanca, botón) | Sí — es el ejemplo de prueba de extensibilidad que ya usó la Fase 6 del plan del editor (`palanca` de prueba) | Contrato de 2 archivos, ya ejercitado |
| Objeto interactivo genérico | Sí, mismo `interactive` | `entities/types/interactive.tsx` |
| Zona bloqueada | Sí, ya existe (`blockedPolygons`, activable/desactivable por evento) | `schema.ts` `LevelNavigation.blockedPolygons` |
| Misión | Sí, sistema completo con 4 tipos de `ObjectiveSource` ya implementado | `schema.ts` `LevelMission`, `runtime/state.ts` `deriveObjectiveDone` |

**Conclusión de la verificación**: de las 9 capacidades futuras enumeradas en el encargo, 7 ya existen tal cual (NPC, puerta, terminal, hotspot, objeto interactivo, zona bloqueada, misión), 1 (mecanismo) ya fue ejercitada como prueba de extensibilidad del propio Level Editor, y solo 1 (cofre) requeriría, en el futuro, o bien reutilizar `collectible` sin cambio alguno, o bien un tipo nuevo que seguiría el contrato de 2 archivos ya probado. **Esta fase no necesita tocar ninguna de estas piezas** — la extensibilidad que pide el encargo ya estaba resuelta por el propio Level Editor antes de este plan; lo único que esta fase le añade es que, cuando esas entidades existan, se vean con la misma profundidad/escala que el resto de la escena, porque la envoltura de profundidad (§D.2, `RuntimeEntity.tsx`) es genérica y se aplica a cualquier tipo de entidad sin excepción.

---

## C. Arquitectura 2.5D propuesta

```
EDITOR DE NIVELES (UI existente + 1 sección nueva "Profundidad")
        │  autor configura: capas de fondo con su factor de profundidad,
        │  rango Y (cerca/lejos), escala mín/máx, sombra on/off
        ▼
CONFIGURACIÓN DE ESCENA  =  LevelDefinition.background.layers + LevelDefinition.depth
        │  (Firestore, mismo documento/reglas de siempre — cero colección nueva)
        ▼
RENDERER 2.5D  =  RuntimeCanvas (fondo multi-capa con parallax vía useCameraBox)
              +  RuntimeEntity / RuntimePlayer (aplican depthScaleFor(position.y) al `scale` de autor)
              +  src/lib/level/depth.ts (función pura, un solo lugar de cálculo,
                 compartida por el editor -preview- y el runtime -juego real-)
        ▼
PERSONAJE  =  Avatar.tsx sin cambios de asset, envuelto con el factor de profundidad
              aplicado como transform adicional (scale + sombra), pie como punto de anclaje
        ▼
MOVIMIENTO  =  useAlexMovement (sin cambios) + useKeyboardMovement (nuevo, delgado, reutiliza
              findPath/walkTo) + TouchDPad (nuevo, mismo camino: llama walkTo con un punto
              objetivo calculado, no un motor de físicas nuevo)
        ▼
EFECTOS  =  CSS puro: sombra de contacto (radial-gradient), bob existente sin cambios,
              prefers-reduced-motion colapsa transición de escala/parallax (no la posición)
```

**Principio de diseño**: la profundidad es una **función pura de la posición** (`y` en % de la imagen → factor de escala/sombra) y del **desplazamiento de cámara** (para el parallax de fondo), nunca un estado adicional que haya que sincronizar. Esto es coherente con el principio ya establecido en todo el proyecto ("nada se persiste que se pueda derivar") y significa que no hay ningún estado nuevo en el reducer del editor ni en el runtime más allá de los dos campos de configuración.

### C.1 Comparación tecnológica objetiva (A/B/C/D)

| Opción | A favor | En contra en este proyecto | Veredicto |
|---|---|---|---|
| **A. React Three Fiber / Three.js** | Motor real de escena 3D, cámara perspectiva de verdad, luces/sombras dinámicas nativas, sería el camino natural si más adelante se decide ir a 3D completo. | Ninguna dependencia gráfica existe hoy (§A.1) — sería la primera. Curva de aprendizaje para el equipo. WebGL en un `<canvas>` no compone con el resto del DOM/CSS del proyecto (overlays, HUD, `PuzzleOverlay`, `WorldDialog` seguirían siendo DOM aparte, forzando una costura constante entre dos mundos de renderizado). Riesgo de rendimiento en gama baja móvil (contexto WebGL, shaders, aunque sean simples). Objetivamente sobredimensionado para "escalar un sprite 2D según su Y y mover un fondo a distinta velocidad" — eso no requiere una cámara 3D ni geometría. | **Descartado para esta fase.** Válido solo si en una fase futura se decide ir a 3D real con terreno/edificios/físicas — ese es precisamente el alcance que el encargo pospone explícitamente. |
| **B. Canvas 2D** | Un único contexto de dibujo, control total de píxeles, buen rendimiento para muchos sprites si se gestiona bien el *dirty rect*. | El proyecto entero (HUB legado y Level Editor) está construido sobre elementos DOM reales — `PuzzleOverlay`, `WorldDialog`, el panel de propiedades, los overlays de misión, todo es HTML/CSS con accesibilidad semántica (`aria-live`, foco, `role`) ya integrada. Migrar la escena a Canvas rompería esa integración: cada entidad interactiva dejaría de ser un elemento DOM real con `aria-label` propio, y habría que reconstruir accesibilidad (foco, lectura de pantalla, hit-testing de tap) a mano sobre píxeles — exactamente el tipo de "reconstrucción" que el encargo pide evitar. Tampoco hay ninguna necesidad real de dibujar miles de sprites por frame que justifique el salto. | **Descartado.** La ganancia de rendimiento de Canvas no compensa el costo de reconstruir accesibilidad e integración con overlays existentes, para una escena con decenas de entidades, no miles. |
| **C. DOM / CSS** | Es lo que el proyecto ya usa al 100%, en el HUB legado y en el Level Editor completo. Cero dependencia nueva. `transform: scale()`/`translate()` son GPU-aceleradas. Cada entidad sigue siendo un elemento real con `aria-label`, foco y semántica — cero trabajo de reconstruir accesibilidad. El y-sort, el sistema de coordenadas en `%`, el patrón `Render` compartido editor/runtime, todo sigue funcionando sin cambios de paradigma. | Un parallax con muchas capas y muchas entidades simultáneas eventualmente satura el DOM más que Canvas — pero la escena real (Ciudad Central, un nivel típico del editor) tiene un puñado de capas y decenas de entidades, muy lejos de ese límite. | **Elegido.** Es la única opción que no exige ninguna reconstrucción de accesibilidad ni introduce una dependencia nueva, y el resultado visual pedido (escala por profundidad + parallax de capas) se consigue completo con las herramientas que el proyecto ya domina. |
| **D. Combinación (p. ej. Canvas solo para partículas/ambiente, DOM para todo lo demás)** | Permitiría efectos ambientales (partículas, niebla) más baratos que muchos `div` animados, sin sacrificar la accesibilidad de las entidades interactivas (que seguirían en DOM). | Añade un segundo paradigma de renderizado y un punto de sincronización (coordenadas Canvas vs. % del DOM) por una ganancia marginal, dado que los efectos ambientales de esta fase (§C.4) son pocos y ligeros. | **No se adopta ahora**, pero se deja anotado en §C.4/§K como la primera opción a reconsiderar **si en el futuro** el número de partículas/efectos ambientales creciera lo suficiente para que el costo de muchos `div` animados sea medible — no es una necesidad de esta fase. |

**Conclusión**: **C — DOM + CSS transforms + SVG**, sin excepción, para toda esta fase. Es la única de las cuatro opciones que no exige ni una dependencia nueva ni una reconstrucción de accesibilidad/integración con el resto de la UI ya construida, y el resultado visual buscado (profundidad por escala + parallax de capas) no necesita más que eso.

### C.4 Ambiente: microanimaciones, luces, partículas, niebla, agua

Hoy esto existe de forma limitada y **puramente hardcodeada**: `SceneFx.tsx` posiciona a mano (coordenadas fijas en el componente) elementos decorativos de Ciudad Central — farolas, luciérnagas, humo, fuente — sin ninguna relación con el nivel/escena que se esté jugando, y sin pasar por `LevelDefinition`. Para que esto sea "aprovechar el editor existente" en vez de "un componente aparte que nadie configura", se propone:

- **Qué debería ser asset**: la textura/silueta de cada efecto (partícula de luciérnaga, silueta de humo, splash de agua) — igual criterio que cualquier otro sprite decorativo del proyecto; no se generan formas ex-nihilo por código si un `.webp` pequeño ya resuelve el problema visualmente mejor.
- **Qué debería ser propiedad de nivel (configurable desde el editor)**: **cuáles** efectos están activos en una escena y **dónde** — esto se modela igual que las capas de fondo (§E.1): un efecto ambiental es, conceptualmente, una capa más de `LevelBackground.layers` con un campo adicional `effect?: "particles" | "glow" | "fog" | "none"` (por defecto `"none"`, es decir, una capa de imagen estática simple como las demás). Así, un autor decide desde `DepthPanel`/el selector de fondo qué zonas tienen niebla o partículas, sin que ningún componente React tenga hardcodeado "si es Ciudad Central, mostrar la fuente".
- **Qué debería ser efecto generado por código (nunca asset)**: el movimiento en sí (la deriva de una partícula, el parpadeo de un glow, la ondulación de niebla) — esto es la parte barata en CSS puro (`@keyframes` reutilizables, mismo patrón que ya usan `anim-idle`/`anim-walk`/`anim-flicker`/`anim-breathe` en `globals.css`) y cara si se intentara como asset animado (spritesheet o `.webm` por efecto). Se define un pequeño catálogo cerrado de 3-4 efectos CSS reutilizables (brillo pulsante, deriva de partículas con `translate` + `opacity`, niebla como gradiente semitransparente con `opacity` oscilante), cada uno una clase CSS aplicable a una capa de fondo o a una entidad vía `className`, sin motor de partículas nuevo.
- **Prioridad de rendimiento móvil**: máximo 2-3 efectos simultáneos activos por escena (límite blando validado en `validateLevel`, mismo criterio que ya usan los presupuestos blandos de vértices/entidades del plan del editor), todos vía `transform`/`opacity` (nunca `filter: blur()` continuo en muchos elementos, nunca partículas individuales como elementos DOM independientes en cantidad — un efecto de "muchas luciérnagas" se implementa como **una sola** capa con un patrón CSS repetido vía `background-image`/`background-position` animado, no como N `div` independientes).
- **Fuera de alcance de esta fase**: agua/fuente con física real, niebla volumétrica, cualquier efecto que requiera Canvas/WebGL — quedan como posibles candidatos para la opción D de §C.1 si en el futuro se decide invertir en ellos; el objetivo de esta fase es la sensación ambiental básica (glow/parpadeo/deriva simple), no una simulación.
- **Nota importante**: esto es una **extensión adicional y opcional** de `LevelBackground.layers` (el campo `effect`), no un requisito para que la escena se sienta 2.5D — el criterio de aceptación central de esta fase (§O) es la profundidad por escala + al menos una capa de parallax; el ambiente configurable es una mejora que reutiliza la misma estructura de datos ya propuesta en §E, sin inventar un sistema paralelo.

**Tecnología: DOM + CSS transforms + SVG, NO Three.js/R3F, NO Canvas 2D.** Ver la comparación completa en §C.1; en resumen, el proyecto entero (legado y Level Editor) ya está construido 100% sobre DOM/CSS/SVG, sin ninguna dependencia gráfica, y el resultado visual buscado se consigue completo con `transform: scale()`/`translate()` sobre `<img>`/`<div>`, exactamente el vocabulario que el proyecto ya domina.

**Si NO se activa la Fase 14** (decisión central): este mismo diagrama sigue siendo válido, pero "CONFIGURACIÓN DE ESCENA" solo existiría para niveles nuevos creados en `/panel/editor`, nunca para la Ciudad Central que los niños ven en `/jugar/[childId]`. Se deja documentado para que quien apruebe este plan decida con el trade-off explícito delante.

---

## D. Componentes

### D.1 Reutilizar sin tocar

- `src/lib/world/navmesh.ts` (motor de navegación completo)
- `src/lib/level/events/*` (bus, catálogo, condiciones, acciones)
- `src/lib/level/persistence/*` (repositorio, versionado, draft cache)
- `src/components/world/useCameraBox.ts`
- `src/components/world/Avatar.tsx` (el asset y el componente base, no la envoltura de profundidad)
- `src/components/world/PuzzleOverlay.tsx`, `src/components/world/WorldDialog.tsx`
- `src/lib/level/entities/registry.ts` (el contrato `EntityTypeDef`/`Render`)
- `src/lib/curriculum.ts`, `src/lib/problem.ts`, `src/lib/attemptRecorder.ts`, `src/lib/economy.ts`, `src/lib/mastery.ts`, `src/lib/badges.ts`, `src/lib/firebase.ts`
- `src/lib/level/runtime/state.ts`, `useLevelRuntime.ts`, `navigation.ts` (derivación de estado, malla activa)

### D.2 Componentes/archivos nuevos

| Archivo | Rol |
|---|---|
| `src/lib/level/depth.ts` | Lógica pura: `depthScaleFor(y, depthConfig)`, `parallaxOffset(layerDepth, cameraDelta)`, `shadowFor(depthScale, depthConfig)`. Sin React, sin Firestore — mismo estilo que `navmesh.ts`. |
| `src/components/level/runtime/BackgroundLayers.tsx` | Pinta la pila de `background.layers` con su `transform` de parallax, dentro de `RuntimeCanvas`. |
| `src/components/level/editor/layers/BackgroundLayersPreview.tsx` (o extensión de `BackgroundLayer.tsx` existente) | Misma pila, en modo estático (sin cámara siguiendo a Alex), para que el editor muestre el resultado mientras se edita. |
| `src/components/level/editor/DepthPanel.tsx` | Sección "Profundidad" del panel de propiedades del nivel: rango Y, escala mín/máx, sombra on/off, gestor de capas de fondo (añadir/quitar/reordenar, cada una con `src` + `depth` + `offsetY`). |
| `src/components/level/runtime/ContactShadow.tsx` | `div` con `radial-gradient` bajo cada entidad/jugador visible, tamaño/opacidad derivados de `depthScaleFor`. |
| `src/lib/level/runtime/useKeyboardMovement.ts` | Hook delgado: en `keydown` de flechas/WASD, calcula un punto objetivo a un delta fijo en la dirección presionada, lo proyecta con `nearestWalkablePointInMesh`, y llama al `walkTo` que ya expone `useAlexMovement`. Repite mientras la tecla esté pulsada (throttle ~150ms), cancela con `walkToken` existente. No introduce un motor de velocidad continua nuevo. |
| `src/components/level/runtime/TouchDPad.tsx` | D-pad/joystick en pantalla, visible solo `<lg` (o solo con puntero tipo touch), 4-8 direcciones, mismo mecanismo que el teclado (llama al mismo `walkTo` calculado). Botones con `aria-label` explícito y objetivo táctil ≥44px. |

### D.3 Componentes del editor a modificar

| Archivo | Cambio |
|---|---|
| `src/components/level/editor/EditorPropertyPanel.tsx` | Monta `DepthPanel` cuando `selection.kind === "level"`, junto a los campos de fondo ya existentes. |
| `src/components/level/editor/layers/BackgroundLayer.tsx` | Extendido para iterar `background.layers` (ver D.2) en vez de pintar una sola `<img>`. |
| `src/components/level/editor/layers/EntityLayer.tsx` | Aplica `depthScaleFor(entity.position.y, level.depth)` multiplicado por `entity.scale` al pintar — mismo cálculo que el runtime, vía `depth.ts` compartido. |
| `src/components/level/editor/editorReducer.ts` | 2-3 acciones nuevas: `SET_DEPTH_CONFIG`, `ADD_BACKGROUND_LAYER`, `UPDATE_BACKGROUND_LAYER`, `DELETE_BACKGROUND_LAYER` — mismo patrón que las acciones existentes de fondo/nivel. |
| `src/lib/level/schema.ts`, `defaults.ts`, `migrate.ts` | Ver §E. |

### D.4 Componentes del runtime a modificar

| Archivo | Cambio |
|---|---|
| `src/components/level/runtime/RuntimeCanvas.tsx` | Monta `BackgroundLayers` en vez de una `<img>` única; pasa el delta de cámara (de `useCameraBox`) a cada capa. |
| `src/components/level/runtime/RuntimeEntity.tsx` | Envuelve el `Render` del tipo de entidad con el factor de profundidad (transform adicional) + `ContactShadow`. **No cambia `Render` en sí** — el tipo de entidad sigue sin saber nada de profundidad, es una envoltura externa. |
| `src/components/level/runtime/RuntimePlayer.tsx` | Igual que `RuntimeEntity`: envuelve `Avatar` con el factor de profundidad + sombra, sin tocar `Avatar.tsx`. |
| `src/lib/level/runtime/useAlexMovement.ts` | **Sin cambios de lógica** — solo se le añade, si se decide, un modo de fácil "objetivo por teclado" reexportando `walkTo` con la firma que `useKeyboardMovement` necesita (probablemente ya expuesta, verificar en implementación). |

### D.5 Explícitamente NO se tocan

- `src/lib/world/questScene.ts` (los datos hardcodeados de Ciudad Central — solo se **leen** para generar el `LevelDefinition` migrado, vía el adaptador ya existente, nunca se editan a mano)
- `src/lib/curriculum.ts`, `src/lib/problem.ts`, `src/lib/attemptRecorder.ts`, `src/lib/economy.ts`, `src/lib/mastery.ts`, `src/lib/badges.ts`, `src/lib/masteryRewards.ts`
- `firestore.rules` (ninguna colección/regla nueva)
- El registro de tipos de entidad existente (`npc.tsx`, `door.tsx`, `terminal.tsx`, `collectible.tsx`, `enemy.tsx`, `interactive.tsx`) — no necesitan ningún campo de profundidad propio, la profundidad es una envoltura externa aplicada por posición, no una propiedad de autor por entidad.
- El bus de eventos y su catálogo de acciones.
- `PanelShell.tsx`, la navegación del panel de padres.

---

## E. Modelo de datos — extensión mínima

Se describe como estructura de campos (no como código de implementación), coherente con el estilo ya usado en `schema.ts`. Todo es **opcional y retrocompatible**: un `LevelDefinition` guardado antes de esta fase sigue siendo válido sin ningún campo nuevo; el runtime aplica valores por defecto neutros (profundidad desactivada = comportamiento idéntico al actual).

### E.1 `LevelBackground` — capas decorativas de parallax

Se añade un campo `layers` (lista, opcional, vacía por defecto) junto a los campos ya existentes (`src`, `width`, `height`, `alt`, `projection`, `filters`, que no cambian). Cada capa:

- `id` — identificador único dentro del nivel.
- `src` — ruta de imagen bajo `/illustrations/`, mismo criterio que el fondo principal.
- `depth` — número que expresa "qué tan cerca de la cámara se mueve esta capa": `0` = fija (cielo/horizonte, no se desplaza con la cámara), `1` = se mueve exactamente como el fondo principal actual (retrocompatible: el fondo `src` de hoy se puede pensar como una capa implícita de `depth = 1`), `>1` = capa cercana/primer plano que se desplaza más rápido que la cámara (efecto de proximidad). El editor expone esto como un selector con presets ("Cielo", "Lejano", "Medio", "Cercano" → 0 / 0.3 / 0.7 / 1.2) más un campo numérico de ajuste fino — reutiliza el `kind: "select"` + `kind: "number"` ya existentes en el sistema de campos, sin añadir ningún `kind` nuevo.
- `offsetY` — desplazamiento vertical en % de la imagen, para capas que no cubren la escena completa (p. ej. una silueta de horizonte).
- `opacity` — 0-1, por defecto 1.
- `loop` (booleano, por defecto `false`) — si la imagen se repite horizontalmente al desplazarse (para capas de cielo/lejanas más pequeñas que el ancho recorrido por la cámara). Se puede diferir del MVP si no hay tiempo (ver §N, marcado como opcional).
- `effect` (opcional, `"particles" | "glow" | "fog" | "none"`, por defecto `"none"`) — asocia una de las 3-4 clases CSS de ambiente ya catalogadas (§C.4) a esta capa, para que un autor pueda marcar "esta capa lejana tiene niebla" o "esta capa cercana parpadea" sin escribir CSS. Es la única superficie de datos que necesita el ambiente configurable de §C.4 — no requiere ninguna estructura nueva más allá de este campo dentro de la misma capa de fondo ya propuesta.

### E.2 `LevelDefinition.depth` — curva profundidad→escala

Campo top-level opcional, `null`/ausente = profundidad desactivada (comportamiento idéntico al actual, sin coste de render adicional). Cuando está presente:

- `enabled` — booleano explícito (permite desactivar sin borrar la configuración ya hecha).
- `range` — `{ nearY: number; farY: number }`, en % de la imagen (igual sistema de coordenadas que todo lo demás). `nearY` es la posición Y que se considera "más cerca de cámara" (típicamente mayor, parte baja de la imagen), `farY` la más lejana.
- `scale` — `{ near: number; far: number }` (p. ej. `near: 1.15`, `far: 0.75`). El factor de escala final de una entidad/personaje en posición `y` es `entity.scale × depthScaleFor(y, range, scale)`, con interpolación (lineal o suavizada) entre `far`/`near`, clampada fuera del rango.
- `shadow` — `{ enabled: boolean; opacityNear: number; opacityFar: number }` — la sombra de contacto se atenúa con la distancia, igual criterio que la escala.

**Nota de diseño**: la profundidad **nunca** cambia el orden de pintado (eso lo sigue decidiendo `layer` + `position.y`, sin cambios) — son dos preocupaciones distintas y deliberadamente no acopladas: el y-sort decide "qué tapa a qué", la profundidad decide "qué tan grande se ve". Mezclarlas sería repetir el error que ya evitó el diseño original del y-sort (§7.4 del plan del editor).

### E.3 Zona jugable, spawn, objetos visuales, animaciones — no se inventa nada nuevo

- **Zona caminable**: ya cubierta por `navigation.walkablePolygons`/`blockedPolygons` — sin cambios.
- **Spawn**: ya cubierto por `navigation.spawn` — sin cambios.
- **Objetos visuales decorativos** (árbol, farola, banco): ya cubiertos por el tipo de entidad `interactive` con `interaction.mode: "none"` — **cero cambio de esquema necesario**. Si en el futuro se quiere una categoría separada en la toolbox por claridad de autoría (no por necesidad técnica), sería un 7º tipo `decoration` que reutiliza exactamente el mismo mecanismo — se deja como mejora opcional, no obligatoria para esta fase.
- **Animaciones de entidad**: ya cubiertas por `EntityStateDef.className` (CSS) — sin cambios; la profundidad se aplica como una envoltura de `transform` adicional, compatible con cualquier `className` de animación existente (`anim-breathe`, `anim-flicker`, etc.), porque son propiedades CSS distintas (`transform: scale()` de profundidad se compone con `translate/rotate` de la animación de estado sin conflicto, aplicando ambos en el mismo `transform` compuesto o en wrappers anidados).

### E.4 Versión de esquema

`LEVEL_SCHEMA_VERSION` pasa de `1` a `2`. `migrate.ts` gana una migración `1 → 2` que añade `depth: undefined`/ausente (o `{ enabled: false, ... }` con valores neutros) a cualquier nivel leído en versión 1 — comportamiento visual idéntico, cero riesgo de romper niveles existentes. `createEmptyLevel`/`defaults.ts` incluyen la configuración de profundidad **desactivada por defecto** también para niveles nuevos (el autor la activa explícitamente desde `DepthPanel`).

---

## F. Assets

### F.1 Reutilizables sin cambios

- `city-central.webp` — se usa tal cual como la capa de fondo principal (`depth: 1`, equivalente al comportamiento actual). **No requiere ningún recorte ni reprocesamiento para el MVP.**
- `explorer.webp`/`avatar.webp` — se siguen usando exactamente igual; la profundidad se aplica como transform externo, el bitmap no cambia.
- Los 7 fondos de zona restantes — mismo criterio, ninguno necesita reprocesamiento para que la profundidad por escala funcione (ver F.2).

### F.2 Lo que el MVP de esta fase NO necesita

La ganancia visual más importante y de menor riesgo — el personaje y los objetos escalan según su posición Y, con sombra de contacto — **funciona con cero assets nuevos**, porque depende únicamente de `transform: scale()` sobre el bitmap ya existente y un `radial-gradient` CSS para la sombra. Esto se puede y se recomienda entregar primero (ver §N).

### F.3 Assets que necesitan procesamiento (mejora opcional, no bloqueante)

El parallax de **capas de fondo separadas** (cielo/skyline lejano moviéndose más lento que un elemento de primer plano) sí necesita arte adicional, porque `city-central.webp` es una única imagen compuesta sin capas exportadas por separado. Opciones, de menor a mayor esfuerzo:

1. **Ninguna capa nueva** — dejar el parallax de fondo como una mejora futura y entregar solo la profundidad por escala de personaje/entidades en esta fase (recomendado para el MVP).
2. **1-2 capas de silueta** recortadas del arte existente o ilustradas de nuevo expresamente (p. ej. una franja de horizonte/skyline lejano con fondo transparente, superpuesta encima de `city-central.webp` con `depth < 1`) — trabajo de ilustración, no de código, encargable en paralelo sin bloquear la implementación.
3. Reprocesar `city-central.webp` completo en capas separadas (fondo/edificios/calle) — desproporcionado para esta fase; el propio encargo lo descarta explícitamente ("si todo está compuesto por una sola imagen, NO reconstruir artificialmente edificios").

### F.4 Assets faltantes

Ninguno bloqueante. Si se decide producir capas de parallax (F.3, opción 2), se necesitarían 1-2 `.webp` con fondo transparente, tamaño comprimido (siguiendo el patrón de los fondos actuales, 7-90KB), sin más requisitos técnicos que los que ya cumplen los assets existentes.

---

## G. Movimiento

### G.1 Lo que no cambia

- **Coordenadas**: % de la imagen de fondo, mismo sistema `Vec2` de siempre.
- **Geometría de movimiento**: `findPath`/`findPathInMesh` sobre la malla de navegación del nivel — sin cambios.
- **Velocidad/duración por tramo**: `segmentMs = clamp(420, 1500, dist × 30)` ms, interpolación lineal — se mantiene sin cambios en esta fase (el encargo no pide rediseñar la sensación de movimiento existente, solo añadir profundidad y más formas de input).
- **Orientación**: `scaleX(-1)` sobre el bitmap según `facing` — sin cambios; se compone con el `scale` de profundidad en el mismo `transform` (`scaleX(-1) scale(depthFactor)`, aplicado con cuidado de orden para no invertir el signo del factor de profundidad).
- **Límites de zona jugable**: `walkablePolygons`/`blockedPolygons` del nivel — sin cambios.

### G.2 Lo que se añade

- **Profundidad basada en posición**: `scale_final = entity.scale × depthScaleFor(pose.y, level.depth)`, recalculado en cada frame del mismo bucle `requestAnimationFrame` que ya mueve a Alex (cero coste adicional de "otro loop" — es una multiplicación extra dentro del `setState` que ya ocurre por frame).
- **Sombra**: un `<div>` adicional posicionado igual que el personaje, con `transform-origin: center` y tamaño/opacidad derivados del mismo factor.
- **Movimiento por teclado** (`useKeyboardMovement`, nuevo): en `keydown` de flechas/`WASD`, se calcula un punto objetivo `pose + delta·dirección` (delta configurable, p. ej. 4-6% de la imagen), proyectado a la malla con `nearestWalkablePointInMesh`, y se llama al mismo `walkTo` que ya usa el clic. Mientras la tecla sigue pulsada, se repite con un throttle corto (~150ms) para que el movimiento se sienta continuo sin inventar un motor de velocidad/aceleración nuevo. Se desactiva mientras hay un overlay abierto (diálogo/desafío/misión) o durante Play Test fuera del runtime real, igual criterio que ya usan los atajos del editor para no interferir con inputs de texto.
- **Aceleración/desaceleración**: no se introduce una curva de física nueva; se recomienda, como mejora menor y de bajo riesgo, aplicar un *ease-out* solo en el último tramo de cada `walkTo` (el personaje frena en vez de detenerse en seco) — cambio contenido a la función de interpolación de `useAlexMovement`, no un rediseño del motor.
- **Controles táctiles** (`TouchDPad`, nuevo): un control direccional en pantalla, visible en viewports pequeños (o cuando se detecta un puntero de tipo touch), con el mismo mecanismo que el teclado — nunca reemplaza el tap-to-walk existente (que sigue funcionando y es la interacción principal en móvil), lo complementa para quien prefiera control explícito o para casos de precisión (acercarse a un hotspot pequeño).

### G.3 Límites y validaciones

Se mantiene el comportamiento ya validado por el Level Editor: si el objetivo calculado (por teclado o D-pad) cae en una zona inalcanzable, `findPathInMesh` devuelve `reachable: false`, el personaje no se mueve, y se anuncia por `aria-live` ("No hay camino hasta ahí") — mismo patrón que ya existe para clic, sin necesitar ningún caso especial nuevo.

---

## H. Profundidad

### H.1 Escala

`depthScaleFor(y, range, scale)`: función pura. Interpola entre `scale.far` (en `range.farY`) y `scale.near` (en `range.nearY`), clampando fuera de rango. Interpolación lineal para el MVP (una curva `smoothstep` es una mejora opcional de pulido visual, sin cambio de contrato).

### H.2 Posición

La posición (`%` de imagen) **no cambia** por profundidad — solo la representación visual (transform). El punto de anclaje del `transform: scale()` debe ser el punto de contacto con el suelo (pies del personaje / base de la entidad), no el centro del sprite, para que la posición lógica y la posición visual coincidan (`transform-origin: 50% 100%` o equivalente, aplicado en el wrapper de profundidad, no en el bitmap original).

### H.3 Parallax

`parallaxOffset(layerDepth, cameraDelta)`: el desplazamiento de cada capa de fondo es `cameraDelta × layerDepth` (donde `cameraDelta` es cuánto se movió el foco de `useCameraBox` desde el encuadre neutro). Con `layerDepth = 1` esto reproduce exactamente el comportamiento actual (la imagen se mueve 1:1 con la cámara, como hoy); `layerDepth < 1` la deja rezagada (sensación de lejanía); `layerDepth > 1` la adelanta (sensación de cercanía).

### H.4 Sombra

`shadowFor(depthScale, shadowConfig)`: opacidad y tamaño interpolados igual que la escala — más cerca (escala mayor) = sombra más marcada y grande; más lejos = sombra más tenue/pequeña. Implementación: `radial-gradient` CSS puro, sin `box-shadow` con blur costoso repetido por elemento (ver §K).

### H.5 Oclusión

Sin cambios respecto al sistema y-sort ya existente (`layer` + `position.y`, `EntityLayer.tsx`) — la profundidad de esta fase es ortogonal a la oclusión, no la reemplaza ni la recalcula.

### H.6 Configurable desde el editor

Todo lo anterior (`range`, `scale.near/far`, `shadow.enabled/opacityNear/opacityFar`, y por capa de fondo: `src`, `depth`, `offsetY`, `opacity`) se edita desde `DepthPanel` (§D.2) dentro del panel de propiedades del nivel ya existente — ningún valor queda hardcodeado en un componente React.

---

## I. Animación

- **Idle**: se mantiene `anim-idle` (bob CSS) sin cambios de asset ni de keyframes.
- **Walk**: se mantiene `anim-walk` (bob + rotación leve) sin cambios; se compone con el nuevo `transform: scale()` de profundidad en el mismo elemento envolvente (el bob es un `translateY`/`rotate` sobre el bitmap interior, la profundidad es un `scale` sobre el wrapper exterior — dos transforms anidados, sin conflicto).
- **Correr**: no existe hoy ni asset ni animación de correr. Para esta fase se recomienda **no inventar una animación de correr real** (requeriría spritesheet o rig, fuera de alcance) — como mucho, una variación cosmética menor (cadencia de bob más rápida vía variable CSS cuando la velocidad de desplazamiento es alta) documentada explícitamente como aproximación temporal, no como "correr" real.
- **Interacción/reacción**: no existe hoy. Se puede añadir una clase CSS de "pulso" (`anim-interact`, bounce corto) disparada al iniciar una interacción con una entidad, reutilizando el mismo mecanismo de `className` que ya usan los estados de entidad (`EntityStateDef.className`) — bajo costo, cero asset nuevo.
- **Arquitectura de reemplazo futuro** (para cuando se decida invertir en spritesheet/rig 2D/Spine/Live2D): se recomienda introducir una capa de indirección delgada — un componente `CharacterRenderer` que hoy simplemente envuelve `Avatar.tsx` (bitmap + CSS), pero que expone una interfaz estable (`variant`, `walking`, `facing`, `depthScale`) para que `QuestScene`/`RuntimePlayer` nunca necesiten cambiar cuando el renderer interno cambie de bitmap a spritesheet/Spine. Es una separación de una sola capa, no una reescritura — se deja diseñada aquí pero **no se implementa** en esta fase (el encargo pide explícitamente no reemplazar el personaje ahora).

---

## J. Responsive / táctil

- **Desktop**: clic para mover (sin cambios) + nuevo movimiento por teclado (flechas/WASD).
- **Tablet**: tap para mover (sin cambios, ya funciona) + `TouchDPad` opcional visible para control de precisión.
- **Móvil**: igual que tablet; `useCameraBox` ya está calibrado para proporciones verticales (`MIN_VISIBLE_FRACTION`), sin cambios necesarios ahí.
- **Nota de alcance sobre el editor**: la investigación encontró que la UI del propio editor (no el runtime que juega el niño) pierde el toolbox y el panel de propiedades por completo por debajo del breakpoint `lg`, sin ningún drawer alternativo, y no tiene gestos táctiles de pan/zoom (`LevelEditorScreen.tsx:52,60`). **Esto es un gap preexistente del Level Editor, no introducido por esta fase**, y arreglarlo por completo es trabajo aparte (el encargo prohíbe explícitamente un "refactor general"). El único compromiso que sí toma esta fase: los campos nuevos de `DepthPanel` deben ser usables razonablemente en el panel de propiedades tal como existe hoy (mismo patrón de campos que ya funciona en desktop/tablet ancho), sin intentar resolver el problema de responsive del editor completo.

---

## K. Rendimiento

- **Cero dependencias nuevas** — mismo criterio que las 10 fases anteriores del Level Editor (A3 del plan original). Todo con React 19 + CSS + SVG nativos.
- **`transform: scale()`/`translate()` son GPU-aceleradas** y no disparan *reflow* — a diferencia de animar `width`/`height`/`top`/`left`, que sí lo harían. Se usa `transform` exclusivamente para la profundidad y el parallax.
- El factor de profundidad se calcula **una vez por entidad visible por frame**, dentro del mismo `requestAnimationFrame` que ya mueve al personaje — coste adicional marginal (una multiplicación + interpolación), no un nuevo bucle.
- El parallax de fondo son 1-3 `transform` sobre divs de capa, coste despreciable incluso en gama baja.
- La sombra de contacto se implementa con un **único `radial-gradient` CSS reutilizado por clase** (definido una vez en `globals.css`, aplicado vía `className`), evitando `box-shadow` con `blur()` costoso repetido por elemento en el DOM.
- **Ningún asset nuevo obligatorio** para el MVP (§F.2) — el presupuesto de descarga no cambia. Si se añaden capas de parallax opcionales (§F.3), deben seguir el mismo criterio de compresión `.webp` ya usado (fondos actuales entre 7-90KB).
- `prefers-reduced-motion`: la transición *animada* de escala/parallax (el cambio suave mientras el personaje camina) se colapsa igual que ya hace `segmentMs → 0` hoy — el valor final de escala/posición se sigue aplicando (no es movimiento decorativo, es información de profundidad), solo se quita la interpolación continua.
- Se recomienda medir con el mismo criterio que ya usa el Level Editor (nivel sintético con muchas entidades, `performance.now()` dentro de la página) antes de dar por cerrada la fase — ver §M.

---

## L. Accesibilidad

- Se mantiene y no se toca el `aria-live` existente para "No hay camino hasta ahí" — el movimiento por teclado/D-pad reutiliza exactamente el mismo mecanismo de anuncio cuando el objetivo calculado es inalcanzable.
- El movimiento por teclado se ata a un contenedor con foco claro (probablemente el `sceneRef`/`stageRef` del runtime), respetando el orden de tabulación existente del resto de la página — no debe "robar" el foco de menús/overlays. Se desactiva automáticamente mientras hay un overlay modal abierto (diálogo/desafío/misión), igual criterio que ya usa `useDialogFocus` para el resto del proyecto.
- Los botones del `TouchDPad` llevan `aria-label` explícito ("Mover arriba", "Mover a la izquierda", etc.) y un objetivo táctil ≥44×44px, siguiendo el mismo estándar mínimo que ya se exige en el criterio A11 del plan del editor (axe, cero violaciones `serious`/`critical`).
- La profundidad (escala/sombra) es **puramente informativa/estética**: ninguna interacción del juego depende de percibir el tamaño relativo — un usuario con daltonismo, baja visión, o con `prefers-reduced-motion` sigue pudiendo jugar exactamente igual sin percibir la escala como señal (el clic/tap/teclado siguen funcionando sobre la posición lógica real, no sobre el tamaño visual).
- `prefers-reduced-motion` colapsa la animación de bob (`anim-idle`/`anim-walk`) y la transición continua de escala/parallax, igual que ya hace hoy con `segmentMs` — criterio A12 del plan del editor, extendido a los nuevos efectos.
- Nuevas rutas/superficies (`DepthPanel` en el editor, `TouchDPad` en el runtime) deben pasar el mismo barrido de axe (cero `serious`/`critical`) que ya exige el criterio A11.

---

## M. Testing

- `npm run lint && npm run typecheck && npm run build` en verde (igual criterio A1 del plan del editor).
- **Los 7 E2E existentes** (`e2e/*.spec.ts` previos al Level Editor) deben seguir pasando **sin modificación**, salvo la adaptación explícita y acotada de `e2e/aventura.spec.ts` que ya preveía la propia Fase 14 original si se activa la migración de Ciudad Central (ver §N, Paso 0) — cualquier otro cambio de comportamiento observable en Ciudad Central fuera de "ahora tiene profundidad/teclado/D-pad" sería una regresión a investigar, no un cambio esperado.
- **Unidad** (`depth.ts`): `depthScaleFor` interpola correctamente dentro de rango, clampa fuera de rango, devuelve escala neutra (1) cuando `depth.enabled === false`; `parallaxOffset` es lineal en `cameraDelta` y `layerDepth`; `shadowFor` interpola igual que la escala.
- **Editor**: configurar profundidad (rango, escalas, sombra) y una capa de fondo nueva desde `DepthPanel`, guardar, recargar, verificar persistencia exacta; `validateLevel` sigue devolviendo cero errores sobre un nivel con profundidad configurada.
- **Runtime**: una entidad/el personaje en una posición Y cercana al `range.nearY` se renderiza con un `transform: scale()` mayor que en `range.farY` (verificable leyendo el estilo computado); las capas de fondo con distinto `depth` se desplazan proporcionalmente distinto al mover la cámara (mismo criterio de muestreo continuo que ya usa `e2e/nivel-runtime.spec.ts` para la pose del personaje).
- **Movimiento nuevo**: pulsar una flecha/WASD mueve al personaje respetando la malla de navegación (no atraviesa bloqueados, se detiene en `reachable: false` con el mismo `aria-live`); el `TouchDPad` produce el mismo resultado por el mismo camino de código (test puede verificar que ambos llaman al mismo `walkTo` con el mismo tipo de objetivo, o al menos que el resultado observable de pose es equivalente).
- **Firebase/Firestore**: migración `schemaVersion 1 → 2` sobre un nivel guardado antes de esta fase no produce error y el nivel se sigue viendo igual (profundidad ausente/desactivada por defecto); ninguna regla de `firestore.rules` cambia; ninguna colección nueva aparece.
- **Progreso académico** (mastery/attempts/starLedger/badges/prerrequisitos): sin cambios de comportamiento esperado — se debe verificar explícitamente que resolver un desafío dentro de una escena con profundidad activada sigue escribiendo exactamente los mismos documentos que hoy (mismo test que ya existe para la Fase 10, repetido sobre un nivel con `depth.enabled = true` para descartar cualquier interferencia).
- **Responsive**: `TouchDPad` visible/oculto según el criterio de viewport definido, en los tres anchos de referencia (desktop/tablet/móvil) ya usados por el proyecto.
- **Accesibilidad**: axe sin violaciones `serious`/`critical` en el runtime con `TouchDPad`/`DepthPanel` presentes; test de `prefers-reduced-motion` confirmando que la interpolación continua se colapsa pero el estado final de escala se sigue aplicando.
- **Rendimiento**: reutilizar el criterio ya establecido (nivel sintético grande) y medir el coste adicional del cálculo de profundidad por frame — objetivo: sin regresión perceptible sobre el presupuesto ya validado en el plan del editor (`buildVisibilityGraph` <60ms, `findPathInMesh` <15ms no deberían verse afectados en absoluto, ya que la profundidad no toca el motor de navegación).

---

## N. Plan de implementación

Orden: **primero extender el editor de niveles (schema + UI de autoría) → después el renderer 2.5D → después personaje/movimiento**, exactamente como pide el encargo. El Paso 0 (migración de Ciudad Central) es un prerrequisito de infraestructura, no "renderer" ni "personaje", así que se coloca antes de todo lo demás por ser lo que hace que el resto del plan sea visible en el HUB real.

### Paso 0 — Activar la Fase 14: Ciudad Central sobre `LevelRuntime` — **REVISADO tras inspeccionar `ciudadCentral.ts` durante la implementación**

> **Corrección importante respecto a la versión original de este plan.** Al implementar este paso se inspeccionó `src/lib/level/legacy/ciudadCentral.ts` línea por línea y se encontró que `ciudadCentralAsLevel()` **solo traduce geometría de navegación y posición/etiqueta de cada hotspot** — `challenges: []`, `dialogs: []` y `events: []` están vacíos siempre (líneas 94-98 del archivo). El texto narrativo de cada hotspot se guarda como `properties.introLines`/`properties.outcome`, propiedades opacas que **ningún tipo de entidad ni overlay del runtime interpreta**. Activar el flag tal cual dejaría a los NPCs y terminales de Ciudad Central visibles pero **sin ningún desafío matemático ni diálogo funcionando** — una regresión grave del juego real (los niños verían una "Ciudad Central" muda), no una mejora. El criterio de aceptación original de este paso ("reproduce el mismo recorrido narrativo/objetivos que hoy") es **falso tal como está escrito** con el adaptador actual, y no se puede cumplir sin antes extender `ciudadCentralAsLevel()` para generar también los `ChallengePlacement` (uno por hotspot con `objectiveId`), los `LevelDialog` (con las líneas de `intro`/`outcome` reales) y las `LevelEventRule` que reproduzcan la lógica hoy cableada a mano en `QuestScene.tsx` (`handlePuzzleClose`, `onDialogContinue`, el chequeo de "primera vez", `NIA_ORIGIN_INTRO`, el `router.push` de siguiente misión).
>
> Eso es un trabajo de **puerto narrativo completo**, no una activación de flag — de tamaño comparable (o mayor) a todo lo demás de este plan junto, con riesgo real de regresión sobre el flujo de juego que los niños usan hoy, y que **no se puede verificar de forma segura en este entorno** porque el arnés de emuladores de Firebase (`scripts/emuladores.mjs`, usado por `npm run e2e`) falla al arrancar en este sandbox (`spawn EINVAL` al invocar `npx.cmd firebase emulators:start`) — sin emuladores no hay forma de correr `e2e/aventura.spec.ts` ni ningún E2E contra Firestore para confirmar que nada se rompió.
>
> **Decisión tomada**: este paso queda **deliberadamente sin implementar** en esta sesión. Se documenta como trabajo futuro, a acometer en una sesión aparte que además pueda correr el harness de emuladores para verificar cada cambio contra `e2e/aventura.spec.ts` antes de tocar el punto de entrada real del HUB. Intentarlo a ciegas (sin poder correr esa prueba) sería precisamente el tipo de atajo que este plan pide evitar.

- **Qué sí queda listo para cuando se acometa**: todo lo que este paso necesitaría reutilizar ya existe y ya se probó en esta sesión — `LevelRuntime` ya soporta profundidad/parallax/teclado/D-pad (Pasos 1-7 de este documento), y el propio adaptador de geometría (`ciudadCentralAsLevel`) sigue siendo un punto de partida válido para el mapeo de navegación/entidades, solo le falta la parte de contenido académico/narrativo.
- **Trabajo pendiente, para la sesión que lo acometa**: extender `ciudadCentralAsLevel()` con `challenges`/`dialogs`/`events` equivalentes a `CIUDAD_CENTRAL_HOTSPOTS`/`handlePuzzleClose`/`onDialogContinue`; exponer el flag `NEXT_PUBLIC_LEVELS_V2`; adaptar `e2e/aventura.spec.ts`; verificar contra emuladores reales (no este sandbox).
- **Mientras tanto**: la escena 2.5D (profundidad, parallax, movimiento por teclado/táctil) **ya es real y jugable hoy** para cualquier nivel creado desde `/panel/editor` y jugado en `/jugar/[childId]/nivel/[levelId]` — el criterio de aceptación de la §O de este documento se cumple ahí. Solo Ciudad Central específicamente (`/jugar/[childId]`, la ruta legada) no hereda estos cambios todavía, exactamente como ya advertía la nota "si no se activa la Fase 14" repetida en varias secciones de este documento.

### Paso 1 — Esquema: profundidad y capas de fondo (sin UI todavía)

- **Archivo**: `src/lib/level/schema.ts` (añadir `LevelBackground.layers`, `LevelDefinition.depth`, ver §E), `src/lib/level/defaults.ts` (`createEmptyLevel` con profundidad desactivada por defecto), `src/lib/level/migrate.ts` (migración `1→2`).
- **Sistema afectado**: modelo de datos puro, sin React ni Firestore tocado directamente (los cambios de esquema se sirven vía el mismo `levelRepository` sin cambios).
- **Dependencia**: ninguna.
- **Criterio de aceptación**: tipos compilan; un `LevelDefinition` fixture en versión 1 migra a versión 2 sin error y con `depth` neutro; `ciudadCentralAsLevel()` (ya sea generando v1 o v2) sigue pasando `validateLevel` con cero errores.
- **Riesgo**: bajo. **Rollback**: revertir el archivo, ningún dato ya escrito se ve afectado (los campos son opcionales).

### Paso 2 — `src/lib/level/depth.ts` (lógica pura)

- **Archivo**: nuevo, `src/lib/level/depth.ts` + su suite de pruebas unitarias.
- **Sistema afectado**: ninguno todavía visible (no consumido por UI en este paso).
- **Dependencia**: Paso 1 (tipos de `depth`/`layers`).
- **Criterio de aceptación**: `depthScaleFor`/`parallaxOffset`/`shadowFor` pasan sus pruebas unitarias (interpolación, clamping, caso desactivado).
- **Riesgo**: bajo. **Rollback**: trivial (archivo nuevo, nada más lo importa aún).

### Paso 3 — Panel de propiedades del nivel: sección "Profundidad"

- **Archivo**: `src/components/level/editor/DepthPanel.tsx` (nuevo), `EditorPropertyPanel.tsx` (montarlo), `editorReducer.ts` (acciones `SET_DEPTH_CONFIG`/`*_BACKGROUND_LAYER`).
- **Sistema afectado**: editor de niveles (UI de autoría).
- **Dependencia**: Paso 1.
- **Criterio de aceptación**: un autor configura rango/escalas/sombra y añade una capa de fondo desde el panel; al guardar y recargar, la configuración persiste exactamente igual (mismo criterio que ya exige el plan del editor para cualquier campo nuevo).
- **Riesgo**: bajo (UI aislada, no afecta render todavía). **Rollback**: ocultar la sección o revertir el archivo.

### Paso 4 — Fondo multi-capa: editor y runtime

- **Archivo**: `src/components/level/editor/layers/BackgroundLayer.tsx` (extender), `src/components/level/runtime/BackgroundLayers.tsx` (nuevo), `RuntimeCanvas.tsx` (montarlo en vez de la `<img>` única).
- **Sistema afectado**: renderizado del editor y del runtime.
- **Dependencia**: Pasos 1-3 (necesita datos configurables para tener algo que pintar).
- **Criterio de aceptación**: con al menos una capa de `depth ≠ 1` configurada, moverse por el nivel en Play Test muestra esa capa desplazándose a distinta velocidad que el fondo principal; con cero capas configuradas, el resultado visual es idéntico al actual (una sola imagen fija a la cámara).
- **Riesgo**: medio (cambia el pintado del fondo en ambos sistemas). **Rollback**: revertir `RuntimeCanvas`/`BackgroundLayer` a pintar solo `background.src` como hoy.

### Paso 5 — Escala por profundidad: entidades y personaje

- **Archivo**: `src/components/level/runtime/RuntimeEntity.tsx`, `RuntimePlayer.tsx` (envolver con el factor de `depth.ts`), `ContactShadow.tsx` (nuevo), mismo tratamiento en `EntityLayer.tsx` del editor para previsualización WYSIWYG.
- **Sistema afectado**: renderizado de entidades/jugador en editor y runtime.
- **Dependencia**: Pasos 1-2.
- **Criterio de aceptación**: una entidad cerca de `range.nearY` se ve visiblemente más grande que una en `range.farY`, con sombra proporcional; el y-sort (oclusión) no cambia de comportamiento; con `depth.enabled = false` el resultado es idéntico al actual (escala = 1, sin sombra).
- **Riesgo**: medio (toca el render de todas las entidades y del jugador; hay que verificar que el punto de anclaje —pies— se mantiene correcto). **Rollback**: envoltura aislada, se puede quitar sin afectar `Render`/`Avatar` originales.

### Paso 6 — Movimiento por teclado

- **Archivo**: `src/lib/level/runtime/useKeyboardMovement.ts` (nuevo), integrado en `LevelRuntime.tsx`/`RuntimeCanvas.tsx`.
- **Sistema afectado**: input del runtime del nivel (y de Ciudad Central si el Paso 0 está activo).
- **Dependencia**: Paso 0 (para que aplique a Ciudad Central) + el motor de navegación existente (sin cambios).
- **Criterio de aceptación**: flechas/WASD mueven al personaje respetando la malla; se desactiva con overlays abiertos; anuncia inalcanzable igual que el clic.
- **Riesgo**: medio (nuevo listener global de teclado — cuidado de no interferir con atajos del editor, que deben quedar fuera de alcance de este hook al vivir en rutas distintas). **Rollback**: quitar el hook, el clic/tap sigue funcionando exactamente igual.

### Paso 7 — Control táctil explícito (D-pad)

- **Archivo**: `src/components/level/runtime/TouchDPad.tsx` (nuevo).
- **Sistema afectado**: UI del runtime, solo visual/input, no toca lógica de movimiento (reutiliza el mismo camino que el Paso 6).
- **Dependencia**: Paso 6 (comparten el mecanismo de "objetivo calculado + walkTo").
- **Criterio de aceptación**: visible en viewports pequeños/dispositivos táctiles, botones accesibles (`aria-label`, tamaño), mueve al personaje igual que teclado/clic.
- **Riesgo**: bajo (aditivo, puramente opcional para el jugador). **Rollback**: ocultar el componente.

### Paso 8 — Pulido: reduced-motion, sombra final, ease-out de llegada

- **Archivo**: `globals.css` (clase de sombra compartida, reglas de `prefers-reduced-motion` extendidas), `useAlexMovement.ts` (ease-out opcional en el último tramo).
- **Sistema afectado**: accesibilidad/rendimiento transversal.
- **Dependencia**: Pasos 4-5.
- **Criterio de aceptación**: `prefers-reduced-motion` colapsa las transiciones continuas nuevas igual que ya hace con `segmentMs`; sombra no usa `blur()` costoso repetido.
- **Riesgo**: bajo. **Rollback**: trivial.

### Paso 9 (opcional, no bloqueante) — Capas de parallax con arte nuevo + ambiente configurable

- **Archivo**: N/A (tarea de ilustración) + configuración desde `DepthPanel` (ya construido en Paso 3-4) + catálogo CSS de 3-4 efectos ambientales (`globals.css`, mismo patrón que `anim-flicker`/`anim-breathe` ya existentes) + campo `effect` en `BackgroundLayer` (§E.1/§C.4).
- **Dependencia**: Pasos 3-4.
- **Criterio de aceptación**: 1-2 capas de silueta/horizonte añadidas a Ciudad Central (o a un nivel de ejemplo) con `depth < 1`, visiblemente rezagadas respecto al fondo principal al mover la cámara; al menos un efecto ambiental (`glow`/`particles`/`fog`) configurado desde el editor sobre una capa se ve reflejado en Play Test, con máximo 2-3 efectos simultáneos por presupuesto blando de rendimiento (§C.4).
- **Riesgo**: bajo, puramente aditivo. Puede quedar fuera del alcance comprometido de esta fase y entregarse después.

### Paso 10 — Cobertura de pruebas y cierre

- **Archivo**: `e2e/nivel-runtime.spec.ts` (extender), nuevas suites de unidad para `depth.ts`, adaptación puntual de `e2e/aventura.spec.ts` si el Paso 0 se activó.
- **Dependencia**: todos los anteriores.
- **Criterio de aceptación**: ver §M completa en verde.
- **Riesgo**: bajo. **Rollback**: N/A (solo pruebas).

---

## O. Criterios de aceptación finales

Para verificar que se logró **"una escena 2.5D viva"** y no solo "una imagen con animaciones encima":

1. **El personaje cambia de tamaño de forma creíble al moverse** entre una posición cercana y una lejana dentro de la misma escena (verificable visualmente y por el `transform` computado), con una sombra de contacto que refuerza la sensación de apoyo sobre el suelo — no un sprite plano flotando.
2. **Al menos una capa visual se mueve a distinta velocidad que el resto de la escena** cuando la cámara sigue al personaje (parallax real, aunque sea de una sola capa adicional) — no toda la imagen se desplaza como un bloque monolítico único, como ocurre hoy.
3. **Toda esa configuración (rango de profundidad, escalas, capas, sombra) vive en el `LevelDefinition` del nivel, editable desde `/panel/editor`**, verificable abriendo el editor, cambiando un valor, y viendo el resultado reflejado en Play Test sin tocar ningún archivo de código — cumple literalmente el requisito rector del encargo.
4. **Ciudad Central, la escena que juegan los niños hoy, muestra estos cambios** (si se activó el Paso 0) — no solo un nivel de ejemplo nuevo que nadie más ve.
5. **El movimiento funciona con clic, teclado y control táctil**, los tres produciendo el mismo comportamiento de fondo (respeto de la malla de navegación, mismo aviso de inalcanzable) — verificable con las mismas pruebas de pose muestreada que ya usa el Level Editor.
6. **Cero regresión** en: los 7 E2E legados (o su adaptación explícita y documentada si el Paso 0 se activó), el sistema de progreso académico (mastery/estrellas/badges/prerrequisitos — mismos documentos Firestore escritos, ni uno más ni uno menos), el rendimiento del motor de navegación (`buildVisibilityGraph`/`findPathInMesh` dentro de los mismos presupuestos ya validados), y la accesibilidad (`prefers-reduced-motion`, foco, `aria-live`, axe sin violaciones serias).
7. **Cero dependencias nuevas, cero rutas API nuevas, cero colección de Firestore nueva** — la profundidad vive dentro del mismo documento `LevelDefinition` ya cubierto por las reglas existentes.
8. **El sistema de entidades sigue siendo "cero `switch` por tipo"**: añadir profundidad no obligó a ningún componente de tipo de entidad (`npc.tsx`, `door.tsx`, etc.) a saber nada sobre profundidad — la envoltura es genérica y externa.

---

*(Fin del documento. Basado en inspección directa del código en la rama `claude/level-editor-fase-10-integracion-academica`, commit `976a5c0`, más `docs/level-editor-plan.md` como referencia de arquitectura ya construida.)*
