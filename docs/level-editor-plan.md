# Plan de implementación — Level Editor de Math Quest

> **Nota de autoría.** Las secciones **5-8** (Arquitectura del Level Editor, Arquitectura de navegación, Arquitectura de entidades, Arquitectura de eventos) y **17-20** (Play Test, Archivos a crear/modificar, Dependencias entre tareas, Criterios de aceptación) fueron redactadas por **Opus 5** tras inspeccionar el repositorio a fondo, según el flujo de dos fases pedido.
>
> Las secciones **1-4** y **9-16** las redactó **Sonnet 5** porque Opus 5 agotó su cuota de sesión a mitad de la entrega (falló al enviar la parte 3/3, justo cuando iba a escribir estas secciones). Sonnet 5 inspeccionó directamente el código fuente (los mismos archivos que cita Opus, con los mismos números de línea) para mantener coherencia terminológica y de modelo de datos con las secciones 5-8/17-20 ya recibidas. **Estas secciones no han sido revisadas por Opus 5** — trátalas como borrador a validar antes de pasar a Fase B (implementación con Sonnet 5). Si más adelante Opus 5 recupera cuota, lo ideal es pedirle una pasada de revisión sobre 1-4 y 9-16 específicamente.

---

## 1. Diagnóstico de arquitectura actual

Inspección directa de: `src/lib/world/navmesh.ts`, `src/lib/world/state.ts`, `src/lib/world/questScene.ts`, `src/lib/world/quests.ts`, `src/lib/world/scenes.ts`, `src/components/world/QuestScene.tsx`, `src/components/world/PuzzleOverlay.tsx`, `src/components/world/WalkDebugOverlay.tsx`, `src/components/world/WorldHud.tsx`, `src/components/world/useCameraBox.ts`, `src/lib/world/walkableAreaCode.ts`, `src/app/api/dev/walkable-area/route.ts`, `src/lib/curriculum.ts`, `src/lib/problem.ts`, `src/lib/attemptRecorder.ts`, `src/lib/economy.ts`, `src/lib/firebase.ts`, `firestore.rules`, `src/lib/types.ts`, `src/components/family/PanelShell.tsx`.

### 1.1 Movimiento de Alex

El movimiento vive enteramente en `QuestScene.tsx` + `navmesh.ts`, sin ningún framework de físicas ni motor externo:

- **Geometría**: una única `WalkableArea = { boundary: Polygon; holes: Polygon[] }` por escena, en % de la imagen de fondo (`navmesh.ts:28-33`). Hoy solo existe una instancia real: `CIUDAD_CENTRAL_WALKABLE` (`questScene.ts:122-207`), trazada a mano con la propia herramienta de debug.
- **Pathfinding**: grafo de visibilidad + Dijkstra reconstruido en cada consulta (`navmesh.ts:210-292`, función `visibilityPath` interna, no exportada). `findPath(from, to, area)` es la API pública (`navmesh.ts:299-304`). Con un solo contorno + huecos y ~60 vértices, reconstruir el grafo en cada clic es submilisegundo — pero **no está memoizado**, y **no soporta múltiples polígonos transitables** ni "inalcanzable": si Dijkstra no encuentra camino, devuelve `[from, to]`, una línea recta que puede atravesar geometría (`navmesh.ts:283`, con comentario propio "no debería pasar" — asunción que un Level Editor con zonas desconectadas por diseño rompe).
- **Animación**: `walkPath` en `QuestScene.tsx:176-234` interpola sobre un único `requestAnimationFrame`, con `walkToken` para cancelar rutas viejas y reloj real (no depende de que un `setTimeout` dispare justo cuando termina una transición CSS). `segmentMs(dist)` clampa entre 420-1500ms según distancia (`:157-159`), y es `0` con `prefers-reduced-motion` (salto directo).
- **Clic para moverse**: `wander()` (`:294-307`) traduce el clic en coordenadas de pantalla a % de imagen usando `sceneBox` (la caja de cámara), proyecta al punto transitable más cercano con `nearestWalkablePoint`, y llama `walkPath(findPath(...))`.
- **Acercarse a un hotspot**: `approach()` (`:276-292`) calcula ruta al `standX/standY` del hotspot, y tras llegar gira al personaje hacia el objeto y dispara `openFor(h)`.
- **Constante de módulo**: `GAME_WALKABLE = dedupeArea(CIUDAD_CENTRAL_WALKABLE)` (`:65`) se calcula una sola vez al cargar el módulo — el pathfinding real nunca usa la constante cruda, que sigue siendo la fuente editable por `WalkDebugOverlay`.
- **z-index fijo**: el avatar tiene `z-20` fijo (`:422`) y los hotspots quedan por encima (`QuestHotspot.tsx`) — nunca hay "detrás de un objeto": es plano, sin profundidad real.

Esto **coincide exactamente** con lo que Opus 5 describe en la §6.1-6.2 del plan (tabla "hoy vs nuevo", extensión de `navmesh.ts` con `NavigationMesh`/`isWalkableInMesh`/`buildVisibilityGraph`/`findPathInMesh` como funciones nuevas y los wrappers viejos reescritos en una línea).

### 1.2 Cómo se renderizan los escenarios

No hay ningún sistema de tiles ni motor de escena: cada escena es **una imagen `.webp` de fondo + una cámara que seguí un foco + capas HTML absolutas en %**.

- `useCameraBox.ts`: dado el tamaño del contenedor y el tamaño nativo de la imagen, calcula un rectángulo tipo `object-fit: cover` que además se desplaza (clampado a los bordes) para seguir `focus` (la posición del avatar) — el "lente de cámara" del juego (`useCameraBox.ts:12-24`).
- `QuestScene.tsx:400-477`: dentro de un `div` posicionado exactamente en `sceneBox.left/top/width/height`, se apilan: imagen de fondo (`<img>` con filtro CSS condicional, `:413-415`) + `SceneFx` (partículas/ambiente) + avatar (`div` absoluto en `%`) + hotspots (`QuestHotspot`, uno por objeto interactivo) + flecha guía + animación de estrella. **Todo el sistema de coordenadas es "% de la imagen completa"** — el mismo que usan los `x/y/standX/standY` de cada hotspot.
- Los overlays (diálogo, puzzle, misión, recompensa) son modales `fixed inset-0` fuera de esa jerarquía (`QuestOverlays.tsx`, `PuzzleOverlay.tsx`).
- **Una sola escena real hoy** (Ciudad Central); las demás zonas (`ZoneScene.tsx`) usan un modelo más simple y genérico (`scenes.ts`: `ZoneScene { background, interactables: Interactable[] }`, sin polígono de navegación — el avatar no "camina" ahí, es una grilla de tarjetas clicables). El Level Editor apunta al modelo de `QuestScene`, no al de `ZoneScene`.

### 1.3 Componentes existentes reutilizables

| Componente | Qué hace hoy | Por qué sirve para el editor |
|---|---|---|
| `WalkDebugOverlay.tsx` | Editor visual completo de un `WalkableArea`: arrastrar vértices, insertar con doble clic o handle "+", borrar con Shift+clic, dibujar un hueco nuevo, `localStorage` de borrador, "Copiar código", "Guardar en archivo" vía `/api/dev/walkable-area` | Es, literalmente, el 80% de la herramienta "dibujar polígono" que pide el editor — Opus lo toma como base directa de `PolygonEditor` (§6.3) |
| `useCameraBox.ts` | Cámara cover+follow | El runtime del nivel (Fase 9 de Opus) la reutiliza tal cual |
| `PuzzleOverlay.tsx` | Puente entre un objeto del mundo y `mod.generateProblem()` + `recordModuleAttempt` | Es el overlay de desafío que el Play Test debe reutilizar (ver §9 más abajo) |
| `QuestionWidget.tsx` | Renderiza cualquier `Problem` según su `inputType` | Usado tal cual dentro de `PuzzleOverlay`; el `ChallengePicker` del editor también lo usa para la vista previa |
| `Avatar.tsx` | Sprite de Alex con variante y animación de caminar | Se reutiliza en el runtime del nivel sin cambios |
| `src/components/family/ui.tsx` (`SectionCard`, `EmptyState`, `SkeletonRows`) | Componentes de lista/estado ya usados en `/panel/*` | Base visual de la lista de niveles en `/panel/editor` |
| `src/components/family/PanelShell.tsx` | Sidebar desktop / tabs móvil, patrón `NAV` (`:12-18`) | Se añade un ítem de navegación "Editor" sin tocar el resto |
| `src/lib/world/walkableAreaCode.ts` (`formatArea`) | Serializa un `WalkableArea` a literal TS | Útil solo como referencia de formato, no se reutiliza directamente (el editor persiste en Firestore, no en código fuente) |

### 1.4 Cómo funciona Firebase/Firestore

- **Carga perezosa obligatoria**: `getFirebase()` (`src/lib/firebase.ts:35-38`) importa `firebase/app`/`firebase/auth`/`firebase/firestore` con `import()` dinámico, nunca estático. El comentario en el archivo (`:22-32`) explica por qué: el deploy es a Cloudflare Workers vía `opennextjs-cloudflare`, y `firebase/firestore` usa `protobufjs`, que compila con `new Function` al cargarse — prohibido en el runtime de Workers. Un `import` estático rompe **cualquier página**, no solo las que usan Firestore. **Esto es una restricción dura para todo el código nuevo**: ningún archivo del Level Editor puede hacer `import { ... } from "firebase/firestore"` a nivel de módulo fuera de `src/lib/firebase.ts`.
- **Caché persistente de una sola pestaña**: `getOrInitFirestore` (`:101-115`) usa `persistentLocalCache` + `persistentSingleTabManager({ forceOwnership: true })` — la app asume un solo dispositivo/pestaña activa a la vez.
- **Emuladores**: `NEXT_PUBLIC_FIREBASE_EMULATORS=1` conecta a Auth+Firestore emulator local (`:62-69`), usado por los E2E de Playwright.
- **Modelo de datos actual**: todo cuelga de `/parents/{parentId}` (documento del padre autenticado) → `/children/{childId}` → colecciones `skillsProgress/`, `attempts/`, `starLedger/`, `redemptionRequests/`, `placements/`, `badges/`. Un catálogo compartido de solo lectura en `/curriculum/{document=**}`. **No existe ninguna colección de "progreso de mundo/nivel"** — es la ausencia más significativa del modelo actual, y confirma la restricción del enunciado ("no crear estado académico paralelo").
- **`firestore.rules`** (`firestore.rules:17-59`): función `isParent(parentId)` (`request.auth.uid == parentId`), reglas anidadas por colección bajo `/parents/{parentId}/children/{childId}/...`, y un catch-all final `allow read, write: if false`. **Cualquier colección nueva necesita su propio bloque de reglas explícito** — el catch-all la bloquea por defecto.
- **Ruta API existente**: `src/app/api/dev/walkable-area/route.ts` — la única ruta API del proyecto, y es **exclusivamente de desarrollo** (`NODE_ENV !== "development"` ⇒ 404 inmediato, `:45-47`). No toca Firestore: escribe directo al archivo fuente en disco. **No es un patrón a replicar** para la persistencia del editor (que debe ser 100% Firestore desde el cliente), pero sí es la referencia de UX para "guardar sin diálogo de archivo" que ya conoce el equipo.

### 1.5 Cómo están estructurados los módulos académicos

`curriculum.ts` define un **grafo plano de 50 módulos** (`MODULES: ModuleDef[]`, `:55-642`), no "5 hilos con 10 niveles fijos": cada `ModuleDef` tiene `id`, `strandSlug`, `difficulty` (solo determina estrellas), `tier` (agrupa visualmente), `prerequisites: string[]` (pueden cruzar hilos — p. ej. `geometria-d10` depende de `algebra-d5`), `generateProblem`, `ConceptComponent`, y opcionalmente `href` propio. `isUnlocked`/`isMastered`/`missingPrerequisites`/`recommendedModule`/`nextChallenge` son funciones puras sobre `Record<string, SkillProgress>` — **ninguna requiere red ni Firestore**, son cálculo local sobre datos ya cargados. El `id` de cada módulo (p. ej. `"aritmetica-d1"`) es directamente la clave del documento `skillsProgress/{id}` — el Level Editor debe referenciar exactamente este `id`, nunca inventar uno propio.

### 1.6 Cómo se representan los desafíos matemáticos

`problem.ts` define `Problem { id, difficulty, kind, prompt, answer, choices?, inputType, ... }` — generado en el momento por `mod.generateProblem()` (una función pura, sin red). `isCorrectAnswer(problem, given)` valida (con tolerancia para `decimal`). `QuestionWidget` (no leído línea por línea, pero referenciado en `PuzzleOverlay.tsx:11,236`) renderiza el control de entrada correcto según `problem.inputType` (`choice`, `integer`, `decimal`, `numberLine`, `groupTens`, `balanceWeight`). **Un desafío nunca se guarda**: se genera, se muestra, se evalúa y se descarta — solo el *resultado* (`correct`, `stars`) se persiste, vía `recordModuleAttempt`.

### 1.7 Cómo funcionan las interacciones actuales

En Ciudad Central, las interacciones son un **array TS hardcodeado**: `CIUDAD_CENTRAL_HOTSPOTS: CiudadCentralHotspot[]` (`questScene.ts:209-282`), cada uno con `id, kind, label, x, y, standX, standY, activeAt (StepId), lockedNote, objectiveId?, intro: string[], outcome`. `hotspotState(hotspot, step)` (`questScene.ts:60-66`) deriva `"activo" | "resuelto" | "bloqueado"` comparando el `activeAt` del hotspot contra el `step` actual (nunca un booleano guardado por hotspot). Al hacer clic (`QuestScene.tsx:245-274`, `openFor`), si el hotspot está activo y tiene `objectiveId`, se abre `PuzzleOverlay`; si no, un diálogo narrativo. **No hay sistema de eventos ni de acciones encadenadas** — cada consecuencia (banner, `+★`, flash, "abrir siguiente zona") está cableada a mano dentro de `handlePuzzleClose` (`QuestScene.tsx:336-349`) y `onDialogContinue` (`:314-324`), con `if (hotspot.id === "compuerta")` literal. Esto es exactamente lo que el sistema de eventos de Opus (§8) generaliza.

### 1.8 Cómo funciona el estado del juego

Este es el principio arquitectónico más importante del proyecto, y aplica sin excepción al Level Editor:

> **No existe estado de progreso narrativo/de mundo guardado en ningún lado.** Todo se deriva, en cada render, del progreso académico real (`skillsProgress`).

Evidencia:
- `world/state.ts:14-21` — `interactableState()` deriva `"bloqueado"|"disponible"|"activado"|"dominado"` de `isMastered`/`isUnlocked`/existencia de progreso. El comentario del archivo (`:4-10`) lo dice explícitamente: "NO es un sistema de progreso nuevo".
- `world/quests.ts:91-113` — `questProgress()` deriva cada objetivo (`done: hasCorrectAttempt(...)`) del progreso real; el comentario (`:6-10`): *"no hay estado de misión guardado en ningún lado [...] no puede desincronizarse del currículo: es una lectura de él, no una copia"*.
- `QuestScene.tsx:94,153` — `step` se recalcula en cada render con `stepFromQuestProgress(quest, npcGreeted)`, nunca un `useState<StepId>` persistido; el único estado de sesión (`npcGreeted`) es efímero y no académico.
- `WorldHud.tsx:19-23` — "AXIA" es solo el nombre narrativo de las estrellas que ya existen (`starLedger`); el comentario es explícito: *"no hay una moneda nueva, ni un dato nuevo en Firestore"*.

**Consecuencia directa para el Level Editor**: el estado "vivo" de un nivel durante el juego (qué puerta está abierta, qué terminal está encendida) **no puede** persistirse como progreso por-nivel en Firestore — tiene que derivarse en cada carga a partir de eventos que ya ocurrieron de verdad en el sistema académico existente (acertar un módulo, dominarlo). Esto es exactamente lo que Opus describe en la §9.6 con `deriveInitialState` (mencionado en la Fase 9 del plan de Opus) y lo que el criterio A7 (§20.2) exige verificar.

### 1.9 Conflictos potenciales con el nuevo Level Editor

| # | Conflicto | Cómo lo resuelve el plan |
|---|---|---|
| C1 | `navmesh.ts` asume **un solo** `WalkableArea` (boundary + holes); el editor necesita N polígonos transitables y M bloqueados independientes | Opus extiende `navmesh.ts` con `NavigationMesh`/`isWalkableInMesh`/etc. **sin romper** las funciones viejas (adaptador `meshFromWalkableArea`, §6.2) |
| C2 | Los hotspots/objetos de escena son **literales TS por escena** (`CIUDAD_CENTRAL_HOTSPOTS`), no datos — no hay ningún "registro de tipos de entidad" | El editor introduce `entities/registry.ts` como sistema paralelo, dirigido por datos; Ciudad Central **no se migra automáticamente** (ver §12 más abajo) |
| C3 | z-index fijo del avatar y los hotspots impide que un objeto quede "delante" de Alex | El runtime nuevo pinta con y-sort (§7.4 de Opus); no se toca el z-index de `QuestScene.tsx` existente |
| C4 | No existe ninguna colección Firestore de progreso de nivel/mundo (§1.8) — cualquier intento de guardar "puerta abierta" como dato persistente violaría el principio central del proyecto | El estado del mundo se deriva en cada `PLAY` (equivalente a `deriveInitialState`), nunca se persiste aparte — validado como criterio de aceptación A7 |
| C5 | El único precedente de "guardar desde el editor" (`WalkDebugOverlay` → `/api/dev/walkable-area`) escribe al **archivo fuente**, un patrón exclusivo de `next dev` que no existe en producción (Cloudflare Workers) | El editor nuevo usa exclusivamente Firestore vía `getFirebase()` — no se crea ninguna ruta API nueva (criterio A4) |
| C6 | `firestore.rules` tiene un catch-all `allow read, write: if false` | Hace falta añadir explícitamente `match /levels/{levelId}` (y su subcolección `versions`) bajo `/parents/{parentId}`, y **desplegar las reglas a mano** — no es automático |
| C7 | `PuzzleOverlay` está cerrado sobre `Interactable`/`ModuleDef` de `scenes.ts`/`curriculum.ts`, con textos (`KIND_HEADLINE`, `KIND_ACTION`) indexados por `InteractionKind` fijo (`terminal`, `puerta`, `objeto`, `npc`, `mecanismo`) | El editor no reutiliza `Interactable` — genera su propio `ChallengePlacement` (§4) y ajusta `PuzzleOverlay` con 2 props opcionales para inyectar el callback de guardado (ver §9) sin duplicar su UI |
| C8 | Cambios sin commitear ya en curso (`git diff --stat`: `QuestScene.tsx` +307/-, `questScene.ts` +114, `WorldHud.tsx`, `badges.ts`, `problem.ts`) más los archivos nuevos sin trackear (`navmesh.ts`, `WalkDebugOverlay.tsx`, `useCameraBox.ts`, `walkableAreaCode.ts`, `src/app/api/dev/`) | Todo esto **ya está incorporado** en la lectura de este plan (se leyó el árbol de trabajo real, no `HEAD`) — es la base sobre la que se construye, no un conflicto a resolver aparte |

