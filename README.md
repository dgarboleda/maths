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

Antes de `npm run deploy`/`preview` hacen falta las `NEXT_PUBLIC_FIREBASE_*` reales en `.env.local` (se incrustan al compilar, igual que en cualquier otro despliegue — ver `.env.local.example`). Si en vez de desplegar en local se conecta el repo a Cloudflare (Workers Builds / Pages) para que compile en su CI, esas mismas variables hay que configurarlas también en el panel del proyecto (Settings → Variables and Secrets, en el entorno de *Build*), porque ese entorno no tiene tu `.env.local`; sin ellas el login con Firebase no funciona en producción (el build ya no falla por su ausencia, pero la app sí lo necesita para autenticar). Como se incrustan al compilar, cambiarlas ahí no actualiza un sitio ya desplegado por sí solo — hace falta un build nuevo (reintentar el último deployment desde el dashboard, o subir un commit nuevo) para que el cambio se refleje. La caché incremental de Next (ISR) está desactivada porque requiere un bucket R2, que a su vez requiere estar autenticado; para activarla:

```bash
npx wrangler r2 bucket create maths-opennext-cache
```

y sigue las notas dentro de `wrangler.jsonc`/`open-next.config.ts`. Más detalles en la [guía de Cloudflare para Next.js](https://developers.cloudflare.com/workers/frameworks/framework-guides/nextjs).

Si el plan gratuito de Cloudflare Workers se queda corto, [Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) sigue siendo la opción sin fricción para Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
