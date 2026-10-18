import { createHash } from "node:crypto";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import * as firestore from "firebase/firestore";
import { getFirebaseFunctionsForApp } from "@/lib/firebase";

export async function createFamily() {
  const app = initializeApp({ apiKey: "demo-api-key", projectId: "demo-numerario" }, crypto.randomUUID());
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = firestore.getFirestore(app);
  firestore.connectFirestoreEmulator(db, "127.0.0.1", 8080);
  const { user } = await createUserWithEmailAndPassword(auth, `${crypto.randomUUID()}@example.test`, "password123");
  const childId = crypto.randomUUID();
  const profile = firestore.doc(db, "parents", user.uid, "children", childId);
  await firestore.setDoc(profile, {
    name: "Sofía", pinHash: createHash("sha256").update("1234").digest("hex"), birthDate: "2017-01-01",
  });
  return { app, auth, db, parentId: user.uid, childId, profile };
}

export async function call<T = unknown>(app: FirebaseApp, name: string, data: unknown): Promise<T> {
  const { functions, functionsFns } = await getFirebaseFunctionsForApp(app);
  return (await functionsFns.httpsCallable<unknown, T>(functions, name)(data)).data;
}

export async function anonymousApp() {
  const app = initializeApp({ apiKey: "demo-api-key", projectId: "demo-numerario" }, crypto.randomUUID());
  connectAuthEmulator(getAuth(app), "http://127.0.0.1:9099", { disableWarnings: true });
  return app;
}

export { deleteApp };
