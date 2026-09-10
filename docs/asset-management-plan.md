# Plan técnico — Gestión de assets de imagen para el Level Editor

> **Nota de autoría y alcance.** Este documento es una **especificación de planificación**, no una entrega de código. Fue redactado por Opus 5 tras inspeccionar el repositorio real (código fuente y `node_modules`, no solo la documentación) tal como está en la rama `claude/level-editor-fase-10-integracion-academica`, commit `414a60b` ("Ciudad Central v2: activa profundidad 2.5D (sin capas de parallax)"). Cita archivo:línea siempre que fue posible verificarlo; donde algo no pudo verificarse en este entorno se dice explícitamente y se convierte en un riesgo o en una decisión pendiente, nunca en una suposición silenciosa. Es la base para que un modelo de ejecución construya esta fase paso a paso, en el orden de la §G.
>
> Continúa y depende de `docs/level-editor-plan.md` (Fases 1-14, ya implementadas) y de `docs/scene-25d-plan.md` (escena 2.5D, implementada salvo su Paso 0/9). Hereda **todas** sus restricciones duras sin relajar ninguna.

---

## Resumen ejecutivo y decisión central

**Hallazgo que condiciona el plan:** el Level Editor puede crear niveles completos sin tocar código —ese fue el criterio rector de sus 14 fases— **excepto en una cosa: la imagen**. `BACKGROUND_CATALOG` (`src/lib/level/backgroundCatalog.ts:14-23`) es un array TypeScript de 8 entradas fijas, y `getFirebase()` (`src/lib/firebase.ts:44-72`) no inicializa `firebase/storage` en absoluto. Añadir un fondo hoy significa editar un archivo `.ts` y desplegar el Worker — exactamente el tipo de dependencia de código que el plan del editor se propuso eliminar (criterio "Crear niveles completos sin tocar código", `docs/level-editor-plan.md` §20.3).

Y hay un segundo hallazgo, **no reportado en el encargo y verificado en esta sesión**: hoy tampoco existe forma de cambiar el fondo de un nivel **ya creado**. `BACKGROUND_CATALOG` solo se consume en el formulario de creación (`src/app/panel/editor/page.tsx:185,195,234`); dentro del editor de un nivel, el botón "Escena" (`EditorTopBar.tsx:62-77`) selecciona `{ kind: "level" }` y monta únicamente `DepthPanel` (`LevelEditorScreen.tsx:183-186`), que edita profundidad y capas de parallax pero **no** `background.src`/`alt`. La acción de reducer `SET_BACKGROUND` existe desde la Fase 4 y solo se usa para escribir `layers` (`DepthPanel.tsx:32`). El requisito 1 del encargo ("usarla como fondo de un nivel nuevo **o existente**") por tanto no es solo "añadir subida": es también cerrar un hueco preexistente del editor.

**Decisión tecnológica central: Firebase Storage, con el mismo patrón de carga perezosa que Firestore/Auth, sin ningún alias nuevo en `next.config.ts` y sin ninguna ruta API.** Se verificó directamente sobre `node_modules/@firebase/storage@0.14.5` que este paquete **no comparte el problema que motivó el patrón perezoso** (§B.2): cero ocurrencias de `new Function`/`eval(` en todos sus builds, y sus únicas dependencias son `@firebase/app`, `@firebase/component` y `@firebase/util` — nada de `protobufjs`, `@grpc/grpc-js` ni `node-fetch`. Aun así **se mantiene la carga perezosa**, por dos razones independientes del runtime: (1) es la regla dura del proyecto verificada por ESLint y por el criterio A5, y no se relaja por conveniencia; (2) es un módulo que solo necesita `/panel/editor`, y cargarlo con el resto de Firebase penalizaría el arranque de `/login`, `/jugar` y `/perfiles`, que nunca lo usan.

**Decisión de alcance central: esta fase no cambia el esquema del nivel.** `LevelBackground.src` y `LevelBackgroundLayer.src` ya son `string` y ya se consumen como `<img src>` en editor y runtime; una URL de descarga de Firebase Storage encaja ahí sin migración, sin bump de `LEVEL_SCHEMA_VERSION` (que sigue en `1`, ver `schema.ts:11`) y sin tocar `migrate.ts`. Todo el trabajo es **aditivo**: una colección de metadata nueva, un archivo de reglas nuevo, una librería de assets nueva y tres puntos de UI. Ninguna línea de `LevelRuntime`, `RuntimeCanvas`, `BackgroundLayers` ni del motor de navegación cambia.

---

## A. Diagnóstico actual

### A.1 Stack y restricciones heredadas (confirmadas, no reinventadas)

- **Next.js 16.3.3**, App Router, **React 19.2.8**, **Tailwind 4**, **Firebase 12.18**. Deploy a **Cloudflare Workers** vía `@opennextjs/cloudflare` 1.20.4 (`package.json:20-42`).
- **`firebase/*` solo con `import()` dinámico, y solo dentro de `src/lib/firebase.ts`** — `docs/level-editor-plan.md` §1.4, criterio A5, riesgo K1. El motivo documentado es `protobufjs` dentro de `firebase/firestore` (`firebase.ts:22-32`), reforzado con alias de resolución al build "browser" en `next.config.ts:13-16`. **Esta fase no toca esos alias** (ver §B.2, por qué no hacen falta para Storage).
- **Cero dependencias nuevas** (criterio A3). Las 14 fases del editor y la fase 2.5D se construyeron sin añadir ninguna; esta fase también (§B.5 justifica por qué el redimensionado en cliente no necesita ninguna).
- **Cero rutas API nuevas** (criterio A4). La única ruta existente (`src/app/api/dev/walkable-area/route.ts`) es exclusivamente de desarrollo y el propio plan del editor la declara "no es un patrón a replicar". Esto es determinante para descartar R2 (§B.3).
- **Firestore: prohibidos `undefined` y arrays anidados.** `src/lib/level/serialize.ts` ya tiene `stripUndefined`, `assertNoNestedArrays`, `assertSize` y `prepareForFirestore` — reutilizables tal cual para la metadata de assets.
- **Modelo de propiedad**: todo cuelga de `/parents/{parentId}`, con `isParent(parentId)` = `request.auth.uid == parentId` (`firestore.rules:17-19`), repetida en cada bloque, y un catch-all final `allow read, write: if false` (`:76-78`) que bloquea por defecto cualquier colección nueva.
- **Aislamiento editor↔runtime** verificado por ESLint (`eslint.config.mjs:29-43`): `src/components/level/runtime/**` no puede importar de `src/components/level/editor/**`. Toda la UI de assets vive en `editor/`.
- **Accesibilidad como requisito real**: criterio A11 (cero violaciones `serious`/`critical` de axe en `/panel/editor` y `/panel/editor/[levelId]`, ningún estado comunicado solo por color) y A12 (`prefers-reduced-motion`).
- **Sin CSP, sin middleware**: verificado (`find src -name middleware.ts` vacío, cero `Content-Security-Policy` en el repo). Consecuencia práctica: cargar imágenes desde `https://firebasestorage.googleapis.com` no requiere ningún cambio de cabeceras hoy — pero si mañana se añade una CSP, `img-src` tendrá que incluir ese origen (queda anotado en §G Paso 11).
- **Sin `next/image`**: todo el proyecto usa `<img>` crudo (`page.tsx:249`, `ZoneScene.tsx:60`, `Avatar.tsx:21`…). Consecuencia: **no hace falta configurar `images.remotePatterns`** ni pasar por el binding `images` de `wrangler.jsonc:22-25` para mostrar una imagen remota. Un `src` absoluto funciona sin ninguna configuración.

### A.2 El catálogo de fondos hoy

`BACKGROUND_CATALOG` (`backgroundCatalog.ts:14-23`) — 8 entradas `{ src, label, alt }`, todas rutas fijas bajo `/public/illustrations/`. El propio comentario del archivo (`:1-7`) documenta la intención original: *"las 8 regiones de AXIA que ya tienen arte"*, y una regla de diseño que conviene mantener: *"las dimensiones nativas se miden al elegir el fondo (`loadImageSize`), nunca se hardcodean acá"*.

Resolución real de los 8 archivos (medición aportada por la sesión anterior, coherente con los pesos que sí se pueden verificar hoy en `public/illustrations/`):

| Archivo | Resolución | Peso en disco (verificado) | Apto como fondo a pantalla completa |
|---|---|---|---|
| `city-central.webp` | 1600×907 | 83.8 KB | **Sí** — es la referencia de "resolución adecuada" |
| `laboratorio-futuro.webp` | 900×502 | 59.2 KB | Aceptable con reservas (borroso en desktop 1080p+) |
| `desierto-geometrico.webp` | 340×190 | 7.6 KB | No |
| `cumbres-numericas.webp` | 340×190 | 9.2 KB | No |
| `islas-pensamiento.webp` | 300×167 | 6.3 KB | No |
| `bosque-patrones.webp` | 340×190 | 9.9 KB | No |
| `valle-desafios.webp` | 340×190 | 10.8 KB | No |
| `academia-infinita.webp` | 300×167 | 8.8 KB | No |

`public/illustrations/` contiene 30 archivos y **ningún** archivo que sugiera una versión de mayor resolución de esas 6 (ni `-2x`, ni `-full`, ni `-hd`, ni subcarpetas). Es el mismo hallazgo que ya registró `docs/scene-25d-plan.md` §A.6 para las capas de parallax: *"No existe ningún asset que sugiera capas separadas"*. **No se asume que exista arte fuente en mayor resolución** — es una pregunta abierta del plan (§G Paso 10, riesgo R7).

