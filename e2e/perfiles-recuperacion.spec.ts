import { expect, test } from "@playwright/test";
import { deleteApp, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  doc,
  getDocFromServer,
  getFirestore,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "firebase/functions";
import {
  CLAVE_PADRE,
  crearHijo,
  entrarAlEspacio,
  registrarPadre,
} from "./utilidades";

async function family<T>(
  email: string,
  work: (
    db: Firestore,
    parentId: string,
    verify: (childId: string, pin: string) => Promise<unknown>,
  ) => Promise<T>,
): Promise<T> {
  const app = initializeApp(
    { apiKey: "demo-api-key", projectId: "demo-numerario" },
    crypto.randomUUID(),
  );
  try {
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    const { user } = await signInWithEmailAndPassword(auth, email, CLAVE_PADRE);
    const db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    const functions = getFunctions(app);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
    return await work(db, user.uid, (childId, pin) =>
      httpsCallable(
        functions,
        "verifyChildPin",
      )({ parentId: user.uid, childId, pin }),
    );
  } finally {
    await deleteApp(app);
  }
}

test("Ada con un id antiguo respeta el bloqueo del PIN, se restablece y se borra sin afectar a otro perfil", async ({
  page,
}) => {
  const email = await registrarPadre(page);
  await crearHijo(page, {
    nombre: "Ada",
    pin: "1234",
    nacimiento: "2011-05-10",
  });
  const childId = await entrarAlEspacio(page, "Ada", "1234");
  await page.goto("/perfiles");
  await crearHijo(page, { nombre: "Bruno" });
  await family(email, async (db, parentId) => {
    await updateDoc(doc(db, "parents", parentId, "children", childId), {
      id: "perfil-antiguo-inexistente",
      name: " Ada ",
      pinFailCount: 5,
      pinLockedUntil: Date.now() + 60_000,
    });
  });
  await page.reload();
  // El PIN se comprueba en Functions también en el dispositivo de la
  // familia, así que el bloqueo vale aquí: ni el PIN correcto entra.
  await page
    .getByRole("button", { name: /Entrar al perfil de\s+Ada\s*$/ })
    .click();
  await page.getByRole("textbox", { name: /PIN de\s+Ada/ }).pressSequentially("1234");
  await page.getByRole("textbox", { name: /PIN de\s+Ada/ }).press("Enter");
  await expect(page.getByText("Demasiados intentos. Espera un momento.")).toBeVisible();
  await page.goto("/panel/ajustes");
  const row = page
    .getByRole("listitem")
    .filter({ has: page.getByText("Ada", { exact: true }) });
  await row.getByRole("button", { name: "Restablecer PIN" }).click();
  const reset = page.getByRole("dialog", { name: /Restablecer PIN de\s+Ada/ });
  await reset.getByLabel("PIN nuevo (4 dígitos)").fill("4321");
  await reset.getByLabel("Confirmar PIN").fill("4321");
  await reset.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(reset).toBeHidden();
  await family(email, async (db, parentId, verify) => {
    const data = (
      await getDocFromServer(doc(db, "parents", parentId, "children", childId))
    ).data();
    expect(data?.pinLockedUntil).toBeUndefined();
    expect(data?.pinFailCount).toBe(0);
    expect(data?.pinHashVersion).toBe(2);
    // Con la sesión de la familia solo confirma; no emite token infantil.
    await expect(verify(childId, "4321")).resolves.toHaveProperty("data.ok", true);
  });
  await page.goto("/perfiles");
  await page
    .getByRole("button", { name: /Entrar al perfil de\s+Ada\s*$/ })
    .click();
  await page.getByRole("textbox", { name: /PIN de\s+Ada/ }).pressSequentially("4321");
  await page.getByRole("textbox", { name: /PIN de\s+Ada/ }).press("Enter");
  await expect(
    page.getByRole("heading", { name: /¿Qué vamos a descubrir/ }),
  ).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(`/jugar/${childId}`);
  await page.goto("/panel/ajustes");
  await row.getByRole("button", { name: "Borrar perfil" }).click();
  const deletion = page.getByRole("dialog", { name: /Borrar.*Ada/ });
  await deletion.getByLabel(/Escribe .*Ada/).fill("Ada");
  await deletion
    .getByRole("button", { name: "Borrar perfil", exact: true })
    .click();
  await expect(deletion).toBeHidden();
  await family(email, async (db, parentId) => {
    expect(
      (
        await getDocFromServer(
          doc(db, "parents", parentId, "children", childId),
        )
      ).exists(),
    ).toBe(false);
  });
  await page.goto("/perfiles");
  await expect(
    page.getByRole("button", { name: "Entrar al perfil de Bruno" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Entrar al perfil de\s+Ada/ }),
  ).toHaveCount(0);
});

test("un borrado pendiente se identifica y puede terminarse desde Ajustes", async ({
  page,
}) => {
  const email = await registrarPadre(page);
  await crearHijo(page, { nombre: "Ada" });
  const childId = await entrarAlEspacio(page, "Ada", "1234");
  await family(email, async (db, parentId) => {
    await updateDoc(doc(db, "parents", parentId, "children", childId), {
      deleting: true,
    });
  });
  await page.goto("/perfiles");
  await expect(
    page.getByText("Borrado pendiente", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Entrar al perfil de Ada" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Terminar borrado de Ada" }).click();
  await page
    .getByRole("button", { name: "Reintentar borrado", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: /Borrar.*Ada/ });
  await dialog.getByLabel('Escribe "Ada" para confirmar').fill("Ada");
  await dialog
    .getByRole("button", { name: "Borrar perfil", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByText("Todavía no hay perfiles de hijos creados."),
  ).toBeVisible();
});
