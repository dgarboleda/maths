/**
 * Utilidades para dejar un `LevelDefinition` seguro de escribir en
 * Firestore, que prohíbe dos cosas que un objeto TypeScript normal puede
 * tener sin darse cuenta: valores `undefined` (solo admite `null`) y arrays
 * anidados (un array cuyos elementos son a su vez arrays). El esquema
 * (`schema.ts`) ya evita los arrays anidados por diseño — `LevelZone.shape`
 * usa un discriminante `kind` en vez de, por ejemplo, `number[][]` para un
 * círculo — así que `assertNoNestedArrays` es un cinturón de seguridad, no
 * la defensa principal.
 *
 * docs/level-editor-plan.md §10.4.
 */

/** Elimina recursivamente las claves cuyo valor es `undefined` — nunca toca
 *  `null`, que Firestore sí admite. No muta el objeto de entrada. */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      result[key] = stripUndefined(v);
    }
    return result as T;
  }
  return value;
}

export class NestedArrayError extends Error {
  path: string;
  constructor(path: string) {
    super(`Firestore no admite arrays anidados: se encontró un array dentro de otro array en "${path}".`);
    this.name = "NestedArrayError";
    this.path = path;
  }
}

/** Lanza `NestedArrayError` si algún array del objeto contiene, a su vez,
 *  otro array como elemento directo. Recorre el objeto entero. */
export function assertNoNestedArrays(value: unknown, path = "$"): void {
  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      if (Array.isArray(item)) throw new NestedArrayError(`${path}[${i}]`);
      assertNoNestedArrays(item, `${path}[${i}]`);
    });
    return;
  }
  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      assertNoNestedArrays(v, `${path}.${key}`);
    }
  }
}

export class LevelTooLargeError extends Error {
  sizeBytes: number;
  limitBytes: number;
  constructor(sizeBytes: number, limitBytes: number) {
    super(`El nivel serializado pesa ${(sizeBytes / 1024).toFixed(1)}KB, por encima del límite de ${(limitBytes / 1024).toFixed(0)}KB.`);
    this.name = "LevelTooLargeError";
    this.sizeBytes = sizeBytes;
    this.limitBytes = limitBytes;
  }
}

/** Presupuesto blando de tamaño (docs/level-editor-plan.md §14 P2/P7): un
 *  documento de Firestore no puede pasar de 1MiB, pero un nivel de varios
 *  cientos de KB ya es señal de que conviene simplificar geometría antes de
 *  llegar ahí — el límite por defecto es deliberadamente más chico que el
 *  límite real de Firestore. */
export function assertSize(value: unknown, limitBytes = 400 * 1024): void {
  const sizeBytes = new TextEncoder().encode(JSON.stringify(value)).length;
  if (sizeBytes > limitBytes) throw new LevelTooLargeError(sizeBytes, limitBytes);
}

/** Deja un valor listo para `setDoc`/`updateDoc`: sin `undefined`, y falla
 *  temprano (en vez de que Firestore lo rechace con un error críptico) si
 *  queda algún array anidado. No comprueba el tamaño — eso es decisión del
 *  llamador (`assertSize` es opcional y con su propio límite configurable). */
export function prepareForFirestore<T>(value: T): T {
  const clean = stripUndefined(value);
  assertNoNestedArrays(clean);
  return clean;
}