**Hallazgo relevante y verificado**: las 6 miniaturas **no** llegan a `ZoneScene.tsx` a través de `BACKGROUND_CATALOG`. `ZoneScene` consume `scene.background`, que viene de `src/lib/world/scenes.ts` / `src/lib/narrative.ts:26-58`, listas **independientes** con sus propias rutas. Y las usa deliberadamente como faja decorativa `aspect-video` recortada (`ZoneScene.tsx:47-64`, con un comentario explícito de por qué no van estiradas). Consecuencia práctica: **cambiar qué muestra el selector del editor no afecta a `ZoneScene` en absoluto**, y no hay ninguna razón para borrar los archivos.

### A.3 Ausencia total de Storage (verificado punto por punto)

| Comprobación | Resultado |
|---|---|
| `getFirebase()` inicializa Storage | **No** — `Promise.all` de `firebase/app`, `firebase/auth`, `firebase/firestore` únicamente (`firebase.ts:45-50`); la interfaz `Firebase` (`:14-20`) no tiene campo `storage` |
| `firebase.json` tiene sección `storage` | **No** — solo `firestore` y `emulators: { auth, firestore }` (`firebase.json:1-11`) |
| Existe `storage.rules` | **No** — `ls` de la raíz confirma solo `firestore.rules` |
| Emulador de Storage configurado | **No** — `scripts/emuladores.mjs:41` lanza `--only auth,firestore`; `playwright.config.ts` levanta ese mismo comando |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` existe | **Sí** — ya está en `firebaseConfig` (`firebase.ts:9`) y en el entorno de pruebas (`playwright.config.ts`, `emulatorEnv`: `"demo-numerario.appspot.com"`). Es la única pieza de configuración que ya está lista |

### A.4 Las capas de parallax quedaron sin material real

`docs/scene-25d-plan.md` §E.1 introdujo `LevelBackground.layers?: LevelBackgroundLayer[]` (`schema.ts:96-104,118+`) y `DepthPanel.tsx` para editarlas. Pero el selector de imagen de cada capa (`DepthPanel.tsx:176-184`) es un `<select>` poblado con **el mismo `BACKGROUND_CATALOG` de 8 escenas completas**, y el valor por defecto de una capa nueva es `BACKGROUND_CATALOG[0].src` = Ciudad Central (`DepthPanel.tsx:39`). Superponer una segunda escena completa y opaca sobre otra no produce parallax: produce oclusión. El propio plan 2.5D ya lo anticipó (§F.3-F.4: *"el parallax de capas de fondo separadas sí necesita arte adicional… se necesitarían 1-2 `.webp` con fondo transparente"*) y lo dejó como Paso 9 opcional, no acometido.

Es decir: la fase 2.5D entregó el motor de parallax pero **no hay ningún camino en el producto para que entre el material que ese motor necesita**. Esta fase es, literalmente, ese camino.

### A.5 Lo que sí está listo para reutilizarse

- `prepareForFirestore` / `assertSize` (`serialize.ts:78-88`) — mismo tratamiento para cualquier documento nuevo.
- El patrón de repositorio de `levelRepository.ts`: funciones puras que **reciben** `firestoreFns`/`db` como parámetros y nunca llaman a `getFirebase()` por su cuenta (`levelRepository.ts:9-16`), justamente para no importar `firebase/*` de forma estática. Es el molde exacto de `assetRepository.ts`.
- `newXId()` de `ids.ts` (`crypto.randomUUID()` con prefijo legible) — se añade `newAssetId()` siguiendo el patrón, un renglón.
- El patrón de UI de selección ya existente en `page.tsx:234-252`: `<label>` con `<input type="radio" className="sr-only">` + estilos en el label. Ya es navegable por teclado y anunciable; el selector nuevo lo reutiliza en vez de inventar otro.
- El diálogo `role="alertdialog"` de conflicto de versión (`LevelEditorScreen.tsx:194+`) como patrón para la confirmación de borrado accesible.
- La caché persistente de Firestore (`persistentLocalCache`, `firebase.ts:101-115`) hace que listar la biblioteca de assets tras una recarga sea instantáneo sin ningún trabajo extra.

---

## B. Decisión tecnológica

### B.1 Qué hay que decidir, exactamente

Tres decisiones separadas que conviene no mezclar:

1. **Dónde vive el byte** (el archivo de imagen).
2. **Cómo llega el navegador a ese byte** (URL directa vs descarga autenticada).
3. **Dónde vive la metadata** (nombre, tipo, dimensiones) — se resuelve en §C.

### B.2 Verificación de compatibilidad de `firebase/storage` con Cloudflare Workers

El encargo pide explícitamente **no asumir** compatibilidad. Verificación directa sobre `node_modules/@firebase/storage@0.14.5`:

| Comprobación | Método | Resultado |
|---|---|---|
| ¿Usa `new Function`/`eval`? | `grep -l "new Function\|eval(" dist/*.js dist/*/*.js` | **Cero coincidencias en todos los builds** (`index.esm.js`, `index.cjs.js`, `index.node.cjs.js`, `node-esm/index.node.esm.js`) |
| ¿Arrastra `protobufjs`/`grpc`? | `dependencies` de su `package.json` | **No**: solo `@firebase/util`, `@firebase/component`, `tslib` (+ peer `@firebase/app`) |
| ¿Qué usa el build "node" (el que resolvería el SSR del Worker)? | Lectura de `node-esm/index.node.esm.js` | `class FetchConnection` (línea 2162) — **la Fetch API estándar**, disponible en Workers. Cero `XMLHttpRequest` |
| ¿Qué usa el build "browser"? | Lectura de `index.esm.js` | `class XhrConnection` con `new XMLHttpRequest()` **dentro del constructor** (línea 2164) — se evalúa al hacer una petición, no al importar el módulo |
| ¿Requiere alias en `next.config.ts` como Firestore/Auth? | Deducción de lo anterior | **No.** El build "node" es compatible con Workers por sí solo, y el "browser" no rompe al importarse |

**Conclusión verificada**: `firebase/storage` **no** tiene el problema que motivó `firebase.ts:22-32` ni los alias de `next.config.ts:13-16`. Aun así, la carga sigue siendo perezosa por regla de proyecto (A5) y por presupuesto de bundle. Y como el `import()` vive dentro de una función que solo se ejecuta en el navegador, el SSR del Worker **nunca evalúa el módulo**, lo que hace la cuestión doblemente inocua.

> ⚠️ Lo que **no** se pudo verificar en este entorno y hay que confirmar antes de empezar (§G Paso 0): que el proyecto real de Firebase tenga un bucket de Storage aprovisionado. Desde el 30 de octubre de 2024, Cloud Storage for Firebase exige plan **Blaze** (con facturación activada) para crear el bucket por defecto en proyectos nuevos; proyectos anteriores conservan el bucket gratuito del plan Spark. Este es el **único bloqueo externo real** de todo el plan, y su verificación es un go/no-go de dos minutos en la consola de Firebase.

### B.3 Comparación de opciones

| Opción | A favor | En contra en este proyecto | Veredicto |
|---|---|---|---|
| **A. Firebase Storage** (SDK cliente, `firebase/storage`) | Ya está en `package.json` (es parte de `firebase@12`) ⇒ **cero dependencias nuevas**. Usa el mismo `FirebaseApp` y el mismo token de `firebase/auth` que ya está en sesión ⇒ el modelo de propiedad `request.auth.uid == parentId` se traduce **literalmente** a Storage Rules. `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` ya existe en la configuración y en el entorno de pruebas. Tiene emulador oficial, integrable en el arnés existente en dos líneas. `uploadBytesResumable` da progreso real para la barra de subida. **Cero rutas API** (A4) y **cero credenciales de servidor**. Verificado compatible con Workers (§B.2). | Requiere plan Blaze si el proyecto es posterior a oct-2024 (riesgo R1). `getDownloadURL()` produce una URL con token que es públicamente legible por quien la tenga (matiz de seguridad tratado en §F.3). Un bucket más que administrar y del que borrar huérfanos a mano. | **Elegida.** Es la única opción que no exige ni una dependencia nueva, ni una ruta API, ni un segundo sistema de identidad, ni credenciales de servidor — y encaja en el modelo de propiedad existente sin traducirlo. |
| **B. Cloudflare R2** (binding del Worker) | Ya se despliega en Cloudflare; el binding R2 está a un renglón de `wrangler.jsonc`; sin coste de egreso; `next.config.ts:45-48` ya inicializa los bindings en `next dev`. | **Rompe A4**: un binding R2 solo es accesible desde código de servidor ⇒ obliga a crear al menos una ruta API (subir + borrar + firmar), y este proyecto es 100% `"use client"` sin Server Actions (README, sección Deploy). **Rompe el modelo de identidad**: el Worker tendría que verificar el ID token de Firebase por su cuenta para saber quién es el padre — es decir, reimplementar `isParent()` en TypeScript, con verificación de JWT y claves públicas de Google, sin ninguna librería (o añadiendo una, rompiendo A3). Crear el bucket exige `wrangler login`, que el propio repo documenta como no disponible en este entorno (`wrangler.jsonc`, nota final; README). Sin emulador local equivalente para las E2E (Miniflare simula R2, pero no está en el arnés de Playwright actual). | **Descartada** para esta fase. Es la opción correcta si algún día el proyecto adopta rutas de servidor; hoy pagaría tres restricciones duras (A3, A4, modelo de identidad) por una ventaja de coste que a esta escala (decenas de MB por familia) es irrelevante. |
| **C. Imagen embebida en el propio `LevelDefinition`** (data URL base64) | Cero infraestructura nueva, cero reglas nuevas, cero servicios nuevos. | Inviable por tamaño: un WebP de 1600×900 pesa ~80 KB, +33% en base64 = ~107 KB, contra un presupuesto blando de nivel de 150 KB (`validate.ts:273`) y un tope duro de 400 KB (`serialize.ts:78`), sobre un límite de Firestore de 1 MiB. Un nivel con fondo + 2 capas ya lo revienta. Además rompe el principio "nada se persiste que se pueda derivar/referenciar" y multiplica el coste de cada lectura del nivel. | **Descartada.** |
| **D. CMS/servicio externo** (Cloudinary, Uploadcare, imgix…) | Redimensionado, optimización y CDN resueltos de fábrica. | Excluido explícitamente por el encargo. Además: dependencia y cuenta nuevas, segundo modelo de identidad, y datos de una familia con menores en un tercero adicional sin necesidad. | **Descartada por alcance.** |
| **E. No subir nada: solo pegar una URL externa** en el campo `src` | Coste cero: `PropertyFields.tsx:59-70` ya tiene un `kind: "image"` que es un input de texto libre. | No resuelve el problema real (un padre no tiene dónde alojar su imagen), traslada la disponibilidad del nivel a un servidor de terceros que puede caerse o borrar el archivo, y abre `src` a URLs arbitrarias (riesgo de contenido y de *hotlinking*). | **Descartada como solución**, pero se conserva como escape hatch existente sin tocarlo. |

### B.4 Cómo llega el navegador al byte (decisión 2)

| Camino | Cómo | Trade-off | Veredicto |
|---|---|---|---|
| **`getDownloadURL()` → URL absoluta con token** | Se guarda esa URL en `background.src`. El `<img>` la carga como cualquier otra. | La URL es efectivamente pública para quien la tenga (las Storage Rules **no** se aplican a las URLs con token). Se revoca borrando el objeto o el token. | **Elegido.** Cero capa de resolución, cero cambios en `RuntimeCanvas`/`BackgroundLayers`/`EntityLayer`, funciona con `loadImageSize` sin tocarlo, y no requiere que el runtime tenga sesión activa para pintar el fondo. El matiz de privacidad se documenta explícitamente en §F.3 en vez de esconderse. |
| **`getBlob()`/`getBytes()` + `URL.createObjectURL`** | Cada lectura pasa por las reglas con el token de sesión. | Rompe `<img src>` directo: exige una capa de resolución `assetId → objectURL`, gestión de revocación de object URLs, y estado de carga asíncrono en el editor **y** en el runtime — es decir, tocar componentes de `runtime/` que hoy no cambian en absoluto. Y el beneficio es proteger dibujos de fondos de nivel. | **Descartado** por desproporcionado. Anotado como camino de mejora si algún día se subieran assets sensibles (fotos de los niños, p. ej.) — pero eso está fuera de alcance y probablemente debería prohibirse de entrada. |

### B.5 Redimensionado/compresión en cliente sin dependencias (decisión adicional)

El encargo pide justificar cualquier librería y evaluar la alternativa nativa. **No hace falta ninguna librería**: el navegador ya trae todo.

- `createImageBitmap(file, { resizeWidth, resizeQuality: "high" })` decodifica **y escala en el decodificador**, sin materializar el bitmap a resolución completa en memoria — clave para una tablet de gama baja con una foto de 12 MP. Soportado en todos los navegadores objetivo.
- `canvas.getContext("2d").drawImage(bitmap, …)` + `canvas.toBlob(type, quality)` produce el `Blob` a subir.
- La detección de canal alfa se hace con el mismo `canvas`: dibujar el bitmap escalado a 64×64 y recorrer `getImageData().data` en pasos de 4 buscando un byte de alfa < 250. Es una sola pasada de 4096 píxeles: microsegundos.

**Caveat de formato que hay que respetar**: `canvas.toBlob("image/webp")` no está garantizado en todos los navegadores (Safari lo incorporó tarde). Regla de implementación: intentar WebP, comprobar `blob.type`, y si no salió WebP caer a `image/png` **cuando la imagen tiene alfa** (nunca a JPEG, que la destruiría) o a `image/jpeg` cuando no la tiene. Si el resultado re-codificado pesa **más** que el original y no hubo cambio de dimensiones, se sube el original tal cual. Todo esto es lógica pura, unitariamente testeable, y es la razón de separar `imageRules.ts` (puro) de `imageProcessing.ts` (DOM) en §E.

---

## C. Modelo de datos

### C.1 Dónde vive el archivo (Storage)

```
parents/{parentId}/level-assets/{assetId}.{ext}          ← imagen final (post-procesado)
parents/{parentId}/level-assets/{assetId}-thumb.webp     ← miniatura 320px de ancho, para las cuadrículas del editor
```

- Un solo segmento de ruta bajo `level-assets/` ⇒ una sola regla `match` los cubre a ambos (§F).
- `{assetId}` = `asset_<uuid>` generado por `newAssetId()` en `ids.ts`, mismo patrón que el resto (`ids.ts:9-11`).
- La extensión refleja el `contentType` real tras el procesado (`webp`/`png`/`jpg`).
- **El objeto es inmutable**: renombrar/re-etiquetar toca solo la metadata; sustituir la imagen se hace subiendo un asset nuevo. Es el mismo criterio que ya rige `/levels/{id}/versions/{n}` (`firestore.rules:60-64`) y evita la clase entera de bugs de "la URL cacheada apunta a otro contenido".

### C.2 Dónde vive la metadata (Firestore)

```
/parents/{parentId}/levelAssets/{assetId}
```

Documento plano, sin arrays ni objetos anidados de más de un nivel:

| Campo | Tipo | Origen / notas |
|---|---|---|
| `id` | `string` | = `assetId`, igual que el id del documento (mismo criterio que `LevelDefinition.id`) |
| `label` | `string` | Nombre editable por el autor. Default: el nombre del archivo sin extensión, saneado y truncado a 60 caracteres |
| `alt` | `string` | Texto alternativo. **Obligatorio no vacío** si el asset se usa como fondo principal, porque `validateLevel` ya exige `background.alt` (`validate.ts:77-82`). Se pide al subir, con un default derivado de `label` y un aviso de que se puede mejorar |
| `kind` | `"scene" \| "layer"` | Elegido por el autor al subir. Ver §C.4 |
| `storagePath` | `string` | `parents/{parentId}/level-assets/{assetId}.webp` — necesario para borrar sin re-derivar la ruta |
| `url` | `string` | `getDownloadURL()` del objeto. **Es lo que acaba en `background.src`** |
| `thumbPath`, `thumbUrl` | `string` | Ídem para la miniatura |
| `width`, `height` | `number` | Dimensiones **del archivo subido** (post-redimensionado). Guardarlas evita que el editor tenga que ejecutar `loadImageSize` contra la red para cada opción de la cuadrícula |
| `originalWidth`, `originalHeight` | `number` | Dimensiones del archivo original — solo informativas, para que el autor entienda "se redimensionó de 4032×3024 a 2560×1920" |
| `bytes` | `number` | Tamaño final. Sirve para el contador de cuota y para el aviso de peso |
| `contentType` | `string` | `image/webp` \| `image/png` \| `image/jpeg` |
| `hasAlpha` | `boolean` | Detectado en cliente (§B.5). Alimenta el aviso de §C.4 |
| `createdAt`, `updatedAt` | `number` | `Date.now()`, mismo criterio que `LevelMetadata` (`schema.ts:69-76`) |

Todo escalar ⇒ **cero riesgo de array anidado**; `prepareForFirestore` se aplica igualmente como cinturón de seguridad, exactamente como hace `levelRepository` antes de cada escritura.

### C.3 Por qué metadata en Firestore y no solo `customMetadata` de Storage

Storage permite adjuntar `customMetadata` al objeto y listar con `listAll()`. Se descarta porque:

1. `listAll()` no ordena ni filtra, y obtener `label`/`kind`/`width` de N objetos exige N `getMetadata()` — N+1 round-trips para pintar una cuadrícula.
2. Renombrar exigiría `updateMetadata` sobre el objeto, rompiendo la inmutabilidad de §C.1.
3. El proyecto ya tiene un patrón único y probado de listado (`listLevels`, `levelRepository.ts:71-79`) y una caché persistente de Firestore que hace la segunda carga instantánea. Storage no aporta nada equivalente.
4. Una consulta Firestore es la forma natural de contar la cuota por padre y de responder "¿qué niveles usan este asset?" sin recorrer el bucket.

### C.4 Decisión explícita sobre "fondo completo" vs "capa transparente" (requisito 5 del encargo)

**Decisión: sí se distinguen, con un campo `kind` de una sola letra de complejidad, y la transparencia se detecta y se *avisa*, nunca se *exige*.** Está **dentro** de alcance, y esta es la justificación de por qué así y no de las otras dos formas posibles:

- *Dejarlo fuera de alcance* (una sola bolsa de imágenes) dejaría el selector de capas de `DepthPanel` exactamente igual de inutilizable que hoy con los 8 fondos: el autor no tendría ninguna señal de qué imágenes sirven para parallax. Sería entregar la mitad del valor.
- *Validar transparencia como requisito duro* para `kind: "layer"` sería incorrecto: una franja de horizonte recortada al borde superior del encuadre, o una capa de cielo que cubre toda la escena por detrás, son capas de parallax perfectamente válidas y completamente opacas. Rechazarlas sería un falso positivo con consecuencias reales.
- **Elegido**: `kind` es una declaración de intención del autor (dos radios al subir: "Fondo de escena completa" / "Capa de parallax"), que gobierna (a) qué reglas de resolución se aplican (§C.5), (b) qué se muestra por defecto en cada selector (el de fondo prioriza `scene`, el de capa prioriza `layer`, ambos con un interruptor "ver todas" — **nunca un bloqueo**, porque un autor puede legítimamente querer una escena entera como capa lejana), y (c) si se muestra el aviso de transparencia. `hasAlpha` es un dato medido, y con `kind: "layer"` + `hasAlpha: false` se muestra un aviso informativo ("esta capa es opaca: tapará lo que haya detrás; para un efecto de parallax suele convenir un PNG/WebP con fondo transparente"), no un error.

### C.5 Umbrales de resolución y peso (requisitos 3 y 7)

Se toma `city-central.webp` (1600×907) como referencia de "resolución adecuada", tal y como pide el encargo.

| Regla | `kind: "scene"` | `kind: "layer"` | Severidad |
|---|---|---|---|
| Ancho mínimo absoluto | 800 px | 480 px | **error** — se rechaza la subida |
| Ancho recomendado | 1600 px | 1200 px | **warning** — se sube igual, con aviso persistente en la ficha del asset |
| Alto mínimo absoluto | 450 px | 120 px (una franja de horizonte es legítimamente baja) | **error** |
| Ancho máximo tras procesar | 2560 px | 2560 px | se **redimensiona** automáticamente, sin preguntar |
| Peso máximo del archivo de entrada | 12 MB | 12 MB | **error** antes de decodificar nada (evita colgar una tablet con un RAW de 60 MB) |
| Peso objetivo tras procesar | ≤ 400 KB | ≤ 400 KB | se alcanza bajando la calidad WebP en pasos (0.85 → 0.75 → 0.65); si aun así no se llega, se sube y se avisa |
| Peso máximo aceptado por las reglas de Storage | 4 MB | 4 MB | **error del servidor** — es la única de estas reglas que es una frontera de seguridad real (§F) |
| Formatos aceptados | `image/webp`, `image/png`, `image/jpeg` | ídem | **error** — se valida en cliente y **también** en las reglas |

**Por qué se redimensiona en cliente y no se sube el original**: es la única defensa real contra un bucket que se llena de fotos de 8 MB que ningún nivel necesita, y contra que el editor de un padre con una tablet de gama baja intente decodificar seis imágenes de 12 MP a la vez en la cuadrícula del selector. El límite duro de 4 MB en las reglas es el respaldo servidor de esa política, no su implementación.

### C.6 Cuotas por padre

| Límite | Valor | Cómo se aplica |
|---|---|---|
| Assets por padre | 40 | Guarda de UX: se cuenta la colección `levelAssets` antes de permitir la subida. **No es una frontera de seguridad** — Storage Rules no puede contar documentos. Se dice explícitamente en el plan para que nadie lo confunda con una protección |
| Bytes totales por padre | ~30 MB | Ídem: suma de `bytes` de la colección, mostrada como barra de uso en la biblioteca |
| Bytes por archivo | 4 MB | **Sí** es frontera real: `request.resource.size` en `storage.rules` |
| Tipo MIME | 3 formatos | **Sí** es frontera real: `request.resource.contentType.matches(...)` |

### C.7 Lo que **no** cambia en el esquema del nivel

- `LEVEL_SCHEMA_VERSION` sigue en `1`. Cero migraciones nuevas en `migrate.ts`.
- `LevelBackground` y `LevelBackgroundLayer` no ganan ningún campo. `src` sigue siendo un `string`; hoy contiene `/illustrations/…`, a partir de esta fase puede contener `https://firebasestorage.googleapis.com/…`. `validateLevel` solo comprueba que no esté vacío (`validate.ts:74-76`), así que sigue pasando sin cambios.
- No se guarda el `assetId` dentro del nivel. Consecuencia consciente: la relación nivel→asset se resuelve **por URL**, no por id. Es más frágil de cara a refactors futuros, pero evita un campo nuevo, una migración y una capa de resolución, y la única operación que la necesita (¿qué niveles usan este asset?) ya lee todos los documentos de nivel de todos modos (`listLevels` hace `getDocs` de la colección entera). Alternativa anotada por si algún día hace falta: añadir `LevelBackground.assetId?: string` como campo opcional puramente informativo.

