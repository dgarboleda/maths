# Plan de implementación — Fases 23-27: del motor al producto

Continuación de `docs/level-editor-plan-v2.md` (fases 15-22, cerradas). Aquel
plan construyó **capacidad autoral**; este cubre las tres capas que faltan
para que esa capacidad sea un producto: **durabilidad del dato**, **bucle de
observación cerrado** y **robustez de superficie**.

Cuatro de las cinco fases de acá son recomendaciones ya escritas en
`level-editor-plan-v2.md` §10 que nunca se implementaron. No son ideas
nuevas: son la deuda que dejó el plan anterior.

---

## 0. Decisiones de política previas (leer antes que nada)

### P1 — Ninguna de estas fases toca el modelo de desbloqueo

`isMastered` (`src/lib/curriculum.ts:671`) es `masteredAt !== null` y de ahí
cuelga `isUnlocked` → `missingPrerequisites` → todo el árbol de progresión.
La Fase 27 (repaso espaciado) **no lo modifica**: un módulo dominado sigue
dominado para siempre a efectos de desbloqueo. Un repaso vencido nunca
re-bloquea nada — solo aparece como sugerencia. Re-bloquear le quitaría a un
niño acceso a contenido que ya tenía, que es exactamente el tipo de castigo
que rompe la confianza en la app.

### P2 — Campos nuevos siempre opcionales, nunca migración

`SkillProgress.masteredVia?` (`src/lib/types.ts:44`) ya sentó el precedente:
un campo nuevo se agrega como opcional y el código lo trata con un default
explícito. Ninguna fase de acá escribe una migración de datos ni un
`schemaVersion` nuevo.

### P3 — Se mantiene el criterio A5 de persistencia

Todo acceso a Firestore nuevo son funciones puras que reciben
`firestoreFns`/`db` como parámetros y nunca llaman a `getFirebase()` por su
cuenta (patrón exacto de `src/lib/level/persistence/levelRepository.ts`). El
llamador —un componente, o un test contra emulador— decide la conexión.

### P4 — Cero dependencias nuevas

Se mantiene A3. En particular: la Fase 24 no incorpora ninguna librería de
ZIP ni de descarga; un `Blob` + `URL.createObjectURL` + `<a download>` alcanza.

### P5 — Orden de ejecución

**23 → 24 → 25 → 26 → 27.** La 23 va primera porque sin ella ningún fallo de
las otras cuatro es observable. La 27 va última porque es la única con
carga de diseño pedagógico y conviene decidirla con la analítica de la 26 ya
funcionando.

Cada fase es independiente y entregable por separado: una PR por fase.

---

## 1. FASE 23 — Robustez de superficie y observabilidad

**Problema:** no existe ni un `error.tsx`, `not-found.tsx` ni
`global-error.tsx` en toda `src/app` (verificado: `find src/app -name
"error.tsx"` no devuelve nada). Cualquier excepción en render deja pantalla
en blanco. Además varias promesas (`getDoc(...).then(...)`) no tienen
`catch`, y no hay ningún registro de errores: si un niño se topa con un
fallo, nadie se entera nunca. Ya estaba anotado en
`docs/auditoria-rendimiento-accesibilidad.md` §3.2.

### 1.1 Convenciones de ESTA versión de Next (16.3.3) — leer antes de escribir

Verificado en `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`.
**Difiere de lo que probablemente tengas memorizado:**

- La prop de recuperación se llama **`retry`**, no `reset`. `reset` todavía
  existe pero la propia doc dice "in most cases, you should use `retry()`
  instead": `retry()` re-ejecuta la obtención de datos dentro de una
  Transition; `reset()` solo limpia el estado del boundary sin re-obtener.
- La firma es `{ error: Error & { digest?: string }, retry: () => void }`.
- `error.tsx` **no** envuelve al `layout.tsx` de su propio segmento, solo a
  `page.js`, `loading.js`, `not-found.js` y layouts anidados por debajo.
- `global-error.tsx` va en la raíz de `app/`, debe traer sus propios `<html>`
  y `<body>`, y **no recibe los estilos globales**: hay que darle su propio
  color de fondo y tipografía inline o se ve como un documento sin CSS.
  Tampoco admite `export const metadata` (es Client Component): el título se
  pone con el componente `<title>` de React.