### 1.10 Qué reutilizar / modificar / crear (resumen)

- **Reutilizar sin tocar**: `Avatar.tsx`, `useCameraBox.ts`, `QuestionWidget.tsx`, `curriculum.ts`, `problem.ts` + generadores por hilo, `attemptRecorder.ts`, `economy.ts`, `mastery.ts`, `badges.ts`/`masteryRewards.ts`, `firebase.ts`, `family/ui.tsx`, todo lo de `/jugar/[childId]/[strand]/...` y la Ciudad Central actual.
- **Extender sin romper compatibilidad**: `navmesh.ts` (multi-polígono, ver §6 de Opus), `firestore.rules` (nueva colección `levels`), `PanelShell.tsx` (1 ítem de nav), `PuzzleOverlay.tsx` (2 props opcionales, ver §9).
- **Crear desde cero**: todo `src/lib/level/**` (esquema, validación, navegación de nivel, entidades, eventos, persistencia), todo `src/components/level/editor/**` y `src/components/level/runtime/**`, las rutas `/panel/editor` y `/jugar/[childId]/nivel/[levelId]`.

---

## 2. Componentes existentes que serán reutilizados

| Componente/módulo | Ruta | Uso en el Level Editor |
|---|---|---|
| `WalkDebugOverlay` | `src/components/world/WalkDebugOverlay.tsx` | Base literal de `PolygonEditor` (interacción de vértices, handles "+", colores) — ver §6.3 de Opus |
| `useCameraBox` | `src/components/world/useCameraBox.ts` | Cámara del runtime del nivel, sin cambios |
| `PuzzleOverlay` | `src/components/world/PuzzleOverlay.tsx` | Overlay de desafío del Play Test y del juego real — con 2 props opcionales nuevas |
| `QuestionWidget` | `src/components/topic/QuestionWidget.tsx` | Renderiza el `Problem` dentro de `PuzzleOverlay` y en la vista previa de `ChallengePicker` |
| `Avatar` | `src/components/world/Avatar.tsx` | Sprite de Alex en el runtime del nivel |
| `useDialogFocus` | `src/components/world/useDialogFocus.ts` | Foco/`Escape` accesible en los overlays del editor y del runtime (diálogo, misión) |
| `SectionCard` / `EmptyState` / `SkeletonRows` | `src/components/family/ui.tsx` | Lista de niveles en `/panel/editor` |
| `PanelShell` | `src/components/family/PanelShell.tsx` | Se añade un ítem a `NAV` (`:12-18`); estructura de layout intacta |
| `curriculum.ts` (`MODULES`, `getModule`, `isUnlocked`, `missingPrerequisites`) | `src/lib/curriculum.ts` | Único punto de acceso a los módulos académicos desde `ChallengePicker` y `runtime` |
| `problem.ts` (`isCorrectAnswer`) | `src/lib/problem.ts` | Evaluación de respuestas — sin cambios |
| `attemptRecorder.ts` (`recordModuleAttempt`) | `src/lib/attemptRecorder.ts` | Única vía de escritura de intentos/estrellas — el runtime del nivel la llama exactamente igual que `PuzzleOverlay` hoy |
| `economy.ts`, `mastery.ts`, `badges.ts`, `masteryRewards.ts` | `src/lib/*.ts` | Sin cambios; se consumen indirectamente vía `recordModuleAttempt`/`awardMasteryBadges` |
| `firebase.ts` (`getFirebase`) | `src/lib/firebase.ts` | Único punto de entrada a Firestore — el `levelRepository` nuevo lo usa igual que el resto del código |
| `navmesh.ts` (funciones actuales) | `src/lib/world/navmesh.ts` | **Extendido**, no reemplazado — ver §6 de Opus |

---

## 3. Componentes nuevos necesarios

Agrupados por capa (la lista exhaustiva de archivos está en la §18 de Opus; acá el rol de cada grupo):

- **`src/lib/level/`** (lógica pura, sin React ni Firestore salvo `persistence/`): esquema (`schema.ts`), valores por defecto (`defaults.ts`), validación (`validate.ts`), migración (`migrate.ts`), geometría multi-polígono (extensión de `navmesh.ts`, no un archivo nuevo), serialización segura para Firestore (`serialize.ts`), registro de entidades (`entities/`), sistema de eventos (`events/`), runtime del nivel (`runtime/`), persistencia (`persistence/`), adaptador legado (`legacy/ciudadCentral.ts`).
- **`src/components/level/editor/`**: shell del editor (provider, reducer, top/bottom bar, toolbox, canvas por capas, panel de propiedades), herramientas de navegación (`PolygonEditor`), editores de gameplay (`EventChainEditor`, `ChallengePicker`, `DialogEditor`, `MissionEditor`), panel de problemas (`IssuesPanel`).
- **`src/components/level/runtime/`**: el "juego real" de un nivel construido en el editor — `LevelRuntime`, capas de canvas, overlays de diálogo/desafío/misión, HUD, barra de Play Test.
- **Rutas nuevas**: `/panel/editor` (lista), `/panel/editor/[levelId]` (editor), `/jugar/[childId]/nivel/[levelId]` (runtime real, fuera del editor).

No se crea ninguna arquitectura académica nueva: `ChallengePicker` y el runtime de desafíos son **capas finas** sobre `curriculum.ts`/`problem.ts`/`attemptRecorder.ts` ya existentes.

---

## 4. Modelo de datos

`src/lib/level/schema.ts` — solo tipos + una constante de versión. Todo en TypeScript puro, sin dependencias de Firebase ni de React (los tipos de React de `EntityTypeDef.Render` son la única excepción, y viven en `entities/registry.ts`, no aquí). Coherente con las referencias ya usadas por Opus en las §5-9 (`LevelEntity`, `NavPolygon`, `EntityTypeDef`, `LevelEventRule`, `ChallengePlacement`, etc.).

```ts
// src/lib/level/schema.ts

export const LEVEL_SCHEMA_VERSION = 1;

export interface Vec2 { x: number; y: number }   // siempre % de la imagen de fondo, 0-100

/* ─────────────────────────── Nivel completo ─────────────────────────── */

export interface LevelDefinition {
  id: string;
  name: string;
  /** Versión de guardado (optimista): se incrementa en cada `saveLevel` exitoso.
   *  No confundir con `schemaVersion`. */
  version: number;
  schemaVersion: number;               // = LEVEL_SCHEMA_VERSION al crear; migrate.ts lo actualiza al leer
  background: LevelBackground;
  navigation: LevelNavigation;
  entities: LevelEntity[];
  zones: LevelZone[];                  // zonas de interacción / disparo, poligonales o circulares
  dialogs: LevelDialog[];
  challenges: ChallengePlacement[];     // referencias a desafíos EXISTENTES, nunca contenido propio
  missions: LevelMission[];
  events: LevelEventRule[];
  metadata: LevelMetadata;
}

export interface LevelMetadata {
  authorUid: string;                   // uid del padre autenticado — mismo dueño que /parents/{uid}
  createdAt: number;                   // epoch ms
  updatedAt: number;
  /** Sinopsis corta opcional, solo informativa (lista de niveles). */
  description?: string;
}

/* ─────────────────────────── Fondo ─────────────────────────── */

export interface LevelBackground {
  src: string;                         // ruta bajo /illustrations/, mismo criterio que hoy
  width: number;                       // px nativos — igual que CIUDAD_CENTRAL_IMAGE_SIZE
  height: number;
  alt: string;                         // obligatorio (validateLevel lo exige) — accesibilidad
  projection: "flat" | "isometric";    // solo afecta la rejilla del editor, nunca las coordenadas
  /** Filtros condicionados por flags de evento — sustituye al `if (flags.cityRestored)` hardcodeado
   *  de QuestScene.tsx:413-415 por una regla configurable. */
  filters?: LevelBackgroundFilter[];
}

export interface LevelBackgroundFilter {
  id: string;
  when: ConditionExpr;
  css: string;                         // p. ej. "brightness(1.1) saturate(1.25)"
}

/* ─────────────────────────── Navegación ─────────────────────────── */

export interface NavPolygon {
  id: string;
  points: Vec2[];                      // polígono simple, ≥3 vértices, en % de imagen
  /** Si empieza activo (transitable/bloqueado) o si depende de un evento
   *  (UNLOCK_AREA) para activarse — ver runtime/navigation.ts. */
  initiallyEnabled: boolean;
}

export interface LevelExit {
  id: string;
  polygon: Vec2[];                     // zona de salida del nivel (vuelve al mapa/zona anterior)
  targetHref: string;                  // ruta a la que navega (p. ej. la ZoneScene existente)
  label: string;
}

export interface LevelNavigation {
  walkablePolygons: NavPolygon[];
  blockedPolygons: NavPolygon[];
  spawn: Vec2;                         // punto de inicio de Alex — debe caer dentro de un walkable
  exits: LevelExit[];                  // "punto de destino" del enunciado
}

/* ─────────────────────────── Entidades ─────────────────────────── */

export type EntityTypeId =
  | "player-spawn" | "npc" | "enemy" | "door" | "terminal" | "collectible" | "interactive";

export type PropertyValue = string | number | boolean | Vec2 | string[];

export interface EntityInteraction {
  mode: "click" | "proximity" | "none";
  standPoint: Vec2 | null;             // dónde se detiene Alex antes de interactuar
  radius: number;                      // % de imagen, usado si mode === "proximity"
  prompt: string;
  lockedNote: string;
  enabledWhen: ConditionExpr;          // por defecto { kind: "always" }
}

export interface EntityStateDef {
  id: string;
  label: string;
  sprite: string | null;               // override de imagen; null = usa el arte del tipo
  visible: boolean;
  /** Ids de NavPolygon (de `blockedPolygons`) que quedan activos como
   *  bloqueadores mientras la entidad está en este estado — así una puerta
   *  cambia la malla de navegación de verdad, no solo el sprite. */
  activeBlockerIds: string[];
  className?: string;                  // animación/estilo (p. ej. "anim-breathe world-ring-glow")
}

export interface EntityStateMachineDef {
  initial: string;                     // id de un EntityStateDef
  states: EntityStateDef[];
}

/** Instancia colocada en el nivel. La lista de estados posibles vive en el
 *  EntityTypeDef (`defaultStates`); acá solo se guarda cuál es el estado
 *  inicial de ESTA instancia (por si se quiere colocar una puerta ya abierta,
 *  por ejemplo) — nunca el estado "actual" de una partida en curso, que es
 *  puramente de runtime (ver runtime/state.ts) y no se persiste. */
export interface LevelEntity {
  id: string;
  type: EntityTypeId;
  name: string;
  position: Vec2;
  rotation: number;                    // grados
  scale: number;                       // 1 = tamaño por defecto del tipo
  layer: number;                       // desempate del y-sort (§7.4 de Opus)
  visible: boolean;
  interaction: EntityInteraction;
  state: { initial: string };
  properties: Record<string, PropertyValue>;   // shape según EntityTypeDef.properties
}

/* ─────────────────────────── Zonas, diálogos, desafíos, misiones ─────────────────────────── */

export interface LevelZone {
  id: string;
  name: string;
  shape: { kind: "polygon"; points: Vec2[] } | { kind: "circle"; center: Vec2; radius: number };
}

export interface LevelDialogLine {
  speakerEntityId: string | null;      // null = narrador
  portrait?: string;
  text: string;
}

export interface LevelDialog {
  id: string;
  name: string;
  lines: LevelDialogLine[];
}

/** El editor SOLO referencia un desafío existente — nunca define enunciado,
 *  respuesta ni generador. `moduleId`/`activityId` son la misma clave que ya
 *  usa el sistema académico (`curriculum.ts`, `skillsProgress/{moduleId}`). */
export interface ChallengePlacement {
  id: string;
  moduleId: string;                    // ModuleDef.id real (p. ej. "aritmetica-d1")
  activityId: string;                  // por ahora siempre "puzzle" (única actividad hoy); reservado
  sourceEntityId: string;              // qué entidad dispara este desafío
}

export type ObjectiveSource =
  | { kind: "challenge"; challengeId: string }          // se cumple con hasCorrectAttempt real
  | { kind: "zone"; zoneId: string }                    // se cumple al entrar a la zona
  | { kind: "collectible"; entityId: string }           // se cumple al recogerlo
  | { kind: "flag"; flag: string; value: boolean };      // se cumple cuando un evento fija ese flag

export interface LevelMissionObjective {
  id: string;
  label: string;
  source: ObjectiveSource;
}

export interface LevelMission {
  id: string;
  title: string;
  premise: string;
  objectives: LevelMissionObjective[];
}

/* ─────────────────────────── Eventos ─────────────────────────── */

export type LevelEventType =
  | "ON_INTERACT" | "ON_CHALLENGE_STARTED" | "ON_CHALLENGE_SUCCESS" | "ON_CHALLENGE_FAILED"
  | "ON_ITEM_COLLECTED" | "ON_MISSION_COMPLETE" | "ON_ENTER_ZONE" | "ON_EXIT_ZONE";

export interface LevelEventTrigger {
  type: LevelEventType;
  entityId?: string;
  challengeId?: string;
  zoneId?: string;
  missionId?: string;
}

export type ConditionExpr =
  | { kind: "always" }
  | { kind: "flag"; flag: string; value: boolean }
  | { kind: "entityState"; entityId: string; state: string }
  | { kind: "all"; of: ConditionExpr[] }
  | { kind: "any"; of: ConditionExpr[] }
  | { kind: "not"; of: ConditionExpr };

export type LevelActionType =
  | "SET_FLAG" | "CHANGE_OBJECT_STATE" | "ACTIVATE_OBJECT" | "OPEN_DOOR" | "CLOSE_DOOR"
  | "UNLOCK_AREA" | "REVEAL_AREA" | "SHOW_DIALOG" | "SHOW_CLUE" | "SPAWN_OBJECT"
  | "UPDATE_MISSION" | "GENERATE_AXIA" | "START_CHALLENGE" | "MOVE_PLAYER" | "PLAY_SOUND";

export interface LevelAction {
  type: LevelActionType;
  params: Record<string, PropertyValue>;
  delayMs: number;                     // acumulado dentro de la cadena, ver §8.5 de Opus
}

export interface LevelEventRule {
  id: string;
  name: string;
  trigger: LevelEventTrigger;
  when: ConditionExpr;
  once: boolean;
  actions: LevelAction[];
}

/* ─────────────────────────── Validación ─────────────────────────── */

export interface LevelIssue {
  severity: "error" | "warning";
  message: string;
  /** A qué seleccionar si el usuario hace clic en el aviso. */
  targetRef?: { kind: Selection["kind"]; id?: string };
}
```

**Notas de diseño que hay que respetar en la implementación:**

1. **Nada de arrays anidados ni `undefined`.** Firestore prohíbe arrays de arrays y valores `undefined` (solo `null`). `LevelZone.shape` con discriminante `kind` evita el problema para polígono/círculo; `NavPolygon.points: Vec2[]` es un array de objetos, no de arrays, así que es válido tal cual. `serialize.ts` (§10) aplica `stripUndefined` antes de cada escritura como cinturón de seguridad.
2. **`ChallengePlacement` no es lo mismo que `LevelEntity`.** Una entidad (p. ej. la terminal) dispara un desafío a través de `sourceEntityId`, pero el desafío es un objeto de primera clase propio — así una misma entidad puede, en el futuro, disparar desafíos distintos según estado sin remodelar `LevelEntity`.
3. **`EntityStateDef.activeBlockerIds` es el mecanismo real de "puerta bloquea el paso".** No hay ningún campo booleano "bloqueado" en la entidad: la malla de navegación activa se recalcula (`buildRuntimeMesh`, §6.4 de Opus) a partir de qué `NavPolygon` de `blockedPolygons` está activo según el estado actual de cada entidad.
4. **Ningún campo de `LevelDefinition` guarda contenido académico.** `ChallengePlacement` es la única superficie de contacto con el currículo, y solo tiene `moduleId`/`activityId` — cumple el criterio A6 (§20.2 de Opus) por construcción.

---

> *(A partir de aquí, secciones 5-8 tal como las entregó Opus 5.)*

## 5. Arquitectura del Level Editor

### 5.1 Layout (5 zonas)

```
┌────────────────────────────────────────────────────────────────────────┐
│ EditorTopBar   MATH QUEST · Editor │ [nombre] │ ● Guardado │ Guardar │ ▶ Probar │
├───────────┬────────────────────────────────────────────┬───────────────┤
│  Toolbox  │              EditorCanvas                  │ PropertyPanel │
│  (izq)    │  ┌──────────────────────────────────────┐  │    (der)      │
│ NAVIGATION│  │ GridLayer                            │  │  Propiedades  │
│  OBJECTS  │  │ BackgroundLayer                      │  │  del elemento │
│  GAMEPLAY │  │ NavigationLayer (SVG 0 0 100 100)    │  │  seleccionado │
│  EDITING  │  │ ZoneLayer                            │  │  (genérico    │
│           │  │ EntityLayer (y-sort)                 │  │   por schema) │
│           │  │ SelectionLayer / PolygonEditor       │  │  + IssuesPanel│
│           │  └──────────────────────────────────────┘  │               │
├───────────┴────────────────────────────────────────────┴───────────────┤
│ BottomBar  🔍100% ─╫─ │ ⊞ Grid │ ⇥ Snap │ 👁 Nav Obj Zonas │ 🐞 │ ▶ Probar │
└────────────────────────────────────────────────────────────────────────┘
```