---

## D. Arquitectura — flujo completo

```
1) SUBIDA (editor, cliente)
   <input type="file"> / drag-drop
        │  File
        ▼
   imageRules.validateFileMeta({name, type, size})        ← puro, sin DOM: formato + peso de entrada
        │  ok
        ▼
   imageProcessing.prepareUpload(file, kind)              ← DOM: createImageBitmap + canvas
        │  · mide originalWidth/Height
        │  · imageRules.decideResize(w, h, kind)  → puro
        │  · redimensiona a ≤2560px si procede
        │  · detecta hasAlpha (64×64 getImageData)
        │  · elige formato de salida (webp → png/jpeg fallback, alfa preservado)
        │  · genera la miniatura de 320px en la misma pasada
        ▼
   imageRules.gradeResolution(w, h, kind)                 ← puro: error / warning / ok  (§C.5)
        │  si error → se aborta con mensaje concreto, nada llega a la red
        ▼
2) ALMACENAMIENTO
   assetRepository.uploadAsset(storageFns, storage, firestoreFns, db, parentId, prepared)
        │  a) uploadBytesResumable(ref(storage, storagePath), blob, {contentType})
        │       └─ 'state_changed' → progreso 0-100 a la UI (aria-live)
        │  b) uploadBytes(thumbPath, thumbBlob)
        │  c) getDownloadURL(×2)
        │  d) setDoc(/parents/{uid}/levelAssets/{assetId}, prepareForFirestore(meta))
        │  si (d) falla → deleteObject(a) y (b) en best-effort, y se propaga el error
        ▼
3) SELECTOR DEL EDITOR
   backgroundOptions.mergeBackgroundOptions(BACKGROUND_CATALOG, assets, { for: "scene" | "layer" })
        │  → BackgroundOption[] con `source: "factory" | "parent"`
        ▼
   <BackgroundPicker>  ─ dos <fieldset>: «De fábrica» y «Mis imágenes»
        │  (misma mecánica de radio sr-only + label que ya usa page.tsx:234-252)
        ▼
4) USO
   · Nivel nuevo   → page.tsx CreateLevelForm → createLevel(..., {src: url, width, height, alt, projection})
   · Nivel existente→ ScenePanel → dispatch SET_BACKGROUND {…background, src, width, height, alt}
   · Capa parallax → DepthPanel → updateLayer(id, {src: url})
        ▼
5) RENDER  — sin ningún cambio de código
   BackgroundLayer.tsx (editor) / BackgroundLayers.tsx (runtime) pintan <img src={…}>
   exactamente igual que con una ruta local. El motor 2.5D no se entera.
```