- Para recuperación a nivel componente (no de segmento de ruta) existe
  `catchError` de `next/error`. Útil si algún panel del editor debe fallar
  sin tumbar la pantalla entera; **no** es lo que se usa para las rutas.

### 1.2 Archivos a crear

| Archivo | Cubre |
|---|---|
| `src/app/global-error.tsx` | Fallo en el layout raíz — última red de seguridad |
| `src/app/error.tsx` | Todo lo demás por defecto |
| `src/app/jugar/[childId]/error.tsx` | El niño jugando: tono y salida propios |
| `src/app/panel/error.tsx` | El padre en el panel |
| `src/app/panel/editor/[levelId]/error.tsx` | Editor: **debe ofrecer no perder el trabajo** |
| `src/app/not-found.tsx` | 404 |
| `src/lib/reportError.ts` | Punto único de registro |

**Cuatro `error.tsx` y no uno solo** porque el destinatario y la salida
cambian: al niño se le ofrece "volver al mapa" con lenguaje de juego; al
padre, "reintentar" y "volver al panel"; en el editor lo importante es
decirle que su borrador local sigue guardado (`LevelEditorProvider` ya
mantiene borrador) y no mandarlo a una ruta que lo pierda.

### 1.3 `reportError.ts` — el contrato

```ts
export type ErrorContext = "jugar" | "panel" | "editor" | "mundo" | "curriculum" | "root";

/** Punto ÚNICO de salida de errores de la app. Hoy solo `console.error`
 *  con forma estable; el día que haya un servicio real (Sentry o el que
 *  sea) se cambia acá y en ningún otro archivo. */
export function reportError(error: unknown, context: ErrorContext, extra?: Record<string, unknown>): void;
```

Deliberadamente **no** se integra ningún servicio de terceros en esta fase:
sería una dependencia nueva (viola P4) y una decisión de infraestructura que
no es urgente. Lo urgente es que exista **un solo lugar por donde salen los
errores** y que las pantallas dejen de quedarse en blanco. Cambiar el cuerpo
de esa función después es trivial; encontrar los 40 `catch` repartidos por el
código, no.

### 1.4 Barrido de `catch` faltantes

Buscar `.then(` sin `.catch(` en `src/app/**` y `src/components/**` y
completarlos llamando a `reportError`. **No** convertir a `try/catch` los que
ya funcionan: solo agregar el `catch` que falta.

### 1.5 Criterio de aceptación

- Test de componente (`src/app/**/*.test.tsx`, suite `npm run test`): cada
  `error.tsx` renderiza su mensaje y su botón, y al pulsar "Reintentar"
  invoca la prop `retry`.
- `npm run build` pasa (Next valida la firma de los archivos especiales).
- Verificación manual: forzar un throw en un `page.tsx` y comprobar que sale
  la pantalla de error y no un blanco.

---

## 2. FASE 24 — Respaldo del trabajo autoral (export / import)

**Problema:** el mundo, los niveles, la currícula personalizada y los assets
del padre viven en un único proyecto Firebase sin ninguna copia. Es el activo
más valioso que produce el producto. Recomendación §10.4 del plan anterior,
nunca implementada.

### 2.1 Alcance decidido: exportar todo, importar **solo como restaurar**

v1 exporta el paquete completo e importa **con los ids originales,
sobrescribiendo** (restaurar una copia de seguridad). **Clonar** —importar
re-mapeando ids para tener dos copias, o recibir el mundo de otra familia—
queda **explícitamente fuera**.

*Motivo del recorte:* re-mapear ids obliga a reescribir todas las referencias
cruzadas —`WorldNode.levelId`, `WorldLink.from/toLevelId`,
`LevelExit.target.levelId`, `ChallengePlacement.moduleId`, las reglas
`unlock.levelIds` de nodos y avatares— y cada referencia olvidada es un mundo
roto de forma silenciosa. Es la mitad arriesgada de la función y no es la que
resuelve el problema urgente (no tener respaldo). Se difiere a una fase
propia, con `validateWorld` corriendo sobre el resultado como red.

