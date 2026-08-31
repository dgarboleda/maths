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
  const auth = getAuth(app);
  const db = firestore.getFirestore(app);

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
