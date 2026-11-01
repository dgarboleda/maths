import { setGlobalOptions } from "firebase-functions/v2";

/*
 * Debe importarse antes que cualquier `onCall` (primera línea de index.ts):
 * cada callable lee las opciones globales al definirse.
 *
 * App Check: con ENFORCE_APP_CHECK=true (functions/.env.<proyecto>) los
 * callables rechazan peticiones sin un token válido de esta app. Va apagado
 * por defecto: primero se despliega el cliente con App Check y se comprueba
 * en la consola que casi todo el tráfico llega verificado; después se activa
 * (docs/operacion.md → Seguridad operativa). Los emuladores no lo exigen.
 */
setGlobalOptions({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === "true" && process.env.FUNCTIONS_EMULATOR !== "true",
});
