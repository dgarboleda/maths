# Plan de jugabilidad — Fases 28-35

## 0. Dónde va este documento

**Documento nuevo `docs/plan-jugabilidad.md`, continuando la numeración global desde la fase 28.**

Motivo: `plan-salto-producto.md` tiene una tesis ("del motor al producto": durabilidad del dato, observación, robustez) y un destinatario (el padre-autor). Todo lo de acá tiene otra tesis y otro destinatario: **el niño que juega**. Mezclarlos haría que el §0 de políticas de aquel documento (que es sobre persistencia y desbloqueo) tenga que convivir con decisiones de diseño de juego que no comparten criterio de aceptación.

Se mantiene el contador global de fases porque el repo ya referencia fases por número desde el código (`// Fase 18`, `// Fase 27` en comentarios de 40+ archivos): dos "Fase 28" distintas serían una trampa permanente.

### Políticas heredadas (se respetan sin excepción)

- **P1** — Ninguna fase re-bloquea contenido ya dominado. `isMastered` (`curriculum.ts:671`) no se toca.
- **P2** — Campos nuevos siempre opcionales, cero migraciones.
- **P3** — Acceso a Firestore con firma `(firestoreFns, db, …)`.
- **P4** — Cero dependencias nuevas. Nada de acá necesita una librería de animación, de audio ni de físicas.
- **P5 (nueva, específica de este plan)** — **Ninguna fase inventa contenido académico.** El generador de cada `ModuleDef` sigue siendo la única fuente de problemas. Todo lo de acá es presentación, cableado y consecuencia.

---

## 1. Diagnóstico: el hallazgo estructural

La Fase 18 (`level-editor-plan-v2.md` §5.1) movió el juego real de `QuestScene` a `LevelRuntime` y dejó Ciudad Central en `/jugar/{childId}/ciudad-central-legacy`, "una ruta de regresión estable sin ningún enlace de producción" (`jugar/[childId]/page.tsx:23-27`). Esa decisión fue correcta para el motor, pero **arrastró consigo el único hub de navegación que el juego tenía**, y nadie lo reconstruyó.

Verificación por grep, no por lectura:

| Superficie | Dónde vive | Alcanzable jugando hoy |
|---|---|---|
| Boss Challenge (`/boss`) | enlace único en `QuestOverlays.tsx:249` | **No** |
| Diario de misiones (`/misiones`) | enlace único en `QuestOverlays.tsx:271` | **No** |
| Tienda (`ShopPanel`) | montada sólo en `ciudad-central-legacy/page.tsx:207` | **No** |
| Las 5 zonas (`/{strand}`) | enlaces en `QuestOverlays.tsx:222` | Sólo entrando a un módulo y usando el "←" del `GameShell` |
| Insignias ganadas | `WorldHud.tsx:73-97` (legacy) + panel del padre | **No** — el niño nunca ve una insignia que ganó |
| Chip "Tu próximo desafío" | `WorldHud.tsx:109` ← `ciudad-central-legacy:184` | **No** |
| Chip "Repaso" (**Fase 27, recién cerrada**) | `WorldHud.tsx:100` ← `ciudad-central-legacy:185` | **No** |

El repaso espaciado de la Fase 27 está implementado, probado y **es invisible**: `nextReview()` sólo se llama desde la ruta legacy (`ciudad-central-legacy/page.tsx:185`).

Y el mundo por defecto que recibe una familia nueva es un solo nivel con **3 desafíos, 1 diálogo y 1 misión** (`level/legacy/ciudadCentral.ts:270-272`). Resueltos esos tres, `activeMission` devuelve `null`, la barra de objetivo del HUD desaparece (`LevelHud.tsx:56`), el nodo del mapa queda "completado", y no queda nada que hacer en el mundo.

---

## 2. FASE 28 — Hub del jugador: reconectar lo que ya está construido

**Problema.** Todo lo de la tabla de §1. No falta contenido: falta un sitio desde donde llegar a él. Hoy, desde un nivel, la única navegación es el botón "atrás" a `/mapa` (`LevelHud.tsx:49`), y `/mapa` es una grilla de tarjetas que no enlaza a ninguna otra cosa (`mapa/page.tsx:124-155`).

**Decisión.** **Ampliar `/jugar/{childId}/mapa` hasta convertirlo en el hub**, no crear una ruta nueva. Motivo: ya es la pantalla a la que vuelve el botón "atrás" del HUD, ya carga mundo, niveles, `skillsProgress` y `totalStars` — tiene en memoria todo lo que un hub necesita y no agrega ni una lectura de Firestore. Una ruta `/base` nueva duplicaría esas cuatro cargas.

