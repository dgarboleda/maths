# Plan de arquitectura — Level Editor, Fases 15-22

> **Nota de autoría.** Redactado por **Opus 5** siguiendo el mismo flujo de dos fases de `docs/level-editor-plan.md` (nota de autoría inicial, líneas 3-5): Opus diseña arquitectura, Sonnet implementa. Este documento **continúa** aquel plan; no lo reescribe. Todas las referencias `§N` son a `docs/level-editor-plan.md` salvo indicación contraria. La implementación (Sonnet 5) procede **por grupos de fases, con revisión del usuario entre cada grupo** — ver el resumen ejecutivo en el plan de la sesión de implementación.
>
> Verificación previa al diseño (Opus 5, releyendo el código directamente, no asumido): la última fase implementada es la **14** (`151055e` "Level Editor Fase 14: migración de Ciudad Central detrás de `NEXT_PUBLIC_LEVELS_V2`"), de ahí que este documento numere desde la **Fase 15**. `LevelExit.targetHref` se usa en exactamente 3 lugares (`PolygonEditor.tsx:168`, `useLevelRuntime.ts:81`, `LevelRuntime.tsx:107`) — migración de bajo riesgo. `getModule` es **síncrono** y lo consumen 29 archivos — es la restricción dominante del Requisito 3, no las plantillas de generador. Distribución real de `inputType` en los 6 generadores de código: 42 `integer`, 7 `choice`, 4 `numberLine`, 1 `decimal`, 1 `groupTens`, 1 `balanceWeight` — el 75% del currículo es "sortear parámetros → fórmula → enunciado con placeholders", lo que hace viable el enfoque data-driven del Requisito 3. `firestore.rules:21-22` no cascada a subcolecciones: cada colección nueva necesita su propio bloque, igual que `levels`/`levelAssets`.

---

## 0. Decisiones de política previas (leer antes que nada)

### P1 — Se revierte parcialmente la regla "el editor nunca define contenido académico"

`ChallengePicker.tsx:12-18` y §9/§20.2-A6 de `docs/level-editor-plan.md` documentan la decisión deliberada de que el editor **solo referencia** un `ModuleDef` por `moduleId`. El Requisito 3 (currícula personalizada) la contradice. **Es un cambio de política explícito, no una extensión natural.** La nueva formulación, que preserva el espíritu del criterio A7:

> El **Level Editor** sigue sin definir contenido académico: un `LevelDefinition` guardado sigue conteniendo solo `{ moduleId, activityId }` — **A6 queda intacto**. Lo que se añade es un **segundo editor**, el *Editor de Currícula*, que sí crea módulos, pero los crea con exactamente el mismo contrato que los módulos de código: un `id` que es la clave de `skillsProgress/{id}`, `prerequisites`, `difficulty`, `generateProblem`, `ConceptComponent`. **No se crea un sistema académico paralelo: se crea una segunda *fuente* del mismo sistema.**

A6 se reescribe así en la Fase 22, y se añade **A15**: "ningún módulo personalizado introduce una colección de progreso propia; su progreso vive en `skillsProgress/{moduleId}` igual que el de cualquier módulo de código".

### P2 — Coexistencia, no reemplazo (tercera aplicación del mismo patrón)

Igual que `navmesh.ts` extendido sin romper `findPath` (§6.2) y Ciudad Central conservada (§12.1): `MODULES` (los ~52 objetos de `curriculum.ts`) **no se toca, no se migra, no se convierte en datos**. Los módulos personalizados son un registro paralelo que `getModule` consulta como *fallback*.

### P3 — Excepción documentada al criterio A2

El Requisito 1 hace que `/jugar/{childId}` deje de renderizar Ciudad Central incondicionalmente. `e2e/aventura.spec.ts` navega ahí. **Este plan rompe A2 a propósito, por primera vez**, y adapta ese spec en la Fase 18 (siembra el mundo de ejemplo y luego juega, probando el camino nuevo real). Es la única excepción; los demás specs siguen intactos.

### P4 — Cero dependencias nuevas (A3 se mantiene)

Tooltips, editor de grafo del mundo y evaluador de expresiones se implementan con React 19 + SVG + Tailwind, siguiendo el precedente de `WalkDebugOverlay`/`PolygonEditor`. En particular **no se añade Floating UI ni Radix** (ver §2.6 por el trade-off que eso implica).

---

## 1. Mapa de fases

| Fase | Nombre | Requisito | Depende de |
|---|---|---|---|
| **15** | Sistema de ayuda contextual (tooltips + `IconButton`) | R4 | — |
| **16** | Modelo de Mundo: historia, grafo, reglas, avatares (datos + persistencia) | R2 | — |
| **17** | Editor de Mundo (`/panel/editor/mundo`) | R2 | 15, 16 |
| **18** | Fin del nivel por defecto (`/jugar/[childId]` despachador + mapa del jugador) | R1 | 16, 17 |
| **19** | Catálogo y selección de avatares | R2 | 16, 17 |
| **20** | Currícula personalizada — núcleo (sin UI) | R3 | — (paralelizable con 16-19) |
| **21** | Editor de Currícula (`/panel/curriculum`) + conceptos + ejemplos | R3 | 15, 20 |
| **22** | Endurecimiento, validación cruzada, export/import, pruebas | todas | 15-21 |

Ruta crítica: `15 → 16 → 17 → 18`. La rama `20 → 21` es independiente y puede ir en paralelo desde el día uno. La Fase 15 va primero a propósito: todas las UIs nuevas de 17/19/21 nacen ya con ayuda, en vez de necesitar una pasada posterior.

---

## 2. FASE 15 — Sistema de ayuda contextual

### 2.1 Diagnóstico confirmado

Cero componentes de tooltip. `title=` nativo en 4 lugares (`EditorTopBar.tsx:65,93`, `EditorBottomBar.tsx:81,95`). `EditorToolbox` tiene ~14 botones y solo 2 muestran su atajo (`<kbd>` en `hint`, `EditorToolbox.tsx:89,226`). `useEditorHotkeys.ts` define 13 atajos, **todos literales dentro del `switch`** — ninguna estructura de datos los describe, así que ningún tooltip puede leerlos sin duplicarlos.

### 2.2 Piezas nuevas

**`src/components/ui/Tooltip.tsx`** — Tailwind puro, sin JS de posicionamiento:

```ts
export function Tooltip(props: {
  content: string;
  shortcut?: string;                       // se pinta como <kbd>
  side?: "top" | "right" | "bottom" | "left";   // default "right"
  wide?: boolean;                          // max-w-56 whitespace-normal para textos largos
  children: React.ReactElement;            // el trigger real (button/label/…)
}): React.ReactElement;
```

- Wrapper `<span className="group relative inline-flex">`; burbuja hermana con `role="tooltip"` e `id` de `useId()`, inyectado al hijo como `aria-describedby` vía `cloneElement`.
- Visibilidad: `pointer-events-none opacity-0 transition-opacity delay-300 group-hover:opacity-100 group-focus-within:opacity-100 group-focus-within:delay-0` — **aparece también con foco de teclado**, no solo con ratón (A11).
- Estilo, exactamente el lenguaje ya usado en el editor: `rounded-md border border-indigo-500/20 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-200 shadow-lg z-50`; el `<kbd>` con `ml-1.5 rounded bg-slate-800 px-1 text-[10px] text-slate-400` (mismas clases que `EditorToolbox.tsx:89`).
- `hidden md:block`: en táctil no hay hover. El `title=` nativo que `IconButton` siempre pone es el fallback en móvil, junto al `HelpOverlay` (§2.4).
- Respeta `prefers-reduced-motion` colapsando `transition`/`delay` (criterio A12).

**`src/components/ui/IconButton.tsx`** — sustituye el JSX ad-hoc repetido en ~12 archivos:

```ts
export function IconButton(props: {
  icon: ComponentType<{ className?: string }>;
  label: string;                    // aria-label — obligatorio
  tooltip?: string;                 // default = label
  shortcut?: string;
  side?: TooltipSide;
  active?: boolean;                 // → aria-pressed + estilo activo
  tone?: "neutral" | "accent" | "danger";
  size?: "sm" | "md";
  showLabel?: boolean;              // texto visible junto al icono (toolbox)
  disabled?: boolean;
  onClick: () => void;
}): React.ReactElement;
```

