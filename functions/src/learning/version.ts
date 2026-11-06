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
 *
 * Módulo propio para que el navegador lo importe sin cargar el catálogo.
 */
export const CONTENT_VERSION = 4;