**Alcance.**

1. `mapa/page.tsx` monta `WorldTopBar` (`world/WorldHud.tsx`) con `stars`, `earnedBadgeIds`, `nextChallengeModule={nextChallenge(progressBySkill)}` y `nextReviewModule={nextReview(progressBySkill)}`. El componente ya acepta exactamente esas props; hoy nadie se las pasa fuera de legacy.
   - Un cambio obligatorio: `WorldHud.tsx:60` tiene `Ciudad Central` **hardcodeado** como `<h1>`. Pasa a ser `world.story.title`.
2. Bajo la grilla de nodos, una sección "Zonas" con los 5 `STRAND_NARRATIVE` y su `masteredCountForStrand` — copiar el bloque de `QuestOverlays.tsx:215-246`, que ya está escrito y probado.
3. Entradas a **Boss** (`/boss`), **Diario** (`/misiones`) y **Tienda** (`ShopPanel` como overlay, mismo montaje que `ciudad-central-legacy/page.tsx:113-131` + `:207`).
4. `LevelHud.tsx` gana un segundo botón fijo ("Base") junto al de salida, para que el hub esté a un toque desde dentro de un nivel, no sólo saliendo de él.
5. **`showWorldMap: false`** (`gameworld/schema.ts:131`) hoy significa "no hay mapa"; con el hub adentro pasaría a significar "no hay hub". Decisión: la regla sigue ocultando **la grilla de nodos**, nunca el resto del hub. Documentarlo en `worldRuleFields.ts`.

**Archivos.** Modificar: `src/app/jugar/[childId]/mapa/page.tsx`, `src/components/world/WorldHud.tsx` (título parametrizado), `src/components/level/runtime/LevelHud.tsx`. Crear: nada.

**Criterio de aceptación.** E2E: desde un nivel recién sembrado (`seedExampleWorld`), llegar en ≤2 toques a cada una de las 8 superficies de la tabla de §1. Test de componente: con un `SkillProgress` con repaso vencido, el chip "Repaso" aparece en el hub (el test que hace visible la Fase 27).

---

## 3. FASE 29 — Las reglas del Mundo que hoy no hacen nada

**Problema.** `WorldRules` tiene 10 campos, el padre los configura desde `worldRuleFields.ts:13-85`, y **8 no los lee nadie**. Verificado con grep sobre todo `src/`:

| Regla | Consumidor real |
|---|---|
| `levelCompletion` | `gameworld/progress.ts:25,53,95` ✓ |
| `showWorldMap` | `jugar/[childId]/page.tsx:77` ✓ |
| `allowReplay`, `autoAdvance`, `challengesAreMandatory`, `maxAttemptsPerChallenge`, `hintsAfterAttempts`, `lockedModulePolicy`, `replayStoryBeats`, `defaultSoundOn` | **sólo `worldRuleFields.ts`** |

Lo mismo pasa con dos disparadores de evento: `EventChainEditor.tsx:21-22` ofrece `ON_ITEM_COLLECTED` y `ON_MISSION_COMPLETE`, y **el runtime nunca los emite** (`useLevelRuntime.ts:89` sólo emite `ON_ENTER_ZONE`/`ON_EXIT_ZONE`; `LevelRuntime.tsx:158,162,172` los otros tres). Un padre puede autorar "al completar la misión → mostrar diálogo + generar AXIA" y no pasa nada, en silencio.

El más caro en jugabilidad es `maxAttemptsPerChallenge`. Hoy `PuzzleOverlay.submit()` (`PuzzleOverlay.tsx:92-127`) registra el intento y pinta `✗ CÓDIGO RECHAZADO — era {answer}` (`:278`) **al primer error**. No hay "inténtalo otra vez" en ninguna parte del juego dentro del mundo. Para un niño de 8 años, fallar una vez y que la máquina te cante la respuesta es el peor feedback posible.

**Decisión.** Implementar 6 de las 8, y **borrar las otras 2 del esquema** en vez de dejarlas mintiendo:

- `maxAttemptsPerChallenge` (0 = ilimitado) → reintento real en `PuzzleOverlay`. **La trampa:** un reintento **no** debe escribir un `Attempt` por cada tecla. Se registra **un solo** `recordModuleAttempt` con el resultado final y `hintsUsed` acumulado, o la tasa de acierto de `skillsProgress` se hunde artificialmente y con ella `recentAccuracy` → `masteredAt`. Esto toca `mastery.ts` sólo de lectura.
- `hintsAfterAttempts` → el botón "Ejecutar diagnóstico" (`PuzzleOverlay.tsx:236`) aparece recién tras N fallos, en vez de estar siempre.
- `allowReplay` → `worldGraphState` "completado" deja de ser clicable si es `false`.
- `lockedModulePolicy` → hoy `PuzzleOverlay.tsx:88-89` siempre hace `showLocked`. Las otras dos opciones (`hide`, `allowAnyway`) no existen.
- `challengesAreMandatory: false` → un desafío deja de bloquear la puerta asociada.
- `autoAdvance` → al completar un nivel, ofrecer el siguiente desbloqueado (no navegar solo: **ofrecer**).
- **Emitir `ON_MISSION_COMPLETE`** en `useLevelRuntime` cuando `missionProgress(...).complete` pasa de `false` a `true`, y **`ON_ITEM_COLLECTED`** cuando una entidad `collectible` cambia de su estado inicial. Ambos ya están en `LevelEventType` (`level/schema.ts:333-334`) y `validate.ts:314` ya los valida.
- **Borrar:** `defaultSoundOn` (lo pisa `useSoundPreference`, que es preferencia de dispositivo y gana siempre) y `replayStoryBeats` se mueve a la Fase 30, donde por primera vez existe algo que repetir.

**Archivos.** Modificar: `src/components/world/PuzzleOverlay.tsx` (reintento + pistas diferidas — el archivo que más cambia), `src/lib/level/runtime/useLevelRuntime.ts` (2 emisiones nuevas), `src/lib/level/runtime/state.ts` (detección de transición de misión), `src/lib/gameworld/schema.ts` + `defaults.ts` + `worldRuleFields.ts`, `src/app/jugar/[childId]/mapa/page.tsx` (`allowReplay`). Crear: nada.

**Criterio de aceptación.** Unitario por regla, con un `WorldRules` sintético. **Y un test de regresión de `mastery`:** 3 reintentos sobre el mismo problema producen exactamente **un** documento en `attempts` y **una** entrada en `recentResults`.

---

## 4. FASE 30 — La historia se ve

**Problema.** El Editor de Mundo tiene `WorldStory.intro`/`outro` y `WorldChapter.intro`/`outro` (`gameworld/schema.ts:57-71`), un editor dedicado (`world-editor/StoryBeatEditor.tsx`, `WorldStoryTab.tsx`) y un tipo `StoryBeat` con hablante y retrato. **El jugador no ve ni un `StoryBeat` nunca.** Grep de `story.intro`, `story.outro`, `chapters`, `chapterId` fuera de `schema.ts`/editor: **cero resultados**. `mapa/page.tsx:117-118` lee sólo `story.title` y `story.logline`.

Adyacente: `public/illustrations/khaos.webp` — el antagonista de todo el guion — **no está referenciado desde ningún archivo de `src/`**. Tampoco `icon-nexus.webp` ni `ada-portrait.webp`. Y los 5 guardianes de zona comparten una sola imagen (`world/guardians.ts:27,33,39,45,51` → todos `null-guardian.webp`) mientras existen seis `null-*.webp` distintos.

**Decisión.** Los story beats se renderizan con **el componente de diálogo que ya existe** (`level/runtime/LevelDialogOverlay.tsx`), no con uno nuevo: `StoryBeat` y `LevelDialogLine` sólo difieren en que `speaker` es texto libre (comentario explícito en `gameworld/schema.ts:40-41`). Un adaptador de 10 líneas.

**Alcance.**

1. `world.story.intro` se muestra la primera vez que el hijo entra al hub. `outro`, al completarse **todos** los nodos del mapa.
2. `chapter.intro` al entrar por primera vez a un nodo cuyo `chapterId` no se había visto. `chapterId` hoy se escribe siempre `null` (`panel/editor/page.tsx:311`): la Fase 30 hace que valga la pena asignarlo.
3. **Qué se persiste** (P2, aditivo): `ChildProfile.seenStoryIds?: string[]`. Un array corto de ids de beat ya vistos. Nada más. `replayStoryBeats: true` lo ignora.
4. `ZONE_GUARDIAN` gana su arte propio: repartir `null-drenador/convertidor/corruptor/fragmentador/controlador` entre los 5 hilos, y reservar `null-guardian.webp` para el guardián del mundo.
5. Khaos entra por la única puerta que no inventa contenido: `WorldStory.antagonistName` ya existe (`schema.ts:54`) y `createEmptyWorld` lo siembra como `"Khaos"` (`defaults.ts:31`). El `outro` del mundo es su aparición, y `khaos.webp` es su retrato por defecto en el `StoryBeatEditor`.