**Nota sobre `loadImageSize`** (`backgroundCatalog.ts:28-35`): sigue siendo la fuente de verdad para los 8 fondos de fábrica (mantiene la regla del archivo: "las dimensiones nunca se hardcodean"). Para un asset subido **no se llama**: `width`/`height` ya vienen medidos en la metadata, porque se midieron en el momento del procesado. Se ahorra un round-trip por selección y se elimina el estado de carga en el formulario de creación.

---

## E. Componentes — qué se reutiliza, qué se crea, qué se modifica

### E.1 Se reutiliza sin tocar

- `src/lib/level/serialize.ts` (`prepareForFirestore`, `assertSize`).
- `src/lib/level/backgroundCatalog.ts::loadImageSize` — sigue sirviendo a los fondos de fábrica.
- El patrón de repositorio de `levelRepository.ts` (funciones puras con `firestoreFns`/`db` inyectados).
- `src/components/level/runtime/**` — **nada**. Cero archivos del runtime se tocan en esta fase.
- `src/lib/level/schema.ts`, `defaults.ts`, `migrate.ts`, `validate.ts`\* — sin cambios estructurales (\*`validate.ts` gana **un** warning opcional en el Paso 10; ver §G).
- `src/lib/level/depth.ts`, `RuntimeCanvas`, `BackgroundLayers`, `EntityLayer`, `navmesh.ts`, todo el bus de eventos, y todo el sistema académico (`curriculum.ts`, `attemptRecorder.ts`, `economy.ts`, `mastery.ts`, `badges.ts`).

### E.2 Archivos nuevos