Mapeo de `tone` a las clases que hoy están copiadas a mano: `neutral` → `text-slate-300 hover:bg-slate-800`; `accent` activo → `bg-cyan-500/15 text-cyan-300`; `danger` → `text-rose-400 hover:bg-rose-500/10`. `size="sm"` = `rounded-md p-1.5` (iconos `size-3.5`), `size="md"` = `min-h-9 gap-2 px-2` (iconos `size-4`).

**Decisión sobre el tamaño táctil**: **no** se sube a `min-h-11` los botones dentro de paneles. El editor ya declara ser una herramienta de pantalla grande (colapsa a drawers bajo `lg`, §5.1) y agrandar todo destruiría la densidad de `EventChainEditor`. En su lugar: (a) `size="sm"` da 28×28 px reales de área clicable sobre un icono de 14; (b) donde el botón acompaña texto, **la fila entera es el target**; (c) los CTA de página completa siguen en `min-h-11`, sin cambio.

**`src/components/level/editor/helpText.ts`** — fuente única de la redacción:

```ts
export interface HelpEntry { text: string; shortcut?: string; long?: string }
export const HELP: Record<string, HelpEntry>;   // claves estables: "toolbox.walkable", "event.trigger.ON_ENTER_ZONE", "bottombar.snap", …
export function help(key: string): HelpEntry;   // lanza en dev si falta la clave
```

Motivo de centralizarlo: (a) la redacción pedagógica se revisa en un solo lugar; (b) el mismo dato alimenta el `HelpOverlay` y, más adelante, un manual generado; (c) evita 40 cadenas sueltas en 20 componentes que nadie vuelve a revisar.

### 2.3 El punto de apalancamiento: `hint` en los descriptores de campo

`PropertyFieldDef` (`src/lib/level/entities/registry.ts:23-34`) es una unión de 9 variantes que **todas** repiten `key`/`label`. Se refactoriza a intersección con una base:

```ts
interface BaseFieldDef { key: string; label: string; hint?: string }   // ← el único campo nuevo
export type PropertyFieldDef = BaseFieldDef & (
  | { kind: "text"; default: string }
  | { kind: "number"; default: number; min?: number; max?: number; step?: number }
  | …   // resto idéntico
);
```

`PropertyField` (`fields/PropertyFields.tsx:30`) pinta, junto a `<span className={LABEL_CLASS}>`, un `<HelpDot hint={field.hint} />` cuando existe. **Con esa única edición**, la ayuda se propaga automáticamente a `EditorPropertyPanel`, `EventChainEditor` (vía `ActionFields`), al editor de reglas del mundo (Fase 17) y al de currícula (Fase 21) — ninguno de ellos necesita tocarse.

Se rellenan los `hint` de: los 7 `EntityTypeDef.properties`, los 15 `ACTION_TYPES[*].params` (`events/catalog.ts`) y los campos comunes del panel.

### 2.4 Atajos que no mienten

`useEditorHotkeys.ts` exporta un descriptor y el `switch` lo consume, en vez de duplicarlo:

```ts
export interface ShortcutDef { id: string; keys: string; label: string; group: "herramientas" | "edición" | "vista" | "archivo" }
export const SHORTCUTS: ShortcutDef[];   // 13 entradas, las que hoy están literales en el switch
```

`IconButton` recibe `shortcut={SHORTCUTS.find(...)!.keys}`. Si mañana cambia un atajo, el tooltip cambia con él.

**`HelpOverlay.tsx`**: la tecla `?` abre un panel con todos los atajos agrupados y la ayuda larga (`HELP[*].long`), generado íntegramente de `SHORTCUTS` + `helpText.ts`. Coste marginal casi nulo, y es la respuesta al caso móvil sin hover.

### 2.5 Cobertura (criterio de aceptación de la fase)

Todo botón de estos archivos pasa por `IconButton` o queda envuelto en `Tooltip`: `EditorToolbox`, `EditorTopBar`, `EditorBottomBar` (incluidos los toggles Grid/Snap/Debug y el zoom), `EditorPropertyPanel`, `MissionEditor`, `DialogEditor`, `EventChainEditor`, `ZoneEditor`, `IssuesPanel`, `PolygonEditor`, `DepthPanel`, `AssetLibrary`, `ChallengePicker`, `/panel/editor/page.tsx`.

**Entregable verificable:** una prueba E2E recorre `/panel/editor` y `/panel/editor/{id}` y afirma que **cero** `<button>` carecen simultáneamente de texto visible y de `aria-describedby`/`title`; `Tab` hasta cada botón de la toolbox muestra su tooltip (foco, no hover); `axe` sigue en cero violaciones `serious`/`critical`.

### 2.6 Trade-off aceptado explícitamente

No hay detección de colisión con el borde de la ventana ni con los `overflow` de los paneles (eso exigiría Floating UI, y A3 lo prohíbe). Mitigación: `side` se elige a mano por zona (toolbox → `right`, barra inferior → `top`, panel derecho → `left` con `wide`), los contenedores de barra usan `overflow-visible`, y el `title=` nativo —que nunca se recorta— sigue presente en todos los casos. **Si en el futuro se acepta una dependencia, sustituir el posicionamiento CSS por Floating UI es un cambio localizado a `Tooltip.tsx`.**

---

## 3. FASE 16 — Modelo de Mundo (datos + persistencia)

### 3.1 Por qué un documento nuevo y no campos en `LevelDefinition`

`LevelDefinition` es deliberadamente autocontenido (§4): un nivel se carga, se valida y se juega sin leer nada más. Meter relaciones entre niveles dentro de cada nivel produciría un grafo distribuido sin dueño (para saber qué está desbloqueado habría que leer los N niveles) y haría imposible validar el grafo entero. **El grafo, la historia y las reglas viven en un documento propio; los niveles siguen siendo hojas autocontenidas.**

### 3.2 Firestore

```
/parents/{parentId}/world/{worldId}                 ← singleton "main" (colección, no doc, para no cerrar la puerta a varios mundos)
/parents/{parentId}/world/{worldId}/versions/{n}    ← snapshot inmutable por guardado, idéntico a levels/versions
```

`firestore.rules`, dentro de `match /parents/{parentId}`, junto a `levels` y `levelAssets`:

```
// Mundo del juego: historia, capítulos, grafo de niveles, reglas generales
// y catálogo de avatares (docs/level-editor-plan-v2.md §3). Mismo dueño y
// mismo versionado inmutable que /levels.
match /world/{worldId} {
  allow read, write: if isParent(parentId);
  match /versions/{versionId} {
    allow read:   if isParent(parentId);
    allow create: if isParent(parentId);
    allow update, delete: if false;
  }
}
```

⚠️ Despliegue manual obligatorio (`npx firebase deploy --only firestore:rules`), igual que en §10.2 / criterio A14.

### 3.3 Modelo de datos — `src/lib/gameworld/schema.ts`

(nombrado `gameworld` y no `world` para no colisionar con `src/lib/world/` de Ciudad Central legacy)

```ts
export const WORLD_SCHEMA_VERSION = 1;

export interface GameWorld {
  id: string;                    // "main"
  name: string;
  version: number;               // versionado optimista, mismo mecanismo que LevelDefinition
  schemaVersion: number;
  story: WorldStory;
  chapters: WorldChapter[];
  nodes: WorldNode[];
  links: WorldLink[];
  rules: WorldRules;
  avatars: AvatarCatalog;
  metadata: { authorUid: string; createdAt: number; updatedAt: number };
}
```

**Historia.** Alineada con `docs/guion-narrativa-math-quest.md`: los nombres propios que hoy están hardcodeados en el código (Alex, Dra. Nia, Khaos, AXIA, NEXUS — `WorldHud.tsx:19-23`, `questScene.ts`) pasan a ser dato editable.