**Archivos.** Crear: `src/components/world/StoryBeatOverlay.tsx` (adaptador `StoryBeat[]` → `LevelDialogOverlay`), `src/lib/gameworld/storyProgress.ts` (puro: qué beats corresponden ahora, dado `seenStoryIds` + estado del grafo). Modificar: `src/app/jugar/[childId]/mapa/page.tsx`, `src/lib/types.ts` (`seenStoryIds?`), `src/lib/world/guardians.ts`, `src/components/world-editor/StoryBeatEditor.tsx` (retratos por defecto).

**Criterio de aceptación.** Unitario sobre `storyProgress`: con `seenStoryIds` vacío devuelve el intro; tras marcarlo, no lo devuelve; con `replayStoryBeats: true` lo devuelve siempre; un `chapterId` inexistente no rompe nada (devuelve lista vacía, nunca lanza).

---

## 5. FASE 31 — Celebración escalonada y game feel

**Problema.** `triggerConfetti()` (`lib/confetti.ts:30`) no tiene parámetros: **60 partículas iguales para todo**. Y se dispara en cada respuesta correcta: `PuzzleOverlay.tsx:126`, `PracticeRoundGeneric.tsx:67`, `MultiModuleChallenge.tsx:125`, `[strand]/[moduleId]/page.tsx:135`. Acertar una suma fácil y dominar un hilo entero producen exactamente el mismo confeti. Cuando todo se celebra igual, nada se celebra.

El sonido son 4 osciladores sintetizados (`gameSound.ts:14`), sin variación por contexto. La escena tiene `anim-idle` y `anim-walk`, pero `scene-25d-plan.md:386` ya había diseñado `anim-interact` ("bounce corto al iniciar una interacción, bajo costo, cero asset nuevo") y **nunca se implementó**.

Y completar una misión no produce nada: `activeMission` devuelve `null` y la barra del HUD simplemente desaparece (`LevelHud.tsx:56`). El `RewardOverlay` que celebraba eso existe, completo, en `QuestOverlays.tsx:285-344` — orfanado con el resto de la ruta legacy.

**Decisión.** `triggerConfetti(intensity: "small" | "medium" | "big" = "small")`. Firma con default, así **ninguna de las 5 llamadas existentes cambia de comportamiento** salvo donde se decida explícitamente subirla. Presupuesto: `small` 20 partículas (respuesta correcta), `medium` 60 (ronda/cohete ganado), `big` 140 + fanfarria (dominar un módulo, cerrar una misión, vencer un boss).

**Alcance.**

1. `confetti.ts` parametrizado. `prefersReducedMotion` sigue cortando todo antes (`:32`), sin cambios.
2. `RewardOverlay` se rescata a `src/components/world/` y lo monta `LevelRuntime` al recibir `ON_MISSION_COMPLETE` (que la Fase 29 hace existir). Requiere desacoplarlo de `Quest` (`QuestOverlays.tsx:291`) hacia `MissionProgress`.
3. `anim-interact` en `globals.css`, disparada por `LevelRuntime.onEntityClick` tras `approach()` (`LevelRuntime.tsx:151`), antes de abrir el overlay.
4. `gameSound.ts` gana `"mastery"` y `"fail"` — dos osciladores más, cero assets, cero dependencias.

**Archivos.** Modificar: `src/lib/confetti.ts`, `src/lib/gameSound.ts`, `src/app/globals.css`, `src/components/level/runtime/LevelRuntime.tsx`, y los 5 sitios de llamada que suben de intensidad. Mover: `QuestOverlays.RewardOverlay` → `src/components/world/MissionRewardOverlay.tsx`.

**Criterio de aceptación.** El test existente de `prefers-reduced-motion` (cero confeti) sigue verde para las tres intensidades. Test de componente: con una misión de 1 objetivo, resolverlo monta el overlay de recompensa.

---

## 6. FASE 32 — Economía con destino

**Problema.** El AXIA no tiene **ningún sumidero** en el juego real. `awardStars` con delta negativo se llama desde un único sitio, y es el panel del padre (`panel/recompensas/page.tsx:37`). La tienda, que es el sumidero diseñado, vive sólo en la ruta legacy. Un niño acumula AXIA para siempre sin que el número signifique nada.

Los cosméticos tampoco existen de fábrica: `createEmptyWorld` siembra `avatars: { avatars: [], defaultAvatarId: "" }` (`gameworld/defaults.ts:41`), y el selector de avatar vive en **el panel del padre** (`panel/ajustes/page.tsx:120`) — el niño no elige su propio personaje. `AvatarPickerDialog.tsx:104` lo dice literalmente: *"Todavía no hay avatares en el catálogo del Mundo. Creá alguno desde el Editor de Mundo."*

