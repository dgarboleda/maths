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

### `NEXT_PUBLIC_LEVELS_V2`: Ciudad Central sobre el motor del Level Editor

Con esta variable en `"1"`, `/jugar/[childId]` (Ciudad Central) se sirve con
`LevelRuntime` sobre `ciudadCentralAsLevel()` (`src/lib/level/legacy/
ciudadCentral.ts`) en vez del `QuestScene.tsx` hardcodeado de siempre —
docs/level-editor-plan.md §12.4 (Fase 14), migración completa: mismos 3
desafíos reales (terminal/medidor/compuerta), la misma misión "El apagón" y
la misma restauración final, con algunas piezas muy puntuales de
`QuestScene.tsx` simplificadas (documentado en el comentario de cabecera de
`ciudadCentral.ts`: sin la presentación especial de Khaos la primera vez,
sin flecha guía sobre el hotspot activo).

**Apagada por default** — nadie la ve sin que alguien la prenda a propósito.
`QuestScene.tsx` no se toca ni se borra: sigue siendo la escena real para
cualquier despliegue que no fije esta variable (§12.1, "coexistencia, no
reemplazo"). Para activarla en un despliegue real, agregar
`NEXT_PUBLIC_LEVELS_V2=1` junto a las `NEXT_PUBLIC_FIREBASE_*` de arriba (se
incrusta al compilar, igual que ellas — build nuevo para que se refleje). En
local, `NEXT_PUBLIC_LEVELS_V2=1 npm run dev`.

`e2e/aventura-ciudad-central-v2.spec.ts` prueba este camino contra un
segundo `next dev` con el flag activo (project `ciudad-central-v2` de
`playwright.config.ts`, puerto 3211) — `e2e/aventura.spec.ts` sigue
probando `QuestScene.tsx` sin cambios, porque sigue siendo lo que corre de
verdad mientras el flag esté apagado.

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