```ts
export interface WorldStory {
  title: string;               // "Math Quest — El despertar de AXIA"
  logline: string;             // ≤240 caracteres, se muestra en el mapa del jugador
  protagonistName: string;     // "Alex"
  mentorName: string;          // "Dra. Nia"
  antagonistName: string;      // "Khaos"
  energyName: string;          // "AXIA"  ← el HUD lo lee de acá en vez de la constante
  counterEnergyName: string;   // "NEXUS"
  intro: StoryBeat[];          // cinemática de apertura del mundo
  outro: StoryBeat[];          // cierre
}

/** Deliberadamente casi igual a `LevelDialogLine` (schema.ts:259), pero con
 *  `speaker` como texto libre: a nivel de mundo no hay entidades a las que
 *  referenciar. El editor de líneas es el mismo componente. */
export interface StoryBeat { id: string; speaker: string | null; portrait: string; text: string }

export interface WorldChapter {
  id: string;
  order: number;
  title: string;               // "Capítulo 1 — El apagón"
  synopsis: string;
  /** Clave de STRAND_NARRATIVE (src/lib/narrative.ts:21) o un slug libre.
   *  Es el puente entre el diccionario decorativo existente y el mundo real. */
  regionSlug: string;
  intro: StoryBeat[];
  outro: StoryBeat[];
}
```

**Relaciones entre niveles: grafo dirigido. Justificación explícita** (hay trade-off real aquí):

1. Una progresión lineal es un grafo con out-degree 1 — el grafo es un superconjunto estricto; elegir lineal cerraría hubs y ramas sin ganar nada estructural.
2. El currículo **ya** es un grafo dirigido con `prerequisites` que cruzan hilos (`curriculum.ts:46-47`, comentario explícito: "pueden cruzar hilos"). Un mundo lineal sobre un currículo en grafo sería incoherente.
3. El guion (§18) describe 8 regiones cada una con núcleo, guardián e historia propios — un mapa, no una fila.
4. **Coste**: la UI necesita editar un grafo. **Mitigación**: el editor ofrece un botón "Encadenar en orden" que genera los links lineales de un capítulo de un golpe, cubriendo el 90% de los casos sin que el padre toque una arista.

```ts
export interface WorldNode {
  levelId: string;             // → /parents/{uid}/levels/{levelId}
  chapterId: string | null;
  /** % del lienzo del mapa (0-100) — mismo sistema de coordenadas que todo el editor. */
  position: Vec2;
  label: string;               // default = level.name
  icon: string;                // emoji, mismo criterio que ModuleDef.emoji
  unlock: WorldUnlockRule;
  /** Punto de entrada del mundo. `validateWorld` exige exactamente uno. */
  isStart: boolean;
}

export type WorldUnlockRule =
  | { kind: "always" }
  | { kind: "afterLevels";  levelIds: string[];  mode: "all" | "any" }
  | { kind: "afterModules"; moduleIds: string[]; mode: "all" | "any" }   // dominados (isMastered)
  | { kind: "afterStars";   stars: number };                              // saldo real de starLedger

export interface WorldLink {
  id: string;
  fromLevelId: string;
  toLevelId: string;
  /** El LevelExit del nivel de origen que materializa esta arista. `null` =
   *  la arista solo existe en el mapa (se viaja por el mapa, no por una
   *  puerta dentro del nivel). */
  exitId: string | null;
  label: string;
}
```

**El punto arquitectónico crítico — "nivel completado" es una *derivación*, no un dato.** Esto es lo que hace que `afterLevels` no viole §1.8 / criterio A7:

```ts
// src/lib/gameworld/progress.ts — funciones puras, sin red
export function levelCompleted(
  level: LevelDefinition,
  progressBySkill: Record<string, SkillProgress>,
  rule: WorldRules["levelCompletion"],
): boolean;
// "allChallengesCorrect"  → todo ChallengePlacement.moduleId con hasCorrectAttempt
// "allChallengesMastered" → todo ChallengePlacement.moduleId con isMastered
// "anyChallengeCorrect"   → al menos uno

export function nodeUnlocked(node, world, levelsById, progressBySkill, totalStars): boolean;
export function worldGraphState(world, levelsById, progressBySkill, totalStars):
  Record<string, "bloqueado" | "disponible" | "completado">;
```

Mismo principio y mismo vocabulario que `world/state.ts:14-21` e `interactableState()`. **No se crea ninguna colección de progreso de mundo.** Se añade a la Fase 22 el criterio **A16**: "tras jugar el mundo entero, listar las colecciones del hijo devuelve exactamente las 6 de hoy".

**Reglas generales.** Hoy no existe nada de esto (verificado): cada comportamiento está cableado.

```ts
export interface WorldRules {
  levelCompletion: "allChallengesCorrect" | "allChallengesMastered" | "anyChallengeCorrect";
  allowReplay: boolean;               // volver a un nivel ya completado
  autoAdvance: boolean;               // al completar, saltar al siguiente desbloqueado
  challengesAreMandatory: boolean;    // un desafío bloquea el paso, o solo recompensa
  maxAttemptsPerChallenge: number;    // 0 = ilimitado
  hintsAfterAttempts: number;         // intentos antes de ofrecer pista
  /** Qué hacer cuando el módulo de un desafío no está desbloqueado
   *  (`isUnlocked` falso) para ese hijo. */
  lockedModulePolicy: "hide" | "showLocked" | "allowAnyway";
  showWorldMap: boolean;              // habilita /jugar/{childId}/mapa
  defaultSoundOn: boolean;
  /** Volver a mostrar la intro del mundo/capítulo cada vez, o solo la 1.ª. */
  replayStoryBeats: boolean;
}
```

Todas las reglas se describen con **`PropertyFieldDef[]`** (`WORLD_RULE_FIELDS`) y se pintan con el `PropertyField` que ya existe → **cero componentes de campo nuevos**, y los `hint` de la Fase 15 aplican gratis.

**Catálogo de avatares** (detalle de uso en Fase 19):

```ts
export interface AvatarDef {
  id: string;
  label: string;
  bodySrc: string;         // sprite de cuerpo entero (reemplaza /illustrations/explorer.webp)
  headshotSrc: string;     // retrato (reemplaza /illustrations/avatar.webp)
  scale: number;           // ajuste para arte de proporciones distintas
  unlock: WorldUnlockRule; // mismo vocabulario, misma derivación
}
export interface AvatarCatalog { avatars: AvatarDef[]; defaultAvatarId: string }
```

### 3.4 `LevelExit` tipado — primera migración real del esquema de nivel

```ts
export type LevelExitTarget =
  | { kind: "level"; levelId: string }
  | { kind: "worldMap" }
  | { kind: "href"; href: string };     // escotilla: sigue permitiendo cualquier ruta

export interface LevelExit {
  id: string;
  polygon: Vec2[];
  label: string;
  target: LevelExitTarget;              // ← nuevo
  /** @deprecated schemaVersion 1. `migrate.ts` lo conserva para no perder
   *  datos, pero ya no se lee. */
  targetHref?: string;
}
```

`LEVEL_SCHEMA_VERSION` pasa a **2**, y `migrate.ts` estrena su primera migración real (la cadena estaba montada pero vacía, §17 Fase 2 / riesgo T7):

- `targetHref` que matchea `^/jugar/[^/]+/nivel/(.+)$` → `{ kind: "level", levelId: $1 }`
- `"/panel"` (el default que escribe `PolygonEditor.tsx:168`) o `""` → `{ kind: "worldMap" }`
- cualquier otro → `{ kind: "href", href }`

Cambios en runtime: `useLevelRuntime.ts:24,81` cambia la firma de `onExitEnter` a `(target: LevelExitTarget)`; `LevelRuntime.tsx:107` resuelve `level` → `/jugar/{childId}/nivel/{levelId}`, `worldMap` → `/jugar/{childId}/mapa`, `href` → `router.push`. En sandbox sigue llamando `onExit?.()` sin cambios.
En el editor: `LevelExit.target` se edita con un **selector de niveles poblado desde `listLevels`** — nunca se teclea una ruta (elimina de raíz la clase de bug T3 para salidas).

### 3.5 Persistencia

**`src/lib/gameworld/persistence/worldRepository.ts`** — mismo estilo exacto que `levelRepository.ts` (recibe `firestoreFns`/`db` como parámetros; **nunca** importa `firebase/*` estáticamente, criterio A5/K1):

