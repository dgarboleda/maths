import { expect, type Page } from "@playwright/test";
import { deleteApp, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { collection, connectFirestoreEmulator, doc, getFirestore, setDoc, writeBatch } from "firebase/firestore";

export const CLAVE_PADRE = "secreto123";

/** Cada prueba usa su propia cuenta: así pueden correr en paralelo. */
export function correoDePrueba(): string {
  return `padre-${crypto.randomUUID()}@ejemplo.test`;
}

/** Crea una cuenta de padre nueva y deja la sesión abierta en /perfiles. */
export async function registrarPadre(page: Page): Promise<string> {
  const correo = correoDePrueba();
  await page.goto("/login");
  await page.getByRole("button", { name: /Créala/i }).click();
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill(CLAVE_PADRE);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "¿Quién va a jugar?" })).toBeVisible();
  return correo;
}

/** Da de alta un perfil de hijo desde /perfiles. */
export async function crearHijo(
  page: Page,
  { nombre = "Ana", pin = "1234", nacimiento = "2018-05-10" } = {},
): Promise<{ nombre: string; pin: string }> {
  await page.getByRole("button", { name: "Agregar hijo" }).click();
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByLabel("Fecha de nacimiento").fill(nacimiento);
  await page.getByLabel("PIN (4 dígitos)").fill(pin);
  await page.getByLabel("Confirmar PIN").fill(pin);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: `Entrar al perfil de ${nombre}` })).toBeVisible();
  return { nombre, pin };
}

/** Entra al perfil del hijo con su PIN y espera la pantalla de juego. */
export async function entrarAlPerfil(page: Page, nombre: string, pin: string): Promise<void> {
  await page.getByRole("button", { name: `Entrar al perfil de ${nombre}` }).click();
  await page.getByLabel(`PIN de ${nombre}`).fill(pin);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: `¡Hola, ${nombre}!` })).toBeVisible();
}

/** Atajo: cuenta nueva + hijo nuevo + sesión del hijo abierta. */
export async function sesionDeHijo(
  page: Page,
  opciones?: { nombre?: string; pin?: string; nacimiento?: string },
): Promise<{ nombre: string; pin: string; correo: string }> {
  const correo = await registrarPadre(page);
  const hijo = await crearHijo(page, opciones);
  await entrarAlPerfil(page, hijo.nombre, hijo.pin);
  return { ...hijo, correo };
}

/** El id del hijo va en la URL de juego: /jugar/{childId}/... */
export function idDeHijo(page: Page): string {
  return page.url().match(/\/jugar\/([^/]+)/)![1];
}

/**
 * Marca como dominados, directo en Firestore, los módulos indicados —sin
 * jugar rondas de verdad. Dominar de verdad exige aciertos repartidos en al
 * menos 2 días distintos (MIN_DAY_SPAN en mastery.ts), algo que una prueba de
 * un solo proceso no puede cumplir jugando. Con la currícula real (candados
 * por prerrequisito), para poder abrir un módulo bloqueado en una prueba hay
 * que otorgarle "dominado" a sus prerrequisitos directos por esta vía; se
 * autentica como el mismo padre de la prueba, así que las reglas de
 * Firestore (isParent) lo permiten igual que al niño jugando de verdad.
 */
export async function otorgarDominio(correo: string, childId: string, moduleIds: string[]): Promise<void> {
  const app = initializeApp(
    { apiKey: "demo-api-key", projectId: "demo-numerario" },
    `otorgar-${crypto.randomUUID()}`,
  );
  try {
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    const { user } = await signInWithEmailAndPassword(auth, correo, CLAVE_PADRE);

    const db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", 8080);

    await Promise.all(
      moduleIds.map((moduleId) =>
        setDoc(doc(db, "parents", user.uid, "children", childId, "skillsProgress", moduleId), {
          recentResults: [],
          recentAccuracy: 1,
          masteredAt: Date.now(),
        }),
      ),
    );
  } finally {
    await deleteApp(app);
  }
}

/**
 * Guarda directo en Firestore el resultado de una evaluación de ubicación ya
 * "hecha" — sin recorrer las ~40 preguntas adaptativas del flujo real — para
 * poder probar la lectura (historial en el panel, insignias de "dominado
 * por evaluación") sin depender de qué tipo de control le toque a cada
 * pregunta al azar.
 */
export async function sembrarEvaluacion(
  correo: string,
  childId: string,
  opts: {
    perStrand: Record<
      string,
      { itemsAsked: number; itemsCorrect: number; highestTierPassed: number; gradeBand: string }
    >;
    overallScore: number;
    overallGradeBand: string;
    grantedModuleIds: string[];
  },
): Promise<void> {
  const app = initializeApp(
    { apiKey: "demo-api-key", projectId: "demo-numerario" },
    `sembrar-${crypto.randomUUID()}`,
  );
  try {
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    const { user } = await signInWithEmailAndPassword(auth, correo, CLAVE_PADRE);

    const db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", 8080);

    const batch = writeBatch(db);
    const placementRef = doc(
      collection(db, "parents", user.uid, "children", childId, "placements"),
    );
    batch.set(placementRef, {
      startedAt: Date.now() - 10 * 60 * 1000,
      completedAt: Date.now(),
      perStrand: opts.perStrand,
      overallScore: opts.overallScore,
      overallGradeBand: opts.overallGradeBand,
      grantedModuleIds: opts.grantedModuleIds,
    });
    for (const moduleId of opts.grantedModuleIds) {
      batch.set(doc(db, "parents", user.uid, "children", childId, "skillsProgress", moduleId), {
        recentResults: [],
        recentAccuracy: 1,
        masteredAt: Date.now(),
        masteredVia: "placement",
      });
    }
    batch.update(doc(db, "parents", user.uid, "children", childId), { placementStatus: "completo" });
    await batch.commit();
  } finally {
    await deleteApp(app);
  }
}

/**
 * Resuelve el enunciado cuando es una operación simple ("¿Cuánto es 3 + 4?").
 * Devuelve null si el enunciado no tiene esa forma, para que la prueba pueda
 * saltarse la parte que exige acertar.
 */
export function resolverEnunciado(prompt: string): number | null {
  const operacion = prompt.match(/(-?\d+(?:[.,]\d+)?)\s*([+\-−×÷*/])\s*(-?\d+(?:[.,]\d+)?)/);
  if (!operacion) return null;
  const a = Number(operacion[1].replace(",", "."));
  const b = Number(operacion[3].replace(",", "."));
  switch (operacion[2]) {
    case "+":
      return a + b;
    case "-":
    case "−":
      return a - b;
    case "×":
    case "*":
      return a * b;
    default:
      return b === 0 ? null : a / b;
  }
}
