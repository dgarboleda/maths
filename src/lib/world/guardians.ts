/**
 * Amenazas Null por zona (docs/guion-narrativa-math-quest.md §14, §19) — pura
 * ambientación sobre el mismo estado de mundo que ya existe:
 *
 * - `ZONE_GUARDIAN` da nombre y arte a la corrupción de cada región. El
 *   guardián se muestra "vencido" cuando la zona ya está 100% dominada
 *   (`masteredCountForStrand`), sin crear ningún candado ni progreso nuevo.
 * - `MINOR_NULL_CYCLE` decora los objetos en estado "bloqueado" con el tipo
 *   de Null que los mantiene corrompidos. Es cosmético: el candado real
 *   sigue viniendo enteramente de `isUnlocked`/prerequisitos reales.
 */
export interface ZoneGuardian {
  name: string;
  /** Cómo corrompe la región mientras sigue activo. */
  corruption: string;
  /** Mensaje al quedar la zona 100% dominada. */
  defeated: string;
  /** Ilustración del guardián, en public/illustrations/. */
  art: string;
}

// Fase 30 (docs/plan-jugabilidad.md §4): antes los 5 compartían la misma
// imagen (`null-guardian.webp`), que ahora queda reservada para el
// guardián del mundo (Khaos, Fase 34) — cada zona tiene su propio Null,
// elegido por afinidad con su texto de corrupción ("drena" → drenador,
// "corrompe" → corruptor, "deforma" → convertidor, "fragmenta" →
// fragmentador, "enreda" → controlador).
export const ZONE_GUARDIAN: Record<string, ZoneGuardian> = {
  aritmetica: {
    name: "El Apagador",
    corruption: "Drena el AXIA de Ciudad Central noche tras noche.",
    defeated: "El Apagador se disuelve: Ciudad Central vuelve a brillar por completo.",
    art: "/illustrations/null-drenador.webp",
  },
  algebra: {
    name: "El Predictor",
    corruption: "Corrompe los datos y las predicciones del Laboratorio Futuro.",
    defeated: "El Predictor se disuelve: el Laboratorio Futuro vuelve a calcular con AXIA puro.",
    art: "/illustrations/null-corruptor.webp",
  },
  geometria: {
    name: "La Distorsión",
    corruption: "Deforma el espacio del Desierto Geométrico.",
    defeated: "La Distorsión se disuelve: el Desierto Geométrico recupera su forma.",
    art: "/illustrations/null-convertidor.webp",
  },
  medicion: {
    name: "El Devorador",
    corruption: "Fragmenta los sistemas numéricos de las Cumbres.",
    defeated: "El Devorador se disuelve: las Cumbres Numéricas quedan restauradas.",
    art: "/illustrations/null-fragmentador.webp",
  },
  logica: {
    name: "El Enigma",
    corruption: "Enreda la lógica de las Islas del Pensamiento en acertijos sin salida.",
    defeated: "El Enigma se disuelve: las Islas del Pensamiento vuelven a tener sentido.",
    art: "/illustrations/null-controlador.webp",
  },
};

export interface MinorNull {
  label: string;
  art: string;
}

/** Se turnan sobre los objetos bloqueados de una zona, por índice. */
export const MINOR_NULL_CYCLE: MinorNull[] = [
  { label: "Null Convertidor", art: "/illustrations/null-convertidor.webp" },
  { label: "Null Corruptor", art: "/illustrations/null-corruptor.webp" },
];