```ts
getWorld(firestoreFns, db, parentId): Promise<GameWorld | null>       // aplica migrateWorld
ensureWorld(firestoreFns, db, parentId, authorUid): Promise<GameWorld> // crea el "main" vacío si no existe
saveWorld(firestoreFns, db, parentId, world): Promise<GameWorld>       // transaccional + versions/, StaleWorldError
listWorldVersions / getWorldVersion / restoreWorldVersion
```

**Refactor de oportunidad**: el `saveLevel` transaccional con versionado (`levelRepository.ts`) y `saveWorld` son el mismo algoritmo. Se extrae `src/lib/level/persistence/versionedDoc.ts` con `saveVersioned(firestoreFns, db, docRef, versionsRef, doc, { onStale })`, y `levelRepository` pasa a usarlo. Riesgo bajo y ya cubierto por `e2e/editor-persistencia.spec.ts`.

**`validateWorld(world, levels)`** — mismas convenciones que `validateLevel` (devuelve `LevelIssue[]`, no lanza):
1. exactamente un nodo con `isStart: true`;
2. todo `WorldNode.levelId` existe en `levels`;
3. todo `WorldLink.from/toLevelId` tiene nodo;
4. todo `WorldLink.exitId` existe en el nivel de origen, y su `target` apunta al mismo `toLevelId` (**incoherencia mapa↔nivel**, el bug más probable);
5. sin ciclos en el grafo de desbloqueo (un nodo no puede depender de sí mismo, directa o indirectamente) — mismo algoritmo que la detección de ciclos de eventos (T4);
6. todo nodo alcanzable desde el start (*warning*, no error: un nodo suelto puede ser deliberado);
7. `afterModules.moduleIds` resuelven con `getModule`;
8. niveles del padre sin nodo (*warning*: "este nivel no aparece en el mapa").

**Entregable verificable:** `ensureWorld` crea `/parents/{uid}/world/main` con `version: 1`; guardar dos veces produce `versions/000001` y `000002` inmutables (un `updateDoc` sobre una versión falla con `permission-denied`); `migrateLevel` convierte los `targetHref` existentes a `target` sin perder ninguno; `validateWorld` da cero errores sobre un mundo de un solo nodo.

---

## 4. FASE 17 — Editor de Mundo

### 4.1 Por qué una pantalla nueva y no un panel del editor de nivel

`editorReducer.ts` es **por-nivel**: su `EditorState.level` es un `LevelDefinition` y todo su historial son snapshots de ese objeto (§5.2). El mundo es un documento hermano, con su propio versionado y su propia validación. Meterlo dentro sería mezclar dos ciclos de guardado en un reducer. **Se crea un reducer hermano**, `worldReducer.ts`, con la misma forma (`{ world, selection, viewport, history, dirty, saveState, issues }`) — y se extraen a `src/components/level/editor/history.ts` los helpers `push/undo/redo/HISTORY_LIMIT` que hoy viven dentro de `editorReducer.ts`, para que ambos los compartan.

### 4.2 Ruta y layout

`/panel/editor/mundo` — cuatro pestañas dentro de un mismo shell (`WorldEditorScreen.tsx`):

1. **Mapa** — lienzo pan/zoom (**reutiliza `useEditorViewport` tal cual**) sobre un fondo opcional. Nodos = tarjetas arrastrables con icono + rótulo + color por estado de validación. Aristas = `<path>` SVG con marcador de flecha, en un `<svg viewBox="0 0 100 100" preserveAspectRatio="none">` — la misma técnica de `NavigationLayer`/`WalkDebugOverlay.tsx:320`. Crear arista: arrastrar del borde de un nodo a otro. Panel derecho: propiedades del nodo (capítulo, `unlock` con constructor de regla, `isStart`) o del link (`exitId` con selector de las salidas del nivel de origen, `label`). Botón "Encadenar capítulo en orden".
2. **Historia** — `WorldStory` (campos + nombres propios) y lista ordenable de `WorldChapter`, cada uno con `intro`/`outro` editados por **`StoryBeatEditor`**, extraído de `DialogEditor` para compartirlo (el editor de líneas es idéntico salvo el hablante).
3. **Reglas** — `WORLD_RULE_FIELDS.map(f => <PropertyField … />)`. Cero componentes nuevos.
4. **Avatares** — Fase 19.

Acceso: ítem nuevo en `NAV` de `PanelShell.tsx` ("Mundo", icono `Map`) y un botón "Mundo" en el encabezado de `/panel/editor`.

### 4.3 Sincronización nodo ↔ nivel

- Crear un nivel desde `/panel/editor` **crea automáticamente su `WorldNode`** (posición en la primera celda libre de una rejilla, `unlock: {kind:"always"}`, `isStart` si es el primero). Borrar un nivel borra su nodo y los links que lo tocan.
- Cambiar `LevelExit.target` en el editor de nivel **propone** crear el `WorldLink` correspondiente (aviso en `IssuesPanel`, con acción "Crear enlace en el mapa"). No se sincroniza en silencio: son dos documentos con dos guardados independientes, y una escritura implícita a otro documento desde el editor de nivel sería sorpresiva y podría chocar con un `StaleWorldError`.

**Entregable verificable:** crear 3 niveles, colocarlos en el mapa, encadenarlos, marcar el primero como inicio, escribir la intro del mundo, cambiar `levelCompletion` a `allChallengesMastered`; recargar y comprobar igualdad profunda de nodos, links, beats y reglas. `validateWorld` reporta el caso 4 (link cuyo `exitId` apunta a otro nivel) como error clicable.

---

## 5. FASE 18 — Fin del nivel por defecto

### 5.1 Qué reemplaza a `/jugar/[childId]`

La página deja de renderizar contenido y pasa a ser **despachador** (mismo esqueleto de carga/auth que hoy: `useAuth`, perfil, `skillsProgress`, `useRequirePlacement` — nada de eso cambia). Tras cargar `getWorld` + `listLevels`:

| Situación | Resultado |
|---|---|
| Hay mundo con nodo `isStart` cuyo nivel existe | `router.replace('/jugar/{childId}/nivel/{startLevelId}')` |
| Hay ≥2 niveles pero ningún `isStart` válido, y `rules.showWorldMap` | `router.replace('/jugar/{childId}/mapa')` |
| Hay exactamente 1 nivel y ningún `isStart` | va a ese nivel |
| **0 niveles** | pantalla `NoLevelsYet` — **nunca un fallback silencioso** |

`NoLevelsYet` (la respuesta directa al pedido "que el editor se abra y pida crear un nivel"):

> **Todavía no hay ninguna aventura**
> Este mundo está vacío. Creá el primer nivel para que {nombre} pueda jugar.
> **[Crear el primer nivel]** → `/panel/editor?crear=1` (abre `/panel/editor` con el formulario `CreateLevelForm` ya desplegado)
> [Cargar el mundo de ejemplo] → siembra Ciudad Central como nivel real (§5.2)
> [Volver a perfiles]

Nota de UX honesta: hoy la sesión autenticada **siempre es la del padre** (`firestore.rules:7-13` lo documenta como pendiente), así que ofrecer el botón "Crear nivel" en la pantalla del niño es correcto por ahora. Cuando exista sesión propia del niño, el botón se condiciona — se deja anotado en el código.

### 5.2 Qué pasa con Ciudad Central / `ciudadCentralAsLevel`

**Decisión: `ciudadCentralAsLevel()` deja de ser el camino por defecto y se convierte en semilla de "mundo de ejemplo".**

- Nueva función `seedExampleWorld(firestoreFns, db, parentId, authorUid)`: `createLevel` + `saveLevel` con el contenido de `ciudadCentralAsLevel(uid)`, más un `GameWorld` con ese único nodo como `isStart` y la historia precargada del guion (§7/§10 de `guion-narrativa-math-quest.md`). Botón "Cargar mundo de ejemplo" en `/panel/editor` (visible solo con 0 niveles) y en `NoLevelsYet`.
- **Ventajas frente a mantenerlo como contenido mágico**: (a) queda como un nivel **real, editable y borrable** del padre, no como algo especial que no se puede tocar; (b) el adaptador legacy no se borra, así que la prueba de paridad de §16.1 (riesgo T8) sigue viva; (c) el padre arranca modificando algo en vez de un lienzo en blanco — es el mejor tutorial posible.
- `QuestScene.tsx` y `src/lib/world/**` **no se borran** (§12.1, coexistencia). El flag `NEXT_PUBLIC_LEVELS_V2` deja de decidir qué ve el niño; queda reducido a habilitar la ruta de regresión `/jugar/{childId}/ciudad-central-legacy`, que monta `QuestScene` tal cual para comparar comportamiento. Se documenta en `README.md`.
- El botón "🏪 Tienda" que hoy `jugar/[childId]/page.tsx:231-242` añade como parche cuando el flag está activo se mueve a `LevelHud` del runtime, donde corresponde.

