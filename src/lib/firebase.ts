import { initializeApp, getApps, getApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

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
  process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "1" &&
  !globalThis.__numerarioEmulatorsConnected
) {
  globalThis.__numerarioEmulatorsConnected = true;
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