**Contenido exacto de cada sección de la toolbox** (los ítems se generan a partir de `ENTITY_TYPES` filtrando por `section`, no de una lista literal):

- **NAVIGATION**: Área transitable (`W`), Zona prohibida (`B`), Punto de inicio, Punto de destino.
- **OBJECTS**: NPC, Enemigo, Puerta, Terminal, Coleccionable, Objeto interactivo.
- **GAMEPLAY**: Zona de interacción, Diálogo, Misión, Desafío matemático, Evento, Activación (regla de evento), Zona bloqueada (atajo a `blockedPolygons`).
- **EDITING**: Seleccionar (`V`), Mover (`M`), Editar vértices (`N`), Agregar vértice (`A`), Eliminar (`Supr`), Duplicar (`Ctrl+D`), Deshacer (`Ctrl+Z`), Rehacer (`Ctrl+Shift+Z`).

**Responsive**: por debajo de `lg`, Toolbox y PropertyPanel colapsan a *drawers*, siguiendo el patrón ya usado en `src/components/family/PanelShell.tsx:129-152` (sidebar en desktop, barra inferior en móvil).

### 5.2 Gestión de estado del editor

**Un único `useReducer`. El estado del editor y el del gameplay NUNCA se mezclan** — son dos archivos, dos tipos y dos providers distintos, y `LevelRuntime` no importa nada de `src/components/level/editor/**` (verificado por regla ESLint, §11.4).

```ts
// src/components/level/editor/editorReducer.ts
export type EditorTool =
  | { kind: "select" }
  | { kind: "move" }
  | { kind: "editVertices" }
  | { kind: "addVertex" }
  | { kind: "drawPolygon"; role: "walkable" | "blocked" | "zone" }
  | { kind: "placeEntity"; entityType: EntityTypeId }
  | { kind: "setSpawn" }
  | { kind: "setExit" };

export type Selection =
  | { kind: "none" }
  | { kind: "entity"; id: string }
  | { kind: "polygon"; role: "walkable" | "blocked"; id: string }
  | { kind: "zone"; id: string }
  | { kind: "dialog"; id: string }
  | { kind: "challenge"; id: string }
  | { kind: "mission"; id: string }
  | { kind: "event"; id: string }
  | { kind: "spawn" }
  | { kind: "exit"; id: string }
  | { kind: "level" };            // propiedades globales (fondo, nombre)

export interface EditorViewport {
  zoom: number;                   // 0.25 – 4
  panX: number; panY: number;     // px
}

export interface EditorState {
  /** ÚNICA copia mutable del nivel. Todo lo demás es UI. */
  level: LevelDefinition;
  selection: Selection;
  tool: EditorTool;
  viewport: EditorViewport;
  grid: { visible: boolean; sizePct: number };
  snap: boolean;
  layerVisibility: { navigation: boolean; entities: boolean; zones: boolean; grid: boolean };
  debugNav: boolean;
  /** Polígono en curso de dibujo (misma idea que `drawingHole` en
   *  WalkDebugOverlay.tsx:88). */
  drafting: { role: "walkable" | "blocked" | "zone"; points: Vec2[] } | null;
  history: { past: LevelDefinition[]; future: LevelDefinition[] };
  dirty: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  saveError: string | null;
  issues: LevelIssue[];
  /** Modo prueba activo. NO altera `level` ni `history`. */
  playtestSessionId: number | null;
}
```

**Acciones del reducer**, separadas explícitamente entre las que mutan el nivel (empujan historial) y las que no:

```ts
export type EditorAction =
  // ─── no mutan el nivel (no tocan history) ───
  | { type: "SELECT"; selection: Selection }
  | { type: "SET_TOOL"; tool: EditorTool }
  | { type: "SET_VIEWPORT"; viewport: Partial<EditorViewport> }
  | { type: "TOGGLE_LAYER"; layer: keyof EditorState["layerVisibility"] }
  | { type: "TOGGLE_GRID" } | { type: "TOGGLE_SNAP" } | { type: "TOGGLE_DEBUG_NAV" }
  | { type: "SET_SAVE_STATE"; state: EditorState["saveState"]; error?: string | null }
  | { type: "SET_ISSUES"; issues: LevelIssue[] }
  | { type: "START_PLAYTEST" } | { type: "STOP_PLAYTEST" }
  | { type: "DRAFT_ADD_POINT"; point: Vec2 }
  | { type: "DRAFT_CANCEL" }
  // ─── mutan el nivel (empujan historial) ───
  | { type: "BEGIN_GESTURE" }                       // snapshot explícito (coalescencia)
  | { type: "SET_LEVEL_FIELD"; patch: Partial<LevelDefinition> }
  | { type: "SET_BACKGROUND"; background: LevelBackground }
  | { type: "ADD_POLYGON"; role: "walkable" | "blocked"; polygon: NavPolygon }
  | { type: "UPDATE_POLYGON"; role: "walkable" | "blocked"; id: string; patch: Partial<NavPolygon> }
  | { type: "MOVE_VERTEX"; role; id: string; index: number; point: Vec2 }
  | { type: "INSERT_VERTEX"; role; id: string; edgeIndex: number; point: Vec2 }
  | { type: "DELETE_VERTEX"; role; id: string; index: number }
  | { type: "DELETE_POLYGON"; role; id: string }
  | { type: "SET_SPAWN"; point: Vec2 }
  | { type: "ADD_EXIT" | "UPDATE_EXIT" | "DELETE_EXIT"; /* ... */ }
  | { type: "ADD_ENTITY"; entity: LevelEntity }
  | { type: "UPDATE_ENTITY"; id: string; patch: Partial<LevelEntity> }
  | { type: "SET_ENTITY_PROPERTY"; id: string; key: string; value: PropertyValue }
  | { type: "DELETE_ENTITY"; id: string }
  | { type: "DUPLICATE_ENTITY"; id: string }
  | { type: "ADD_ZONE" | "UPDATE_ZONE" | "DELETE_ZONE"; /* ... */ }
  | { type: "ADD_DIALOG" | "UPDATE_DIALOG" | "DELETE_DIALOG"; /* ... */ }
  | { type: "ADD_CHALLENGE" | "UPDATE_CHALLENGE" | "DELETE_CHALLENGE"; /* ... */ }
  | { type: "ADD_MISSION" | "UPDATE_MISSION" | "DELETE_MISSION"; /* ... */ }
  | { type: "ADD_EVENT" | "UPDATE_EVENT" | "DELETE_EVENT"; /* ... */ }
  | { type: "REPLACE_LEVEL"; level: LevelDefinition }   // carga / restaurar versión
  // ─── historial ───
  | { type: "UNDO" } | { type: "REDO" };
```

**Historial**: snapshots inmutables del campo `level`, tope `HISTORY_LIMIT = 50` (baja a 20 si `assertSize` detecta >200 KB, ver §14 P9). Los arrastres continuos (mover un vértice, mover una entidad) se **coalescen**: el `pointerdown` despacha `BEGIN_GESTURE` (empuja un snapshot), los `pointermove` intermedios mutan sin empujar. Es el mismo criterio que ya usa `WalkDebugOverlay` implícitamente al mantener `draft` en un solo `setDraft` por movimiento (`:118-126`).

**Regla del reducer**:
```ts
const MUTATING = new Set<EditorAction["type"]>([...]);
function editorReducer(state: EditorState, action: EditorAction): EditorState {
  if (action.type === "UNDO")  return undo(state);
  if (action.type === "REDO")  return redo(state);
  const next = apply(state, action);
  if (!MUTATING.has(action.type)) return next;
  if (action.type !== "BEGIN_GESTURE" && state.gestureOpen) return { ...next, dirty: true };
  return { ...next, dirty: true, history: push(state.history, state.level) };
}
```

### 5.3 Panel de propiedades genérico

`EditorPropertyPanel` **no tiene ningún `switch` por tipo de entidad**. Resuelve `getEntityType(entity.type).properties` y pinta un `PropertyField` por descriptor:

```tsx
{typeDef.properties.map((field) => (
  <PropertyField
    key={field.key}
    field={field}
    value={entity.properties[field.key] ?? field.default}
    level={level}                                   /* para poblar entityRef/zoneRef/... */
    onChange={(v) => dispatch({ type: "SET_ENTITY_PROPERTY", id: entity.id, key: field.key, value: v })}
  />
))}
```

Además de las propiedades del tipo, el panel muestra siempre las **comunes** (`name`, `position`, `rotation`, `scale`, `layer`, `visible`), el editor de `EntityStateMachine` (lista de estados con `activeBlockerIds` como `polygonRef` múltiple) y el bloque `interaction` (con `standPoint` fijable arrastrando un handle secundario en el canvas).

Los campos `moduleRef` se pueblan desde `MODULES` (`src/lib/curriculum.ts:55`), y `entityRef`/`zoneRef`/`dialogRef`/`polygonRef` desde el propio `level`. **Toda referencia se elige de un desplegable, nunca se escribe a mano** — elimina de raíz la clase de bugs T5.

### 5.4 Canvas y viewport

`useEditorViewport` mantiene `{ zoom, panX, panY }` y expone:

```ts
screenToImagePercent(clientX, clientY): Vec2   // inverso de la transform, con clamp 0-100 y round1
imagePercentToScreen(p: Vec2): { x: number; y: number }
```

El contenedor aplica una sola transform CSS:
```
transform: translate(panX px, panY px) scale(zoom);
transform-origin: 0 0;
```
sobre un div de tamaño base `width = containerWidth`, `height = containerWidth * (bg.height / bg.width)`. Todas las capas viven dentro y usan `%`, exactamente como `QuestScene.tsx:400-477`. El `<svg viewBox="0 0 100 100" preserveAspectRatio="none">` de `NavigationLayer` hereda esa transform sin ningún cálculo adicional — el truco ya probado en `WalkDebugOverlay.tsx:320`.

`snapToGrid(p, sizePct)` se aplica **solo si `state.snap`**, y nunca a un vértice que se está afinando con la herramienta "editar vértices" mientras se pulsa `Alt`.

### 5.5 Autosave y borrador local

`useAutosave` con debounce de **1500 ms** tras el último cambio:
1. `saveDraft(levelId, level)` a `localStorage` — **siempre**, instantáneo, `try/catch` silencioso (patrón de `WalkDebugOverlay.tsx:100-106`).
2. `saveLevel(...)` a Firestore — actualiza `saveState` (`Guardando… → Guardado ✓ → idle`).

Al abrir el editor, si `draft.savedAt > levelDoc.metadata.updatedAt`, se muestra una barra `role="status"`:
> *"Hay cambios locales sin guardar más recientes que el servidor. [Recuperar] [Descartar]"*

**El borrador nunca se aplica sin confirmación explícita.** Firestore es la fuente de verdad (restricción del enunciado).

`beforeunload` avisa si `dirty === true`. Un `saveLevel` exitoso llama a `clearDraft(levelId)`.

### 5.6 Atajos de teclado (`useEditorHotkeys`)

`V` seleccionar · `M` mover · `N` editar vértices · `A` agregar vértice · `W` área transitable · `B` zona prohibida · `Supr` eliminar · `Ctrl+D` duplicar · `Ctrl+Z` deshacer · `Ctrl+Shift+Z` rehacer · `Ctrl+S` guardar · `Espacio`+arrastre pan · `Ctrl`+rueda zoom · `Esc` cancelar dibujo / deseleccionar · `P` probar nivel · `Tab`/`Shift+Tab` recorrer entidades · `←↑→↓` mover 0.5% · `Shift+←↑→↓` mover 0.1%.

Los atajos se desactivan cuando el foco está en un `<input>`/`<textarea>` y cuando `playtestSessionId !== null`.

---

## 6. Arquitectura de navegación

### 6.1 Código ACTUAL vs código NUEVO

| Aspecto | Hoy (`src/lib/world/navmesh.ts`) | Nuevo |
|---|---|---|
| Modelo | `WalkableArea { boundary: Polygon; holes: Polygon[] }` (`:28-33`) | `NavigationMesh { walkable: Polygon[]; blocked: Polygon[] }` |
| Dentro/fuera | `isWalkable` (`:123-126`) — 1 contorno | `isWalkableInMesh` — N contornos, M bloqueos |
| Grafo | Reconstruido por consulta (`:210-255`) | `buildVisibilityGraph(mesh)` **memoizado**; solo `from`/`to` se insertan por consulta |
| Inalcanzable | `return [from, to]` recta (`:283`) — **atraviesa muros** | `{ path: [from], reachable: false }` |
| Tests de cruce | Contra **todas** las aristas (`:193`) | Rejilla espacial 10×10 |
| Origen del dato | Literal TS en `questScene.ts:122-207` | `level.navigation` desde Firestore |

### 6.2 Cambios exactos en `src/lib/world/navmesh.ts` (añadir, no romper)

```ts
/* ───────── NUEVO: malla multi-polígono ───────── */

export interface NavigationMesh {
  /** Regiones transitables. Un punto debe estar dentro de al menos una. */
  walkable: Polygon[];
  /** Obstáculos. Un punto dentro de cualquiera de ellos NO es transitable. */
  blocked: Polygon[];
}

/** Adaptador: el modelo viejo es un caso particular del nuevo.
 *  Permite que QuestScene siga funcionando sin tocar una línea. */
export function meshFromWalkableArea(area: WalkableArea): NavigationMesh {
  return { walkable: [area.boundary], blocked: area.holes };
}

/** Regla de la especificación, en este orden exacto. */
export function isWalkableInMesh(p: Point, mesh: NavigationMesh): boolean {
  if (!mesh.walkable.some((poly) => pointInPolygon(p, poly))) return false;   // fuera del verde ⇒ BLOCKED
  if (mesh.blocked.some((poly) => pointInPolygon(p, poly))) return false;     // dentro del rojo ⇒ BLOCKED
  return true;                                                                // dentro del verde ⇒ WALKABLE
}

/** Grafo de visibilidad precalculado UNA VEZ por malla. */
export interface VisibilityGraph {
  mesh: NavigationMesh;
  /** Vértices utilizables (los no transitables ya están filtrados). */
  nodes: Point[];
  /** ringOf[i] = índice de anillo del nodo i (para vecinos triviales). */
  ringOf: number[];
  /** Adyacencia estática entre vértices del propio grafo. */
  adjacency: { to: number; dist: number }[][];
  /** Todas las aristas de todos los anillos, para tests de cruce. */
  edges: [Point, Point][];
  /** Índice espacial: celda de la rejilla 10×10 → índices en `edges`. */
  edgeGrid: number[][];
}

export function buildVisibilityGraph(mesh: NavigationMesh): VisibilityGraph;

/** Ruta dentro de una malla, usando un grafo ya construido. `from`/`to` se
 *  insertan como 2 nodos extra; el resto de la adyacencia ya está calculada. */
export function findPathInMesh(
  from: Point,
  to: Point,
  graph: VisibilityGraph,
): { path: Point[]; reachable: boolean };

export function nearestWalkablePointInMesh(p: Point, mesh: NavigationMesh, nudge?: number): Point;

/** Normaliza la malla al cargar el nivel: dedupe de vértices casi pegados
 *  (misma idea que dedupeArea, :56-58) + descarte de anillos con <3 puntos
 *  + fusión de vértices compartidos entre polígonos adyacentes. */
export function normalizeMesh(mesh: NavigationMesh, eps?: number): NavigationMesh;
```

**Reescritura de las funciones viejas en términos de las nuevas** — una línea cada una, para que `QuestScene.tsx` no cambie:

```ts
const graphCache = new WeakMap<WalkableArea, VisibilityGraph>();

export function isWalkable(p: Point, area: WalkableArea): boolean {
  return isWalkableInMesh(p, meshFromWalkableArea(area));
}

export function nearestWalkablePoint(p: Point, area: WalkableArea, nudge = 0.6): Point {
  return nearestWalkablePointInMesh(p, meshFromWalkableArea(area), nudge);
}

export function findPath(from: Point, to: Point, area: WalkableArea): Point[] {
  let graph = graphCache.get(area);
  if (!graph) { graph = buildVisibilityGraph(meshFromWalkableArea(area)); graphCache.set(area, graph); }
  return findPathInMesh(from, to, graph).path;
}
```

> ⚠️ **`findPath` conserva firma y comportamiento observable en el caso mono-contorno.** `GAME_WALKABLE` (`QuestScene.tsx:65`) es una constante de módulo, así que el `WeakMap` acierta siempre desde el segundo clic. La prueba de regresión (§16.1) fija 6 rutas concretas sobre `CIUDAD_CENTRAL_WALKABLE` antes y después del cambio.

**Detalles de implementación que hay que respetar:**