### 5.3 `/jugar/[childId]/mapa` — mapa del jugador

Ruta nueva. Renderiza `worldGraphState(...)` (Fase 16): un nodo por nivel con estado `bloqueado`/`disponible`/`completado`, derivado en cada render de `skillsProgress` + `starLedger` — **cero estado propio**. Muestra `story.logline`, el capítulo actual y sus `StoryBeat` de intro la primera vez (o siempre, según `rules.replayStoryBeats`). Vocabulario visual: el mismo de `ZoneScene`/`world/state.ts` (`bloqueado`/`disponible`/`dominado`), no uno nuevo. Estado no comunicado solo por color (criterio A11): icono de candado + texto.

### 5.4 Impacto en pruebas (P3)

`e2e/aventura.spec.ts` se adapta en esta misma fase: siembra el mundo de ejemplo, navega a `/jugar/{childId}` y verifica que redirige al nivel sembrado, con los mismos asertos de gameplay de hoy. Es la excepción documentada a A2.

**Entregable verificable:** con un padre sin niveles, `/jugar/{childId}` muestra `NoLevelsYet` y **no** monta ni `QuestScene` ni `LevelRuntime` (aserto sobre el DOM); "Crear el primer nivel" abre `/panel/editor` con el formulario listo; tras sembrar el ejemplo, `/jugar/{childId}` redirige al nivel; una consulta directa al emulador confirma que ninguna colección nueva de progreso apareció (A16).

---

## 6. FASE 19 — Avatares

### 6.1 Assets

`AssetKind` (`imageRules.ts:9`) pasa a `"scene" | "layer" | "avatar"` y se añade su fila a `RESOLUTION_THRESHOLDS`:

```ts
avatar: { minWidth: 128, minHeight: 128, recommendedWidth: 512 }
```

Además, `gradeResolution` devuelve *warning* para un avatar sin canal alfa (`prepared.hasAlpha === false`): un sprite de personaje con fondo opaco se ve mal recortado sobre la escena, y hoy no hay nada que lo avise. Las rutas de Storage no cambian (`parents/{parentId}/level-assets/{id}`), así que **`storage.rules` no se toca**. `AssetLibrary`/`AssetUploader` ganan el filtro por `kind` que ya soportan.

**Los 8 fondos de fábrica siguen ocultos** (commit `1ce6c73`) — esta fase no los reactiva.

### 6.2 `Avatar.tsx` parametrizado sin romper llamadas

Mismo patrón "props opcionales con default que preserva el comportamiento byte a byte" que se usó con `PuzzleOverlay` (§9.4):

```ts
export function Avatar(props: {
  variant?: "explorer" | "headshot";
  walking?: boolean;
  className?: string;
  title?: string;
  /** Nuevos, opcionales. Sin ellos, exactamente el comportamiento de hoy. */
  bodySrc?: string;     // default "/illustrations/explorer.webp"
  headshotSrc?: string; // default "/illustrations/avatar.webp"
  scale?: number;       // default 1
})
```

Ninguna de las llamadas existentes cambia una línea.

### 6.3 Dónde se guarda la elección del niño

**En el documento del hijo que ya existe**: `/parents/{uid}/children/{childId}` gana `avatarId?: string` (en `ChildProfile`, `src/lib/types.ts`). Sin colección nueva, sin regla nueva.

Justificación explícita frente a A7: **la elección de avatar es una preferencia de perfil, no progreso académico ni estado de mundo** — vive junto a `name`/`birthDate`, exactamente como `useSoundPreference` es una preferencia y no progreso. Lo que **sí** se deriva y nunca se guarda es *qué avatares están desbloqueados* (`AvatarDef.unlock` evaluado con las mismas funciones puras de la Fase 16).

Selector: `AvatarPicker` en `/panel/{childId}` (el padre lo asigna) y en el HUD del juego (`LevelHud`) si el mundo lo permite. `useResolvedAvatar(childId, world, progress)` devuelve el `AvatarDef` efectivo (elegido si está desbloqueado, si no el `defaultAvatarId`, si no las rutas de fábrica) — un solo lugar donde se resuelve la cascada.

**Entregable verificable:** subir un PNG con alfa como `kind: "avatar"`, crearlo como `AvatarDef` con `unlock: { kind: "afterStars", stars: 50 }`, comprobar que aparece bloqueado con 40★ y seleccionable con 50★, y que al elegirlo el sprite cambia en `LevelRuntime` y en el HUD sin recargar.

---

## 7. FASE 20 — Currícula personalizada (núcleo, sin UI)

Este es el requisito más abierto. Empiezo por la restricción que manda sobre todo el diseño.

### 7.1 La restricción dominante: `getModule` es síncrono

`getModule` (`curriculum.ts:646`) es una función pura sobre un array en memoria, y la consumen **29 archivos** (rutas, overlays, HUD, `attemptRecorder`, `placement`, `masteryRewards`, `world/quests`, `world/state`). Los módulos personalizados vienen de Firestore, que es asíncrono. Cualquier diseño que exija convertir `getModule` en `async` toca 29 archivos y rompe media aplicación. **Descartado.**

**Solución: registro hidratado antes del render.**

```ts
// src/lib/curriculum/customRegistry.ts   (sin React, sin Firebase)
export function registerCustomModules(defs: ModuleDef[]): void;
export function getCustomModule(id: string): ModuleDef | undefined;
export function listCustomModules(): ModuleDef[];
export function clearCustomModules(): void;      // para las pruebas
export function allModules(): ModuleDef[];       // [...MODULES, ...listCustomModules()]
```

Cambios en `curriculum.ts` — **mínimos y quirúrgicos**:
- `getModule`: `return MODULES.find(m => m.id === id) ?? getCustomModule(id);`
- `modulesForStrand`, `recommendedModule`, `nextChallenge`, `countUnlocked`, `masteredCountForStrand`: `MODULES` → `allModules()`.
- Nada más. Los 29 consumidores no se tocan.

**Hidratación**: hook `useCustomCurriculum(parentId)` que carga `listCustomModuleDocs`, compila y llama `registerCustomModules`, devolviendo `{ ready: boolean }`. Se consume en `FamilyProvider` (todo `/panel/**`) y en el layout de `/jugar/[childId]/**`, y el render de contenido se **gatea** con `ready` igual que hoy se gatea con `progressLoaded` (`jugar/[childId]/page.tsx:171`). Sin gate, un `getModule("cst-x")` devolvería `undefined` en el primer render — por eso es un gate, no una espera optimista.

### 7.2 Namespace de ids

Todo módulo personalizado tiene id `cst-<slug>`. `validateCustomModule` impone el prefijo y rechaza colisiones con `MODULES` y con otros custom. Consecuencia: `skillsProgress/cst-mis-sumas` nunca puede pisar `skillsProgress/aritmetica-d1`, y un `undefined` de `getModule` sobre un `cst-*` es inmediatamente diagnosticable ("falta hidratar el registro").

### 7.3 Firestore

```
/parents/{parentId}/curriculumModules/{moduleId}
```

```
match /curriculumModules/{moduleId} {
  allow read, write: if isParent(parentId);
}
```

Sin subcolección `versions/`: un módulo es mucho más chico que un nivel y su historial no justifica el coste (queda anotado como posible ampliación). **La colección global `/curriculum/**` de solo lectura (`firestore.rules:78-81`) sigue sin usarse y sigue sin tocarse** — es catálogo administrado aparte, otra cosa. `CurriculumSkill` (`types.ts:25-32`), vestigio muerto, se borra en la Fase 22.

### 7.4 Modelo de datos

