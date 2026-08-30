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