Además, en el camino principal la penalización por repetir no se aplica: `attemptRecorder.ts:60` pasa `repeatsToday: 0` fijo. `diminishingFactor` (`economy.ts:15-17`) existe, está probada, y sólo la usan la pirámide y la pantalla de tema con estado de sesión. Machacar el mismo módulo fácil rinde estrellas plenas para siempre.

**Decisión.** **No se crea una moneda nueva.** El comentario de `WorldHud.tsx:19-24` es política vigente: AXIA es el nombre narrativo de `starLedger`, no un dato paralelo. Lo que se crea es **dónde gastarla**.

**Alcance.**

1. `ShopPanel` montado en el hub de la Fase 28. Sin cambios internos: el canje sigue siendo `redemptionRequests` aprobado por el padre.
2. **Catálogo de avatares de fábrica.** `DEFAULT_AVATAR_CATALOG` en `gameworld/defaults.ts`, con el arte que ya está en el repo (`explorer.webp`, `avatar.webp`, `nia-standing.webp`) y `unlock: { kind: "afterStars", stars: N }`. Se fusiona en lectura (`useResolvedAvatar.ts:98` deja de devolver `null` cuando el padre no autoró nada) — **no se escribe en el documento de mundo del padre**, que quedaría con contenido que él no puso.
3. **El niño elige su avatar desde el hub**, no el padre desde Ajustes. `AvatarPickerDialog` ya recibe `parentId`/`child` y ya resuelve `avatarUnlocked` contra el progreso real: se reusa tal cual. `panel/ajustes` lo conserva.
4. `attemptRecorder` recibe `repeatsToday` del llamador en vez de `0`. **La trampa:** el comentario de `economy.ts:10-14` dice que el diseño real es por día calendario vía Firestore y que hoy se aproxima con estado de sesión. Mantener la aproximación (contador en el componente), **no** construir la agregación diaria en esta fase — es la puerta a un `dailyCounters` que P2 no quiere.

**Archivos.** Modificar: `src/lib/gameworld/defaults.ts`, `src/lib/useResolvedAvatar.ts`, `src/lib/attemptRecorder.ts` (1 parámetro), `src/app/jugar/[childId]/mapa/page.tsx`. Reutilizar sin tocar: `ShopPanel.tsx`, `AvatarPickerDialog.tsx`, `gameworld/progress.ts:74` (`avatarUnlocked`).

**Criterio de aceptación.** Unitario: con un mundo sin avatares autorados, `useResolvedAvatar` devuelve un avatar de fábrica y no `null`. Con un avatar autorado del mismo id que uno de fábrica, **gana el del padre**. Integración: un canje resta del `starBalance` y el saldo del hub baja en la misma recarga.

---

## 7. FASE 33 — `activityId`: variedad real dentro del nivel

**Problema.** `ChallengePlacement.activityId` (`level/schema.ts:299-300`) dice textualmente: *"Por ahora siempre 'puzzle' (única actividad hoy); reservado para más adelante."* Ese "más adelante" es ahora. Hoy, **todo desafío de todo nivel autorado es la misma ficha de una sola pregunta** (`LevelChallengeOverlay.tsx:69` → `PuzzleOverlay`), con el mismo texto de recompensa hardcodeado `reward: "¡Resuelto!"` (`:78`).

Mientras tanto el repo tiene **cuatro minijuegos completos** que sólo son alcanzables desde las pestañas de la pantalla de tema (`[strand]/[moduleId]/page.tsx:29-34`): `PracticeRoundGeneric` (ronda de 10), `CoheteGeneric` (contrarreloj), `EjemplosTab`, y `PyramidGame`, este último enterrado tras un botón que sólo aparece en el hilo de Lógica (`[strand]/page.tsx:171`).

**Decisión.** Un registro `ACTIVITIES` en `src/lib/level/activities/registry.ts`, mismo patrón que `entities/registry.ts` (descriptor con `id`, `label`, `hint`, componente). El editor gana un selector en `ChallengePicker`; el runtime despacha en `LevelChallengeOverlay`.

| `activityId` | Componente | Nota |
|---|---|---|
| `"puzzle"` | `PuzzleOverlay` | **default**; sin cambio de comportamiento para todo nivel existente |
| `"ronda"` | `PracticeRoundGeneric` | 10 preguntas del mismo módulo |
| `"cohete"` | `CoheteGeneric` | contrarreloj, `GOAL=8` / `START_TIME=30` (`CoheteGeneric.tsx:10-11`) |