```ts
export const CUSTOM_MODULE_SCHEMA_VERSION = 1;

export interface CustomModuleDoc {
  id: string;                 // "cst-<slug>" = doc id = clave de skillsProgress
  schemaVersion: number;
  /** DEBE ser un slug de STRANDS (src/lib/strands.ts). Decisión: en esta fase
   *  no se inventan hilos nuevos — un hilo nuevo implica ruta, narrativa y
   *  navegación nuevas, que es otro proyecto. */
  strandSlug: string;
  label: string;
  emoji: string;
  difficulty: number;         // 1-10 → solo valor en estrellas (economy.ts), sin cambios
  tier: number;
  prerequisites: string[];    // ids de MODULES o de otros custom
  generator: GeneratorSpec;
  concept: ConceptSpec;
  examples: WorkedExample[];
  published: boolean;         // false = borrador, no aparece en ChallengePicker
  metadata: { authorUid: string; createdAt: number; updatedAt: number };
}
```

`compileModule(doc): ModuleDef` produce `{ …metadata, generateProblem: compileGenerator(doc.generator), ConceptComponent: buildConcept(doc.concept) }` — la única función que convierte dato en el mismo tipo que ya usa todo el sistema.

### 7.5 Plantillas de generador — diseñadas sobre los patrones reales

Extraídos por inspección de los 6 generadores (`arithmetic.ts` leído completo, resto muestreado): sortear 1-3 variables enteras de un rango → una restricción de coherencia (`if (!isAdd && a < b) swap`, `b = divisor * cociente` para división exacta) → una plantilla de string → una fórmula → 3 pistas. El 75% de los 56 casos es exactamente eso.

```ts
export type GeneratorSpec =
  | ArithmeticGeneratorSpec     // integer/decimal — cubre ~42 casos de hoy
  | ChoiceGeneratorSpec         // opción múltiple — cubre los 7
  | NumberLineGeneratorSpec     // recta numérica — cubre los 4
  | TableGeneratorSpec          // banco de preguntas escritas a mano
  | VariantGeneratorSpec        // rama aleatoria entre sub-specs (el `Math.random() < 0.3`)
  | { kind: "builtin"; strandSlug: string; difficulty: number };  // delega en STRANDS[x].generateProblem

export interface GeneratorVariable {
  name: string;                 // [a-z][a-z0-9]*
  min: number; max: number; step: number;   // step 1 = entero, 0.1 = decimal
  choices?: number[];           // si está, se sortea de esta lista en vez del rango
}

export interface GeneratorConstraint {
  expr: string;                 // "a + b <= 10", "b != 0", "a % b == 0"
  message: string;              // se muestra en la vista previa si no se satisface
}

export interface ArithmeticGeneratorSpec {
  kind: "arithmetic";
  variables: GeneratorVariable[];
  constraints: GeneratorConstraint[];   // re-sorteo hasta MAX_RESAMPLES = 50
  promptTemplate: string;               // "¿Cuánto es {a} + {b}?"
  flavor: string;                       // Problem.flavor, decorativo
  answerExpr: string;                   // "a + b"
  inputType: "integer" | "decimal";
  hintTemplates: [string, string, string];   // conceptual → primer paso → casi completo
  problemKind: string;                  // Problem.kind (identidad para problemSignature)
}

export interface ChoiceGeneratorSpec extends Omit<ArithmeticGeneratorSpec, "kind" | "inputType"> {
  kind: "choice";
  distractors:
    | { mode: "near"; spread: number }              // = choiceSet(answer, spread) de problem.ts
    | { mode: "expr"; exprs: string[] }             // distractores calculados: ["a - b", "a * b"]
    | { mode: "labels"; options: { label: string; valueExpr: string }[] };  // opciones no numéricas
  choiceLabelTemplate?: string;
}

export interface NumberLineGeneratorSpec extends Omit<ArithmeticGeneratorSpec, "kind" | "inputType"> {
  kind: "numberLine";
  lineMinExpr: string; lineMaxExpr: string; startExpr: string;
}

/** Salida de emergencia data-driven: preguntas escritas a mano, una por fila.
 *  Garantiza que NUNCA haya un ejercicio inexpresable sin escribir código. */
export interface TableGeneratorSpec {
  kind: "table";
  rows: {
    id: string; prompt: string; answer: number;
    inputType: "integer" | "decimal" | "choice";
    choices?: number[]; choiceLabels?: string[];
    hints: [string, string, string];
  }[];
  problemKind: string;
}

export interface VariantGeneratorSpec {
  kind: "variants";
  variants: { weight: number; spec: Exclude<GeneratorSpec, VariantGeneratorSpec> }[];
}
```

### 7.6 El evaluador de expresiones — la decisión técnica más importante de esta fase

**`src/lib/curriculum/expr.ts`: parser propio (shunting-yard → AST → eval), ~180 líneas, sin dependencias. NUNCA `eval` ni `new Function`.** Dos razones duras, ambas del propio repo:

1. **Cloudflare Workers prohíbe `new Function`.** Es literalmente por lo que `firebase/firestore` se importa perezosamente (`firebase.ts:22-32`: `protobufjs` compila con `new Function` al cargarse y rompe *cualquier* página). Un compilador de fórmulas con `new Function` reintroduciría exactamente el fallo que ese comentario documenta.
2. **Es contenido escrito por el usuario y persistido en Firestore.** Evaluarlo como código es una inyección, aunque hoy el único autor sea el propio padre.

Soporta: `+ - * / % ^`, unario `-`, paréntesis, comparadores `< <= > >= == !=`, lógicos `&& || !`, y funciones `abs, min, max, round, floor, ceil, gcd, lcm, sqrt, pow`. `parseExpr(src)` devuelve `{ ast } | { error, position }` para que el editor subraye el error mientras se escribe.

```ts
export function parseExpr(src: string): ExprParseResult;
export function evalExpr(ast: ExprNode, vars: Record<string, number>): number;
export function fillTemplate(tpl: string, vars: Record<string, number>): string;  // {a}, {answer}, {a+b}
export function compileGenerator(spec: GeneratorSpec, rng?: () => number): () => Problem;
```

`rng` inyectable ⇒ pruebas deterministas de generadores, algo que hoy no existe para ninguno de los 6 generadores de código (mejora colateral).

### 7.7 Qué SÍ y qué NO es alcanzable sin código (respuesta explícita al pedido)

**SÍ, 100% data-driven desde el editor:**
- metadata completa: id, label, emoji, hilo, dificultad, tier, prerrequisitos (selector sobre los ~52 existentes + custom);
- generador: cualquier ejercicio "sortear N números con restricciones → fórmula → enunciado con placeholders → respuesta entera o decimal"; opción múltiple con 3 modos de distractor; recta numérica; **banco de preguntas escritas a mano** (cubre todo lo demás); mezcla ponderada de variantes;
- pistas de 3 niveles con placeholders;
- concepto: cualquiera de las 11 visualizaciones existentes parametrizada, o una secuencia de láminas texto+imagen (Fase 21);
- ejemplos resueltos ilimitados, con pasos e imágenes.

**NO — requiere código nuevo, y hay que decirlo sin ambigüedad:**
- **una visualización interactiva nueva** → 2 archivos (componente + entrada en `conceptCatalog.ts`), mismo contrato que los tipos de entidad (§7.5);
- **un tipo de interacción nuevo** (un 6.º `inputType`) → `QuestionWidget.tsx` tiene 5 ramas fijas, cada una con su componente React (`NumberLineInput`, `GroupTensInput`, `BalanceWeightInput`). Arrastrar-y-soltar, ordenar, emparejar o dibujar es código React nuevo. **No hay atajo.** El editor solo puede combinar los 5 existentes;
- **lógica de generación no expresable como fórmula** (generar un polígono válido, un conjunto de datos con moda única, factorizar) → se resuelve con `TableGeneratorSpec` sin código, o con una plantilla de generador nueva (2 archivos).

### 7.8 Catálogo de "dinámicas"

Tratando "dinámica" = tipo de interacción / generador / visualización parametrizable.

**Dinámicas de interacción existentes (6, reutilizables desde el día uno):**

