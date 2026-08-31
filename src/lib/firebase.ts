import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/*
 * Toda la app es "use client" (ver README), pero Next igualmente ejecuta
 * este módulo en Node al prerenderizar "/" durante `next build`. Si las
 * NEXT_PUBLIC_FIREBASE_* no están disponibles en ese entorno de build (p.ej.
 * un proyecto de Cloudflare sin esas variables configuradas), getAuth()
 * lanza auth/invalid-api-key de forma síncrona y tira el build entero.
 * Como ningún archivo del proyecto usa `auth`/`db` fuera del navegador, en
 * el servidor basta con no inicializar Firebase de verdad.
 */
const isBrowser = typeof window !== "undefined";

function initFirebase() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return { app, auth: getAuth(app), db: getFirestore(app) };
}

const firebase = isBrowser ? initFirebase() : undefined;

export const app = firebase?.app as FirebaseApp;
export const auth = firebase?.auth as Auth;
export const db = firebase?.db as Firestore;

/*
 * Con NEXT_PUBLIC_FIREBASE_EMULATORS=1 la app habla con los emuladores
 * locales en vez de con el proyecto real. Lo usan las pruebas E2E de
 * Playwright (ver e2e/README.md) y sirve también para desarrollar sin tocar
 * datos de verdad: `npm run emuladores`.
 */
declare global {
  var __numerarioEmulatorsConnected: boolean | undefined;
}

if (
  isBrowser &&
  process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "1" &&
  !globalThis.__numerarioEmulatorsConnected
) {
  globalThis.__numerarioEmulatorsConnected = true;
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