**`"piramide"` queda explícitamente fuera de v1.** `generatePyramid(op)` (`lib/pyramid.ts:17`) no recibe un módulo: fabrica sus propios números con dificultad fija por operación (`pyramid.ts:54-58`), y `piramide/page.tsx:57` guarda sus intentos con `skillId: "piramide"` — un id que **no corresponde a ningún módulo** y por tanto no alimenta mastery ni prerrequisitos. Meterla como actividad de un `ChallengePlacement` exigiría rehacerla sobre `mod.generateProblem()`, que es una fase propia, no un apéndice.

**El riesgo real, y hay que nombrarlo:** `activityId` ya es un `string` obligatorio en el esquema, así que **no hay migración** (P2 se cumple solo). Pero `CoheteGeneric` y `PracticeRoundGeneric` hoy reportan con `onAnswer(correct, hintsUsed)` y **el llamador** decide qué escribir; `PuzzleOverlay` escribe por su cuenta vía `recordModuleAttempt` y admite los overrides de Play Test (`recordAttempt`, `awardBadges`, `PuzzleOverlay.tsx:63-74`). Unificar esos dos contratos **sin romper el Play Test ni el sandbox** (`level/runtime/services.ts:96`) es el trabajo difícil de esta fase. Hacerlo primero, como refactor puro con los tests existentes en verde, y recién después agregar las actividades.

**Archivos.** Crear: `src/lib/level/activities/registry.ts`, `src/components/level/runtime/LevelActivityOverlay.tsx` (el despachador). Modificar: `src/components/level/runtime/LevelChallengeOverlay.tsx`, `src/components/level/editor/ChallengePicker.tsx`, `src/lib/level/validate.ts` (`activityId` desconocido = error clicable), `src/components/topic/{CoheteGeneric,PracticeRoundGeneric}.tsx` (aceptar los overrides de sandbox).

**Criterio de aceptación.** Unitario: todo `LevelDefinition` existente con `activityId: "puzzle"` renderiza byte a byte lo de hoy. Play Test con actividad `"cohete"` **no escribe nada** en Firestore (el test que protege la Fase 11). `validateLevel` reporta `activityId` inexistente.

---

## 8. FASE 34 — Un boss que se pueda perder

**Problema.** `/boss` y `/{strand}/evento` son **el mismo componente con otro objeto `theme`**: `boss/page.tsx:111-122` y `evento/page.tsx:154-169`, ambos `MultiModuleChallenge`. Y ese componente no tiene vidas, ni tiempo, ni estado de derrota: fallar simplemente muestra la respuesta y avanza (`MultiModuleChallenge.tsx:156-157`), y al terminar pinta `theme.closingMessage` — "¡Boss derrotado!" — **sin mirar cuántas acertaste** (`:90-105`). Es imposible perder. El "Código secreto" es peor: los dígitos revelados son `Math.floor(Math.random() * 10)` (`evento/page.tsx:166`), un código que no codifica nada.

El guardián de zona existe con nombre, texto de corrupción y texto de derrota (`world/guardians.ts:22-53`), y se muestra como **una franja de texto de 11px** encima de la escena (`ZoneScene.tsx:101-126`). No se enfrenta.

**Decisión.** `MultiModuleChallenge` gana tres props opcionales — `lives?: number`, `onDefeat?: () => void`, `revealFrom?: (correct, problem) => string` — **todas con default que preserva el comportamiento actual**, porque el evento y el boss no son los únicos consumidores previstos.

**Alcance.**

1. **Boss:** `lives = 3`. Perder una vida por fallo; a cero, pantalla de derrota con "volver a intentar". `pickBossModules` (`boss/page.tsx:19-23`) toma un módulo recomendado por hilo = como mucho 5 preguntas; con 3 vidas eso ya es una tensión real.
2. El boss **es** el guardián: `ZONE_GUARDIAN` da nombre, arte y las dos líneas de texto. El boss de zona (desde `/{strand}`) usa el guardián de ese hilo; el boss general usa `world.story.antagonistName` + `khaos.webp`.
3. **Recompensa de victoria:** hoy el boss no otorga nada extra. El Cohete sí (`BOSS_BONUS = 15` + insignia "rapido", `[strand]/[moduleId]/page.tsx:155-160`). Replicar ese patrón exacto — `awardStars(..., "boss_level")`, razón que **ya existe** en `StarReason` (`types.ts:102`) y hoy no la escribe el boss.
4. **Código secreto derivado, no aleatorio:** el dígito revelado sale de `problem.answer % 10`. Cuesta una línea y convierte un adorno en una mecánica.