| Archivo | Rol |
|---|---|
| `storage.rules` | Reglas de seguridad de Storage (§F). Raíz del repo, junto a `firestore.rules` |
| `src/lib/level/assets/imageRules.ts` | **Lógica pura, sin DOM, sin red**: `validateFileMeta`, `gradeResolution`, `decideResize`, `pickOutputFormat`, `assetStoragePath`, `thumbStoragePath`, `checkQuota`, `sanitizeLabel`. Es lo que se prueba unitariamente en `e2e/unidad-nivel.spec.ts` sin abrir ninguna página |
| `src/lib/level/assets/imageProcessing.ts` | **Todo lo que necesita DOM**: `prepareUpload(file, kind)` (decodificar, redimensionar, detectar alfa, generar miniatura), sobre `createImageBitmap` + `<canvas>` nativos. Cero dependencias |
| `src/lib/level/assets/assetRepository.ts` | CRUD contra Storage + Firestore, con `storageFns`/`storage`/`firestoreFns`/`db` **inyectados** (nunca llama a `getFirebase()`): `listAssets`, `uploadAsset`, `renameAsset`, `deleteAsset`, `findLevelsUsingAsset` |
| `src/lib/level/assets/backgroundOptions.ts` | `mergeBackgroundOptions(factory, assets, opts)`: fusiona `BACKGROUND_CATALOG` con los assets del padre en una sola lista tipada con `source: "factory" \| "parent"` y `usage`. **Función pura** ⇒ testeable |
| `src/components/level/editor/assets/BackgroundPicker.tsx` | Selector unificado en dos secciones («De fábrica» / «Mis imágenes»), con botón "Subir imagen". Se usa en los **tres** puntos: creación de nivel, cambio de fondo, y selector de capa de `DepthPanel` |
| `src/components/level/editor/assets/AssetUploader.tsx` | `<input type="file">` etiquetado + drag-drop opcional + radios de `kind` + campo `alt` + barra de progreso determinada (`<progress>` + `role="status"`) + errores en `role="alert"` |
| `src/components/level/editor/assets/AssetLibrary.tsx` | Cuadrícula de assets del padre con miniaturas (`loading="lazy"`, `decoding="async"`), renombrar en línea, borrar con `role="alertdialog"`, contador de cuota, avisos de resolución |
| `src/components/level/editor/ScenePanel.tsx` | Sección "Fondo" del panel de nivel: monta `BackgroundPicker` + `alt`, y **envuelve** al `DepthPanel` existente (§E.4) |
| `e2e/editor-assets.spec.ts` | E2E de subida/gestión contra el emulador de Storage (§H) |

### E.3 Archivos existentes a modificar

| Archivo | Cambio | Riesgo |
|---|---|---|
| `src/lib/firebase.ts` | Añadir `getFirebaseStorage(): Promise<{ storage, storageFns }>` con su propia `Promise` memoizada y su propio `import("firebase/storage")` — **no** se añade al `Promise.all` de `initFirebase()`, para no cargar Storage en `/login`, `/jugar` y `/perfiles`, que no lo usan. Dentro, `connectStorageEmulator(storage, "127.0.0.1", 9199)` bajo la misma condición `NEXT_PUBLIC_FIREBASE_EMULATORS === "1"` ya existente. Se documenta con un comentario del mismo estilo que los de `:22-32` y `:74-100`, incluyendo el hallazgo de §B.2 (por qué Storage **no** necesita alias en `next.config.ts`) | Bajo — aditivo, nada existente cambia de comportamiento |
| `firebase.json` | Añadir `"storage": { "rules": "storage.rules" }` y `emulators.storage: { "port": 9199 }` | Bajo |
| `scripts/emuladores.mjs` | `--only auth,firestore` → `--only auth,firestore,storage` (línea 41) | Bajo — puede romper el arranque del emulador si el entorno no lo soporta; se verifica en el Paso 0 |
| `firestore.rules` | Bloque nuevo `match /levelAssets/{assetId} { allow read, write: if isParent(parentId); }` dentro de `match /parents/{parentId}`, junto a `/levels` (el catch-all de `:76-78` lo bloquearía si no) | Bajo, pero **exige despliegue manual** (criterio A14, ver README) |
| `src/lib/level/ids.ts` | `export function newAssetId()` — tres líneas, mismo patrón | Nulo |
| `src/lib/level/backgroundCatalog.ts` | **Se extiende, no se reemplaza** (§E.5): `BackgroundOption` gana `usage: "scene" \| "thumbnail"` y `source: "factory"`; las 8 entradas se etiquetan según §A.2. `BACKGROUND_CATALOG` y `loadImageSize` siguen exportándose con la misma forma y el mismo nombre | Bajo — cambio de tipo aditivo; `page.tsx` compila igual |
| `src/app/panel/editor/page.tsx` | `CreateLevelForm`: el `<fieldset>` de fondo (`:231-254`) se sustituye por `<BackgroundPicker>`; `handleSubmit` (`:189-212`) usa `option.width/height` si el asset ya los trae y `loadImageSize` solo para los de fábrica | Medio — es el único formulario por el que hoy nacen todos los niveles |
| `src/components/level/editor/LevelEditorScreen.tsx` | En `selection.kind === "level"` (`:183-186`) monta `<ScenePanel>` (que a su vez contiene `<DepthPanel>`) en vez de `<DepthPanel>` suelto | Bajo |
| `src/components/level/editor/DepthPanel.tsx` | El `<select>` de imagen de capa (`:175-184`) pasa a `<BackgroundPicker for="layer" compact>`; el default de capa nueva (`:39`) deja de ser `BACKGROUND_CATALOG[0].src` (Ciudad Central, escena completa opaca) y pasa a ser `""` con estado vacío explícito "Elegí una imagen para esta capa" | Bajo — cambio local, `SET_BACKGROUND` y el schema no cambian |
| `src/lib/level/validate.ts` | **Solo en el Paso 10**: un `warning` (jamás `error`) cuando `background.width < 1200` — "el fondo tiene poca resolución para una escena a pantalla completa" | Bajo — es `warning`, no bloquea el Play Test (`validate.ts:7`) |
| `README.md` | Sección nueva "Reglas de Storage: hay que desplegarlas aparte", en paralelo exacto a la que ya existe para Firestore | Nulo |
| `playwright.config.ts` | Ningún cambio necesario: `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` ya está en `emulatorEnv`. Se verifica que el `webServer` de emuladores sigue esperando por el puerto 9099 (sí) | Nulo |

### E.4 Por qué `ScenePanel` envuelve a `DepthPanel` y no al revés

`DepthPanel` está bien acotado a su responsabilidad (profundidad + capas) y su cabecera lo documenta explícitamente: *"fondo/nombre ya se editan en otro lado"* (`DepthPanel.tsx:15-17`). Esa nota era una descripción del estado del mundo, no un principio de diseño — el "otro lado" para el fondo simplemente no existía. La forma limpia de cerrarlo es un `ScenePanel` que reúna las dos secciones ("Fondo de la escena" + `<DepthPanel/>`) bajo la misma selección `{ kind: "level" }`, que ya es la que activa el botón "Escena" de `EditorTopBar.tsx:62-77` y cuyo `title` ya dice *"Fondo y profundidad de la escena"*. Cero cambios en el reducer: `SET_BACKGROUND` ya existe y ya acepta un `LevelBackground` completo (`editorReducer.ts:118,255`).

### E.5 Decisión explícita sobre `BACKGROUND_CATALOG` (requisito 4 del encargo)

**Se extiende. No se reemplaza. No se borra.** Razones:

1. Los 8 fondos son **parte del producto**: un padre que crea su primer nivel tiene que poder elegir uno sin subir nada. Un editor cuya única fuente de fondos es "sube el tuyo" es peor que el actual.
2. Son la red de seguridad si Storage falla, si el proyecto está en Spark sin bucket (riesgo R1), o si el padre está sin conexión: el selector degrada a "solo De fábrica" en vez de quedarse vacío.
3. `city-central.webp` es además la referencia de `ciudadCentralAsLevel()` (`legacy/ciudadCentral.ts:243`) y del fondo de `/login` (`login/page.tsx:57`) — el catálogo no es solo del editor.

La convivencia se resuelve en **un selector unificado con dos secciones etiquetadas**, no en dos selectores separados y no en una lista plana:

- Dos `<fieldset>` con `<legend>` — «De fábrica» y «Mis imágenes» — dentro del mismo grupo de radios (`name="background"`), de modo que la navegación por teclado recorre las dos secciones como un único grupo y el lector de pantalla anuncia a qué sección pertenece cada opción. Es exactamente la estructura semántica que ya usa `page.tsx:231-254`, ampliada.
- «Mis imágenes» aparece **primero** cuando el padre tiene ≥1 asset (es lo que buscará), y se colapsa a un estado vacío con el botón "Subir imagen" cuando no tiene ninguno.
- Dentro de «De fábrica», los fondos con `usage: "thumbnail"` van en un subgrupo colapsable «Regiones (arte de tarjeta, baja resolución)» con una insignia de aviso que **no depende solo del color** (icono + texto "baja resolución", criterio A11).

---

## F. Reglas de seguridad

### F.1 `storage.rules` (archivo nuevo)

```
rules_version = '2';

// Modelo idéntico al de firestore.rules: /parents/{parentId} es el padre
// autenticado (parentId == auth.uid) y todo cuelga debajo. Un asset
// pertenece al padre que lo subió; nadie más lo lista, lo sustituye ni lo
// borra. Los niveles de ese padre son los únicos que lo referencian.
service firebase.storage {
  match /b/{bucket}/o {

    function isParent(parentId) {
      return request.auth != null && request.auth.uid == parentId;
    }

    match /parents/{parentId}/level-assets/{assetFile} {
      allow read: if isParent(parentId);

      // Frontera de seguridad REAL (no una guarda de UX): tamaño y tipo.
      // El redimensionado en cliente apunta a ~400KB; estos 4MB son el
      // techo duro que impide que un cliente modificado llene el bucket.
      allow create: if isParent(parentId)
                    && request.resource.size < 4 * 1024 * 1024
                    && request.resource.contentType.matches('image/(webp|png|jpeg)');

      // Inmutable, igual que /levels/{id}/versions/{n} en firestore.rules:
      // sustituir una imagen se hace subiendo un asset nuevo, nunca
      // pisando un objeto al que ya apunta un nivel guardado.
      allow update: if false;

      allow delete: if isParent(parentId);
    }

    // Catch-all, mismo criterio que firestore.rules:76-78.
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### F.2 Añadido a `firestore.rules`

Dentro de `match /parents/{parentId} { … }`, junto al bloque de `levels` ya existente (`firestore.rules:52-65`):

```
      // Metadata de las imágenes subidas por el padre-autor
      // (docs/asset-management-plan.md §C.2). El archivo vive en Storage
      // (storage.rules); acá solo su ficha: etiqueta, tipo, dimensiones.
      match /levelAssets/{assetId} {
        allow read, write: if isParent(parentId);
      }
