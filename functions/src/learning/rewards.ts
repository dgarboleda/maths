/**
 * Estrellas que premia el servidor (`recordLearningAction`). Única fuente:
 * la usa el servidor para acreditar y la interfaz para explicar cuánto aporta
 * cada sección y cuántas quedan por ganar.
 */
export const STAR_REWARDS = {
  /** Clase terminada (una vez por clase). */
  lesson: 5,
  /** Repaso mixto de una unidad superado (una vez por unidad). */
  mixed: 5,
  /** Aventura completada (una vez por aventura). */
  adventure: 10,
  /** Primera sesión del repaso diario terminada cada día. */
  daily: 2,
  /** Extra al alcanzar una racha de 7, 14 o 30 días. */
  streakBonus: 3,
} as const;