**Archivos.** Modificar: `src/components/topic/MultiModuleChallenge.tsx` (el único con lógica nueva), `src/app/jugar/[childId]/boss/page.tsx`, `src/app/jugar/[childId]/[strand]/evento/page.tsx`, `src/lib/world/guardians.ts`.

**Criterio de aceptación.** Unitario: 3 fallos con `lives = 3` disparan `onDefeat` y **no** pintan `closingMessage`. Sin `lives`, el comportamiento es idéntico al actual (test de regresión del evento).

---

## 9. FASE 35 — Motivos para volver mañana

**Problema.** Tres huecos de rejugabilidad, todos verificables:

1. **Ninguna marca se guarda.** `PracticeRoundGeneric.tsx:117` dice *"Obtuviste {score} puntos en esta ronda"* y ese `score` es estado local que muere al desmontar. `CoheteGeneric` no tiene récord. `PyramidGame` tampoco. No hay nada que superar.
2. **Las misiones se acaban.** `QUESTS` son **3 misiones, 9 objetivos**, todos apuntando a módulos `d1`-`d3` (`world/quests.ts:33-73`), contra **53 módulos** en la currícula. Un niño completa el diario entero en sus primeros 9 aciertos y después `activeQuest` devuelve `null` para siempre (`:116-122`) — con el efecto secundario de que el pulso que marca los objetos de misión en la escena (`ZoneScene.tsx:143`) se apaga y no vuelve.
3. **Nada distingue volver al día siguiente** de jugar dos horas seguidas. `recentResults` guarda `day` (`types.ts:42`) pero sólo se usa para la ventana móvil de mastery.

**Decisión y alcance.**

1. **Marcas personales.** `records/{activityId}:{moduleId}` por hijo, documento de `{ best: number, at: number }`. Escritura de un solo campo, sin agregación. El componente muestra "Tu marca: N" y "¡Nueva marca!". Aditivo, sin migración; la ausencia del documento es "sin marca todavía", nunca cero.
2. **Misiones derivadas de la currícula.** `QUESTS` deja de ser una lista literal y pasa a ser **una función** sobre `modulesForStrand` + `missingPrerequisites`: la misión activa siempre agrupa 3 objetivos alrededor del frente de avance real del niño. Las 3 premisas escritas se conservan como capa narrativa rotativa (`quests.ts:38,51,64`) — se pierde especificidad narrativa y se gana que el diario nunca se vacíe. **Es un intercambio, dilo en el doc.**
3. **Racha de días, que sólo suma.** `ChildProfile.streakDays?` + `lastPlayedDay?` (P2, opcionales). Jugar un día nuevo consecutivo la sube; **un día perdido la reinicia a 1, nunca a 0, y nunca quita nada ya ganado** (P1 aplicado a economía: ningún mecanismo de este proyecto castiga). Se muestra en el hub junto al AXIA.
4. **El repaso vencido entra al diario.** `nextReview()` (Fase 27) aparece como un objetivo más del diario, no sólo como el chip del hub.

**Archivos.** Crear: `src/lib/records.ts` (puro + repositorio con firma P3), `src/lib/streak.ts` (puro, reloj inyectado). Modificar: `src/lib/world/quests.ts` (de dato a función), `src/lib/types.ts`, `src/components/topic/{CoheteGeneric,PracticeRoundGeneric}.tsx`, `src/components/pyramid/PyramidGame.tsx`, `src/app/jugar/[childId]/misiones/page.tsx`, `src/app/jugar/[childId]/mapa/page.tsx`.

**Criterio de aceptación.** Unitario con reloj inyectado: dos sesiones el mismo día no suben la racha; días consecutivos sí; un hueco reinicia a 1 y **`starBalance` no cambia** (el test que protege "nunca se castiga"). `questProgress` sobre un progreso con 40 módulos dominados devuelve una misión incompleta, nunca `null`.

---

## 10. Prioridad, riesgo y orden

**Mayor sensación de mejora por menor esfuerzo: Fase 28.** Es cableado puro. Cero lógica nueva, cero esquema, cero Firestore. Devuelve de golpe seis superficies ya construidas y probadas —boss, diario, tienda, zonas, insignias y el repaso espaciado de la Fase 27— que hoy el niño no puede alcanzar. Es también la que desbloquea a las demás: 32 necesita un sitio donde montar la tienda, 35 necesita dónde mostrar la racha.