```

⚠️ **Ambos archivos hay que desplegarlos a mano** (`npx firebase deploy --only firestore:rules,storage --project <id>`), exactamente igual que ya documenta el README para Firestore y que registra el criterio A14 / riesgo K6 del plan del editor. Sin ese paso, la subida falla con `storage/unauthorized` en producción aunque todo compile en verde — el mismo síntoma que el README ya describe para `placements`.

### F.3 El matiz honesto: las URLs de descarga no pasan por las reglas

`getDownloadURL()` devuelve una URL que incluye un `token` de acceso y que es **legible por cualquiera que la tenga**, sin autenticación y sin evaluar `storage.rules`. Las reglas de arriba protegen el acceso vía SDK (listar, leer metadata, subir, borrar), no la URL tokenizada.

**Evaluación explícita del riesgo, no un descuido**:
- El contenido es arte de fondo de un nivel de matemáticas, subido voluntariamente por el padre-autor para que su hijo lo vea en pantalla. No hay dato personal ni identificable en el flujo previsto.
- La URL es de facto un secreto de 128+ bits: no es enumerable ni indexable, y no aparece en ninguna superficie pública (el `LevelDefinition` que la contiene solo lo pueden leer el propio padre y sus hijos, por `firestore.rules`).
- Es revocable: borrar el objeto invalida la URL de inmediato.

**Mitigaciones que sí se adoptan**: (a) el `AssetUploader` incluye una nota visible de una línea — "Las imágenes que subas quedan asociadas a tu cuenta. No subas fotos de personas ni información personal" —; (b) se documenta en el README junto al despliegue de reglas. **Mitigación descartada**: servir por `getBlob()` + object URL (§B.4), desproporcionada para este contenido y con coste real en el runtime.

---

## G. Plan de implementación

Orden: **verificar el bloqueo externo → infraestructura y lógica pura → acceso a datos → procesado → UI, del punto de menor a mayor exposición**. Ningún paso rompe nada si el siguiente no llega a hacerse.

### Paso 0 — Verificación de prerrequisitos (go/no-go, cero código)

- **Qué**: (1) Confirmar en Firebase Console que el proyecto real tiene un bucket de Cloud Storage aprovisionado, o que se puede aprovisionar (plan Blaze si el proyecto es posterior a oct-2024). (2) Confirmar que `npx firebase emulators:start --only auth,firestore,storage --project demo-numerario` arranca en la máquina donde se vaya a implementar.
- **Sistema afectado**: ninguno.
- **Dependencia**: ninguna.
- **Criterio de aceptación**: ambas respuestas son "sí", **por escrito, en el PR**. Si (1) es "no", el plan se detiene aquí y se reabre §B.3 con la opción B (R2 + una ruta API, aceptando romper A4 explícitamente y con un diseño de verificación de ID token) — no se empieza a construir sobre una suposición.
- **Riesgo**: es el riesgo. **Rollback**: N/A.

> Contexto relevante: `docs/scene-25d-plan.md` §N Paso 0 dejó constancia de que el arnés de emuladores falla con `spawn EINVAL` en el sandbox donde se implementó aquella fase. Si esta fase se implementa en el mismo entorno, **el Paso 0 fallará en (2)** y toda la verificación E2E del §H quedará pendiente — en ese caso, la instrucción es la misma que tomó aquel plan: documentarlo y no dar por cerrada la fase, no implementar a ciegas.

### Paso 1 — Infraestructura de Storage (sin código de app)

- **Archivos**: `storage.rules` (nuevo), `firebase.json` (sección `storage` + emulador 9199), `scripts/emuladores.mjs:41` (`--only auth,firestore,storage`), `README.md` (sección de despliegue).
- **Sistema afectado**: arnés local y de pruebas. La app no cambia.
- **Dependencia**: Paso 0.
- **Criterio de aceptación**: `npm run emuladores` levanta los tres emuladores; `npm run e2e` sigue en verde **sin ninguna modificación de los specs existentes** (criterio A2).
- **Riesgo**: bajo. **Rollback**: revertir los 4 archivos; nada de la app depende de ellos todavía.

### Paso 2 — `imageRules.ts` (lógica pura) + sus pruebas unitarias

- **Archivos**: `src/lib/level/assets/imageRules.ts` (nuevo), `e2e/unidad-nivel.spec.ts` (extender).
- **Sistema afectado**: ninguno visible.
- **Dependencia**: ninguna (se puede hacer en paralelo al Paso 1).
- **Criterio de aceptación**: las suites de §H.1 en verde. `validateFileMeta` rechaza un `image/gif` y un archivo de 20 MB; `gradeResolution` devuelve `error` en 640×360/`scene`, `warning` en 1000×600/`scene`, `ok` en 1600×900/`scene`, y `ok` en 1200×160/`layer` (la franja de horizonte, que sería `error` como `scene`); `decideResize` no escala una imagen de 1600 px y sí una de 4000; `pickOutputFormat` nunca devuelve JPEG para una entrada con alfa.
- **Riesgo**: nulo. **Rollback**: trivial.

### Paso 3 — `getFirebaseStorage()` en `src/lib/firebase.ts`

- **Archivo**: `src/lib/firebase.ts`.
- **Sistema afectado**: acceso a Firebase. Ningún consumidor todavía.
- **Dependencia**: Paso 1 (para el emulador).
- **Criterio de aceptación**: `npm run build` en verde (es la prueba real de que el Worker no se rompe, criterio A5/K1); ninguna página existente carga un solo byte más de JS (verificable comparando el bundle de `/login` antes/después: `firebase/storage` **no** debe aparecer en su grafo); en una página del editor, `getFirebaseStorage()` resuelve y, con `NEXT_PUBLIC_FIREBASE_EMULATORS=1`, apunta a `127.0.0.1:9199`.
- **Riesgo**: bajo, pero es **el único paso que toca un archivo del que depende toda la app**. Se hace aislado, con su propio commit, precisamente por eso.
- **Rollback**: revertir el archivo; nada más lo importa aún.

### Paso 4 — `assetRepository.ts` + reglas de Firestore

- **Archivos**: `src/lib/level/assets/assetRepository.ts` (nuevo), `src/lib/level/ids.ts` (`newAssetId`), `firestore.rules` (bloque `levelAssets`).
- **Sistema afectado**: persistencia.
- **Dependencia**: Pasos 1-3.
- **Criterio de aceptación**: E2E contra emuladores — subir un `Blob` sintético crea el objeto en Storage **y** el documento en `/parents/{uid}/levelAssets/{id}`; `listAssets` los devuelve ordenados por `createdAt` desc; `renameAsset` cambia solo `label`/`updatedAt`; `deleteAsset` borra objeto + miniatura + documento; un segundo usuario autenticado recibe `permission-denied` al listar los assets del primero; un `updateMetadata`/re-`uploadBytes` sobre un objeto existente falla (inmutabilidad de `storage.rules`).
- **Riesgo**: medio — es donde puede quedar basura (objeto subido sin documento, o al revés). Mitigación en el propio diseño: orden estricto **objeto → miniatura → URLs → documento**, y si el documento falla se intenta `deleteObject` de ambos en `best-effort` con `catch` silencioso; el error que se propaga es el original, no el de la limpieza.
- **Rollback**: revertir los archivos; los objetos ya subidos se borran a mano desde la consola (se documenta).

### Paso 5 — `imageProcessing.ts` (Canvas nativo)

- **Archivo**: `src/lib/level/assets/imageProcessing.ts` (nuevo).
- **Sistema afectado**: ninguno visible todavía.
- **Dependencia**: Paso 2.
- **Criterio de aceptación**: en `page.evaluate` sobre una imagen generada en el propio navegador, `prepareUpload` produce un blob ≤2560 px de ancho, ≤400 KB en el caso típico, con `hasAlpha` correcto para una entrada con y sin transparencia, y una miniatura de 320 px; una entrada PNG con alfa **nunca** sale como JPEG; una imagen de 4000×3000 se procesa en <1500 ms en el perfil `devices["Pixel 7"]` ya usado por el project "móvil" de `playwright.config.ts`.
- **Riesgo**: medio — soporte de `toBlob("image/webp")` desigual. Mitigado por la cadena de fallback de §B.5 y verificado por el criterio de arriba.
- **Rollback**: se puede degradar a "subir el original sin procesar" cambiando una función, si algo sale mal en un navegador concreto.

### Paso 6 — `AssetLibrary` + `AssetUploader` (UI de gestión)

- **Archivos**: `src/components/level/editor/assets/AssetUploader.tsx`, `AssetLibrary.tsx` (nuevos).
- **Sistema afectado**: UI del editor. Todavía **no** conectado a ningún selector de fondo — se monta como un panel propio, alcanzable pero aislado.
- **Dependencia**: Pasos 4-5.
- **Criterio de aceptación**: un padre sube una imagen, la ve en la cuadrícula con su miniatura, la renombra, y la borra; el progreso se anuncia por `role="status"`; los errores por `role="alert"`; axe sin violaciones `serious`/`critical` (A11); todo el flujo es completable **solo con teclado**; la cuota se muestra y bloquea la subida 41.
- **Riesgo**: bajo — aditivo y aislado. **Rollback**: desmontar el panel.

### Paso 7 — `BackgroundPicker` + creación de nivel

- **Archivos**: `src/lib/level/assets/backgroundOptions.ts`, `src/components/level/editor/assets/BackgroundPicker.tsx` (nuevos); `src/lib/level/backgroundCatalog.ts`, `src/app/panel/editor/page.tsx` (modificar).
- **Sistema afectado**: el formulario por el que nacen **todos** los niveles.
- **Dependencia**: Paso 6.
- **Criterio de aceptación**: crear un nivel eligiendo un fondo **de fábrica** produce exactamente el mismo `LevelDefinition` que antes de esta fase (mismo `src`, `width`, `height`, `alt`, `projection`) — verificable con la aserción profunda que ya hace `e2e/editor-persistencia.spec.ts`; crear uno con una **imagen subida** produce `background.src` = la URL de descarga y `width`/`height` = los de la metadata, sin ninguna llamada a `loadImageSize`; el selector es un único grupo de radios navegable con flechas a través de las dos secciones.
- **Riesgo**: **medio-alto**, el más alto del plan: si esto se rompe, no se pueden crear niveles. Por eso va después de que todo lo demás esté verificado, y por eso su criterio de aceptación central es "el camino de fábrica no cambia en absoluto".
- **Rollback**: revertir `page.tsx` al `<fieldset>` anterior — `BackgroundPicker` queda inerte pero la biblioteca del Paso 6 sigue funcionando.

### Paso 8 — Cambiar el fondo de un nivel existente (`ScenePanel`)

- **Archivos**: `src/components/level/editor/ScenePanel.tsx` (nuevo), `LevelEditorScreen.tsx:183-186` (montarlo).
- **Sistema afectado**: editor de un nivel.
- **Dependencia**: Paso 7.
- **Criterio de aceptación**: abrir un nivel, cambiar su fondo desde el panel "Escena", guardar, recargar ⇒ `background.src/width/height/alt` persisten exactamente; `validateLevel` sigue en cero errores; el canvas del editor refleja el fondo nuevo de inmediato; undo/redo revierten el cambio como cualquier otra mutación (usa `SET_BACKGROUND`, que ya está en la lista de acciones historizadas de `editorReducer.ts:159`).
- **Riesgo**: bajo. Cierra el hueco preexistente de §A.1. **Rollback**: volver a montar `<DepthPanel>` suelto.

### Paso 9 — Capas de parallax con imágenes reales (`DepthPanel`)

- **Archivo**: `src/components/level/editor/DepthPanel.tsx:39,175-184`.
- **Sistema afectado**: editor de capas 2.5D.
- **Dependencia**: Paso 7.
- **Criterio de aceptación**: añadir una capa nueva ya **no** preselecciona Ciudad Central; el selector de imagen de capa muestra por defecto los assets `kind: "layer"` con un interruptor "ver todas"; subir un PNG con transparencia y asignarlo a una capa con `depth: 0.3` produce, en Play Test, el efecto de parallax que la fase 2.5D dejó construido y sin material — es decir, **se completa el Paso 9 opcional de `docs/scene-25d-plan.md`**, esta vez sin depender de que alguien encargue arte y lo commitee al repo.
- **Riesgo**: bajo. **Rollback**: volver al `<select>` anterior.

### Paso 10 — Los 6 fondos de baja resolución

- **Archivos**: `src/lib/level/backgroundCatalog.ts` (etiquetado `usage`), `BackgroundPicker.tsx` (subgrupo colapsable), `src/lib/level/validate.ts` (warning de resolución).
- **Sistema afectado**: qué ve el autor en el selector; ningún dato existente cambia.
- **Dependencia**: Paso 7.
- **Decisión propuesta, con sus alternativas descartadas**:
  - ❌ **Borrar los archivos**: incorrecto. `ZoneScene` los usa vía `scenes.ts`/`narrative.ts` y seguiría usándolos; y cualquier nivel ya creado con uno de ellos se quedaría con una imagen rota.
  - ❌ **Quitarlos de `BACKGROUND_CATALOG`**: rompe el selector para un nivel que ya los use (el fondo seleccionado no aparecería como opción marcada) y elimina opciones sin dar alternativa a quien no quiera subir nada.
  - ✅ **Degradarlos, no ocultarlos**: siguen en el catálogo, marcados `usage: "thumbnail"`, agrupados en un subgrupo **colapsado por defecto** titulado «Regiones (arte de tarjeta, baja resolución)», con insignia de aviso (icono + texto, nunca solo color) y un texto de ayuda que dirige a "Subir imagen". Además, `validateLevel` emite un `warning` (nunca `error`, para no bloquear el Play Test ni romper niveles existentes) cuando `background.width < 1200`.
- **Pregunta abierta que este plan NO resuelve y hay que responder antes de cerrarlo (riesgo R7)**: *¿existe arte fuente de esas 6 regiones en mayor resolución?* No se asume que sí — en `public/illustrations/` no hay ni rastro (§A.2). Si la respuesta es **sí**, la acción correcta es re-exportarlas a ≥1600 px y **revertir el subgrupo colapsado**, quedando el catálogo homogéneo (media hora de trabajo, cero código). Si la respuesta es **no**, esta degradación es permanente y la subida de assets es la respuesta al problema. La decisión no puede tomarla el implementador: hay que preguntársela a quien produjo el arte.
- **Criterio de aceptación**: un nivel existente cuyo fondo es `bosque-patrones.webp` se sigue abriendo, jugando y guardando sin ningún cambio de comportamiento; su `IssuesPanel` muestra un warning nuevo y ningún error; `ZoneScene` se ve idéntica.
- **Riesgo**: bajo. **Rollback**: quitar el etiquetado y el warning.

### Paso 11 — Pulido, límites y cierre

- **Archivos**: `README.md`, `AssetLibrary.tsx` (barra de uso), `BackgroundPicker.tsx` (`loading="lazy"`, `decoding="async"`, tamaños de miniatura), `e2e/editor-assets.spec.ts`.
- **Dependencia**: todos los anteriores.
- **Criterio de aceptación**: §H completa en verde; §I completa.
- **Riesgo**: bajo. **Rollback**: N/A.

### Tabla de riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| **R1** | El proyecto real está en plan Spark y no puede aprovisionar bucket ⇒ todo el plan es inviable tal cual | **Paso 0 es un go/no-go explícito antes de escribir código.** Si falla, se reabre §B.3 con la opción R2 y su coste (romper A4 + verificar ID tokens en el Worker) sobre la mesa |
| **R2** | El emulador de Storage no arranca en el entorno de implementación (precedente documentado: `spawn EINVAL` en `docs/scene-25d-plan.md` §N Paso 0) | Se detecta también en el Paso 0. Si falla, la fase se implementa pero **no se declara cerrada**: se documenta qué quedó sin verificar, exactamente como hizo el plan 2.5D con su Paso 0 |
| **R3** | Objetos huérfanos en Storage (documento sin objeto o al revés) tras un fallo a mitad | Orden estricto de operaciones + limpieza best-effort (Paso 4). Una reconciliación automática de huérfanos **queda fuera de alcance** y se documenta como tarea manual desde la consola |
| **R4** | Borrar un asset que un nivel ya usa deja el nivel con una imagen rota | `deleteAsset` llama antes a `findLevelsUsingAsset` (compara `url` contra `background.src` y cada `layers[].src` de los niveles del padre — reutiliza la lectura que ya hace `listLevels`) y, si hay coincidencias, el diálogo las lista por nombre y exige una segunda confirmación explícita. Además, el `<img>` del editor lleva `onError` que muestra "imagen no disponible" en vez de un hueco mudo |
| **R5** | La URL con token es efectivamente pública | Evaluado y aceptado explícitamente en §F.3, con aviso en la UI y en el README. No se esconde |
| **R6** | Un navegador sin `toBlob("image/webp")` produce archivos mayores de lo previsto | Cadena de fallback verificada en el Paso 5; el techo real lo pone la regla de 4 MB de Storage, no el cliente |
| **R7** | No se sabe si existe arte fuente en mayor resolución de las 6 regiones | Convertido en **pregunta explícita** del Paso 10, no en una suposición. La decisión de "degradar permanentemente" vs "re-exportar" depende de esa respuesta |
| **R8** | Reglas de Storage/Firestore desplegadas en un entorno y no en otro ⇒ `storage/unauthorized` solo en producción | Es el riesgo K6 del plan del editor, ya conocido y ya documentado en el README para Firestore. Se replica la sección para Storage (Paso 1) y se añade al criterio A14 |
| **R9** | El Paso 7 rompe la creación de niveles | Es el paso de mayor riesgo y va el penúltimo, con el criterio de aceptación centrado en "el camino de fábrica produce exactamente el mismo documento que antes" y con un rollback de un solo archivo |
| **R10** | Si algún día se añade una CSP, `img-src` no incluiría `firebasestorage.googleapis.com` y todos los fondos subidos dejarían de verse | Anotado en el README junto al despliegue de reglas. Hoy no hay CSP (verificado, §A.1) |

---

## H. Testing

Se sigue el arnés existente al pie de la letra: **Playwright para todo, sin Vitest/Jest** (criterio A3; `e2e/unidad-nivel.spec.ts:44-52` documenta explícitamente esa decisión).

### H.1 Unitarias — lógica pura, extendiendo `e2e/unidad-nivel.spec.ts`

Sin `page`, sin red, sin Firestore, igual que las suites de `navmesh`/`validate`/`serialize`/`depth` que ya viven ahí:

- **`imageRules.validateFileMeta`**: acepta `image/webp|png|jpeg`; rechaza `image/gif`, `image/svg+xml` (importante: SVG es un vector de scripting, se rechaza a propósito) y `application/pdf`; rechaza >12 MB; rechaza tamaño 0.
- **`imageRules.gradeResolution`**: la matriz completa de §C.5 para ambos `kind`, incluyendo los bordes exactos (799/800, 1599/1600) y el caso de la franja de horizonte (1200×160) que es `ok` como `layer` y `error` como `scene`.
- **`imageRules.decideResize`**: 4000×3000 → 2560×1920 preservando la relación de aspecto; 1600×900 → sin cambio; 320×180 → sin cambio (no se **amplía** nunca).
- **`imageRules.pickOutputFormat`**: con alfa y WebP disponible → `image/webp`; con alfa y WebP no disponible → `image/png` (**nunca** JPEG); sin alfa y sin WebP → `image/jpeg`.
- **`imageRules.assetStoragePath`/`thumbStoragePath`**: forma exacta y un solo segmento tras `level-assets/`.
- **`imageRules.checkQuota`**: 40 assets → permite; 41 → bloquea con el mensaje de cuota; suma de bytes por encima del presupuesto → warning.
- **`imageRules.sanitizeLabel`**: recorta a 60, colapsa espacios, quita la extensión, no queda vacío nunca.
- **`backgroundOptions.mergeBackgroundOptions`**: los assets del padre van primero cuando existen; cada opción lleva su `source`; con `for: "layer"` los `kind: "layer"` van primero pero **ninguno se oculta** con `showAll`; una `src` que ya está seleccionada pero no está en ninguna lista (asset borrado) aparece igualmente como opción marcada con estado "no disponible" — el caso que evita que un nivel existente pierda su selección.

### H.2 Procesado en navegador — dentro de `e2e/editor-assets.spec.ts` con `page.evaluate`

La imagen de prueba se **genera en el propio navegador** con `OffscreenCanvas` + `convertToBlob`, y se adjunta al `<input type="file">` construyendo un `DataTransfer` — así no hace falta commitear ningún binario de fixture, y se pueden generar dimensiones arbitrarias (1600×900, 340×190, 4000×3000, con y sin alfa) desde el propio test. Alternativa si eso diera problemas: una fixture pequeña en `e2e/fixtures/`, que sería un archivo nuevo pero **no** una dependencia nueva.

- `prepareUpload` sobre 4000×3000 → ancho ≤2560, peso ≤400 KB, `originalWidth === 4000`.
- `hasAlpha` correcto para PNG con transparencia y para JPEG opaco.
- Miniatura de 320 px generada y distinta del principal.
- Tiempo de procesado <1500 ms medido con `performance.now()` **dentro de la página** (mismo criterio que `e2e/nivel-rendimiento.spec.ts`, para no medir ruido de IPC), en el project "móvil".

### H.3 Persistencia contra emuladores — `e2e/editor-assets.spec.ts`

Mismo patrón que `e2e/editor-persistencia.spec.ts`, con el emulador de Storage en 9199:

- Subir → el objeto existe (consulta directa al emulador: `GET http://127.0.0.1:9199/v0/b/demo-numerario.appspot.com/o?prefix=parents/{uid}/level-assets`) y `/parents/{uid}/levelAssets/{id}` existe con todos los campos de §C.2.
- Renombrar → cambia `label` y `updatedAt`, **no** `storagePath` ni `url`.
- Inmutabilidad: un segundo `uploadBytes` al mismo `storagePath` falla (`storage/unauthorized`), igual que ya se prueba para `/versions` en Firestore.
- Aislamiento entre padres: un segundo usuario autenticado recibe `permission-denied` al listar `/parents/{otroUid}/levelAssets` y `storage/unauthorized` al leer su objeto por SDK.
- Borrar → objeto, miniatura y documento desaparecen; borrar un asset en uso exige la doble confirmación y lista los niveles afectados por nombre.
- Cuota: subir el asset nº41 se bloquea en cliente con el mensaje esperado.
- Reglas de tamaño/tipo: intentar subir un blob de 5 MB o un `image/gif` **por SDK, saltándose la UI** falla con `storage/unauthorized` — es la prueba de que la frontera de seguridad real está en las reglas y no solo en el formulario.