1. **Filtrado de nodos.** Con N polígonos transitables, un vértice del anillo puede caer fuera de la malla (esquina cóncava cubierta por un bloqueado). `buildVisibilityGraph` descarta los nodos que no cumplen `isWalkableInMesh(node, mesh)` tras aplicarles un `nudge` hacia el interior del anillo. Sin esto, Dijkstra encuentra rutas que pasan por vértices ilegales.
2. **Vecinos del mismo anillo.** Se conserva la optimización de `navmesh.ts:220-232` (dos vértices consecutivos del mismo anillo son visibles por definición), pero **solo si el punto medio de esa arista es transitable**: en la malla nueva, un lado de un polígono transitable puede estar cubierto por un bloqueado.
3. **Índice espacial de aristas.** `segmentIsClear` hoy prueba contra todas las aristas (`:193`). Con `edgeGrid` (rejilla 10×10 sobre el espacio 0-100, aristas registradas en todas las celdas que atraviesan), solo se prueban las aristas de las celdas que el segmento consultado recorre (traversal tipo Bresenham). Coste por par: de O(E) a ~O(√E).
4. **Costura entre polígonos adyacentes** (hallazgo #3, §1.1). `normalizeMesh` fusiona vértices a distancia < `eps` (0.05) **entre polígonos distintos**, no solo dentro de cada anillo, para que dos salas contiguas compartan vértices exactos y el grafo las conecte. Además, todo punto que entra al pathfinding pasa antes por `nearestWalkablePointInMesh` con `nudge = 0.6` — igual que hoy (`QuestScene.tsx:305`), lo que evita consultas justo sobre la costura.
5. **Inalcanzable (hallazgo #1).** `findPathInMesh` devuelve `{ path: [from], reachable: false }`. El runtime **no mueve a Alex** y anuncia por `aria-live` *"No hay camino hasta ahí"*. Nunca una recta que atraviese geometría.
6. **Dijkstra.** Se mantiene O(V²) sin heap mientras V ≤ 150; por encima se usa un binary heap simple (30 líneas, sin dependencias). El umbral se decide en `buildVisibilityGraph`.

### 6.3 Cómo se editan los polígonos

`src/components/level/editor/PolygonEditor.tsx` es un **port directo** de `WalkDebugOverlay.tsx` con tres diferencias:

| WalkDebugOverlay (hoy) | PolygonEditor (nuevo) |
|---|---|
| Un `WalkableArea` (boundary + holes) | Un `NavPolygon` cualquiera de `walkable[]`, `blocked[]` o `zones[]` |
| `draft` en estado local + `localStorage` | Sin estado propio: despacha `MOVE_VERTEX` / `INSERT_VERTEX` / `DELETE_VERTEX` al `editorReducer` |
| `pointFromEvent` contra `containerRef.getBoundingClientRect()` (`:108-114`) | `screenToImagePercent` de `useEditorViewport` (con `zoom`/`pan`) + `snapToGrid` opcional |

**Se conserva idéntico**:
- `<svg viewBox="0 0 100 100" preserveAspectRatio="none">` (`:320`) — las coordenadas SVG *son* los porcentajes.
- Handles de vértice `<circle r="0.9">` con `cursor: grab/grabbing/not-allowed` (`:277-294`).
- Handles "+" de punto medio: círculo visible `r="0.55"` sobre un área de clic invisible `r="1.6"` (`:296-310`) — el comentario `:298-302` explica por qué.
- Inserción-y-arrastre en el mismo gesto, con reversión si el punto no se movió ≥0.3 (`:128-141`, `:198-204`).
- Doble clic sobre la arista más cercana con umbral de 4 unidades (`:182-196`).
- Borrado con Shift+clic o modo "Borrar puntos" (`:152-165`), con el suelo de 3 vértices y el borrado del anillo entero si baja de 3 (`:155-158`).
- Dibujo de polígono nuevo punto a punto con `polyline` discontinua (`:325-333`) y botones "Cerrar"/"Cancelar" (`:366-379`).

**Colores** (los mismos que hoy, `:321-323`): transitable `fill: rgba(34,197,94,0.18)` / `stroke: #22c55e`; bloqueado `fill: rgba(244,63,94,0.25)` / `stroke: #f43f5e`. Zona de interacción: `#38bdf8`. Selección: `stroke-width` ×2 + `stroke-dasharray`.

**Diferencia de rendimiento deliberada** (§14 P6): los handles "+" solo se pintan para el **polígono seleccionado**; hoy se pintan para todos (`:334-336`). Los no seleccionados son un único `<polygon>` sin handles.

**Validación en vivo**: si `polygonIsSimple(points) === false`, la arista culpable se pinta en ámbar y `IssuesPanel` muestra un `error`. No se bloquea el dibujo — se avisa.

### 6.4 Integración con el movimiento real de Alex

`src/lib/level/runtime/useAlexMovement.ts` — el `walkPath` de `QuestScene.tsx:176-234` extraído **sin cambios funcionales** y parametrizado:

```ts
export function useAlexMovement(opts: {
  spawn: Vec2;
  /** Recalculado solo cuando cambia la malla activa (puerta abierta, área revelada). */
  graph: VisibilityGraph;
  zones: RuntimeZone[];            // con bbox precalculado
  onZoneCross?: (zoneId: string, kind: "enter" | "exit") => void;
  onUnreachable?: () => void;
}): {
  pose: Pose;                      // { x, y, facing } — mismo tipo que QuestScene.tsx:54
  walking: boolean;
  walkTo(target: Vec2): number;    // ms totales; corrige con nearestWalkablePointInMesh
  approach(standPoint: Vec2, facePoint: Vec2): Promise<void>;
  teleport(to: Vec2): void;        // reset del play-test
};
```

Se conserva todo lo que ya funciona:
- Un solo bucle `requestAnimationFrame` interpolando por reloj real, con `walkToken` para cancelar rutas viejas (`:176-234`).
- `segmentMs(dist) = min(1500, max(420, dist*30))`, y `0` con `prefers-reduced-motion` (`:157-159`) ⇒ salto directo.
- `facingFor(seg, fallback)` (`:192-196`).
- `busyRef` para no encolar dos `approach` (`:277-278`).

**Detección de zonas** dentro del mismo bucle rAF, con dos filtros para no matar el rendimiento (§14 P4):
1. Solo se re-evalúa si la pose se movió más de `0.25` unidades desde la última evaluación.
2. Prefiltro por bounding box de cada zona antes de `pointInPolygon`.

**Malla activa dependiente del estado del mundo** — `src/lib/level/runtime/navigation.ts`:

```ts
export function buildRuntimeMesh(level: LevelDefinition, state: LevelRuntimeState): NavigationMesh {
  const walkable = level.navigation.walkablePolygons
    .filter((p) => state.enabledPolygons[p.id] ?? p.initiallyEnabled)
    .map((p) => p.points);
  // Bloqueadores activos = los que el ESTADO ACTUAL de cada entidad mantiene activos
  const activeBlockerIds = new Set(
    level.entities.flatMap((e) => currentStateOf(e, state)?.activeBlockerIds ?? []),
  );
  const blocked = level.navigation.blockedPolygons
    .filter((p) => (state.enabledPolygons[p.id] ?? p.initiallyEnabled) || activeBlockerIds.has(p.id))
    .map((p) => p.points);
  return normalizeMesh({ walkable, blocked });
}
```

En `useLevelRuntime`:
```ts
const meshKey = `${enabledPolygonIdsSorted.join("|")}::${entityStatesKey}`;
const graph = useMemo(() => buildVisibilityGraph(buildRuntimeMesh(level, state)), [level, meshKey]);
```

⇒ **El grafo solo se reconstruye cuando una puerta se abre o un área se desbloquea**, no en cada frame ni en cada clic (§14 P3).

**Requisito "preparado para NPCs/enemigos"**: `useAlexMovement` no sabe que su sujeto es Alex — recibe `spawn`, devuelve `pose`. Un `useEntityMovement(entityId)` futuro reutiliza el **mismo `graph`** (ya memoizado por nivel) y el mismo `findPathInMesh`. La ruta de patrulla del enemigo ya está en el esquema (`properties.patrol: Vec2[]` del tipo `enemy`), y el enemigo activo puede aportar su propio bloqueador vía `EntityStateDef.activeBlockerIds` — sin ningún cambio en el motor.

---

## 7. Arquitectura de entidades

### 7.1 Principio

**Cero `switch (entity.type)` en el core.** El core (reducer, canvas, panel de propiedades, runtime, validador) solo conoce `LevelEntity` y `EntityTypeDef`. Todo lo específico de un tipo vive en su propio archivo.

Esto sustituye directamente al modelo actual, donde el tipo está codificado en tres `Record` literales separados y desincronizables:
- `ICONS` en `src/components/world/QuestHotspot.tsx:6-12`
- `DIALOG_ICON` en `src/components/world/QuestOverlays.tsx:14-20`
- `KIND_HEADLINE` / `KIND_ACTION` en `src/components/world/PuzzleOverlay.tsx:17-31`
- `KIND_ICON` / `KIND_NOUN` en `src/lib/world/scenes.ts:42-56`

En el modelo nuevo, todo eso es **un campo del `EntityTypeDef`**.

### 7.2 Ejemplo completo — `terminal`

```tsx
// src/lib/level/entities/types/terminal.tsx
import { Terminal as TerminalIcon } from "lucide-react";
import type { EntityTypeDef, EntityRenderProps } from "../registry";

function TerminalRender({ entity, activeState, mode, selected, onSelect }: EntityRenderProps) {
  const isCore = entity.properties.isCore === true;
  return (
    <button
      type="button"
      data-entity-id={entity.id}
      data-state={activeState.id}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      aria-label={`${entity.name} — ${activeState.label}`}
      className={`absolute -translate-x-1/2 -translate-y-1/2 ${activeState.className ?? ""}
                  ${selected && mode === "editor" ? "editor-selected" : ""}`}
      style={{ left: `${entity.position.x}%`, top: `${entity.position.y}%`,
               transform: `translate(-50%,-50%) rotate(${entity.rotation}deg) scale(${entity.scale})` }}
    >
      {/* halo + icono, mismo lenguaje visual que QuestHotspot.tsx:53-87 */}
    </button>
  );
}

export const TERMINAL_TYPE: EntityTypeDef = {
  id: "terminal",
  label: "Terminal",
  Icon: TerminalIcon,
  section: "objects",
  defaultHeightPct: 6,
  defaultStates: {
    initial: "off",
    states: [
      { id: "off", label: "Apagada", sprite: null, visible: true,
        activeBlockerIds: [], className: "anim-flicker" },
      { id: "on",  label: "Activa",  sprite: null, visible: true,
        activeBlockerIds: [], className: "anim-breathe world-ring-glow" },
    ],
  },
  defaultInteraction: {
    mode: "click",
    standPoint: null,          // el editor lo pide al colocar
    radius: 4,
    prompt: "Usar la terminal",
    lockedNote: "Sin energía todavía",
    enabledWhen: { kind: "always" },
  },
  properties: [
    { kind: "text",    key: "headline", label: "Rótulo",  default: "TERMINAL BLOQUEADA" },
    { kind: "text",    key: "action",   label: "Acción",  default: "Introduce el código" },
    { kind: "image",   key: "sprite",   label: "Arte",    default: "" },
    { kind: "boolean", key: "isCore",   label: "Panel de núcleo (ámbar)", default: false },
  ],
  Render: TerminalRender,
};
```

**`Render` es el mismo componente en el editor y en el runtime** (`mode` solo añade el resalte de selección). Lo que se ve editando es exactamente lo que se ve jugando: WYSIWYG real, no dos renderers que divergen.

### 7.3 Los 7 tipos base

| Tipo | Sección | Estados por defecto | Propiedades clave | Interacción |
|---|---|---|---|---|
| `player-spawn` | navigation | — | — | ninguna (`singleton: true`) |
| `npc` | objects | `idle` | `portrait`, `role`, `dialogId` (dialogRef) | click, `standPoint` **obligatorio** (lo exige `validateLevel`) |
| `enemy` | objects | `active` (inicial), `defeated` | `art`, `patrol: Vec2[]`, `blockerPolygonId` | click |
| `door` | objects | `locked` (inicial), `closed`, `open` | `blockerPolygonId` (polygonRef), `sprite` | click |
| `terminal` | objects | `off` (inicial), `on` | `headline`, `action`, `isCore` | click |
| `collectible` | objects | `available` (inicial), `collected` | `art`, `label` | click / proximity |
| `interactive` | objects | `default` (editable) | libres | configurable |

**La puerta del flujo de 24 pasos** usa `activeBlockerIds: ["poly_vano"]` en `locked` y `closed`, y `[]` en `open`. Así `OPEN_DOOR` **cambia la malla de navegación de verdad** (§6.4), no solo el sprite.

### 7.4 Orden de pintado (y-sort)

```ts
const painted = [...level.entities, PLAYER_AS_ENTITY(pose)]
  .filter(isVisibleNow)
  .sort((a, b) => a.layer - b.layer || a.position.y - b.position.y);
// z-index = 10 + índice
```

Esto resuelve "objetos delante/detrás de Alex" en el arte isométrico **sin ningún motor nuevo**. Hoy es imposible: el avatar tiene `z-20` fijo (`QuestScene.tsx:422`) y los hotspots también (`QuestHotspot.tsx:51`), así que Alex nunca puede pasar por detrás de una columna.

`background.projection === "isometric"` solo afecta a la rejilla del editor (rombos en vez de cuadrados) y a la sugerencia de `layer` al colocar una entidad. **No introduce ninguna transformación de coordenadas.**

### 7.5 Contrato de extensibilidad

Añadir un tipo de entidad nuevo requiere tocar **exactamente 2 archivos**:
1. Crear `src/lib/level/entities/types/palanca.tsx` exportando `PALANCA_TYPE: EntityTypeDef`.
2. Añadirlo al array de `src/lib/level/entities/index.ts`.

Automáticamente aparece en la toolbox, se puede colocar en el canvas, su panel de propiedades se pinta solo, el validador comprueba sus referencias, y el runtime lo pinta y lo hace interactuable. **Ninguna otra línea del proyecto cambia.** Este contrato se verifica como entregable de la Fase 6.

---

## 8. Arquitectura de eventos

### 8.1 Dónde vive el bus

`src/lib/level/events/bus.ts` — **TypeScript puro, sin React y sin Firebase.**

El bus **no toca el DOM ni el estado de React**: recibe un evento, decide qué reglas disparan y devuelve una lista de *efectos*. Quien los aplica es:
- `runtimeReducer` (`src/lib/level/runtime/state.ts`) para los `patch` de estado;
- los `RuntimeServices` inyectados (`services.ts`) para los `side` (sonido, navegación, VFX).

Esta separación es lo que permite (a) probar el bus sin montar nada, (b) que el play-test use **el mismo bus** con servicios distintos, (c) que `deriveInitialState` re-emita eventos en modo silencioso.

### 8.2 Registro de listeners

Al cargar el nivel, `createEventBus(level.events)` construye un índice:

```ts
type ListenerKey = `${LevelEventType}:${string}`;   // "ON_CHALLENGE_SUCCESS:ch_terminal"

export interface EventBus {
  index: Map<ListenerKey, LevelEventRule[]>;
  fired: Set<string>;          // ids de reglas `once` ya disparadas en esta sesión
}

function keyOf(t: LevelEventTrigger): ListenerKey {
  const target = t.entityId ?? t.challengeId ?? t.zoneId ?? t.missionId ?? "*";
  return `${t.type}:${target}`;
}
```

Emitir un evento es una búsqueda O(1) en `index` por `type:targetId` más otra por `type:*`, e iteración solo sobre las reglas de esas claves. **Ningún recorrido lineal de `level.events` en tiempo de juego** (importa con 60 reglas y 60 fps).

### 8.3 Ejecución

```ts
export interface EmitPayload {
  type: LevelEventType;
  targetId: string | null;
  /** Datos del evento (p. ej. { correct: true, stars: 14, moduleId }). */
  data: Record<string, PropertyValue>;
}

export interface RuntimeEffect {
  /** Patch al estado del runtime (aplicado por el reducer). */
  patch?: RuntimeStatePatch;
  /** Efecto lateral delegado a los servicios (VFX, sonido, diálogo, navegación). */
  side?: SideEffect;
  /** Retardo antes de aplicarlo (`LevelAction.delayMs` acumulado). */
  atMs: number;
}

export function emit(bus: EventBus, payload: EmitPayload, ctx: ConditionContext): RuntimeEffect[];
```

**Algoritmo de `emit`:**
1. Recoger reglas de `index.get("TYPE:target")` ∪ `index.get("TYPE:*")`.
2. Descartar las que tengan `rule.once && bus.fired.has(rule.id)`.
3. Descartar las que fallen `evaluateCondition(rule.when, ctx)`.
4. Para cada regla superviviente, recorrer `rule.actions` acumulando `delayMs` y llamando a `ACTION_HANDLERS[action.type](action.params, ctx, payload.data)` → `RuntimeEffect`.
5. `bus.fired.add(rule.id)` si `rule.once`.
6. **Guardia anti-ciclo**: `emit` mantiene un contador por cadena; si se superan `MAX_CHAIN_DEPTH = 32` emisiones encadenadas, se aborta y se registra el ciclo (en play-test aparece en `IssuesPanel`; en producción, un `console.warn`). Evita el congelado por `A → B → A` (riesgo T4).

Con `prefers-reduced-motion`, todos los `atMs` se colapsan a 0 (§15 K9).

### 8.4 Catálogo de acciones

| Acción | Parámetros | Efecto | ¿Escribe en Firestore? |
|---|---|---|---|
| `SET_FLAG` | `flag`, `value` | `patch.flags[flag] = value` | no |
| `CHANGE_OBJECT_STATE` | `entityId`, `state` | `patch.entityStates[entityId] = state` (⇒ recálculo de bloqueadores y de la malla) | no |
| `ACTIVATE_OBJECT` | `entityId` | Azúcar de `CHANGE_OBJECT_STATE` al **segundo** estado declarado del tipo | no |
| `OPEN_DOOR` | `entityId` | `CHANGE_OBJECT_STATE(entityId, "open")` ⇒ sus `activeBlockerIds` dejan de estar activos | no |
| `CLOSE_DOOR` | `entityId` | `CHANGE_OBJECT_STATE(entityId, "closed")` | no |
| `UNLOCK_AREA` | `polygonId`, `role` | `patch.enabledPolygons[polygonId] = true` ⇒ **la malla de navegación cambia de verdad** | no |
| `REVEAL_AREA` | `polygonId` \| `entityIds` | Visibilidad/niebla; **sin** efecto en navegación | no |
| `SHOW_DIALOG` | `dialogId` | `side: { kind: "openDialog", dialogId }` | no |
| `SHOW_CLUE` | `text`, `ms` | `side: { kind: "banner", text, ms }` — patrón `showBanner` (`QuestScene.tsx:145-151`) | no |
| `SPAWN_OBJECT` | `entityId` | `patch.spawned[entityId] = true`; la entidad existía con `visible: false` | no |
| `UPDATE_MISSION` | `missionId`, `objectiveId` | **Solo refresca la vista.** Los objetivos siguen derivándose (§9.5) | no |
| `GENERATE_AXIA` | `source: "challenge"` | `side: { kind: "axiaPulse", stars }` — animación `+★` (`QuestScene.tsx:467-476`) + `aria-live` | **NO** (ver ⚠️) |
| `START_CHALLENGE` | `challengeId` | `side: { kind: "openChallenge", challengeId }` | lo hace el overlay |
| `MOVE_PLAYER` | `to: Vec2`, `instant` | `side: { kind: "movePlayer" }` | no |
| `PLAY_SOUND` | `sound` | `services.playSound()` de `src/lib/gameSound.ts` | no |

> ⚠️ **`GENERATE_AXIA` NO escribe en `starLedger`.**
> Las estrellas ("AXIA" es solo su nombre narrativo — `src/components/world/WorldHud.tsx:19-23`: *"no hay una moneda nueva, ni un dato nuevo en Firestore"*) las otorga **exclusivamente** `recordModuleAttempt` (`src/lib/attemptRecorder.ts:50-59`) cuando el niño acierta. `GENERATE_AXIA` es la **representación visual** de ese otorgamiento que ya ocurrió, y recibe el número real en `event.data.stars` (el `AttemptOutcome.stars` que devuelve `recordModuleAttempt`).
> Una implementación que hiciera `addDoc(collection(db, ..., "starLedger"), ...)` aquí **duplicaría el saldo y crearía una economía paralela** — prohibido por las restricciones del enunciado. El criterio de aceptación 13 (§20) lo verifica contando documentos de `starLedger` tras jugar: debe ser exactamente 1.

**Esquema de parámetros** (`events/catalog.ts`) — declarativo, para que `EventChainEditor` pinte los campos solo, igual que el panel de entidades:

```ts
export const ACTION_TYPES: Record<LevelActionType, ActionTypeDef> = {
  OPEN_DOOR: {
    label: "Abrir puerta",
    params: [{ kind: "entityRef", key: "entityId", label: "Puerta", default: "", ofType: ["door"] }],
  },
  UNLOCK_AREA: {
    label: "Desbloquear área",
    params: [
      { kind: "polygonRef", key: "polygonId", label: "Polígono", default: "" },
      { kind: "select", key: "role", label: "Capa", default: "walkable",
        options: [{ value: "walkable", label: "Transitable" }, { value: "blocked", label: "Bloqueado" }] },
    ],
  },
  // ...
};
```

**Añadir una acción nueva requiere tocar exactamente 2 archivos**: `events/catalog.ts` (descriptor) y `events/actions.ts` (handler). Mismo contrato de extensibilidad que las entidades (§7.5).

### 8.5 La cadena del ejemplo, expresada con el catálogo

Cadena pedida: `ON_CHALLENGE_SUCCESS → GENERATE_AXIA → ACTIVATE_TERMINAL → ACTIVATE_LIGHTS → UNLOCK_DOOR → OPEN_DOOR → REVEAL_AREA`

```
Regla: "Terminal resuelta → se abre el camino"
  trigger: { type: "ON_CHALLENGE_SUCCESS", challengeId: "ch_terminal", ... }
  when:    { kind: "always" }
  once:    true
  actions:
    ├─ [   0 ms] GENERATE_AXIA        { source: "challenge" }
    ├─ [ 200 ms] CHANGE_OBJECT_STATE  { entityId: "ent_terminal", state: "on" }      ← ACTIVATE_TERMINAL
    ├─ [ 400 ms] SET_FLAG             { flag: "luces", value: true }                 ← ACTIVATE_LIGHTS
    ├─ [ 900 ms] CHANGE_OBJECT_STATE  { entityId: "ent_puerta", state: "closed" }    ← UNLOCK_DOOR
    ├─ [1400 ms] OPEN_DOOR            { entityId: "ent_puerta" }                     ← OPEN_DOOR
    └─ [1400 ms] UNLOCK_AREA          { polygonId: "poly_sala2", role: "walkable" }  ← REVEAL_AREA
```

Y el encendido visual de la ciudad se declara en el fondo, no en código:
```ts
background.filters = [{
  id: "luces_on",
  when: { kind: "flag", flag: "luces", value: true },
  css: "brightness(1.1) saturate(1.25)",
}];
```
— el equivalente configurable del `brightness-110 saturate-125` hardcodeado en `QuestScene.tsx:413-415`.

### 8.6 Editor de cadenas (`EventChainEditor.tsx`)

- Lista de reglas con su `name`, el trigger resumido y el número de acciones.
- Al seleccionar una regla: selector de `LevelEventType`, selector del objetivo (poblado según el tipo: entidades / desafíos / zonas / misiones), constructor de `ConditionExpr` (árbol con `all`/`any`/`not`), y lista ordenable de acciones con su `delayMs`.
- Cada acción se pinta con los campos de `ACTION_TYPES[type].params` — sin ningún `switch`.
- **Vista de grafo** (solo lectura) que dibuja las cadenas: `evento → acción → (entidad/polígono afectado) → evento que eso puede disparar`. Es la que alimenta la detección estática de ciclos de `validateLevel`.

---

## 9. Integración con desafíos matemáticos

**Regla rectora (impuesta por el enunciado y verificada en §1.6/§1.8): el Level Editor nunca define contenido académico. Solo referencia, posiciona y dispara.**

### 9.1 Qué guarda el nivel

Un `ChallengePlacement { id, moduleId, activityId, sourceEntityId }` (§4). `activityId` está reservado para cuando exista más de un tipo de actividad por módulo (hoy siempre `"puzzle"`, el único flujo que expone `PuzzleOverlay`) — se incluye desde el día uno para no tener que migrar el esquema después.

### 9.2 `ChallengePicker` (herramienta del editor)

Lista `MODULES` (`curriculum.ts:55`) agrupados por `strandSlug`, con buscador y filtro por hilo. Al elegir un módulo, muestra una **vista previa real**: `mod.generateProblem()` ejecutado una vez y renderizado con `QuestionWidget` en modo solo-lectura (sin `onSubmit` funcional) — así el creador del nivel ve exactamente el tipo de pregunta que va a aparecer, con datos reales, no una maqueta. Al confirmar, crea un `ChallengePlacement` con `sourceEntityId` = la entidad seleccionada en el canvas (normalmente una terminal, pero cualquier tipo de entidad puede tener un desafío asociado).

### 9.3 Cómo se dispara y resuelve en el runtime

El runtime del nivel (`src/lib/level/runtime/`, Fase 9 de Opus) mantiene el mismo flujo que ya existe en `QuestScene.tsx` para Ciudad Central, generalizado:

1. El jugador interactúa con la entidad (clic o proximidad, según `EntityInteraction.mode`).
2. Si la entidad tiene un `ChallengePlacement` asociado (`challenges.find(c => c.sourceEntityId === entity.id)`), el runtime resuelve `mod = getModule(placement.moduleId)` y emite `ON_CHALLENGE_STARTED`.
3. Se monta `PuzzleOverlay` — **el mismo componente**, no una copia — con `mod` y un `interactable` sintetizado a partir de la entidad (label, clue, reward salen de las propiedades de la entidad/su tipo, no de `scenes.ts`).
4. Al resolver, `PuzzleOverlay` llama internamente a `recordModuleAttempt` (como hace hoy) y, en vez de solo llamar a `onResolved`/`onClose`, el runtime también emite `ON_CHALLENGE_SUCCESS` o `ON_CHALLENGE_FAILED` con `data: { correct, stars, moduleId }`.

### 9.4 Único cambio de código en `PuzzleOverlay.tsx`

`PuzzleOverlay` está hoy cerrado sobre `Interactable`/`KIND_ICON`/`KIND_HEADLINE`/`KIND_ACTION` indexados por `InteractionKind` fijo (`scenes.ts`, `PuzzleOverlay.tsx:17-31`). Para que el runtime del nivel lo reutilice sin bifurcar el componente, se añaden **dos props opcionales** con valores por defecto que preservan el comportamiento actual byte a byte:

```ts
// PuzzleOverlay.tsx — firma ampliada, comportamiento por defecto sin cambios
{
  // ...props actuales sin tocar...
  recordAttempt?: typeof recordModuleAttempt;   // default: recordModuleAttempt real
  onStars?: (stars: number) => void;            // default: no-op — el runtime lo usa para GENERATE_AXIA
}
```

El cuerpo de `submit` (`:77-111`) se refactoriza para llamar `(recordAttempt ?? recordModuleAttempt)(...)` y, tras guardar, invocar `onStars?.(outcome.stars)`. **Ninguna llamada existente a `PuzzleOverlay` (la de `QuestScene.tsx:526-536`) cambia una sola línea** — sigue sin pasar esas props, y el componente se comporta exactamente igual que hoy.

### 9.5 Objetivos de misión atados a desafíos

`ObjectiveSource: { kind: "challenge"; challengeId }` (§4) se resuelve exactamente con el mismo principio que `world/quests.ts:hasCorrectAttempt` (§1.8): un objetivo de tipo `challenge` está "hecho" si `hasCorrectAttempt(progressBySkill, mod.id)` es verdadero para el módulo del `ChallengePlacement` referenciado — **nunca** un booleano propio guardado por nivel. Así "resolver el desafío" y "el objetivo de la misión se marca hecho" son la misma lectura de `skillsProgress`, y sobreviven a un refresco de página sin que el nivel guarde nada de progreso (criterio 21/A7 de Opus).

### 9.6 Qué NO hace esta capa

- No genera preguntas propias, no valida respuestas con lógica propia, no calcula estrellas con una fórmula propia (todo eso sigue en `problem.ts`/`isCorrectAnswer`/`economy.ts`, sin tocar).
- No crea un `moduleId` nuevo por nivel — un nivel de ejemplo con "Sumas hasta 5" usa literalmente `"aritmetica-d1"`, el mismo módulo que ya juega cualquier niño desde `/jugar/{childId}/aritmetica/aritmetica-d1`.
- No introduce ningún concepto de "dificultad del nivel" distinto de la dificultad ya definida en `ModuleDef.difficulty`.

---

## 10. Persistencia

### 10.1 Por qué Firestore y no otra cosa

Restricción dura del enunciado y del propio código: `localStorage` **nunca** es la fuente de verdad (solo caché de recuperación, §5.5 de Opus), y no se crea ninguna base de datos paralela. El proyecto ya tiene un único punto de acceso a Firestore (`getFirebase()`) y un modelo de reglas por-padre — el editor se integra ahí, no al lado.

### 10.2 Esquema Firestore

```
/parents/{parentId}/levels/{levelId}                  ← documento "vivo": la LevelDefinition actual
/parents/{parentId}/levels/{levelId}/versions/{n}      ← snapshot inmutable de cada guardado, n = version zero-padded (p. ej. "000002")
```

Se cuelga de `/parents/{parentId}`, no de `/children/{childId}`: un nivel no pertenece a un hijo en particular (cualquier hijo de la familia puede jugarlo), es propiedad del padre-autor — igual criterio que `/curriculum` es del catálogo, no de un hijo.

**Reglas nuevas** (añadidas a `firestore.rules`, dentro de `match /parents/{parentId} { ... }`, junto a los bloques ya existentes de `children`):

```
match /levels/{levelId} {
  allow read, write: if isParent(parentId);

  match /versions/{versionId} {
    allow read: if isParent(parentId);
    allow create: if isParent(parentId);
    allow update, delete: if false;      // inmutable: cada versión se escribe una sola vez
  }
}
```

⚠️ **Estas reglas hay que desplegarlas a mano** (`npx firebase deploy --only firestore:rules --project <id>`) — no hay ningún paso automático en el repo que lo haga (criterio A14 de Opus, §20.2).

### 10.3 `levelRepository.ts` — API de acceso

Funciones puras sobre `getFirebase()`, sin estado propio, siguiendo el mismo estilo que `attemptRecorder.ts`:

```ts
listLevels(parentId): Promise<LevelSummary[]>                 // id, name, updatedAt — para /panel/editor
createLevel(parentId, name, background): Promise<LevelDefinition>   // createEmptyLevel() + primer setDoc, version = 1
getLevel(parentId, levelId): Promise<LevelDefinition | null>  // aplica migrateLevel() al leer
saveLevel(parentId, levelId, level): Promise<LevelDefinition>  // ver 10.4 (transaccional, con versionado)
deleteLevel(parentId, levelId): Promise<void>
duplicateLevel(parentId, levelId): Promise<LevelDefinition>
listVersions(parentId, levelId): Promise<{ version: number; savedAt: number }[]>
getVersion(parentId, levelId, version): Promise<LevelDefinition>
restoreVersion(parentId, levelId, version): Promise<LevelDefinition>   // = saveLevel con el contenido de esa versión
```

### 10.4 `saveLevel` — versionado optimista

1. Lee el documento vivo dentro de una transacción de Firestore.
2. Si `remote.version !== level.version` que el editor tenía cargado ⇒ lanza `StaleLevelError` (alguien más guardó una versión más nueva mientras se editaba — el editor muestra un diálogo de conflicto en vez de sobrescribir a ciegas).
3. Si coincide: `nextVersion = level.version + 1`; escribe el documento vivo con `{ ...level, version: nextVersion, metadata: { ...level.metadata, updatedAt: now } }`, y **además** crea `versions/{zeroPad(nextVersion)}` con el mismo contenido, inmutable desde ese momento (las reglas lo impiden).
4. Antes de cualquier escritura, `serialize.ts` corre `stripUndefined` + `assertNoNestedArrays` + `assertSize` (presupuesto blando de tamaño, §14 de Opus) sobre el objeto completo.

### 10.5 Borrador local (`draftCache.ts`)

Mismo patrón que `WalkDebugOverlay` (`localStorage.setItem` en cada cambio, `try/catch` silencioso, `:100-106`), pero con un rol distinto: **nunca es la fuente de verdad**, solo protege contra una pestaña cerrada sin guardar. Al abrir un nivel, si el borrador local es más reciente que `metadata.updatedAt` del documento remoto, se ofrece "Recuperar / Descartar" (§5.5 de Opus) — nunca se aplica solo. Un `saveLevel` exitoso limpia el borrador de ese nivel.

### 10.6 `useLevelDoc.ts`

Hook que envuelve `getLevel`/`saveLevel` con el estado de carga/guardado que consume `EditorProvider` (`saveState: "idle"|"saving"|"saved"|"error"`, §5.2 de Opus) — sin lógica propia más allá de eso.

### 10.7 Lo que **no** se hace

- No se usa ninguna colección nueva fuera de `/parents/{parentId}/levels/**`.
- No se guarda ningún estado de partida en curso (eso es responsabilidad exclusiva de `skillsProgress`/`starLedger`, existentes — ver §9.5).
- No se añade ninguna ruta `/api/*` — toda la persistencia es Firestore desde el cliente (criterio A4).

---

## 11. Play Test

### 11.1 Objetivo

Jugar el nivel **tal como está guardado en ese momento**, sin salir del editor, usando el runtime real (no una simulación aparte) — para que "se ve bien en el editor" y "funciona jugando" sean literalmente la misma pregunta.

### 11.2 Cómo se logra sin mezclar editor y gameplay (restricción dura del enunciado)

`LevelRuntime` (el mismo componente que monta `/jugar/{childId}/nivel/{levelId}` para el juego real) recibe sus efectos de lectura/escritura a través de un puerto de servicios (`RuntimeServices`, en `runtime/services.ts`), no llamando a Firestore directamente:

```ts
interface RuntimeServices {
  recordChallengeAttempt: typeof recordModuleAttempt;   // o un stub en sandbox
  progressBySkill: Record<string, SkillProgress>;       // lectura, ya cargado por el padre
  onExit: () => void;
}
```

- **Juego real** (`/jugar/{childId}/nivel/{levelId}`): `createLiveServices()` — usa `recordModuleAttempt` de verdad, lee `skillsProgress` real del hijo.
- **Play Test** (dentro del editor): `createSandboxServices()` — usa el `progressBySkill` real del padre-autor (para que los prerrequisitos se comporten igual que en juego real) pero con `recordChallengeAttempt` **interceptado**: el intento se evalúa y muestra normalmente (para que resolver el desafío se sienta igual), pero la escritura a `attempts`/`skillsProgress`/`starLedger` se **omite** — el criterio de aceptación 21/A5 de Opus exige verificar con una consulta directa a los emuladores que ningún documento se creó durante el play-test.

Una regla ESLint (`no-restricted-imports` en `eslint.config.mjs`, ya prevista en la §18.2 de Opus) impide que `src/components/level/runtime/**` importe nada de `src/components/level/editor/**` — la separación EDITOR ↔ RUNTIME es estructural, no solo de convención.

### 11.3 Flujo

```
EDIT MODE
  │  clic "▶ Probar" (o tecla P)
  ▼
validateLevel(level)
  │
  ├─ hay errores ──▶ se abre IssuesPanel, NO se entra a Play Test
  │
  └─ sin errores ──▶ PLAY TEST
                        · Toolbox, PropertyPanel, BottomBar se ocultan (display:none + aria-hidden)
                        · aparece PlayTestBar ("MODO PRUEBA" + Reset + Salir)
                        · se monta LevelRuntime con level=state.level (en memoria, no releído de Firestore)
                          y services=createSandboxServices(...)
                        · Alex spawnea en navigation.spawn
                        │
                        │  clic "↺ Reset"
                        ▼
                     se remonta LevelRuntime con key={++playtestSessionId} —
                     vuelve a spawn, estado de entidades limpio, sin salir del modo prueba
                        │
                        │  clic "✕ Salir"
                        ▼
                     EDIT MODE  ← selección, zoom, pan e historial de undo quedan EXACTAMENTE
                                   como estaban antes de entrar (el reducer del editor nunca
                                   se tocó durante el play-test: es estado 100% del runtime)
```

### 11.4 Qué pasa con `dirty`/autosave durante el Play Test

`useAutosave` se pausa mientras `playtestSessionId !== null` (no tiene sentido autoguardar mientras no se está editando) y se retoma al salir, sin perder el `dirty` que hubiera antes de entrar.

---

## 12. Estrategia de migración

### 12.1 Principio: coexistencia, no reemplazo

Ciudad Central (`QuestScene.tsx` + `questScene.ts` + `navmesh.ts` en su forma actual) **sigue existiendo tal cual, indefinidamente**. El Level Editor es un sistema nuevo que corre en paralelo. La única superficie compartida es la extensión de `navmesh.ts` (§6.2 de Opus), diseñada explícitamente para que las funciones viejas (`isWalkable`, `findPath`, `nearestWalkablePoint`) sigan funcionando idénticas — verificado con una prueba de regresión dedicada (§16.1) antes de tocar una sola línea de UI.

### 12.2 Por qué no migrar Ciudad Central de entrada

1. **Riesgo innecesario para el MVP**: el criterio de aceptación (§20 de Opus) no pide "Ciudad Central corriendo sobre el motor nuevo", pide "poder construir un nivel nuevo de punta a punta sin tocar código". Migrar Ciudad Central es un proyecto aparte con su propio riesgo de regresión narrativa (guiones, textos, secuencias especiales como `NIA_ORIGIN_INTRO`).
2. **Ciudad Central tiene lógica especial no genérica**: el chequeo de "primera vez en el mundo" (`QuestScene.tsx:261-272`), el flujo de "siguiente misión" con `router.push` (`:321-323`), textos de guion largos — forzar todo esto dentro del modelo genérico de eventos/acciones de la §8 de Opus antes de que ese modelo se haya probado con un nivel real es prematuro.
3. **Mantener el modelo de datos honesto**: si el primer nivel real que usa el editor es una migración 1:1 de algo que ya existe, no se prueba de verdad la expresividad del `LevelDefinition` para un nivel *nuevo*.

### 12.3 Qué se hace igual: el adaptador de paridad

`src/lib/level/legacy/ciudadCentral.ts` expone `ciudadCentralAsLevel(authorUid): LevelDefinition` — **no se usa en producción**, es una función de prueba/documentación que traduce `CIUDAD_CENTRAL_WALKABLE` + `CIUDAD_CENTRAL_HOTSPOTS` al esquema nuevo (spawn = `PLAYER_START`, un `NavPolygon` walkable = `boundary`, uno bloqueado por cada `hole`, 5 `LevelEntity` — Dra. Nia como `npc`, terminal como `terminal`, medidor y compuerta como `interactive`/`door`). Sirve para dos cosas: (a) demostrar en una prueba automática que el modelo nuevo puede expresar un nivel real ya existente sin perder información (criterio de la Fase 2, §17 de Opus: `validateLevel` da cero errores sobre su salida), y (b) documentar, con un ejemplo concreto, cómo se traduce el vocabulario viejo (`CiudadCentralHotspotKind`) al nuevo (`EntityTypeId`).

### 12.4 Migración real (opcional, fuera del MVP — Fase 14 de Opus)

Solo si se decide explícitamente después de que el editor esté probado: activar `ciudadCentralAsLevel()` detrás de un flag (`NEXT_PUBLIC_LEVELS_V2`), en un PR aparte, adaptando en esa misma PR los E2E de `e2e/aventura.spec.ts` que hoy verifican el comportamiento hardcodeado. Hasta que eso ocurra, **cero E2E existentes cambian una línea** (criterio A2, §20.2 de Opus).

---

## 13. Riesgos técnicos

| # | Riesgo | Mitigación |
|---|---|---|
| T1 | Romper `findPath`/`isWalkable`/`nearestWalkablePoint` al extender `navmesh.ts` — son el corazón del movimiento de Ciudad Central, en producción hoy | Los wrappers viejos quedan como adaptadores de una línea sobre las funciones nuevas (§6.2 de Opus); prueba de regresión dedicada con 6 pares origen/destino fijados sobre `CIUDAD_CENTRAL_WALKABLE` (§16.1), corrida ANTES de tocar cualquier componente React (Fase 1 de Opus, aislada del resto) |
| T2 | Un polígono autointersecante (dibujado a mano en el editor) rompe la asunción de "polígono simple" de `pointInPolygon`/el grafo de visibilidad, igual que ya advierte el comentario de `dedupeArea` (`navmesh.ts:52-54`) | `validateLevel` detecta autointersección en vivo mientras se dibuja (aviso ámbar, no bloqueante) — ver §6.3 de Opus |
| T3 | Referencias rotas: un `ChallengePlacement.sourceEntityId`, un `EntityStateDef.activeBlockerIds`, o un `LevelEventTrigger.entityId` que apunten a un id borrado | Todo campo de referencia se **elige de un desplegable** poblado desde el propio `level` (nunca se teclea a mano, §5.3 de Opus) — elimina la clase de bug en el origen; `validateLevel` igual la detecta como red de seguridad para datos importados/corruptos |
| T4 | Ciclo de eventos (`A → B → A`) que cuelgue el juego en un bucle infinito de emisiones | Guardia `MAX_CHAIN_DEPTH = 32` en `emit()` (§8.3 de Opus) + detección estática de ciclos en `validateLevel` sobre el grafo trigger→acción→entidad afectada |
| T5 | Escribir a Firestore un objeto con `undefined` o un array anidado (ambos prohibidos) revienta `saveLevel` en producción sin aviso claro | `serialize.ts` con `stripUndefined`/`assertNoNestedArrays` corre antes de cada escritura (§10.4); el esquema (§4) ya evita arrays de arrays por diseño (discriminante `kind` en `LevelZone.shape`) |
| T6 | Guardados concurrentes (dos pestañas, o autosave + guardado manual) pisándose entre sí | Versionado optimista con `StaleLevelError` (§10.4) — nunca un `setDoc` ciego |
| T7 | Migrar el esquema en el futuro (añadir un campo, cambiar un tipo) rompe niveles ya guardados | `schemaVersion` + `migrate.ts` con una cadena de migraciones (`v1→v2→...`), aplicada al leer (§17, Fase 2 de Opus) — vacía hoy (`v1→v1`) pero con la estructura montada desde el principio |
| T8 | El adaptador `ciudadCentralAsLevel` queda desincronizado si alguien edita `questScene.ts` sin tocar el adaptador | Es parte del plan de pruebas (§16.4): la prueba de paridad falla en CI si `CIUDAD_CENTRAL_WALKABLE`/`CIUDAD_CENTRAL_HOTSPOTS` cambian de forma incompatible con el mapeo actual |

---

## 14. Riesgos de rendimiento

| # | Riesgo | Mitigación |
|---|---|---|
| P1 | Reconstruir el grafo de visibilidad en cada clic (como hoy) escala mal con múltiples polígonos y más vértices de los que tiene Ciudad Central | `buildVisibilityGraph` se memoiza por malla activa (§6.4 de Opus) — solo se reconstruye cuando cambia qué polígonos están habilitados (una puerta se abre), nunca por frame ni por clic |
| P2 | Un nivel con muchos vértices/entidades hincha el documento de Firestore y ralentiza el editor | Presupuestos blandos en `validateLevel` (advertencia, no bloqueo) sobre nº de vértices totales, nº de entidades, tamaño serializado (`assertSize`, §10.4); `simplifyPolygon` disponible para reducir vértices redundantes (Fase 13 de Opus) |
| P3 | Test de cruce de segmentos contra **todas** las aristas (como hoy, `navmesh.ts:193`) es O(E) por par de nodos — cuadrático en niveles grandes | Índice espacial de aristas por rejilla 10×10 (`edgeGrid`, §6.2 de Opus) reduce a ~O(√E) por consulta |
| P4 | Evaluar `pointInPolygon` contra todas las zonas en cada frame del bucle de movimiento (60fps) | Dos filtros: solo re-evaluar si la pose se movió &gt;0.25 unidades desde la última evaluación, y prefiltro por bounding box antes de la prueba exacta (§6.4 de Opus) |
| P5 | Re-render de React en cada frame de `requestAnimationFrame` durante el caminar | Se mantiene el patrón ya probado en `QuestScene.tsx` (un solo `setState` por frame vía el propio hook de movimiento) — nada nuevo que empeore lo que ya funciona en producción |
| P6 | Pintar handles de edición ("+", vértices) para **todos** los polígonos a la vez con muchos polígonos en pantalla | Los handles de inserción solo se pintan para el polígono **seleccionado** (§6.3 de Opus) — cambio deliberado respecto a `WalkDebugOverlay`, que los pinta todos porque solo maneja 1-2 anillos |
| P7 | Historial de undo/redo sin límite hincha memoria en una sesión de edición larga | Tope `HISTORY_LIMIT = 50` (baja a 20 si el nivel serializado supera 200KB), con coalescencia de gestos continuos (arrastrar un vértice = 1 entrada de historial, no una por `pointermove`) — §5.2 de Opus |
| P8 | Cargar los 52 módulos y sus `ConceptComponent` solo para mostrar el `ChallengePicker` | `curriculum.ts` ya es una lista en memoria sin I/O — no hay carga adicional que optimizar; la vista previa ejecuta `generateProblem()` una sola vez al seleccionar, no por cada tecla del buscador |

Presupuesto de rendimiento verificado en pruebas (`e2e/nivel-rendimiento.spec.ts`, §16 de Opus): con 300 vértices, 8 bloqueos y 40 entidades, `buildVisibilityGraph` &lt;60ms y `findPathInMesh` &lt;15ms.

---

## 15. Riesgos de compatibilidad

| # | Riesgo | Mitigación |
|---|---|---|
| K1 | `firebase/firestore` importado estáticamente en un archivo nuevo rompe el SSR en Cloudflare Workers (§1.4) — es fácil de cometer sin darse cuenta al escribir `levelRepository.ts` | Regla ESLint `no-restricted-imports` prohibiendo `firebase/firestore` fuera de `src/lib/firebase.ts` (criterio A5, §20.2 de Opus) — falla en build, no solo en runtime |
| K2 | Un nivel viejo (`schemaVersion` desactualizado) cargado en una versión nueva del editor | `migrate.ts` aplica la cadena de migraciones al leer (§17, Fase 2 de Opus) antes de que el nivel llegue al editor |
| K3 | Cambiar `navmesh.ts` de forma que altere el comportamiento observable de Ciudad Central en producción | Prueba de regresión con rutas fijadas + los 7 E2E existentes deben pasar sin modificación (criterios A1/A2, §20.2 de Opus) — es la primera fase del plan, aislada, precisamente para descartar esto antes de construir nada más encima |
| K4 | Un tipo de entidad o acción de evento nuevo que rompa la extensibilidad prometida (tocar más de 2 archivos) | Contrato de extensibilidad verificado como entregable explícito de la Fase 6 (tipo de entidad `palanca` de prueba) y ejercitado también para acciones (§7.5/§8.4 de Opus) |
| K5 | El `EditorPropertyPanel` genérico no sabe renderizar un tipo de campo nuevo que un tipo de entidad futuro necesite | `PropertyFieldDef.kind` es una unión cerrada revisada en code review; añadir un `kind` nuevo (p. ej. un selector de color) es un cambio explícito y aislado a `fields/PropertyFields.tsx`, nunca implícito |
| K6 | Reglas de Firestore desplegadas a un proyecto pero no a otro (dev vs prod) dejan `/panel/editor` funcionando en un entorno y fallando con `permission-denied` en otro | Documentado explícitamente en `README.md` como paso manual obligatorio de la Fase 3 (criterio A14) — no hay forma de automatizarlo sin credenciales de despliegue en CI, fuera del alcance de este plan |
| K7 | Extensión del navegador o dispositivo sin soporte de `IndexedDB` (ver comentario de `firebase.ts:82-84`) afecta también al borrador local del editor | El borrador usa `localStorage` (no `IndexedDB`) con `try/catch` silencioso — el editor sigue funcionando contra Firestore directo si el borrador local falla, igual que ya hace `WalkDebugOverlay` |

---

## 16. Plan de pruebas

### 16.1 Unitarias — lógica pura (`e2e/unidad-nivel.spec.ts`, Playwright component-less o Vitest si se añade — a decidir en Fase 1 según lo que ya use el repo para pruebas puras; **no añade dependencias nuevas**, ver criterio A3)

- **`navmesh` (extensión)**: 6 suites —
  1. Regresión: `isWalkable`/`findPath`/`nearestWalkablePoint` producen el mismo resultado antes/después del cambio sobre `CIUDAD_CENTRAL_WALKABLE`, con 6 pares origen/destino fijados de antemano.
  2. `isWalkableInMesh`: dentro de un walkable ⇒ true; dentro de un bloqueado ⇒ false; fuera de todo walkable ⇒ false (incluso si no hay ningún bloqueado ahí).
  3. `buildVisibilityGraph`/`findPathInMesh`: ruta directa cuando no hay obstáculo; ruta que rodea un bloqueado; `reachable: false` cuando dos regiones no están conectadas (nunca una recta que atraviese).
  4. Costura entre polígonos adyacentes (`normalizeMesh`): dos walkables que comparten un borde permiten pasar de uno a otro.
  5. Índice espacial de aristas (`edgeGrid`): mismo resultado que el test exhaustivo O(E), en un caso con suficientes aristas para ejercitar más de una celda.
  6. Filtrado de nodos no transitables: un vértice de un walkable cubierto por un bloqueado no aparece como nodo del grafo.
- **`geometry`**: 3 suites — `polygonIsSimple` (detecta autointersección), `simplifyPolygon` (reduce vértices colineales sin cambiar la forma), casos límite (polígono de 3 vértices, polígono degenerado).
- **`validate`**: las 8 comprobaciones estructurales de `validateLevel` (implementadas en Fase 2, `src/lib/level/validate.ts`): (1) todo polígono es simple; (2) existe ≥1 transitable y `spawn` cae dentro de la malla; (3) cada `LevelExit` toca la malla; (4) toda entidad interactuable tiene `standPoint` (error si falta; *warning*, no error, si no cae exacto sobre lo transitable — el runtime lo corrige solo, igual que un clic fuera del área; ver `ciudadCentralAsLevel`, cuyos propios `standX/standY` de producción no caen todos exactos); (5) toda referencia entre elementos apunta a un id existente; (6) `background.alt` no vacío; (7) `name`/`background.src` no vacíos; (8) ningún id repetido dentro de su colección. La detección de ciclos de eventos (T4) se añade recién en Fase 8, cuando exista `events/catalog.ts` — no antes. Los presupuestos blandos de §14 (P2) se prueban junto con `serialize`.
- **`serialize`**: `stripUndefined` elimina `undefined` recursivamente sin tocar `null`; `assertNoNestedArrays` lanza sobre un array de arrays sintético; `assertSize` avisa por encima del umbral.
- **`legacy/ciudadCentral`**: `ciudadCentralAsLevel()` pasa `validateLevel` con cero errores; prueba de paridad punto a punto del polígono (mismos vértices que `CIUDAD_CENTRAL_WALKABLE`) y de los 5 nombres de entidad esperados.
- **`events/bus`**: orden de ejecución de acciones respetando `delayMs`; `once` no vuelve a disparar; condiciones (`all`/`any`/`not`) filtran correctamente; `MAX_CHAIN_DEPTH` corta un ciclo sintético `A→B→A` sin colgar el proceso.
- **`runtime/state`**: `deriveInitialState` reconstruye el estado del mundo (puertas abiertas, terminales activas) puramente a partir de `skillsProgress` simulado, sin ninguna escritura; `deriveObjectiveDone` para los 4 `ObjectiveSource`.

### 16.2 Persistencia (`e2e/editor-persistencia.spec.ts`, contra el emulador de Firestore — mismo patrón que ya usan los E2E existentes vía `NEXT_PUBLIC_FIREBASE_EMULATORS=1`)

- Crear nivel → leer → guardar dos veces → `versions/000001` y `versions/000002` existen e inmutables (un `updateDoc` sobre una versión falla con `permission-denied`).
- Conflicto de versión: dos "clientes" (dos `saveLevel` con el mismo `level.version` de partida) — el segundo debe fallar con `StaleLevelError`.
- Borrar un nivel elimina el documento vivo (las versiones pueden quedar o purgarse — a decidir en Fase 3, documentar la decisión tomada).

### 16.3 Editor (`e2e/editor.spec.ts`, Playwright end-to-end contra la UI real)

Cubre el flujo completo de 24 pasos del criterio de aceptación (§20.1 de Opus) más:
- Deshacer/rehacer sobre cada tipo de mutación (mover vértice, colocar entidad, editar propiedad, borrar).
- Atajos de teclado (§5.6 de Opus) uno por uno.
- Recuperación de borrador local tras un cierre no limpio simulado (`localStorage` con un borrador más nuevo que `updatedAt`).
- Prueba de extensibilidad: añadir el tipo de entidad `palanca` de prueba y confirmar que aparece en toolbox/canvas/panel sin más cambios (criterio A10).

### 16.4 Runtime y Play Test (`e2e/nivel-runtime.spec.ts`)

- Jugar `ciudadCentralAsLevel()` fuera del editor (`/jugar/{childId}/nivel/{id}` con el adaptador): Alex camina respetando la geometría real, rodea el hueco, no sale del contorno — muestreo continuo de la pose durante la animación (no solo el punto final).
- Resolver un desafío dentro del runtime escribe `attempts`/`skillsProgress`/`starLedger` exactamente igual que hoy en Ciudad Central (mismo aserto que ya hace algún E2E existente sobre `PuzzleOverlay`, reutilizado).
- Cadena de eventos completa (el ejemplo de §8.5 de Opus): verificar el `data-state` de cada entidad en cada instante de la secuencia de 1.4s.
- Play Test: cero escrituras a Firestore durante la sesión (consulta directa al emulador tras salir) — criterio 21/A7.
- Reset dentro de Play Test vuelve a spawn con estado de entidades limpio, sin salir del modo prueba ni tocar el estado del editor.

### 16.5 Rendimiento (`e2e/nivel-rendimiento.spec.ts`)

Nivel sintético generado en el propio test (300 vértices, 8 polígonos bloqueados, 40 entidades): `buildVisibilityGraph` &lt;60ms, `findPathInMesh` &lt;15ms — medido con `performance.now()` dentro de la página, no con el reloj de Playwright (evita ruido de red/IPC).

### 16.6 Regresión y accesibilidad (obligatorias, no nuevas — verifican que nada existente se rompió)

- Los 7 E2E existentes (`e2e/*.spec.ts` de hoy) pasan **sin ninguna modificación** — criterio A2.
- `npm run lint && npm run typecheck && npm run build` en verde — criterio A1.
- Cero violaciones `serious`/`critical` de axe en `/panel/editor` y `/panel/editor/[levelId]` (criterio A11); `prefers-reduced-motion` colapsa las animaciones del editor y del runtime igual que ya hace `QuestScene.tsx:157-159` (criterio A12).

---

> *(A partir de aquí, secciones 17-20 tal como las entregó Opus 5. Nota: al inicio de la Fase 1 de la §17, Opus 5 se quedó sin cuota de sesión a mitad de la entrega y los puntos 1-3 de esa fase no llegaron a transcribirse completos — se conserva el fragmento recibido, que incluye el punto 4, el entregable verificable y el "no hacer" de esa fase, intactos.)*

## 17. Orden exacto de implementación

### **FASE 1 — Motor de navegación multi-polígono (sin UI)**
**Archivos:** `src/lib/world/navmesh.ts` (extender).
**Trabajo** *(fragmento recibido — los puntos 1-3 de esta fase no llegaron a transcribirse antes del corte de cuota; ver §6.2 de este mismo documento para el diseño completo de `NavigationMesh`/`isWalkableInMesh`/`buildVisibilityGraph`/`findPathInMesh`/`normalizeMesh` que esta fase implementa)*:

(firmas intactas, con `WeakMap` de caché de grafo por objeto `area`).
4. Filtrar nodos no transitables antes de entrar al grafo; conservar la optimización de vecinos del mismo anillo solo cuando la arista está dentro de la malla.

**Entregable verificable:** `e2e/unidad-nivel.spec.ts` pasa las 6 suites de `navmesh` (incluida la de **regresión** sobre `CIUDAD_CENTRAL_WALKABLE`, con 6 pares origen/destino fijados) y las 3 de `geometry`. `e2e/aventura.spec.ts` pasa sin cambios: Ciudad Central se mueve exactamente igual.
**No hacer:** no tocar ningún componente React.

---

### **FASE 2 — Modelo de datos, validación, migración y adaptador legacy**
**Archivos:** `src/lib/level/schema.ts`, `defaults.ts`, `ids.ts`, `validate.ts`, `migrate.ts`, `serialize.ts`, `legacy/ciudadCentral.ts`; suites `validate`, `serialize` y `legacy/ciudadCentral` en `e2e/unidad-nivel.spec.ts`.
**Trabajo:**
1. Escribir `schema.ts` completo tal cual §4 (solo tipos y `LEVEL_SCHEMA_VERSION = 1`).
2. `createEmptyLevel(authorUid, name, background)` con un polígono transitable rectangular por defecto (10,10)-(90,90) y `spawn` en su centro, para que un nivel nuevo sea jugable desde el minuto cero.
3. `validateLevel` con las 8 comprobaciones de §16.1 + presupuestos blandos de §14 P2.
4. `serialize.ts` con `stripUndefined`, `assertNoNestedArrays`, `assertSize`.
5. `migrate.ts` con la cadena vacía (`v1 → v1`) pero la estructura ya montada: `MIGRATIONS: Record<number, (raw:any)=>any>`.
6. `ciudadCentralAsLevel(authorUid)` con el mapeo completo de §12.3.

**Entregable verificable:** `ciudadCentralAsLevel()` produce un `LevelDefinition` que pasa `validateLevel` con **cero errores**, y la prueba de paridad confirma la igualdad punto a punto del polígono y los 5 nombres de entidad.
**No hacer:** nada de UI ni de Firestore.

---

### **FASE 3 — Persistencia y lista de niveles**
**Archivos:** `firestore.rules` (modificar), `src/lib/level/persistence/levelRepository.ts`, `draftCache.ts`, `useLevelDoc.ts`, `src/app/panel/editor/page.tsx`, `src/components/family/PanelShell.tsx` (1 ítem de nav), `e2e/editor-persistencia.spec.ts`.
**Trabajo:**
1. Añadir el bloque `match /levels/{levelId}` de §10.2 a `firestore.rules`.
2. `levelRepository` con las 10 funciones de §10.3; `saveLevel` transaccional con `StaleLevelError`.
3. `draftCache` clonando el patrón de `WalkDebugOverlay.tsx:33-45`.
4. `/panel/editor`: lista con `SectionCard`/`EmptyState`/`SkeletonRows` de `src/components/family/ui.tsx`; acciones crear / duplicar / borrar / abrir / "Jugar con {hijo}".
5. Ítem `{ href: "/panel/editor", label: "Editor", icon: Wand2, exact: false }` en `NAV` de `PanelShell.tsx:12-18`.
6. **Desplegar las reglas**: `npx firebase deploy --only firestore:rules --project <id>` y anotarlo en `README.md`.

**Entregable verificable:** `e2e/editor-persistencia.spec.ts` crea un nivel, lo lee, lo guarda dos veces y comprueba que existen `versions/000001` y `versions/000002` inmutables; un intento de `update` sobre una versión falla con `permission-denied`.
**No hacer:** todavía no hay editor visual; la lista basta.

---

### **FASE 4 — Shell del editor (provider, reducer, historial, canvas vacío)**
**Archivos:** `src/components/level/editor/LevelEditorProvider.tsx`, `editorReducer.ts`, `LevelEditorScreen.tsx`, `EditorTopBar.tsx`, `EditorBottomBar.tsx`, `EditorCanvas.tsx`, `layers/BackgroundLayer.tsx`, `layers/GridLayer.tsx`, `useEditorViewport.ts`, `useEditorHotkeys.ts`, `useAutosave.ts`, `src/app/panel/editor/[levelId]/page.tsx` + `layout.tsx`, `src/app/globals.css` (clases `.editor-*`).
**Trabajo:** estado completo de §5.2, undo/redo con coalescencia de gestos, viewport pan/zoom, rejilla flat/isométrica, autosave con debounce, barra de recuperación de borrador local.
**Entregable verificable:** abrir `/panel/editor/{id}` muestra el fondo, se hace zoom y pan, `Ctrl+Z`/`Ctrl+Shift+Z` funcionan sobre un cambio de nombre, el indicador de guardado pasa por `Guardando… → Guardado ✓`, y al recargar el nombre persiste.

---

### **FASE 5 — Herramientas de navegación**
**Archivos:** `layers/NavigationLayer.tsx`, `PolygonEditor.tsx`, `EditorToolbox.tsx` (sección NAVIGATION), `IssuesPanel.tsx`.
**Trabajo:** port de `WalkDebugOverlay` según §6.3; herramientas *área transitable*, *zona prohibida*, *punto de inicio*, *punto de destino*; handles "+" solo en el polígono seleccionado (P6); aviso en vivo de polígono autointersecante (T2); contador de vértices en `BottomBar`.
**Entregable verificable:** dibujar dos polígonos transitables y un bloqueado, moverlos, insertar y borrar vértices, colocar el spawn; `validateLevel` reporta cero errores; recargar conserva la geometría exacta.

---

### **FASE 6 — Registro de entidades y colocación**
**Archivos:** `src/lib/level/entities/registry.ts`, `schema.ts`, `index.ts`, `types/*.tsx` (7), `layers/EntityLayer.tsx`, `layers/SelectionLayer.tsx`, `EditorPropertyPanel.tsx`, `fields/*.tsx`.
**Trabajo:** los 7 tipos de §7.3, el panel de propiedades 100 % dirigido por `PropertyFieldDef` (§5.3), y-sort de §7.4, selección/mover/duplicar/eliminar.
**Entregable verificable:** colocar los 7 tipos, editar sus propiedades, comprobar el y-sort (una entidad con `y` mayor tapa a otra con `y` menor). **Prueba de extensibilidad**: añadir un 8.º tipo (`palanca`) tocando solo 2 archivos y verificar que aparece en toolbox, canvas y panel sin más cambios.

---

### **FASE 7 — Zonas, diálogos y desafíos**
**Archivos:** `layers/ZoneLayer.tsx`, `DialogEditor.tsx`, `ChallengePicker.tsx`, sección GAMEPLAY de `EditorToolbox.tsx`.
**Trabajo:** zonas poligonales y circulares; editor de líneas de diálogo con hablante (entidad o narrador) y retrato; `ChallengePicker` sobre `MODULES` con vista previa real de `mod.generateProblem()` renderizada con `QuestionWidget`.
**Entregable verificable:** asociar `aritmetica-d1` a la terminal, ver la vista previa del problema, guardar y recargar conservando `moduleId` y `activityId`.

---

### **FASE 8 — Sistema de eventos (datos + editor)**
**Archivos:** `src/lib/level/events/catalog.ts`, `bus.ts`, `actions.ts`, `conditions.ts`, `EventChainEditor.tsx`; suite `events/bus` en `e2e/unidad-nivel.spec.ts`.
**Trabajo:** catálogo completo de §8.4, bus indexado de §8.2 con guardia anti-ciclo, editor visual trigger → condición → lista de acciones con `delayMs`, detección estática de ciclos en `validateLevel`.
**Entregable verificable:** las pruebas del bus pasan (orden, `once`, condiciones, `MAX_CHAIN_DEPTH`); la cadena de 6 acciones del ejemplo se construye por UI y se guarda.

---

### **FASE 9 — Runtime del nivel**
**Archivos:** `src/lib/level/runtime/state.ts`, `services.ts`, `navigation.ts`, `useLevelRuntime.ts`, `useAlexMovement.ts`; `src/components/level/runtime/LevelRuntime.tsx`, `RuntimeCanvas.tsx`, `RuntimeEntity.tsx`, `RuntimeZones.tsx`, `RuntimePlayer.tsx`, `LevelHud.tsx`; `src/app/jugar/[childId]/nivel/[levelId]/page.tsx` + `layout.tsx`; suite `runtime/state`.
**Trabajo:** `deriveInitialState` (§9.6), malla activa memoizada (§6.4), movimiento con escritura directa al DOM en el bucle rAF (P5), detección de zonas con los dos filtros (P4), `useCameraBox` para la cámara, `LevelExit`.
**Entregable verificable:** jugar `ciudadCentralAsLevel()` desde `/jugar/{childId}/nivel/{id}`: Alex camina respetando la geometría, rodea el bloqueado y no sale del área. Las pruebas 13-14 y 17 de §16.3 pasan.
**No hacer:** todavía sin desafíos ni play-test.

---

### **FASE 10 — Integración académica**
**Archivos:** `src/components/world/PuzzleOverlay.tsx` (2 props opcionales), `src/components/level/runtime/LevelChallengeOverlay.tsx`, `LevelDialogOverlay.tsx`.
**Trabajo:** refactor de `submit` (`PuzzleOverlay.tsx:77-111`) a `recordAttempt ?? defaultRecordAttempt`; envoltorio de §9.3; emisión de `ON_CHALLENGE_STARTED` / `SUCCESS` / `FAILED`.
**Entregable verificable:** resolver un desafío en `/jugar/{childId}/nivel/{id}` escribe `attempts`, `skillsProgress` y `starLedger` exactamente igual que hoy (prueba 21 de §16.3), y `e2e/aventura.spec.ts` sigue verde (las llamadas antiguas a `PuzzleOverlay` no cambiaron).

---

### **FASE 11 — Play Test**
**Archivos:** `createSandboxServices` en `services.ts`, `PlayTestBar.tsx`, modo play-test en `LevelEditorScreen.tsx`, regla ESLint de aislamiento en `eslint.config.mjs`.
**Trabajo:** flujo de §11.3, `key={playtestSessionId}` para el remount en Reset, validación bloqueante antes de entrar.
**Entregable verificable:** pruebas 12, 15, 16, 18, 19 y **20** de §16.3 (la 20 confirma cero escrituras a Firestore durante el play-test). La regla ESLint falla si `LevelRuntime` importa algo de `editor/`.

---

### **FASE 12 — Misiones y HUD**
**Archivos:** `MissionEditor.tsx`, `LevelMissionOverlay.tsx`, `deriveObjectiveDone` en `runtime/state.ts`.
**Trabajo:** §9.5 con las 4 `ObjectiveSource`; overlay con el markup de `QuestOverlays.MissionOverlay`; barra de objetivo actual con el patrón de `QuestScene.tsx:499-514`; `GENERATE_AXIA` con la animación `+★` de `QuestScene.tsx:467-476`.
**Entregable verificable:** un objetivo de tipo `challenge` se marca completado tras resolverlo de verdad y **sigue completado** tras recargar, sin ningún documento de progreso de nivel en Firestore.

---

### **FASE 13 — Endurecimiento**
**Archivos:** `IssuesPanel.tsx`, `validate.ts`, `geometry.ts` (`simplifyPolygon`), `e2e/editor.spec.ts`, `e2e/nivel-runtime.spec.ts`, `e2e/nivel-rendimiento.spec.ts`, `e2e/accesibilidad.spec.ts` (2 rutas nuevas).
**Trabajo:** todos los mitigadores de §13 y §14 pendientes; modo teclado del canvas (K8); `beforeunload`; diálogo de conflicto `StaleLevelError`; presupuestos y simplificación.
**Entregable verificable:** las 6 suites de §16 en verde, incluida la de rendimiento con el nivel sintético de 300 vértices y las 21 pruebas E2E.

---

### **FASE 14 — (OPCIONAL, no comprometida) Migración de Ciudad Central**
Solo tras decisión explícita. Detalle en §12.4. Flag `NEXT_PUBLIC_LEVELS_V2`, PR independiente, adaptación de `e2e/aventura.spec.ts` en esa misma PR.

---

## 18. Archivos que se crearán / modificarán

### 18.1 Crear (61 archivos)

**Lógica pura — `src/lib/level/`**
```
src/lib/level/schema.ts
src/lib/level/defaults.ts
src/lib/level/ids.ts
src/lib/level/validate.ts
src/lib/level/migrate.ts
src/lib/level/geometry.ts
src/lib/level/serialize.ts
src/lib/level/entities/registry.ts
src/lib/level/entities/schema.ts
src/lib/level/entities/index.ts
src/lib/level/entities/types/playerSpawn.tsx
src/lib/level/entities/types/npc.tsx
src/lib/level/entities/types/enemy.tsx
src/lib/level/entities/types/door.tsx
src/lib/level/entities/types/terminal.tsx
src/lib/level/entities/types/collectible.tsx
src/lib/level/entities/types/interactive.tsx
src/lib/level/events/catalog.ts
src/lib/level/events/bus.ts
src/lib/level/events/actions.ts
src/lib/level/events/conditions.ts
src/lib/level/runtime/state.ts
src/lib/level/runtime/services.ts
src/lib/level/runtime/navigation.ts
src/lib/level/runtime/useLevelRuntime.ts
src/lib/level/runtime/useAlexMovement.ts
src/lib/level/persistence/levelRepository.ts
src/lib/level/persistence/draftCache.ts
src/lib/level/persistence/useLevelDoc.ts
src/lib/level/legacy/ciudadCentral.ts
```

**Editor — `src/components/level/editor/`**
```
src/components/level/editor/LevelEditorProvider.tsx
src/components/level/editor/editorReducer.ts
src/components/level/editor/LevelEditorScreen.tsx
src/components/level/editor/EditorTopBar.tsx
src/components/level/editor/EditorToolbox.tsx
src/components/level/editor/EditorCanvas.tsx
src/components/level/editor/EditorPropertyPanel.tsx
src/components/level/editor/EditorBottomBar.tsx
src/components/level/editor/PolygonEditor.tsx
src/components/level/editor/EventChainEditor.tsx
src/components/level/editor/ChallengePicker.tsx
src/components/level/editor/DialogEditor.tsx
src/components/level/editor/MissionEditor.tsx
src/components/level/editor/IssuesPanel.tsx
src/components/level/editor/useEditorViewport.ts
src/components/level/editor/useEditorHotkeys.ts
src/components/level/editor/useAutosave.ts
src/components/level/editor/layers/BackgroundLayer.tsx
src/components/level/editor/layers/NavigationLayer.tsx
src/components/level/editor/layers/EntityLayer.tsx
src/components/level/editor/layers/ZoneLayer.tsx
src/components/level/editor/layers/GridLayer.tsx
src/components/level/editor/layers/SelectionLayer.tsx
src/components/level/editor/fields/PropertyFields.tsx
```

**Runtime — `src/components/level/runtime/`**
```
src/components/level/runtime/LevelRuntime.tsx
src/components/level/runtime/RuntimeCanvas.tsx
src/components/level/runtime/RuntimeEntity.tsx
src/components/level/runtime/RuntimeZones.tsx
src/components/level/runtime/RuntimePlayer.tsx
src/components/level/runtime/LevelDialogOverlay.tsx
src/components/level/runtime/LevelChallengeOverlay.tsx
src/components/level/runtime/LevelMissionOverlay.tsx
src/components/level/runtime/LevelHud.tsx
src/components/level/runtime/PlayTestBar.tsx
```

**Rutas — `src/app/`**
```
src/app/panel/editor/page.tsx
src/app/panel/editor/[levelId]/page.tsx
src/app/panel/editor/[levelId]/layout.tsx
src/app/jugar/[childId]/nivel/[levelId]/page.tsx
src/app/jugar/[childId]/nivel/[levelId]/layout.tsx
```

**Pruebas — `e2e/`**
```
e2e/unidad-nivel.spec.ts
e2e/editor-persistencia.spec.ts
e2e/editor.spec.ts
e2e/nivel-runtime.spec.ts
e2e/nivel-rendimiento.spec.ts
```

### 18.2 Modificar (7 archivos)

| Archivo | Cambio | Riesgo |
|---|---|---|
| `src/lib/world/navmesh.ts` | **Añadir** `NavigationMesh`, `isWalkableInMesh`, `buildVisibilityGraph`, `findPathInMesh`, `nearestWalkablePointInMesh`, `normalizeMesh`, `meshFromWalkableArea`. **Reescribir** `isWalkable`/`findPath`/`nearestWalkablePoint` como adaptadores de una línea, con firma y semántica intactas. | Medio — cubierto por prueba de regresión (Fase 1) |
| `src/components/world/PuzzleOverlay.tsx` | Añadir props opcionales `recordAttempt?` y `onStars?`; extraer el cuerpo actual de `submit` (`:82-100`) a `defaultRecordAttempt`. | Bajo — sin cambios en llamadas existentes |
| `firestore.rules` | Añadir `match /levels/{levelId}` + `match /versions/{versionId}` dentro de `match /parents/{parentId}`. | Bajo — solo añade permisos, no relaja los existentes. **Requiere despliegue manual.** |
| `src/components/family/PanelShell.tsx` | Un ítem en `NAV` (`:12-18`). | Nulo |
| `src/app/globals.css` | Bloque de clases `.editor-*` (canvas, handles, rejilla, panel). | Nulo |
| `eslint.config.mjs` | `no-restricted-imports`: (a) `firebase/firestore` prohibido fuera de `src/lib/firebase.ts`; (b) `src/components/level/editor/**` prohibido desde `src/components/level/runtime/**`. | Nulo |
| `README.md` | Sección "Editor de niveles": despliegue de reglas, ruta `/panel/editor`, colecciones nuevas. | Nulo |

### 18.3 Explícitamente NO se tocan

`src/components/world/QuestScene.tsx` · `src/lib/world/questScene.ts` · `src/lib/world/quests.ts` · `src/lib/world/state.ts` · `src/lib/world/scenes.ts` · `src/components/world/ZoneScene.tsx` · `src/components/world/SceneFx.tsx` · `src/components/world/WalkDebugOverlay.tsx` · `src/lib/world/walkableAreaCode.ts` · `src/app/api/dev/walkable-area/route.ts` · `src/app/jugar/[childId]/page.tsx` · `src/lib/curriculum.ts` · `src/lib/problem.ts` · `src/lib/attemptRecorder.ts` · `src/lib/mastery.ts` · `src/lib/economy.ts` · `src/lib/badges.ts` · `src/components/topic/**` · `src/lib/firebase.ts` · los 7 specs E2E existentes.

---

## 19. Dependencias entre tareas

### 19.1 Grafo de fases

```
F0 ──▶ F1 ──▶ F2 ──┬──▶ F3 ──▶ F4 ──▶ F5 ──┬──▶ F6 ──▶ F7 ──┬──▶ F8 ──┐
                   │                        │                 │        │
                   └────────────────────────┴─────────────────┘        │
                                                                       ▼
                                          F1 + F2 + F6 + F8 ─────────▶ F9
                                                                       │
                                                                       ▼
                                                              F7 ────▶ F10
                                                                       │
                                                        F4 + F9 + F10 ─┴──▶ F11
                                                                       │
                                                                       ▼
                                                        F7 + F9 ─────▶ F12
                                                                       │
                                                                       ▼
                                                     (todas) ────────▶ F13 ──▶ [F14]
```

### 19.2 Tabla de precedencias

| Fase | Depende de | Motivo exacto |
|---|---|---|
| F1 | F0 | Línea base de no regresión |
| F2 | F1 | `LevelNavigation` referencia `NavPolygon`, que el motor debe saber consumir; `ciudadCentralAsLevel` valida contra `normalizeMesh` |
| F3 | F2 | `levelRepository` serializa `LevelDefinition`; `migrateLevel` se aplica al leer |
| F4 | F3 | El editor carga el nivel con `useLevelDoc` y guarda con `saveLevel` |
| F5 | F4, F1 | `PolygonEditor` despacha al `editorReducer` (F4) y `validateLevel` usa `polygonIsSimple` (F1/F2) |
| F6 | F4, F2 | `EditorPropertyPanel` necesita el reducer y `PropertyFieldDef` |
| F7 | F6 | Los desafíos se asocian a entidades ya colocables; los diálogos referencian `entityId` |
| F8 | F6, F7 | Los triggers referencian `entityId`, `challengeId` y `zoneId`, que deben existir |
| F9 | F1, F2, F6, F8 | El runtime necesita el motor de navegación, el modelo, el registro de entidades (para `Render`) y el bus |
| F10 | F7, F9 | El overlay de desafío necesita `ChallengePlacement` (F7) montado dentro del runtime (F9) |
| F11 | F4, F9, F10 | El play-test vive dentro del shell del editor (F4) y monta el runtime completo (F9+F10) |
| F12 | F7, F9 | Los objetivos referencian `challengeId` (F7) y se derivan en `runtime/state` (F9) |
| F13 | F1–F12 | Endurecimiento transversal |
| F14 | F13 | Opcional, solo tras paridad demostrada |

### 19.3 Paralelizables

- **F5 ‖ F6**: navegación y entidades no se tocan (`NavigationLayer` vs `EntityLayer`, ramas distintas del reducer). Único punto común: `EditorToolbox` — se resuelve declarando primero la estructura de secciones vacía en F4.
- **F7 ‖ parte de F8**: `catalog.ts`, `bus.ts` y `conditions.ts` (lógica pura, con sus pruebas) pueden escribirse en paralelo a F7; solo `EventChainEditor.tsx` necesita F7.
- **Documentación de F13** (README, notas de a11y) puede adelantarse.

### 19.4 Ruta crítica

`F0 → F1 → F2 → F3 → F4 → F6 → F8 → F9 → F10 → F11 → F13` — 11 fases. F5, F7 y F12 quedan fuera del camino crítico si se paralelizan.

### 19.5 Bloqueos externos

| Bloqueo | Cuándo | Quién |
|---|---|---|
| **Despliegue de `firestore.rules`** al proyecto real | Fin de F3 | Quien tenga acceso a Firebase Console (`npx firebase deploy --only firestore:rules`) |
| **Arte de fondo** para niveles nuevos | F4 (el selector puede empezar con los 9 `.webp` ya en `public/illustrations/`) | Ninguno: hay 9 fondos ya disponibles |
| Nada más | — | — |

> No hay dependencias de librerías nuevas: el plan **no añade ninguna dependencia a `package.json`**. Zoom/pan, undo/redo, edición de polígonos y el event bus se implementan con React 19 + SVG nativo, siguiendo el precedente de `WalkDebugOverlay`.

---

## 20. Criterios de aceptación

### 20.1 El flujo de 24 pasos

Cada criterio es verificable en `e2e/editor.spec.ts` + `e2e/nivel-runtime.spec.ts`.

| # | Paso | Criterio de aceptación verificable |
|---|---|---|
| **1** | Crear nivel | En `/panel/editor`, "Nuevo nivel" abre `/panel/editor/{levelId}`. Existe `/parents/{uid}/levels/{levelId}` con `version: 1` y `schemaVersion: 1`. `validateLevel` devuelve cero errores (el nivel vacío ya trae área rectangular por defecto y spawn en su centro). |
| **2** | Elegir fondo | El selector lista los 9 `.webp` de `public/illustrations/`. Al elegir `city-central.webp`, `background.width/height` se rellenan con las dimensiones nativas leídas del `<img>` (1600×907), el `alt` es obligatorio y no puede quedar vacío. El fondo se ve en el canvas. |
| **3** | Definir área transitable | Herramienta "Área transitable" (verde). Clic a clic se dibuja un polígono; "Cerrar" lo añade a `navigation.walkablePolygons`. Se ve relleno `rgba(34,197,94,0.18)` con borde `#22c55e`. Vértices arrastrables, insertables con "+" o doble clic, borrables con Shift+clic. El contador del `BottomBar` refleja el número real. |
| **4** | Definir zonas prohibidas | Herramienta "Zona prohibida" (roja) dibuja dentro del área verde y añade a `navigation.blockedPolygons`. Relleno `rgba(244,63,94,0.25)`, borde `#f43f5e`. Con "🐞 Ver navegación" activo, `isWalkableInMesh` se muestra por muestreo: verde = transitable, rojo = bloqueado, y **fuera del verde también es rojo**. |
| **5** | Colocar Alex | Herramienta "Punto de inicio". Clic dentro del área ⇒ `navigation.spawn` se fija y aparece el sprite `explorer.webp`. Clic **fuera** del área ⇒ `validateLevel` emite `error: "El punto de inicio está fuera del área transitable"` en `IssuesPanel`, con clic-para-seleccionar. |
| **6** | Colocar Dra. Nia | Herramienta NPC. Se crea una `LevelEntity` de tipo `npc`. En el panel derecho: `name = "Dra. Nia"`, `portrait = "/illustrations/nia-portrait.webp"`, `role = "Investigadora de AXIA"`. Se define su `interaction.standPoint` arrastrando un handle secundario. |
| **7** | Colocar terminal | Herramienta Terminal. Entidad de tipo `terminal` con estados `off` (inicial) y `on`. El panel derecho muestra `headline`, `action`, `isCore` — **derivados de `EntityTypeDef.properties`, sin ningún `switch` en el panel**. |
| **8** | Colocar puerta | Herramienta Puerta. Entidad `door` con estados `locked` (inicial), `closed`, `open`. En `blockerPolygonId` se selecciona (campo `polygonRef`) un polígono bloqueado dibujado en el vano; `EntityStateDef.activeBlockerIds` lo incluye en `locked` y `closed`, y no en `open`. |
| **9** | Crear interacción con la terminal | En la terminal, `interaction.mode = "click"`, `prompt = "Usar la terminal"`, `lockedNote = "Sin energía"`, `standPoint` fijado. En el runtime, la terminal es un `<button>` con `aria-label` = `"Terminal de acceso — Disponible"`. |
| **10** | Asociar un desafío existente | `ChallengePicker` lista los 52 módulos agrupados por hilo. Se elige `aritmetica-d1` ("Sumas hasta 5") con `activityId = "puzzle"`. "Vista previa" muestra un `Problem` real de `mod.generateProblem()`. Se crea un `ChallengePlacement` con `sourceEntityId` = la terminal. **En ninguna parte del `LevelDefinition` guardado aparece un enunciado, una respuesta ni un generador**: solo `{ moduleId: "aritmetica-d1", activityId: "puzzle" }`. |
| **11** | Configurar `ON_CHALLENGE_SUCCESS` | En `EventChainEditor`, nueva regla con `trigger.type = "ON_CHALLENGE_SUCCESS"` y `trigger.challengeId` = el del paso 10. |
| **12** | Activar terminal | Acción `CHANGE_OBJECT_STATE { entityId: terminal, state: "on" }` con `delayMs: 200`. |
| **13** | Generar AXIA | Acción `GENERATE_AXIA { source: "challenge" }` con `delayMs: 0`. **Verificación anti-economía-paralela**: tras jugar el nivel en vivo, el número de documentos de `starLedger` creados es exactamente **1** (el de `recordModuleAttempt`), no 2. |
| **14** | Desbloquear la puerta | Acción `CHANGE_OBJECT_STATE { entityId: puerta, state: "closed" }` con `delayMs: 900`. |
| **15** | Abrir la puerta | Acciones `OPEN_DOOR { entityId: puerta }` y `UNLOCK_AREA { polygonId: sala2, role: "walkable" }`, ambas con `delayMs: 1400`. La regla completa tiene 5 acciones en orden. |
| **16** | Probar nivel | "▶ Probar" (o `P`): `validateLevel` corre primero; si hay errores, se abre `IssuesPanel` y **no se entra**. Sin errores: Toolbox, PropertyPanel y BottomBar desaparecen (`display:none` + `aria-hidden`), aparece `PlayTestBar` con "MODO PRUEBA", y Alex está en `navigation.spawn`. |
| **17** | Mover a Alex sin salir del área | Clic dentro ⇒ camina. Clic **fuera** ⇒ se detiene en el punto proyectado por `nearestWalkablePointInMesh` (la prueba muestrea la pose durante la animación y afirma `isWalkableInMesh(pose) === true` en **todos** los muestreos). Clic al otro lado del bloqueado ⇒ **rodea**, y ningún muestreo cae dentro del polígono rojo. Clic en un área desconectada ⇒ `reachable: false`, Alex **no se mueve** y se anuncia por `aria-live`. |
| **18** | Resolver el desafío | Clic en la terminal ⇒ Alex camina a `standPoint`, gira y se abre el overlay. Es `PuzzleOverlay` (mismo componente que el juego real), con el enunciado de `aritmetica-d1` y `NumberLineInput`. Se responde correctamente ⇒ "CÓDIGO ACEPTADO". Se emite `ON_CHALLENGE_SUCCESS`. |
| **19** | Ver cambiar el estado del mundo | En 1,4 s se observa, en orden: `+★` de AXIA (0 ms) → terminal en estado `on` con su clase `anim-breathe world-ring-glow` (200 ms) → puerta `closed` (900 ms) → puerta `open` (1400 ms). La prueba verifica el `data-state` de cada entidad en cada instante. |
| **20** | Entrar a la nueva zona | El clic en el área `sala2` que **antes** dejaba a Alex quieto (`reachable: false`) ahora produce una ruta que la atraviesa. Se verifica que `buildRuntimeMesh` incluye `sala2` solo después de `UNLOCK_AREA`. |
| **21** | Salir del play-test | "✕ Salir": vuelven Toolbox, PropertyPanel y BottomBar; **la selección, el zoom, el pan y el historial de undo son exactamente los de antes de entrar**. `attempts`, `skillsProgress` y `starLedger` del hijo **no han crecido** (consulta directa a los emuladores). |
| **22** | Guardar | "Guardar": el indicador pasa `Guardando… → Guardado ✓`. `/parents/{uid}/levels/{id}` tiene `version: N+1` y existe `/versions/{N+1}` inmutable. Un `updateDoc` sobre esa versión falla con `permission-denied`. |
| **23** | Recargar | `page.reload()` en `/panel/editor/{id}`. No aparece la barra de "borrador local más reciente" (el guardado limpió `draftCache`). |
| **24** | Encontrar el nivel exactamente como fue configurado | Aserción profunda: `background.src/width/height/alt` idénticos · `navigation.walkablePolygons` y `blockedPolygons` **punto a punto** · `navigation.spawn` idéntico · 4 entidades con mismos `id`, `type`, `name`, `position`, `layer`, `state.initial` y `properties` · el `ChallengePlacement` con `moduleId: "aritmetica-d1"` y `activityId: "puzzle"` · la `LevelEventRule` con sus 5 acciones en el mismo orden y con los mismos `delayMs`. Y **volver a entrar en play-test reproduce los pasos 17-20 idénticamente**. |

### 20.2 Criterios transversales (obligatorios en cada fase)

| # | Criterio |
|---|---|
| **A1** | `npm run lint`, `npm run typecheck`, `npm run build` y `npm run e2e` en verde. |
| **A2** | Los 7 specs E2E existentes pasan **sin ninguna modificación**. Ciudad Central se juega exactamente igual que antes. |
| **A3** | **Cero dependencias nuevas** en `package.json`. |
| **A4** | **Cero rutas API nuevas** en `src/app/api/`. |
| **A5** | Ningún `import` estático de `firebase/*` fuera de `src/lib/firebase.ts` (verificado por ESLint y por `npm run build`). |
| **A6** | El `LevelDefinition` guardado **no contiene** enunciados, respuestas, generadores ni lógica de evaluación matemática. Solo `{ moduleId, activityId }`. |
| **A7** | No existe ninguna colección de Firestore de "progreso de nivel" ni de "estado de mundo". El estado del runtime se deriva de `skillsProgress` + sesión (verificable listando las colecciones del hijo tras jugar). |
| **A8** | `localStorage` solo contiene claves `level-editor-draft:*`, y borrarlas no pierde ningún dato guardado (verificable: borrar y recargar ⇒ el nivel sigue completo). |
| **A9** | `LevelRuntime` no importa nada de `src/components/level/editor/**` (regla ESLint). |
| **A10** | Añadir un tipo de entidad nuevo requiere tocar exactamente 2 archivos (`types/*.tsx` + `entities/index.ts`); añadir una acción de evento nueva requiere exactamente 2 (`events/catalog.ts` + `events/actions.ts`). Verificado con el ejercicio del tipo `palanca` en F6. |
| **A11** | Cero violaciones `serious`/`critical` de axe en `/panel/editor` y `/panel/editor/[levelId]`. Ningún estado del editor o del runtime se comunica solo por color. |
| **A12** | `prefers-reduced-motion` colapsa los `delayMs` de las acciones y desactiva la animación de caminar, igual que hoy (`QuestScene.tsx:157-159`). |
| **A13** | Con un nivel de 300 vértices, 8 bloqueos y 40 entidades: `buildVisibilityGraph` <60 ms y `findPathInMesh` <15 ms (medido en `e2e/nivel-rendimiento.spec.ts`). |
| **A14** | `firestore.rules` desplegadas al proyecto real, y la sección correspondiente añadida a `README.md`. |

### 20.3 Revisión de las restricciones del enunciado

| Restricción | Cumplimiento |
|---|---|
| No duplicar sistemas existentes | ✅ Académico: solo se referencia (§9, A6). Movimiento: se **extiende** `navmesh.ts`, no se reescribe (§6.2). Renderizado: el mismo componente `Render` en editor y runtime (§7.2). Modal: `useDialogFocus` existente. |
| No romper el gameplay actual | ✅ Fases 1-13 no tocan `QuestScene`, `questScene.ts`, `ZoneScene`, `jugar/[childId]/page.tsx` (§18.3, A2). El único cambio en `PuzzleOverlay` son props opcionales. |
| No crear estado académico paralelo | ✅ Objetivos derivados con `hasCorrectAttempt` (§9.5); `deriveInitialState` replays sin persistir (§9.6); `GENERATE_AXIA` no escribe en `starLedger` (§8.4 ⚠️, criterio 13); A7. |
| No usar `localStorage` como fuente de verdad | ✅ Solo caché de recuperación, nunca aplicada sin confirmación (§10.5, A8). |
| Compatible con Firebase/Firestore tal como existe hoy | ✅ Mismo árbol `/parents/{uid}`, mismo `isParent()`, mismo `getFirebase()` perezoso, cero rutas API, restricciones de arrays anidados y `undefined` respetadas (§10, A4, A5). |
| Navegación realmente funcional | ✅ `findPathInMesh` sobre los polígonos editados es el **único** camino de movimiento del runtime; `UNLOCK_AREA` cambia la malla de verdad; criterios 17 y 20 lo verifican por muestreo de la pose. |
| Extensible | ✅ Registro de entidades y catálogo de acciones dirigidos por datos; contrato de 2 archivos (A10). |
| Crear niveles completos sin tocar código | ✅ El flujo de 24 pasos se ejecuta enteramente por UI; el `LevelDefinition` resultante vive solo en Firestore. |
| Play Test con el mismo runtime | ✅ Un solo `LevelRuntime`, dos implementaciones del puerto `RuntimeServices` (§11.2); criterio 21 verifica el aislamiento de escrituras. |

---

### Archivos críticos para la implementación

- `C:\Users\diego_garciaar\repositorios\maths\src\lib\world\navmesh.ts` — motor de navegación a extender (multi-polígono, grafo precalculado, `reachable`)
- `C:\Users\diego_garciaar\repositorios\maths\src\components\world\QuestScene.tsx` — de aquí sale `walkPath`, `wander`, `approach` y el modelo de coordenadas en % que hereda el runtime
- `C:\Users\diego_garciaar\repositorios\maths\src\components\world\WalkDebugOverlay.tsx` — editor de polígonos ya funcional; es la base literal de `PolygonEditor`
- `C:\Users\diego_garciaar\repositorios\maths\src\components\world\PuzzleOverlay.tsx` — puente académico canónico; único archivo del juego actual que se modifica (2 props opcionales)
- `C:\Users\diego_garciaar\repositorios\maths\src\lib\world\questScene.ts` — fuente del adaptador legacy y prueba de expresividad del `LevelDefinition`
- `C:\Users\diego_garciaar\repositorios\maths\firestore.rules` — hay que añadir `match /levels/**` y **desplegarlo a mano**

---

*(Fin del documento. Secciones 1-4 y 9-16: Sonnet 5, borrador pendiente de revisión. Secciones 5-8 y 17-20: Opus 5.)*
