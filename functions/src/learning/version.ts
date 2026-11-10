/**
 * Versión del contenido: al cambiar los bancos se incrementa y el motor
 * migra el avance guardado (`migrateProgress`) sin perder logros.
 *
 * Historial:
 * - 2: bancos con seis formas paralelas por lección.
 * - 3: auditoría didáctica (ejemplos, tercera y cuarta formulación
 *   conceptual): una comprobación en curso con la versión anterior se
 *   reinicia para no mezclar respuestas de enunciados distintos.
 * - 4: operaciones escritas (columnas y división larga con todo el
 *   procedimiento) y clases base de primaria opcionales.
 * - 5: decimales en las operaciones escritas: multiplicación en columnas,
 *   división con cociente, dividendo o divisor decimal y formas con
 *   decimales en suma y resta (cambian bancos de clases existentes).
 * - 6: la coma la pone el alumno (resultado de suma, resta y multiplicación
 *   y cociente de la galera); con decimales, la galera empieza por las
 *   unidades (0,…) y la respuesta guarda la coma («C0,75;…»).
 * - 7: análisis y corrección de un error en la práctica de suma de fracciones.
 *
 * Módulo propio para que el navegador lo importe sin cargar el catálogo.
 */
export const CONTENT_VERSION = 7;
