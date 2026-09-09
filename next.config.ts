import type { NextConfig } from "next";

/*
 * Aunque toda la app es "use client", Next renderiza cada página una vez en
 * el servidor para generar el HTML inicial, así que `@firebase/firestore` y
 * `@firebase/auth` también se cargan ahí. Su condición "node" apunta a un
 * build con `@grpc/grpc-js` (protobufjs incluido), que genera funciones con
 * `new Function` al importarse — Cloudflare Workers no permite generar
 * código desde strings y el Worker responde 500 en cualquier página. Se
 * fuerza la resolución al build "browser" (WebChannel sobre fetch, sin gRPC)
 * también en el servidor: es el mismo build que ya usa Firebase Hosting.
 */
const firebaseBrowserAliases = {
  "@firebase/firestore": "@firebase/firestore/dist/index.esm.js",
  "@firebase/auth": "@firebase/auth/dist/esm/index.js",
};

const nextConfig: NextConfig = {
  // Un `distDir` propio permite correr un segundo `next dev` del mismo
  // proyecto en otro puerto sin chocar con el lockfile del primero (Fase
  // 14, `playwright.config.ts`: NEXT_PUBLIC_LEVELS_V2 solo se puede fijar al
  // arrancar el servidor, así que probar ambos flags en la misma corrida de
  // e2e exige dos procesos de `next dev`). Sin la variable, se comporta
  // exactamente igual que siempre (".next").
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  /*
   * En desarrollo, Next solo sirve sus recursos internos al host con el que
   * arrancó (localhost). Las pruebas E2E abren la app en 127.0.0.1 —el
   * contenedor no tiene IPv6, así que "localhost" no siempre resuelve—, y sin
   * esto el navegador se queda sin los chunks de JS y la página nunca se
   * hidrata. Solo afecta a `next dev`.
   */
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    resolveAlias: firebaseBrowserAliases,
  },
  webpack: (config) => {
    Object.assign(config.resolve.alias, firebaseBrowserAliases);
    return config;
  },
};

export default nextConfig;

// Habilita bindings de Cloudflare (variables, KV, R2...) en `next dev`,
// para que el entorno local se parezca al del Worker en producción.
// Ver https://opennext.js.org/cloudflare/get-started
import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
