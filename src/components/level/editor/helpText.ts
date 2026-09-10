/**
 * Redacción centralizada de la ayuda contextual del editor — Fase 15
 * (docs/level-editor-plan-v2.md §2.2). Un solo lugar para revisar el texto
 * pedagógico/explicativo de cada botón, en vez de 40 cadenas sueltas
 * repartidas en 20 componentes. El mismo dato alimenta `Tooltip` y
 * `HelpOverlay` (tecla `?`).
 *
 * Claves estables por zona: "toolbox.*", "topbar.*", "bottombar.*",
 * "property.*", "mission.*", "dialog.*", "event.*", "zone.*", "polygon.*",
 * "depth.*", "asset.*", "challenge.*".
 */
export interface HelpEntry {
  /** Texto corto del tooltip. */
  text: string;
  /** Atajo de teclado asociado, si existe uno fijo (ver también `SHORTCUTS`
   *  en `useEditorHotkeys.ts` para los atajos globales). */
  shortcut?: string;
  /** Explicación más larga, solo para `HelpOverlay`. */
  long?: string;
}

export const HELP: Record<string, HelpEntry> = {
  // ── Barra superior ──
  "topbar.scene": { text: "Fondo, capas de parallax y profundidad 2.5D de la escena." },
  "topbar.save": { text: "Guarda el nivel en Firestore.", shortcut: "Ctrl+S" },
  "topbar.play": { text: "Juega el nivel tal como está guardado, sin salir del editor.", shortcut: "P" },

  // ── Barra inferior ──
  "bottombar.zoomOut": { text: "Alejar el lienzo." },
  "bottombar.zoomIn": { text: "Acercar el lienzo." },
  "bottombar.grid": { text: "Muestra una rejilla de referencia sobre el lienzo (solo visual, no afecta el juego)." },
  "bottombar.snap": { text: "Ajusta los puntos que arrastrás a la rejilla más cercana, para alinear más fácil." },
  "bottombar.debug": { text: "Dibuja la malla de navegación real (por dónde puede caminar Alex) sobre la escena." },
  "bottombar.simplify": { text: "Quita vértices colineales o duplicados sin cambiar la forma del polígono." },
  "bottombar.play": { text: "Juega el nivel tal como está guardado, sin salir del editor.", shortcut: "P" },

  // ── Toolbox — Navegación ──
  "toolbox.walkable": { text: "Dibuja una zona por donde Alex puede caminar.", shortcut: "W" },
  "toolbox.blocked": { text: "Dibuja una zona que bloquea el paso, aunque esté dentro de un área transitable.", shortcut: "B" },
  "toolbox.spawn": { text: "Marca dónde aparece Alex al empezar el nivel." },
  "toolbox.exit": { text: "Crea una salida: un lugar donde, al entrar, el jugador va a otro nivel o al mapa." },

  // ── Toolbox — Gameplay ──
  "toolbox.zonePolygon": { text: "Dibuja una zona de interacción con forma libre (dispara diálogos, misiones o eventos)." },
  "toolbox.zoneCircle": { text: "Dibuja una zona de interacción circular." },
  "toolbox.dialogNew": { text: "Crea un diálogo nuevo — una serie de líneas de texto que se pueden mostrar desde un evento o entidad." },
  "toolbox.eventNew": { text: "Crea una regla de evento nueva: cuando pasa algo, hacé una o varias acciones." },
  "toolbox.missionNew": { text: "Crea una misión nueva: un título, una premisa y una lista de objetivos a cumplir." },

  // ── Panel de propiedades (entidad) ──
  "property.duplicate": { text: "Duplica esta entidad con las mismas propiedades.", shortcut: "Ctrl+D" },
  "property.delete": { text: "Elimina esta entidad del nivel.", shortcut: "Supr" },
  "property.standPoint": { text: "Marca en el lienzo dónde se detiene Alex antes de interactuar con esta entidad." },

  // ── Misión ──
  "mission.delete": { text: "Elimina esta misión del nivel." },
  "mission.addObjective": { text: "Agrega un objetivo nuevo a la misión." },
  "mission.removeObjective": { text: "Quita este objetivo de la misión." },

  // ── Diálogo ──
  "dialog.delete": { text: "Elimina este diálogo del nivel." },
  "dialog.addLine": { text: "Agrega una línea nueva al diálogo." },
  "dialog.removeLine": { text: "Quita esta línea del diálogo." },

  // ── Regla de evento ──
  "event.delete": { text: "Elimina esta regla de evento." },
  "event.addCondition": { text: "Agrega una condición: la regla solo se dispara si también se cumple esto." },
  "event.removeCondition": { text: "Quita esta condición." },
  "event.addAction": { text: "Agrega una acción a la cadena — se ejecutan en orden, de arriba hacia abajo." },
  "event.removeAction": { text: "Quita esta acción de la cadena." },
  "event.moveActionUp": { text: "Mueve esta acción antes en la cadena." },
  "event.moveActionDown": { text: "Mueve esta acción después en la cadena." },

  // ── Zona ──
  "zone.delete": { text: "Elimina esta zona del nivel." },

  // ── Punto de destino ──
  "exit.delete": { text: "Elimina este punto de destino del nivel." },
  "exit.target": { text: "A dónde va el jugador al pisar esta zona: a otro nivel, al mapa del mundo, o una ruta manual." },

  // ── Editor de polígonos (canvas) ──
  "polygon.close": { text: "Cierra el polígono con los puntos dibujados (mínimo 3)." },
  "polygon.cancel": { text: "Cancela el dibujo en curso sin guardar nada.", shortcut: "Esc" },

  // ── Profundidad / parallax ──
  "depth.addLayer": { text: "Agrega una capa de fondo nueva para el efecto de parallax." },
  "depth.removeLayer": { text: "Elimina esta capa de parallax." },

  // ── Biblioteca de imágenes ──
  "asset.upload": { text: "Sube una imagen nueva a tu biblioteca." },
  "asset.rename": { text: "Cambia el nombre de esta imagen." },
  "asset.delete": { text: "Borra esta imagen de tu biblioteca de forma permanente." },

  // ── Selector de desafío ──
  "challenge.link": { text: "Elegí un módulo del currículo para que esta entidad lo dispare como desafío." },
  "challenge.change": { text: "Cambia el módulo vinculado a esta entidad." },
  "challenge.unlink": { text: "Quita el desafío vinculado — la entidad deja de disparar un módulo." },
};

/** Lee una entrada de ayuda por clave. Avisa en consola en desarrollo si
 *  falta, en vez de lanzar — un tooltip vacío no debe romper el editor. */
export function help(key: string): HelpEntry {
  const entry = HELP[key];
  if (!entry && process.env.NODE_ENV !== "production") {
    console.warn(`[helpText] falta la clave "${key}" en HELP`);
  }
  return entry ?? { text: "" };
}