**La más riesgosa: Fase 33 (`activityId`).** Toca esquema, editor, runtime, validación y **el Play Test a la vez**. El riesgo concreto no es el despacho de actividades, es unificar el contrato de reporte de intentos entre `PuzzleOverlay` (escribe por sí mismo, con overrides de sandbox) y `CoheteGeneric`/`PracticeRoundGeneric` (delegan en el llamador) sin que una sesión de Play Test empiece a escribir progreso real. Va tarde, y con el refactor de contrato como PR separada antes de agregar ninguna actividad.

**Segunda más riesgosa: Fase 29**, por el reintento. Si un reintento escribe un `Attempt` por intento fallido, `recentAccuracy` se degrada y `masteredAt` deja de alcanzarse: se rompe la progresión académica desde una mejora de jugabilidad. El test de regresión de §3 es obligatorio, no opcional.

**Orden recomendado.**

**28 → 29 → 30 → 31 → 32 → 34 → 33 → 35.**

- **28** primera, por lo de arriba: sin hub, cinco de las siete fases restantes no tienen dónde aterrizar.
- **29** segunda porque emite `ON_MISSION_COMPLETE`, del que depende la celebración de la 31, y porque el reintento es el arreglo de game feel más grande del plan por sí solo.
- **30 y 31** son baratas, de bajo riesgo y muy visibles: conviene meterlas temprano para que el salto se note antes de entrar en las caras.
- **32** antes de **34** porque el bono de estrellas del boss no significa nada hasta que exista dónde gastarlas.
- **33** penúltima, con todo lo demás estable.
- **35** última: es la única con carga de diseño (el intercambio de las misiones derivadas) y conviene decidirla viendo ya jugado el resto.

## 11. Lo que este plan deliberadamente NO hace

- **No toca los 6 generadores ni `curriculum.ts`** más allá de leer `nextReview`/`nextChallenge`. La currícula PISA se acaba de trabajar (fases A/B/C del git log) y no es objeto de acá.
- **No reescribe `PyramidGame` sobre módulos reales** (§7). Es una fase propia.
- **No rescata `QuestScene`/`src/lib/world/**`** como runtime. La coexistencia decidida en la Fase 18 se mantiene: se rescatan *componentes* sueltos (`RewardOverlay`, el bloque de zonas de `QuestOverlays`), nunca la escena.
- **No construye la agregación diaria de `diminishingFactor`** (`economy.ts:10-14`). Sigue siendo aproximación de sesión.
- **No mete assets ni dependencias nuevas.** Todo el arte que estas fases necesitan —Khaos, los 6 Null, los 8 fondos de región, los retratos— ya está en `public/illustrations/` sin usar.
- **Bug adyacente detectado, fuera de alcance pero anotado:** `[strand]/[moduleId]/page.tsx:117-122` escribe el `Attempt` **sin `hintsUsed`**, a diferencia de `attemptRecorder.ts:51`. El panel "Cómo les va" de la Fase 26 va a mostrar "sin dato" para el camino de práctica principal, que es justo el de más volumen. Arreglo de 1 línea; corresponde a la Fase 26, no a este plan.

---

## Resumen ejecutivo

1. **El juego tiene más contenido del que el niño puede alcanzar.** La Fase 18 movió el juego real a `LevelRuntime` y dejó Ciudad Central en una ruta de regresión sin enlaces — arrastrando consigo el único hub que había. Hoy el Boss Challenge, el diario de misiones, la tienda, las cinco zonas, las insignias ganadas y **el chip de repaso espaciado de la Fase 27 recién cerrada** son inalcanzables jugando normal: sus únicos enlaces viven en `QuestOverlays.tsx`, dentro de `ciudad-central-legacy`. **Fase 28 lo reconecta sin escribir ni una línea de lógica nueva** — es, de lejos, la mayor mejora por el menor esfuerzo del plan.
2. **Fallar una vez te canta la respuesta.** `PuzzleOverlay` registra el intento y revela el resultado al primer error, en todo el mundo. La regla `maxAttemptsPerChallenge` que arreglaría esto **ya existe, el padre ya la configura, y nadie la lee** — junto con 7 de las 10 `WorldRules` y dos disparadores de evento que el editor ofrece y el runtime nunca emite. Fase 29 los hace reales.
3. **Nada tiene consecuencia.** El boss es literalmente el mismo componente que el evento con otro texto y **no se puede perder**; la historia autorada (intro, capítulos, outro, Khaos) nunca se muestra; las marcas de cada minijuego se descartan al desmontar; el AXIA no tiene dónde gastarse y `activityId` está reservado en el esquema para variar los minijuegos dentro de los niveles y sigue valiendo `"puzzle"` en el 100% de los casos. Las fases 30-35 cierran esos bucles reutilizando componentes y arte que ya están en el repo.
