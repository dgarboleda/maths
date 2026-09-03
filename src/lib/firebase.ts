import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export interface Firebase {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  /** Funciones de "firebase/firestore" (collection, doc, onSnapshot...). */
  firestore: typeof import("firebase/firestore");
}

/*
 * Toda la app es "use client" (ver README), pero Next igual renderiza cada
 * página una vez en el servidor para generar el HTML inicial, así que un
 * `import` estático de "firebase/firestore" se evalúa también ahí. Ese
 * paquete usa protobufjs, que compila funciones con `new Function` al
 * cargarse — Cloudflare Workers no permite generar código desde strings y
 * el Worker responde 500 en cualquier página, sin necesidad de que se
 * llegue a llamar ninguna función de Firestore. Por eso Firebase entero se
 * carga de forma perezosa con `import()` dentro de esta función: así el
 * paquete solo se evalúa cuando el navegador la ejecuta de verdad.
 */
let firebasePromise: Promise<Firebase> | undefined;

export function getFirebase(): Promise<Firebase> {
  if (!firebasePromise) firebasePromise = initFirebase();
  return firebasePromise;
}

declare global {
  var __numerarioEmulatorsConnected: boolean | undefined;
}

async function initFirebase(): Promise<Firebase> {
  const [{ initializeApp, getApps, getApp }, { getAuth, connectAuthEmulator }, firestore] =
    await Promise.all([
      import("firebase/app"),
      import("firebase/auth"),
      import("firebase/firestore"),
    ]);

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = withDiagnostics(() => getAuth(app));
  const db = getOrInitFirestore(app, firestore);

  /*
   * Con NEXT_PUBLIC_FIREBASE_EMULATORS=1 la app habla con los emuladores
   * locales en vez de con el proyecto real. Lo usan las pruebas E2E de
   * Playwright (ver e2e/README.md) y sirve también para desarrollar sin
   * tocar datos de verdad: `npm run emuladores`.
   */
  if (
    process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "1" &&
    !globalThis.__numerarioEmulatorsConnected
  ) {
    globalThis.__numerarioEmulatorsConnected = true;
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    firestore.connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }

  return { app, auth, db, firestore };
}

/*
 * Sin caché local persistente, Firestore solo guarda los datos en memoria:
 * cualquier recarga (o un corte de red justo en ese momento, típico de una
 * tablet familiar con wifi inestable) obliga a esperar una respuesta del
 * servidor antes de mostrar nada, y si esa respuesta no llega a tiempo la
 * lista de hijos se ve vacía aunque los documentos sigan intactos en el
 * servidor. `persistentLocalCache` guarda los datos en IndexedDB para que
 * sobrevivan a recargas y estén disponibles de inmediato mientras se
 * confirma con el servidor. Si el navegador no soporta IndexedDB (modo
 * privado de Safari, por ejemplo) `initializeFirestore` lanza, así que se
 * usa `getFirestore` (memoria) como respaldo.
 */
function getOrInitFirestore(
  app: FirebaseApp,
  firestore: typeof import("firebase/firestore"),
): Firestore {
  try {
    return firestore.initializeFirestore(app, {
      localCache: firestore.persistentLocalCache({
        tabManager: firestore.persistentMultipleTabManager(),
      }),
    });
  } catch (err) {
    console.error("No se pudo activar la caché persistente de Firestore", err);
    return firestore.getFirestore(app);
  }
}

/*
 * La clave web de Firebase no es secreta — se restringe por dominio/App
 * Check en Google Cloud, no por ocultarla —, así que es seguro mostrar un
 * fragmento en el mensaje de error. Si auth/invalid-api-key persiste
 * después de configurar las NEXT_PUBLIC_FIREBASE_* en el panel de
 * Cloudflare, esto distingue "no llegó ningún valor al build" de "llegó
 * un valor pero no es el correcto" sin depender de la consola del
 * navegador (login/page.tsx muestra `error.message` cuando el código no
 * es uno de los reconocidos).
 */
function withDiagnostics<T>(fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    const key = firebaseConfig.apiKey;
    const preview = key ? `"${key.slice(0, 6)}…" (${key.length} caracteres)` : "no está definida";
    const diag = new Error(
      `${err instanceof Error ? err.message : String(err)} — NEXT_PUBLIC_FIREBASE_API_KEY ${preview}.`,
    );
    (diag as Error & { code?: string }).code = (err as { code?: string })?.code;
    throw diag;
  }
}
