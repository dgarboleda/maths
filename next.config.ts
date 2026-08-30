import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * En desarrollo, Next solo sirve sus recursos internos al host con el que
   * arrancó (localhost). Las pruebas E2E abren la app en 127.0.0.1 —el
   * contenedor no tiene IPv6, así que "localhost" no siempre resuelve—, y sin
   * esto el navegador se queda sin los chunks de JS y la página nunca se
   * hidrata. Solo afecta a `next dev`.
   */
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;

// Habilita bindings de Cloudflare (variables, KV, R2...) en `next dev`,
// para que el entorno local se parezca al del Worker en producción.
// Ver https://opennext.js.org/cloudflare/get-started
import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
