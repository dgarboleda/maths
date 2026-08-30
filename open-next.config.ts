// Config por defecto del adaptador OpenNext para Cloudflare.
// Sin `incrementalCache` porque no hay bucket R2 (requiere `wrangler login`
// con una cuenta real de Cloudflare) — ver la nota en wrangler.jsonc.
// import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Para best results consider enabling R2 caching
  // See https://opennext.js.org/cloudflare/caching for more details
  // incrementalCache: r2IncrementalCache,
});