| id | Componente | Qué hace el niño | Parámetros del `Problem` |
|---|---|---|---|
| `choice` | botones en `QuestionWidget` | elige entre 3 opciones | `choices`, `choiceLabels` |
| `integer` | input numérico | escribe un entero | — |
| `decimal` | input numérico | escribe un decimal (tolerancia 0.05, `problem.ts:114`) | — |
| `numberLine` | `NumberLineInput` | mueve un token sobre una recta | `lineMin`, `lineMax`, `startValue` |
| `groupTens` | `GroupTensInput` | reparte objetos en decenas y sueltas | `groupTotal` |
| `balanceWeight` | `BalanceWeightInput` | equilibra una balanza con pesos | `balanceLeftFixed/RightFixed/Weights` |

**Dinámicas de generador existentes (5 patrones extraídos del código), todas cubiertas por el modelo:**

| Patrón | Ejemplo real | Cómo se expresa |
|---|---|---|
| expresión con operandos sorteados | `arithmetic.ts:118-129` | `variables` + `answerExpr` |
| operación inversa para garantizar exactitud | división: `a = b * answer` (`:131-134`) | variables `b`,`q` + `promptTemplate` con `{b*q}` + `answerExpr: "q"` |
| combo elegido de una tabla | porcentajes (`:176-182`) | `GeneratorVariable.choices` |
| rama aleatoria entre variantes | `if (Math.random() < 0.3)` (`:38`) | `VariantGeneratorSpec` |
| restricción de orden para evitar negativos | `if (a < b) swap` (`:54`) | `constraints: [{ expr: "a >= b" }]` |

**Dinámicas nuevas que propondría (priorizadas por valor/coste, para fases futuras):**

1. **`matchPairs`** — emparejar (fracción ↔ dibujo, figura ↔ nombre). Altísimo valor pedagógico, componente simple, encaja con `choices`/`choiceLabels` extendidos.
2. **`orderSequence`** — ordenar de menor a mayor, u ordenar los pasos de un procedimiento. Cubre un hueco real: hoy no hay ninguna dinámica de secuencia pese a que "Patrones" es un hilo del guion (§18).
3. **`tapCount`** — contar tocando objetos. Hoy **no hay nada por debajo de `numberLine`** — el nivel de entrada es demasiado alto para 4-5 años.
4. **`gridPaint`** — pintar celdas de una grilla (área, fracciones, coordenadas). Reutiliza mucho de `GroupTensInput`.
5. **`multiStep`** — 2-3 preguntas encadenadas donde una respuesta alimenta la siguiente. Hoy **imposible**: `Problem` es atómico y `PuzzleOverlay` evalúa una sola respuesta. Es el cambio más caro y el más transformador pedagógicamente (§17 del guion pide un "loop", no una pregunta suelta).

**Entregable verificable de la Fase 20:** pruebas unitarias de `expr.ts` (precedencia, funciones, errores de sintaxis, división por cero); `compileGenerator` con `rng` fijo produce 20 problemas idénticos entre corridas; un `CustomModuleDoc` de "sumas hasta 20" registrado hace que `getModule("cst-sumas-20")` lo devuelva y que `recordModuleAttempt` escriba en `skillsProgress/cst-sumas-20` exactamente igual que con un módulo de código; `isUnlocked` respeta un prerrequisito que apunta a `aritmetica-d1`.

---

## 8. FASE 21 — Editor de Currícula, conceptos y ejemplos

### 8.1 Plantillas de concepto

```ts
// src/lib/curriculum/conceptCatalog.ts
export interface ConceptTemplateDef {
  id: string;                       // "numberLine", "array", …
  label: string;                    // "Recta numérica"
  /** Los MISMOS PropertyFieldDef del Level Editor (registry.ts:23) — el editor
   *  de currícula no necesita ni un componente de campo nuevo, y hereda los
   *  tooltips de la Fase 15 gratis. */
  params: PropertyFieldDef[];
  build: (params: Record<string, PropertyValue>) => ComponentType;
}
export interface ConceptSpec { templateId: string; params: Record<string, PropertyValue> }
```

Catálogo inicial: **11 entradas, una por cada `*Concept.tsx` existente**, envolviéndolos con sus props reales (`NumberLineConcept{min,max}`, `ArrayConcept{mode:"mult"|"div"}`, etc. — los parámetros exactos se leen componente por componente en la fase; están todos acotados a rangos numéricos o enums de 2-6 valores).

Más **una plantilla genuinamente data-driven, nueva**:
- **`slides`** — `{ slides: { title, text, imageSrc? }[] }` renderizado por `SlidesConcept.tsx` (nuevo). Es la que hace realmente posible "explicar un concepto sin escribir código", y por eso es obligatoria en esta fase, no opcional. Las imágenes salen de la biblioteca de assets (`kind: "scene"`).

(Descartado por ahora: `embedLevel`, que usaría un nivel del editor como concepto. Atractivo pero arrastra el runtime completo a la pestaña de concepto; se anota como idea futura.)

### 8.2 Ejemplos como entidad de datos

Hoy `EjemplosTab.tsx` (72 líneas) llama `generateProblem()` 3 veces y revela la respuesta — es "generar y mostrar", no contenido autoral.

```ts
export interface WorkedExample {
  id: string;
  prompt: string;              // literal, no plantilla: un ejemplo es contenido fijo
  steps: ExampleStep[];
  answer: number;
  answerText: string;          // "12 manzanas", cuando el número solo no alcanza
}
export interface ExampleStep { id: string; text: string; math?: string; imageSrc?: string }
```

`EjemplosTab` gana una prop opcional `examples?: WorkedExample[]`: si viene no vacía, pinta los pasos (plegables, uno a uno, con botón "Siguiente paso"); si no, **exactamente el comportamiento de hoy**. Cero cambios en los 52 módulos de código. Además, el editor ofrece "Generar ejemplo desde el generador": corre `compileGenerator` una vez y precarga `prompt`/`answer` para que el padre solo escriba los pasos.

### 8.3 UI — `/panel/curriculum`

Lista de módulos personalizados (borrador/publicado) + editor de módulo con 4 pestañas:

1. **Datos** — id (auto-slug desde el label, con prefijo `cst-` fijo y bloqueado), label, emoji, hilo (select de `STRANDS`), dificultad, tier, prerrequisitos (multi-select sobre `allModules()` agrupado por hilo).
2. **Generador** — selector de plantilla + editor de variables (tabla), restricciones, plantilla de enunciado con inserción de placeholders por clic, fórmula de respuesta con validación de sintaxis en vivo, 3 pistas. **Y el panel de vista previa (§10, recomendación 5), que es obligatorio.**
3. **Concepto** — selector de plantilla + sus `params` con `PropertyField` + vista previa en vivo del componente real.
4. **Ejemplos** — lista ordenable con pasos.

`ChallengePicker.tsx` pasa a listar `allModules()` con una etiqueta visual "Tuyo" en los personalizados, y filtra los `published: false`. **Su comentario de cabecera (`:12-18`) se reescribe** para reflejar la política P1 en vez de la anterior.

**Entregable verificable:** crear por UI un módulo "Restas hasta 20" con generador de plantilla aritmética, concepto `numberLine{0,20}` y 2 ejemplos; publicarlo; colocarlo con `ChallengePicker` en un nivel; jugarlo en `/jugar/{childId}/nivel/{id}` y comprobar que `attempts`, `skillsProgress/cst-restas-20` y `starLedger` se escriben exactamente como con un módulo de código (mismo aserto que la prueba 21 de §16.3, con otro id).

---

## 9. FASE 22 — Endurecimiento

1. **Validación cruzada mundo ↔ niveles ↔ módulos** (`validateWorld` completo, §3.3), con `IssuesPanel` a nivel mundo y clic-para-navegar al elemento culpable.
2. **Export/import JSON del mundo completo** (§10, recomendación 4).
3. **Migraciones**: verificar `migrateLevel` v1→v2 sobre niveles reales; borrar `CurriculumSkill` (`types.ts:25-32`), vestigio muerto confirmado.
4. **Pruebas**: `e2e/mundo.spec.ts`, `e2e/curriculum-editor.spec.ts`, `e2e/unidad-expr.spec.ts`, `e2e/unidad-mundo.spec.ts`; `axe` sobre `/panel/editor/mundo`, `/panel/curriculum`, `/jugar/{childId}/mapa`; adaptación de `aventura.spec.ts` (P3).
5. **Rendimiento**: presupuesto del documento de mundo (`assertSize` con 60 nodos y 120 links); `compileGenerator` <1 ms por problema con 3 variables y 3 restricciones; `useCustomCurriculum` con 40 módulos personalizados no añade >150 ms al arranque de `/jugar`.
6. **`README.md`**: colecciones nuevas (`world`, `curriculumModules`), despliegue manual de reglas, retirada de `NEXT_PUBLIC_LEVELS_V2` del camino por defecto.
7. **Actualizar `docs/level-editor-plan.md`**: reformular A6, añadir A15/A16, documentar la excepción a A2, y enlazar este documento como continuación.