### H.4 Editor end-to-end

- Crear un nivel con un fondo **de fábrica**: aserción profunda de que el `LevelDefinition` resultante es idéntico al de antes de esta fase (reutiliza el aserto del criterio 24 del plan del editor).
- Crear un nivel con una imagen **subida**: `background.src` = la URL de descarga, `width`/`height` = los de la metadata; guardar, recargar, y verificar que el canvas del editor y el Play Test la pintan.
- Cambiar el fondo de un nivel existente desde `ScenePanel`: persiste, `validateLevel` en cero errores, undo lo revierte.
- Asignar una imagen subida con alfa a una capa de parallax y verificar en Play Test que se desplaza a distinta velocidad que el fondo — es decir, **el criterio 2 de la §O de `docs/scene-25d-plan.md` con material real**, no con una segunda escena opaca.
- Fondo de baja resolución: `IssuesPanel` muestra el warning nuevo y **ningún error**; el nivel se puede probar igual.

### H.5 Regresión, accesibilidad y build (obligatorias, no nuevas)

- **Los 12 specs E2E existentes pasan sin ninguna modificación** — extensión del criterio A2 al inventario actual de `e2e/`.
- `npm run lint && npm run typecheck && npm run build` en verde (A1). El `build` es además la verificación real de que `firebase/storage` no rompe el Worker.
- Cero violaciones `serious`/`critical` de axe en `/panel/editor` y `/panel/editor/[levelId]` **con la biblioteca de assets y el diálogo de subida abiertos** (A11).
- Flujo completo de subida y borrado **solo con teclado**, sin trampas de foco: el diálogo de borrado devuelve el foco al elemento que lo abrió.
- Ningún estado comunicado solo por color: "baja resolución", "en uso", "seleccionado" y "error" llevan icono y/o texto.
- `prefers-reduced-motion`: la barra de progreso es **determinada** (`<progress value>`), no un spinner indeterminado animado (A12).
- Presupuesto de bundle: `/login` y `/jugar/[childId]` no crecen — `firebase/storage` no debe aparecer en su grafo de módulos.