### 2.2 Formato del paquete

`src/lib/backup/bundle.ts`:

```ts
export const BUNDLE_FORMAT = "math-quest-bundle" as const;
export const BUNDLE_FORMAT_VERSION = 1;

export interface WorldBundle {
  format: typeof BUNDLE_FORMAT;
  formatVersion: number;
  exportedAt: number;
  /** Solo informativo: de qué cuenta salió. No se usa al importar. */
  sourceParentId: string;
  world: GameWorld;
  levels: LevelDefinition[];
  customModules: CustomModuleDoc[];
  /** Fichas de los assets — los BYTES no viajan (ver §2.3). */
  assets: LevelAsset[];
}
```

`formatVersion` desde el día uno: un paquete es un archivo que el padre puede
guardar durante años y abrir con una versión de la app que ya no existe hoy.

### 2.3 Los bytes de las imágenes NO viajan — y hay que decirlo

Los assets viven en Cloud Storage (`parents/{uid}/level-assets/{file}`) y el
paquete solo lleva su ficha de Firestore (`LevelAsset`, con `storagePath`).
Un paquete restaurado en **la misma cuenta** funciona perfecto (los archivos
siguen ahí). Restaurado en **otra cuenta** deja las imágenes rotas.

*Trade-off aceptado:* meter los bytes obligaría a base64 (infla ~33% y
revienta el límite práctico de un JSON en memoria con pocas decenas de
imágenes) o a un ZIP (dependencia nueva, viola P4). Como v1 no soporta
importar en otra cuenta (§2.1), el problema no se materializa todavía.

**Mitigación obligatoria, no opcional:** al importar, verificar cada
`storagePath` y mostrar la lista de assets que no se pudieron resolver, con
los niveles que los referencian. Un respaldo que restaura en silencio un
mundo con imágenes rotas es peor que uno que falla.

### 2.4 Archivos

**Crear:**
- `src/lib/backup/bundle.ts` — tipos, `buildBundle()`, `parseBundle()` (valida
  `format`/`formatVersion` y la forma; **nunca lanza**, devuelve
  `{ ok: true, bundle } | { ok: false, errors: string[] }`, misma convención
  que `validateLevel`/`validateWorld`).
- `src/lib/backup/backupRepository.ts` — `exportBundle(firestoreFns, db, parentId)`
  y `importBundle(firestoreFns, db, parentId, bundle)`, con la firma A5 (P3).
- `src/components/family/BackupPanel.tsx` — UI de las dos acciones.

**Modificar:**
- `src/app/panel/ajustes/page.tsx` — monta `BackupPanel`. Va en Ajustes y no
  en el editor porque es una operación de la cuenta, no de un nivel.

**Reutilizar sin tocar:** `listLevels`/`getLevel`/`insertLevel`
(`levelRepository.ts`), `getWorld`/`saveWorld` (`worldRepository.ts`),
`listCustomModuleDocs`/`saveCustomModuleDoc` (`curriculumRepository.ts`),
`listAssets` (`assetRepository.ts`), `prepareForFirestore`/`assertSize`
(`src/lib/level/serialize.ts`).

### 2.5 Trampas concretas de la importación

1. **Versionado optimista.** `saveWorld` lanza `StaleWorldError` si la
   versión remota no coincide con `world.version`. Al restaurar, el mundo del
   paquete trae una versión vieja. **Solución:** leer el mundo remoto primero
   y escribir el del paquete con `version` = la remota, para que el guardado
   pase y quede como una versión nueva más. Nunca forzar la escritura
   saltándose la transacción.
2. **`insertLevel` no es idempotente respecto de `versions/**`.** Escribe
   `versions/{level.version}`, y esa subcolección es inmutable por reglas
   (`allow update, delete: if false`). Restaurar un nivel cuya versión ya
   existe **falla desde las reglas**. Solución: al importar, escribir cada
   nivel con `version` = (remota + 1) si el nivel ya existe, o tal cual si es
   nuevo.
3. **Niveles que ya no están en el paquete.** Restaurar **no borra** lo que
   existe en la cuenta y no viene en el paquete. Es una fusión, no un
   reemplazo. Decirlo en la UI con esas palabras.
