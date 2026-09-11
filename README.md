This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy

Este proyecto se despliega en Cloudflare en lugar de Vercel (la opción que trae la plantilla de `create-next-app` por defecto). Técnicamente es un **Cloudflare Worker con assets estáticos** (lo que Cloudflare recomienda hoy para Next.js) y no un proyecto clásico de "Pages" — Cloudflare aún no tiene un ["verified adapter"](https://nextjs.org/docs/app/getting-started/deploying#verified-adapters) propio para Next.js; la integración pasa por [OpenNext](https://opennext.js.org/cloudflare) (`@opennextjs/cloudflare`). Como toda la app es cliente (`"use client"`) salvo los `layout.tsx` de metadatos, no hay Server Actions ni Route Handlers que migrar.

La configuración ya está en el repo (`wrangler.jsonc`, `open-next.config.ts`). Falta un paso que solo puede hacer quien tenga la cuenta de Cloudflare:

```bash
npx wrangler login   # una sola vez, abre el navegador
npm run preview       # construye y sirve el Worker en local; imprime la URL al terminar
npm run deploy        # construye y despliega de verdad a *.workers.dev
```

Antes de `npm run deploy`/`preview` hacen falta las `NEXT_PUBLIC_FIREBASE_*` reales en `.env.local` (se incrustan al compilar, igual que en cualquier otro despliegue — ver `.env.local.example`). Si en vez de desplegar en local se conecta el repo a Cloudflare (Workers Builds) para que compile en su CI, esas mismas variables hay que configurarlas también en el panel del proyecto, pero **en Settings → Build → "Build variables and secrets"** — no en Settings → Variables and Secrets a secas, que son las de runtime del Worker ya desplegado y no las ve el paso de `next build` ([doc oficial de Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)). Sin ellas el login con Firebase no funciona en producción (el build ya no falla por su ausencia, pero la app sí lo necesita para autenticar). Como se incrustan al compilar, cambiarlas ahí no actualiza un sitio ya desplegado por sí solo — hace falta un build nuevo (reintentar el último deployment desde el dashboard, o subir un commit nuevo) para que el cambio se refleje.

Ese panel de variables de build distingue **Production** de **Preview**: si se cargaron solo en un entorno, el otro compila igual pero sin ellas — mismo síntoma (`auth/invalid-api-key`, "NEXT_PUBLIC_FIREBASE_API_KEY no está definida") aunque el build termine en verde. Confirmá que las 6 variables están marcadas para ambos entornos, no solo para el que se usó al configurarlas la primera vez.

El `NEXT_PUBLIC_FIREBASE_API_KEY` es el que aparece en Firebase Console (Configuración del proyecto → General → Tus apps → tu app web → bloque `firebaseConfig`) — no una clave creada a mano en Google Cloud Console. Aunque ambas viven en el mismo proyecto de Google Cloud, Firebase Auth solo reconoce la suya; una creada manualmente (aunque tenga las APIs correctas habilitadas) da `auth/configuration-not-found` al intentar iniciar sesión o registrarse. La caché incremental de Next (ISR) está desactivada porque requiere un bucket R2, que a su vez requiere estar autenticado; para activarla:

```bash
npx wrangler r2 bucket create maths-opennext-cache
```

y sigue las notas dentro de `wrangler.jsonc`/`open-next.config.ts`. Más detalles en la [guía de Cloudflare para Next.js](https://developers.cloudflare.com/workers/frameworks/framework-guides/nextjs).

### `/jugar/[childId]`: despachador, no Ciudad Central

Desde la Fase 18 (docs/level-editor-plan-v2.md §5.1), `/jugar/[childId]` ya
no muestra ningún juego por defecto: decide a qué nivel real del Mundo del
padre mandar al niño (o a "Crear el primer nivel"/"Cargar el mundo de
ejemplo" si todavía no tiene ninguno). `NEXT_PUBLIC_LEVELS_V2` **ya no
afecta a esta ruta** — el motor nuevo (`LevelRuntime`) se usa siempre que
hay un nivel real, sembrado a mano o vía "Cargar el mundo de ejemplo"
(`seedExampleWorld`, que persiste `ciudadCentralAsLevel()` como nivel
editable).

`QuestScene.tsx` (la escena "Ciudad Central" original) no se toca ni se
borra (§12.1, "coexistencia, no reemplazo"), pero ya no es lo primero que
ve un niño: sigue viva en su propia ruta de regresión,
**`/jugar/[childId]/ciudad-central-legacy`**, siempre accesible (sin flag),
sin ningún enlace de producción hacia ahí — sirve para comparar
comportamiento contra el motor nuevo, y es lo que ejercitan
`e2e/aventura.spec.ts`/`juego.spec.ts` (ver §Pruebas).

### Reglas de Firestore: hay que desplegarlas aparte

`firestore.rules` vive en el repo y protege los emuladores en local y en
Playwright, pero **nada en `npm run deploy`/`preview` ni en Cloudflare
Workers Builds las sube al proyecto real** — Cloudflare solo compila y
despliega el Worker (Next.js), no toca Firestore. Si nunca se corrió el
comando de abajo (o se editaron las reglas después de la última vez), el
proyecto real puede estar sirviendo unas reglas más viejas o las que trae el
Console por defecto — más restrictivas que las de este archivo.

Mismo síntoma que las build vars de Cloudflare: todo compila en verde y la
app carga bien (los datos que ya se podían leer antes siguen leyéndose), pero
una escritura nueva falla con `permission-denied` ("Missing or insufficient
permissions") aunque el usuario esté bien autenticado — por ejemplo, la
evaluación inicial completándose mandaba al niño de vuelta a `/evaluacion` en
bucle porque nunca lograba guardar la franja `placements`, colección más
nueva que las reglas desplegadas todavía no reconocían.

```bash
npx firebase login                          # una sola vez, abre el navegador
npx firebase deploy --only firestore:rules --project <tu-project-id>
```

`<tu-project-id>` es el mismo `NEXT_PUBLIC_FIREBASE_PROJECT_ID` de
`.env.local` (Firebase Console → Configuración del proyecto → General). Hace
falta repetir este despliegue cada vez que cambie `firestore.rules` — no es
automático como sí lo es la compilación del Worker en cada push.

### Reglas de Storage: mismo problema, mismo comando aparte

`storage.rules` (biblioteca de imágenes del Level Editor,
docs/asset-management-plan.md) tiene exactamente el mismo problema que
`firestore.rules` de arriba — vive en el repo, protege el emulador local, pero
nada la sube sola al proyecto real:

```bash
npx firebase deploy --only storage --project <tu-project-id>
```

Sin este paso, subir una imagen desde `/panel/editor` falla con
`storage/unauthorized` en producción aunque todo compile en verde — el mismo
síntoma descrito arriba, ahora sobre Storage. Se puede desplegar junto con las
reglas de Firestore en un solo comando:

```bash
npx firebase deploy --only firestore:rules,storage --project <tu-project-id>
```

**Prerrequisito que no depende del repo**: el proyecto de Firebase necesita
tener un bucket de Cloud Storage aprovisionado. Desde el 30 de octubre de
2024, Firebase exige plan **Blaze** (facturación activada) para crear el
bucket por defecto en proyectos nuevos; se confirma en Firebase Console →
Storage. Si el proyecto no tiene bucket todavía, hay que crearlo ahí antes de
desplegar las reglas — no es algo que `firebase deploy` resuelva por su
cuenta.

Si el plan gratuito de Cloudflare Workers se queda corto, [Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) sigue siendo la opción sin fricción para Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Pruebas

Tres capas, cada una con el runner que le corresponde — ninguna es un
sustituto de las otras — más un presupuesto de rendimiento aparte:

- **`npm run test`** (Vitest + jsdom) — lógica pura (`src/test/unit/`:
  navmesh, geometría, `validateLevel`, el motor de evaluación de ubicación,
  la currícula personalizada…) y tests de componente/accesibilidad
  (`*.test.tsx`, colocados junto al componente que prueban — React Testing
  Library + [`jest-axe`](https://github.com/nickcolley/jest-axe) para los
  escaneos WCAG 2.1 A/AA). Nada de esto abre un navegador ni habla con
  Firebase — corre en segundos.
- **`npm run test:integration`** (Vitest + emulador real) — Firestore/
  Storage de verdad (`src/test/integration/`), reglas de seguridad
  incluidas: `firestore.rules`/`storage.rules` solo se ejercitan de verdad
  contra el emulador, nunca con un doble en memoria. Arranca los emuladores
  sola (`globalSetupEmulators.ts`) si no están ya arriba.
- **`npm run e2e`** (Playwright + navegador real + emuladores) — reducida a
  los recorridos núcleo de la app: **acceso** (`acceso.spec.ts`), **jugar**
  (`aventura.spec.ts`/`juego.spec.ts`) y **evaluación**
  (`evaluacion.spec.ts`). "Crear hijo" no tiene su propio archivo — lo
  ejercita `crearHijo()` como paso previo en todos los anteriores. Todo lo
  demás que antes vivía acá (accesibilidad, detalles de UI del Level
  Editor, narrativa secundaria) se repartió entre las dos capas de arriba;
  ver el propio `e2e/*.spec.ts` y `src/test/unit|integration/*.test.ts`
  para el detalle de qué se movió a dónde.
- **`npm run perf`** ([Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci),
  configurado en `lighthouserc.json`) — presupuesto de rendimiento y
  accesibilidad sobre `/login` (la única pantalla pública sin sesión ni
  emuladores), corriendo contra `next build && next start`. Falla si el
  peso de JS o el peso total de la página crecen por encima del umbral
  fijado (docs/auditoria-rendimiento-accesibilidad.md §1.2) o si el puntaje
  de accesibilidad baja de 0.9; el puntaje de rendimiento (más ruidoso en
  CI compartido) solo avisa, no bloquea. No es un sustituto de las tres
  capas de arriba — no ejercita lógica ni recorridos, solo el costo de la
  primera carga.

Antes, la lógica pura y la persistencia contra el emulador vivían también
en `e2e/` como specs de Playwright sin usar `page` — el único runner
disponible en ese momento. Con Vitest ya como dependencia, correrlas ahí
solo pagaba el costo de arrancar navegador + `next dev` sin necesitarlo.

### CI: la suite de e2e se reparte en shards

`.github/workflows/ci.yml` corre `npx playwright test --shard=N/M` en una
matriz de jobs en paralelo (`e2e`), y un job aparte (`e2e-informe`) combina
los reportes "blob" de cada shard en un único HTML al final
(`npx playwright merge-reports`). Agregar más archivos o recorridos a
`e2e/` no exige tocar nada de esto: `--shard` reparte **tests**, no
archivos, así que el reparto entre shards se mantiene parejo sea cual sea
la cantidad de archivos que haya el día de mañana — solo hace falta subir
el número de shards en la matriz (`shard: [1, 2, ...]`, y el denominador a
juego en el paso `--shard=${{ matrix.shard }}/N` y en el nombre del job) si
la suite crece lo suficiente como para que valga la pena más paralelismo.
