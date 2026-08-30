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

Este proyecto se despliega en [Cloudflare Pages](https://developers.cloudflare.com/workers/frameworks/framework-guides/nextjs) en lugar de Vercel (la opción que trae la plantilla de `create-next-app` por defecto). Cloudflare aún no tiene un ["verified adapter"](https://nextjs.org/docs/app/getting-started/deploying#verified-adapters) propio; la integración actual pasa por [OpenNext](https://opennext.js.org/cloudflare) (`@opennextjs/cloudflare`). Como toda la app es cliente ("use client") salvo los `layout.tsx` de metadatos, no debería haber sorpresas de Server Actions/Route Handlers al migrar.

Si el plan gratuito de Cloudflare Pages/Workers se queda corto, [Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) sigue siendo la opción sin fricción para Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