4. **Confirmación explícita.** Restaurar sobrescribe. Un `window.confirm` con
   el recuento ("Se van a sobrescribir 12 niveles, 1 mundo y 4 módulos") es
   el mínimo.

### 2.6 Criterio de aceptación

- Unitario (`npm run test`): `parseBundle` rechaza `format` desconocido,
  `formatVersion` futura, y JSON sin las claves obligatorias, devolviendo
  errores legibles y sin lanzar.
- Integración contra emuladores (`npm run test:integration`, nuevo
  `src/test/integration/backup-persistencia.test.ts`): crear mundo + 2
  niveles + 1 módulo → exportar → borrar los niveles → importar → comprobar
  igualdad profunda y que `validateWorld` no reporta errores.
- Manual: descargar el `.json`, abrirlo, comprobar que es legible.

---

## 3. FASE 25 — Plantillas de nivel

**Problema:** hoy la única alternativa al lienzo en blanco es sembrar Ciudad
Central entera (`seedExampleWorld`). Recomendación §10.1 del plan anterior,
marcada ahí como "alta prioridad, coste bajo", nunca hecha. Es el mayor
obstáculo de adopción para un padre no técnico.

### 3.1 Es dato, no código

`src/lib/level/templates/` con un módulo por plantilla, cada uno exportando
una función `(authorUid, name, background) => LevelDefinition` construida
sobre `createEmptyLevel` (`src/lib/level/defaults.ts:11`) y luego rellenando
`entities`/`zones`/`dialogs`/`challenges`/`missions`/`events`. **Ningún
concepto nuevo en el esquema.**

Tres plantillas, las del plan anterior:

| Plantilla | Contenido |
|---|---|
| `salaConTerminal` | 1 entidad terminal + 1 `ChallengePlacement` sin módulo asignado + 1 misión de un objetivo |
| `pasilloConPuerta` | 2 polígonos, 1 puerta con `LevelExit` sin destino + 1 desafío que la abre vía evento |
| `encuentroConNpc` | 1 NPC + diálogo de 3 líneas + 1 desafío al terminar el diálogo |

### 3.2 La decisión que hay que tomar bien: qué queda sin rellenar

Cada plantilla deja **deliberadamente** vacíos el `moduleId` de sus
`ChallengePlacement` y el `target` de sus `LevelExit`. Motivo: son las dos
cosas que solo el padre puede decidir, y `validateLevel` ya las reporta como
error clicable. Así la plantilla no es una caja negra: al crearla, el panel
de problemas dice exactamente qué faltan **dos** decisiones y lleva a cada
una. Una plantilla que se autocompleta con un módulo cualquiera enseña menos
y produce niveles que el padre no entiende.

### 3.3 Archivos

**Crear:** `src/lib/level/templates/index.ts` (registro
`LEVEL_TEMPLATES: TemplateDef[]` con `id`, `label`, `description`, `build`),
`salaConTerminal.ts`, `pasilloConPuerta.ts`, `encuentroConNpc.ts`.

**Modificar:** `src/app/panel/editor/page.tsx` → `CreateLevelForm` gana un
selector de plantilla (por defecto "Lienzo vacío", que llama a `createLevel`
como hoy). Cuando hay plantilla, usa `insertLevel` con el `LevelDefinition`
que devuelve `build()`.

**Ojo:** la sincronización nodo↔nivel del formulario
(`page.tsx:290-303`) debe seguir corriendo igual con plantilla — es el mismo
`saveWorld` posterior, no lo dupliques.

### 3.4 Criterio de aceptación

Unitario: para cada plantilla, `validateLevel(build(...))` devuelve
**exactamente** los errores esperados (el `moduleId` y el `target` sin
asignar) y **ningún otro**. Ese test es el que impide que una plantilla se
pudra cuando el esquema evolucione.

---

## 4. FASE 26 — Cerrar el bucle de observación

**Problema:** el padre diseña un nivel y no tiene forma de saber cómo le fue a
su hijo en él. Recomendación §10.6, nunca hecha.

### 4.1 Corrección al diagnóstico previo