---

## 10. Recomendaciones adicionales

1. **Plantillas de nivel al crear** (alta prioridad, coste bajo). `createLevel` desde una plantilla — *Sala con terminal*, *Pasillo con puerta y desafío*, *Encuentro con NPC* — en vez de solo lienzo vacío. Cada plantilla es un `LevelDefinition` literal en `src/lib/level/templates/`: **dato, no código nuevo**. Ataca el problema real de adopción: los pasos para armar un nivel completo son mucho pedir para un padre no técnico, y hoy la única alternativa al lienzo en blanco es Ciudad Central entera.

2. **Vista previa del generador, obligatoria en la Fase 21.** Botón "Generar 20 preguntas" que corre `compileGenerator(spec)` y muestra una tabla con enunciado/respuesta/pistas, más avisos automáticos: duplicados por `problemSignature` (la función ya existe, `problem.ts:81`), respuestas negativas o no enteras cuando `inputType: "integer"`, restricciones que agotan los 50 re-sorteos, rango de respuestas demasiado estrecho. **Es el único mecanismo realista para que un padre confíe en un generador que escribió.** No debería ser opcional.

3. **Panel de "salud del mundo"** — extender `IssuesPanel` al nivel mundo: niveles huérfanos sin nodo, nodos inalcanzables desde el inicio, ciclos de desbloqueo, links incoherentes con los `LevelExit`, módulos personalizados con prerrequisitos rotos, y **desafíos cuyo módulo está bloqueado para todos los hijos** (cruce `isUnlocked` × `skillsProgress` real de cada hijo). Este último es el fallo silencioso más probable de un mundo grande y hoy nada lo detecta.

4. **Exportar / importar el mundo completo como JSON.** Un botón que serializa `{ world, levels[], customModules[] }` a un `.json` descargable, y otro que lo importa validando y re-mapeando ids. Motivo: todo el trabajo autoral del padre vive hoy en un único proyecto Firebase sin ninguna copia de respaldo, y es el activo más valioso que produce el producto. Coste bajo — todo es dato puro y ya serializable (`prepareForFirestore` existe). Beneficio colateral: permite compartir mundos entre familias sin ninguna infraestructura nueva.

5. **"Jugar como {hijo}" en el Play Test.** Hoy `createSandboxServices` usa el progreso del **padre**, así que el padre nunca ve lo que su hijo ve (qué está bloqueado, qué pistas aparecen). Añadir un selector de hijo que pase el `progressBySkill` real de ese niño al sandbox es casi gratis (el puerto ya recibe `progressBySkill`, §11.2) y cambia radicalmente la utilidad del play test.

6. **Analítica autoral ligera, sin datos nuevos.** En `/panel/editor/{levelId}`, un panel "Cómo les va" que lee `attempts` (colección que ya existe) agrupado por `moduleId` de los `ChallengePlacement` del nivel: intentos, % acierto, pistas usadas. Cierra el bucle *diseñar → observar → ajustar* sin crear ni un documento nuevo, y es la información que más ayudaría a un padre a decidir si su generador está bien calibrado.

---

## 11. Resumen de archivos

**Crear (≈40):**
`src/components/ui/Tooltip.tsx`, `IconButton.tsx`, `HelpOverlay.tsx` · `src/components/level/editor/helpText.ts`, `history.ts`, `StoryBeatEditor.tsx` · `src/lib/gameworld/{schema,defaults,validate,migrate,progress,ids}.ts`, `persistence/{worldRepository,useWorldDoc}.ts` · `src/components/world-editor/{WorldEditorScreen,WorldMapCanvas,WorldNodeCard,WorldLinkLayer,worldReducer,StoryTab,RulesTab,AvatarsTab}.tsx` · `src/app/panel/editor/mundo/page.tsx` · `src/app/jugar/[childId]/mapa/page.tsx` · `src/components/jugar/NoLevelsYet.tsx` · `src/lib/level/persistence/versionedDoc.ts`, `seedExampleWorld.ts` · `src/components/world/AvatarPicker.tsx`, `src/lib/useResolvedAvatar.ts` · `src/lib/curriculum/{expr,customRegistry,customSchema,compileModule,generatorTemplates,conceptCatalog,validateCustomModule}.ts`, `persistence/curriculumRepository.ts`, `useCustomCurriculum.ts` · `src/components/topic/concepts/SlidesConcept.tsx` · `src/app/panel/curriculum/{page.tsx,[moduleId]/page.tsx}` · 5 specs E2E nuevos.

**Modificar (≈20):** `firestore.rules` (2 bloques) · `src/lib/level/schema.ts` (`LevelExit`, versión 2) · `migrate.ts` (primera migración real) · `useLevelRuntime.ts`, `LevelRuntime.tsx` (exits tipadas) · `PolygonEditor.tsx` (selector de destino) · `src/lib/curriculum.ts` (**6 líneas**) · `src/lib/types.ts` (`ChildProfile.avatarId`, borrar `CurriculumSkill`) · `src/components/world/Avatar.tsx` (props opcionales) · `src/lib/level/assets/imageRules.ts` (`AssetKind: "avatar"`) · `src/lib/level/entities/registry.ts` (`hint?`) · `fields/PropertyFields.tsx` (`HelpDot`) · `useEditorHotkeys.ts` (`SHORTCUTS`) · `ChallengePicker.tsx` (`allModules()` + reescritura del comentario de política) · `EjemplosTab.tsx` (prop opcional) · `src/app/jugar/[childId]/page.tsx` (despachador) · `src/app/panel/editor/page.tsx` (semilla + acceso a Mundo) · `PanelShell.tsx` (2 ítems de nav) · los ~12 componentes del editor que adoptan `IconButton` · `e2e/aventura.spec.ts` (excepción P3) · `README.md`.

**Explícitamente NO se tocan:** `src/components/world/QuestScene.tsx`, `src/lib/world/**` (Ciudad Central legacy), los 6 generadores (`arithmetic.ts`, `algebra.ts`, `geometria.ts`, `medicion.ts`, `logica.ts`, `aritmeticaMcdMcm.ts`), `hints.ts`, `problem.ts`, `attemptRecorder.ts`, `economy.ts`, `mastery.ts`, `badges.ts`, `firebase.ts`, `storage.rules`, los 11 `*Concept.tsx` existentes (se envuelven, no se editan), `QuestionWidget.tsx` (hasta que se añada una dinámica nueva).

---

### Archivos críticos para la implementación

- `src/lib/curriculum.ts` — las 6 líneas que habilitan todo el Requisito 3 (`getModule` con fallback al registro + `allModules()`); su `ModuleDef` es el contrato exacto que debe producir `compileModule`
- `src/lib/level/schema.ts` — `LevelExit` tipado y `LEVEL_SCHEMA_VERSION → 2`; es el punto de contacto entre el nivel y el nuevo documento de Mundo
- `src/lib/level/persistence/levelRepository.ts` — patrón exacto (firma con `firestoreFns`/`db`, versionado transaccional, `StaleLevelError`) que `worldRepository` y `curriculumRepository` deben clonar, y del que se extrae `versionedDoc.ts`
- `src/lib/level/entities/registry.ts` — `PropertyFieldDef` gana `hint?`; ese único cambio propaga tooltips a todos los paneles y da al editor de Mundo y al de Currícula su sistema de formularios sin escribir campos nuevos
- `src/app/jugar/[childId]/page.tsx` — hoy construye `ciudadCentralAsLevel` incondicionalmente (`:60`); se convierte en el despachador que resuelve el Requisito 1
- `firestore.rules` — dos bloques nuevos (`world/**`, `curriculumModules`), con despliegue manual obligatorio