---

## I. Criterios de aceptación finales

Para dar esta fase por cerrada:

1. **Un padre sube una imagen propia desde `/panel/editor` y la usa como fondo de un nivel nuevo, sin tocar ningún archivo y sin desplegar nada.** Verificable end-to-end contra emuladores.
2. **Ese mismo padre cambia el fondo de un nivel que ya existía**, desde el panel "Escena" del editor — cerrando el hueco preexistente de §A.1, no solo el que planteaba el encargo.
3. **Un padre asigna una imagen con fondo transparente a una capa de parallax** desde `DepthPanel`, y el efecto se ve en Play Test — la fase 2.5D deja de estar "lista pero sin material" (`docs/scene-25d-plan.md` §F.3/§N Paso 9).
4. **Listar, renombrar y borrar assets funciona**, con el mismo modelo de propiedad que el resto del proyecto: verificado por prueba de que un segundo padre autenticado no puede leer, listar ni borrar los assets del primero, ni por Firestore ni por Storage SDK.
5. **La calidad se gobierna con reglas explícitas y verificables**: por debajo de 800 px se rechaza, por debajo de 1600 px se avisa, por encima de 2560 px se redimensiona en cliente, y el techo duro de 4 MB/formato lo aplican las reglas de Storage, no el formulario.
6. **Los 8 fondos de fábrica siguen funcionando exactamente igual**, y un nivel creado eligiendo uno de ellos produce byte a byte el mismo `LevelDefinition` que antes de esta fase. `BACKGROUND_CATALOG` se extendió, no se reemplazó.
7. **Los 6 fondos de baja resolución no se borran ni se ocultan**: se degradan a un subgrupo colapsado con aviso, `ZoneScene` no cambia en absoluto, y la pregunta sobre si existe arte fuente en mayor resolución queda respondida por escrito (no asumida) antes del cierre.
8. **Cero dependencias nuevas** en `package.json` (A3) — el redimensionado, la compresión y la detección de alfa son Canvas nativo.
9. **Cero rutas API nuevas** en `src/app/api/` (A4).
10. **Ningún `import` estático de `firebase/*` fuera de `src/lib/firebase.ts`** (A5), verificado por ESLint y por `npm run build`.
11. **Cero cambios en el esquema del nivel**: `LEVEL_SCHEMA_VERSION` sigue en `1`, `migrate.ts` sigue vacío, y ningún nivel guardado necesita migrarse.
12. **Cero archivos de `src/components/level/runtime/**` modificados** — el runtime pinta una URL remota exactamente igual que una ruta local, sin enterarse.
13. **Cero cambios en el sistema académico** (`curriculum.ts`, `attemptRecorder.ts`, `economy.ts`, `mastery.ts`, `badges.ts`) ni en el motor de navegación.
14. **`storage.rules` y el bloque `levelAssets` de `firestore.rules` desplegados al proyecto real**, con la sección correspondiente añadida al `README.md` — extensión explícita del criterio A14, y el único paso que ninguna automatización del repo puede cubrir.
15. **Los 12 E2E existentes pasan sin modificación**, `lint`/`typecheck`/`build` en verde, axe sin violaciones `serious`/`critical` en las superficies nuevas, y el flujo completo de subida y borrado completable solo con teclado.

---

*(Fin del documento. Basado en inspección directa del código y de `node_modules` en la rama `claude/level-editor-fase-10-integracion-academica`, commit `414a60b`, con `docs/level-editor-plan.md` y `docs/scene-25d-plan.md` como referencia de arquitectura, vocabulario y restricciones ya establecidas.)*