El Play Test **ya usa el progreso real del hijo seleccionado**
(`LevelEditorScreen.tsx:39-58` lee
`children/{selectedChildId}/skillsProgress`). La recomendación §10.5 del plan
anterior está, en lo esencial, **cumplida**. El hueco que queda es de
información, no de datos: `PlayTestBar`
(`src/components/level/runtime/PlayTestBar.tsx`) dice "Modo prueba" y nunca
nombra al hijo, y el editor es una ruta a pantalla completa sin el
`ChildSwitcher` del panel — así que el padre no sabe con qué progreso está
probando ni puede cambiarlo sin salir.

**Arreglo (barato):** `PlayTestBar` recibe `childName` y lo muestra ("Modo
prueba · como Sofía"). Si `useFamily().children.length > 1`, ese texto es un
`<select>` que cambia `selectedChildId`. Cambiar de hijo debe remontar el
runtime — reutilizar el mecanismo de `sessionId` que ya existe para "Reset"
(`LevelEditorScreen.tsx:143`), no inventar otro.

### 4.2 Panel "Cómo les va"

En `/panel/editor/{levelId}`, un panel que para cada `ChallengePlacement` del
nivel muestra: intentos, % de acierto y último intento, por hijo.

**La trampa, y es fea:** el `skillId` que se guarda en `attempts` **no es** el
`moduleId`. `attemptRecorder.ts:43` escribe
`skillId: \`${mod.strandSlug}-topico-${mod.id}\``, mientras que el documento
de `skillsProgress` sí usa `mod.id` pelado. La consulta del panel tiene que
construir esa cadena, no comparar contra `placement.moduleId` directamente.
No cambies el formato de `skillId` para "arreglarlo": hay datos escritos con
él desde hace meses y ninguna migración vale ese cambio.

**Segunda limitación real:** el documento `Attempt`
(`src/lib/types.ts:71-77`) **no guarda `hintsUsed`**, aunque
`recordModuleAttempt` lo recibe y lo usa para calcular estrellas. La métrica
"pistas usadas" de la recomendación §10.6 **no es computable con los datos de
hoy**. Agregar `hintsUsed: number` al documento es aditivo y no rompe nada
(los documentos viejos lo leen como `undefined` → se muestra "—", nunca 0,
que sería mentir). Hacerlo en esta fase, y que el panel distinga
explícitamente "sin dato" de "cero pistas".

### 4.3 Archivos

**Crear:** `src/lib/level/analytics.ts` (consulta pura, firma A5:
`challengeStats(firestoreFns, db, parentId, childIds, placements)`),
`src/components/level/editor/StatsPanel.tsx`.

**Modificar:** `src/lib/types.ts` (`Attempt.hintsUsed?`),
`src/lib/attemptRecorder.ts` (escribirlo),
`src/lib/level/runtime/services.ts` (el sustituto de arena ya replica la
lógica: no escribe nada, así que solo hay que mantener la firma alineada),
`PlayTestBar.tsx`, `LevelEditorScreen.tsx`.

### 4.4 Rendimiento

Un nivel con 6 desafíos × 3 hijos son 18 consultas si se hace ingenuo.
Hacer **una** consulta por hijo (`where skillId in [...]`, tope de 30 valores
en Firestore, de sobra) y agrupar en cliente. El panel se carga **bajo
demanda** —al abrir la pestaña, no al montar el editor—: el editor ya es la
pantalla más pesada de la app y esto no puede entrar en su arranque.

---

## 5. FASE 27 — Repaso espaciado

**Problema:** `mastery.ts:44-49` fija `masteredAt` una vez y nunca lo revisa.
Un módulo dominado en marzo sigue "dominado" en septiembre sin que el niño lo
haya vuelto a ver. No hay decaimiento, ni repaso, ni retención. Es la
diferencia entre practicar y aprender, y es lo único de este plan que no
estaba ya en el anterior.

### 5.1 Modelo: Leitner de 4 cajas, no SM-2

```ts
// src/lib/mastery.ts
export const REVIEW_INTERVALS_DAYS = [3, 7, 21, 60] as const;
```

Al dominar un módulo entra en la caja 0 (repaso a los 3 días). Cada repaso
superado sube una caja (tope: 3 → 60 días). Un repaso fallado vuelve a la
caja 0. **`masteredAt` no se toca nunca** (P1).

*Por qué Leitner y no SM-2/FSRS:* SM-2 necesita que el niño califique su
propia dificultad percibida después de cada ítem, que es justo lo que un niño
de 8 años no puede hacer de forma fiable, y su factor de facilidad requiere
un historial por ítem que acá no existe (los problemas son **generados**, no
una baraja fija: `problemSignature` identifica la forma, no la instancia).
Leitner solo necesita "acertó / no acertó", que es exactamente lo que ya
tenemos. La precisión extra de SM-2 sería falsa.

### 5.2 Cambios de datos (aditivos, P2)

```ts
// src/lib/types.ts — SkillProgress
/** Caja de Leitner del repaso (0-3). Ausente = 0. */
reviewBox?: number;
/** Último repaso resuelto, ms. Ausente ⇒ se usa masteredAt. */
lastReviewAt?: number;
```

### 5.3 Funciones nuevas en `mastery.ts`

```ts
export function reviewDueAt(p: SkillProgress): number | null;   // null si no dominado
export function isReviewDue(p: SkillProgress, now?: number): boolean;
export function recordReview(p: SkillProgress, correct: boolean): SkillProgress;
```

`recordReview` es **pura** y no toca `recentResults` ni `masteredAt`: solo
`reviewBox`/`lastReviewAt`.

### 5.4 Un solo punto de integración

En `recordModuleAttempt` (`attemptRecorder.ts:34`) ya se calcula
`wasMastered`. Si es `true`, aplicar además `recordReview` al progreso antes
de escribirlo. **Ese es el único sitio**: todas las superficies del juego
(práctica, evento, boss, nivel) pasan por ahí. No dupliques la lógica en
ninguna pantalla.

Espejarlo en `sandboxRecordAttempt` (`services.ts:96`) para que el Play Test
siga calculando lo mismo que el juego real.

### 5.5 Superficie: sugerir, nunca obligar

**No modificar `nextChallenge`.** Lo consumen `WorldHud`, `boss/page.tsx` y
`evaluacion/page.tsx`, y cambiarle la semántica arrastra las tres.

Añadir en `curriculum.ts` una función hermana:

```ts
export function nextReview(progressBySkill: Record<string, SkillProgress>, now?: number): ModuleDef | null;
```

devuelve el módulo dominado con el repaso más vencido, o `null`. `WorldHud`
(`src/components/world/WorldHud.tsx:95`) muestra un chip "Repaso · {módulo}"
junto al de "Tu próximo desafío" cuando lo hay. Mismo `moduleHref`, misma
pantalla de práctica: **el repaso no es una pantalla nueva**, es el mismo
módulo señalado en otro momento.

### 5.6 La decisión de producto que hay que confirmar antes de codear

Con `REVIEW_INTERVALS_DAYS = [3, 7, 21, 60]`, un niño que dominó 20 módulos
acumula repasos vencidos si deja la app dos semanas — y volver a una lista de
14 repaso pendientes es desmotivador. **Tope duro sugerido: `nextReview`
devuelve como mucho uno a la vez** (por eso su firma devuelve `ModuleDef |
null` y no un array). El chip no debe mostrar nunca un contador de deuda.
Si el usuario prefiere otra cosa, es acá donde hay que decidirlo antes de
implementar, no después.

### 5.7 Criterio de aceptación

Unitario (`src/test/unit/`), con reloj inyectado (las funciones reciben
`now`, nunca llaman a `Date.now()` por dentro salvo el default):
- Un módulo recién dominado no tiene repaso vencido; a los 3 días sí.
- Repaso acertado → caja +1 y el próximo vence 7 días después.
- Repaso fallado → caja 0, y **`masteredAt` intacto** (el test que protege P1).
- Progreso previo sin `reviewBox`/`lastReviewAt` se comporta como caja 0
  contada desde `masteredAt` (el test que protege P2).
- `isUnlocked` da idéntico resultado con y sin repasos vencidos.

---

## 6. Resumen de archivos

**Crear (14):** `src/app/global-error.tsx`, `src/app/error.tsx`,
`src/app/not-found.tsx`, `src/app/jugar/[childId]/error.tsx`,
`src/app/panel/error.tsx`, `src/app/panel/editor/[levelId]/error.tsx` ·
`src/lib/reportError.ts` · `src/lib/backup/{bundle,backupRepository}.ts`,
`src/components/family/BackupPanel.tsx` ·
`src/lib/level/templates/{index,salaConTerminal,pasilloConPuerta,encuentroConNpc}.ts` ·
`src/lib/level/analytics.ts`, `src/components/level/editor/StatsPanel.tsx`

**Modificar (8):** `src/lib/types.ts` (`Attempt.hintsUsed?`,
`SkillProgress.reviewBox?`/`lastReviewAt?`) · `src/lib/mastery.ts` (3
funciones nuevas) · `src/lib/curriculum.ts` (`nextReview`) ·
`src/lib/attemptRecorder.ts` (hintsUsed + recordReview) ·
`src/lib/level/runtime/services.ts` (espejo de arena) ·
`src/app/panel/editor/page.tsx` (plantillas) · `src/app/panel/ajustes/page.tsx`
(respaldo) · `src/components/level/runtime/PlayTestBar.tsx` (hijo visible) ·
`src/components/world/WorldHud.tsx` (chip de repaso) ·
`src/components/level/editor/LevelEditorScreen.tsx`

**Explícitamente NO se tocan:** `src/lib/curriculum.ts:671` (`isMastered`) ·
el formato de `skillId` en `attempts` · `nextChallenge` ·
`firestore.rules` (ninguna fase necesita reglas nuevas: todo cuelga de
colecciones ya cubiertas) · `src/lib/world/**` y `QuestScene.tsx` (Ciudad
Central legacy) · los 6 generadores.

## 7. Dónde va cada prueba

| Tipo | Config | Ubicación |
|---|---|---|
| Lógica pura y componentes | `vitest.config.mts` (`npm run test`) | `src/**/*.test.{ts,tsx}` |
| Contra emuladores, sin navegador | `vitest.integration.config.mts` (`npm run test:integration`) | `src/test/integration/**/*.test.ts` |
| Recorrido completo con navegador | `playwright.config.ts` (`npm run e2e`) | `e2e/*.spec.ts` |

Regla de la casa (README §"Pirámide de pruebas"): un test va a Playwright
**solo** si necesita un navegador de verdad. Nada de este plan lo necesita
salvo, como mucho, un recorrido de export→import en la Fase 24 — y aun ese
está mejor cubierto por la prueba de integración de §2.6.

---

## 8. Lo que este plan deliberadamente NO hace

- ~~**Sesión propia del niño.**~~ Implementada tras confirmar que el
  escenario es real: `functions/src/index.ts` (`verifyChildPin`,
  `listChildrenPublic`, Cloud Functions con Admin SDK), custom token con
  claims `{ role: "child", parentId, childId }`, `firestore.rules`/
  `storage.rules` extendidas (`isChild`/`isAnyChildOf`), `AuthProvider.tsx`
  expone el `parentId` efectivo, y `/entrar/{parentId}` es la puerta de
  entrada pública (enlace compartible desde Ajustes) para jugar sin la
  sesión del padre en el dispositivo. Ver `src/test/integration/
  child-session-rules.test.ts` para la cobertura de la frontera de
  seguridad.
- **Contador agregado de estrellas.** `useTotalStars` descarga el libro mayor
  entero en cada pantalla. Está bien identificado en
  `auditoria-rendimiento-accesibilidad.md` §1.2 y necesita migrar saldos
  existentes; es una fase propia, no un apéndice de estas.
- ~~**Presupuesto de rendimiento en CI**~~ Implementado con Lighthouse CI
  (no `@next/bundle-analyzer`: envuelve el `webpack()` de `next.config`, que
  la build de producción — Turbopack desde Next 16 — ignora). Ver
  `lighthouserc.json`, `.github/workflows/ci.yml` (job "Presupuesto de
  rendimiento") y `npm run perf`.
- **Clonar/compartir mundos.** Ver §2.1.
