# Math Quest

Plataforma para adolescentes: clases de matemáticas con explicaciones visuales, ejemplos razonados, práctica guiada y autónoma, repaso y una aventura donde aplicar lo aprendido. Incluye un programa inicial de 12 lecciones y seguimiento familiar. La creación de mundos y niveles queda como herramienta de contenido adicional.

El alcance, los criterios educativos y la revisión docente/piloto pendientes están descritos en [reorientación del aprendizaje](docs/reorientacion-aprendizaje.md). El [inventario de contenido](docs/auditoria-contenido.md) cubre los 67 módulos anteriores.

Next.js 16 + React 19 + TypeScript + Tailwind. El frontend se empaqueta con OpenNext para Cloudflare Workers. Firebase aporta Auth, Firestore, Storage y Cloud Functions.

## Desarrollo

Requisitos: Node.js 22 actualizado, npm, Java 21 para los emuladores y Chromium para las pruebas de navegador.

```sh
npm ci
npm ci --prefix functions
cp .env.local.example .env.local
npm run dev
```

Completa las seis variables `NEXT_PUBLIC_FIREBASE_*` desde la configuración de la app web en Firebase Console. Se incorporan **al compilar**, no al arrancar el Worker. No uses una API key creada manualmente en Google Cloud para sustituir la clave de Firebase Auth.

Para desarrollar con datos locales, usa los valores demo documentados en [operación](docs/operacion.md) y `NEXT_PUBLIC_FIREBASE_EMULATORS=1`. En otra terminal:

```sh
npm run emuladores
```

Este comando compila Functions y arranca Auth, Firestore, Storage y Functions bajo `demo-numerario`. Las pruebas configuran automáticamente las variables demo y no requieren un proyecto real. Instala las dependencias de ambos paquetes antes de ejecutarlas.

## Comprobaciones

```sh
npm run lint                 # Incluye las fuentes de Functions
npm run typecheck            # Tipos y rutas de Next
npm run functions:build      # TypeScript y marca de versión del backend
npm test                     # Lógica, componentes y accesibilidad
npm run test:integration     # Persistencia, reglas y callables reales
npm run e2e                  # Chromium, escritorio y móvil
npm run audit:security       # Auditoría de ambos paquetes
npm run perf                 # Producción: login, clase, aventura, nivel y editor
npm run build                # Worker completo de OpenNext
```

`test:integration`, `e2e` y `perf` arrancan/reutilizan emuladores. Para instalar el navegador: `npx playwright install --with-deps chromium`. Si ya existe uno en el sistema, define `PLAYWRIGHT_CHROMIUM_PATH`.

La CI verifica las tres capas de pruebas, el empaquetado del Worker, las dependencias y los presupuestos de producción. `performance/budgets.json` establece límites de transferencia de JS, peso total y accesibilidad; Lighthouse conserva la sesión de prueba en juego/editor y sus informes se adjuntan al resultado. Las puntuaciones de rendimiento se conservan como diagnóstico, sin umbral temporal que haga inestable la CI.

La auditoría bloquea vulnerabilidades altas/críticas en dependencias de ejecución y errores del servicio de auditoría. También guarda informes completos de herramientas de desarrollo en `security-reports/`, incluidos los avisos que todavía no tienen parche compatible.

## Funcionamiento y datos

- `/panel`: perfiles, progreso, recompensas y ajustes de la familia.
- `/panel/editor`: niveles y mundo; `/panel/curriculum`: módulos personalizados.
- `/entrar/{parentId}`: acceso desde otro dispositivo. Functions verifica el PIN, persiste los fallos/bloqueos y emite una sesión limitada al hijo.
- `/jugar/{childId}`: espacio educativo con programa y aventura incluidos, sin evaluación obligatoria ni niveles preparados por la familia.
- `/jugar/{childId}/aprende`: 12 lecciones en tres unidades; `/aprende/{lessonId}`: clase, ejemplos, práctica, comprobación y aplicación. `/practicar` permite entrar a la práctica de un tema.
- `/jugar/{childId}/aventura`: El apagón, con decisiones de distribución de energía y consecuencias persistentes. `/mapa` mantiene los mundos y actividades adicionales de la familia.
- Functions evalúa y registra la nueva evidencia educativa, con operaciones idempotentes y revisiones para evitar sobrescrituras entre pestañas. Pedir ayuda conserva la recompensa y se distingue de la resolución autónoma.
- `/panel/progreso`: estados educativos y repasos, separados del histórico de otras actividades. La ruta `/ciudad-central-legacy` se conserva para regresión.
- Las estrellas se actualizan en Functions: libro mayor y agregado se confirman juntos, con operaciones idempotentes y migración/reconciliación del histórico. Las reglas impiden que el hijo escriba directamente ambos documentos.
- El editor consulta una muestra de los últimos 200 intentos por módulo; la interfaz señala cuándo hay más historial.
- Al borrar un perfil se cierran sus escrituras infantiles y se vacían todas sus subcolecciones, incluidas las marcas personales, con lecturas y lotes acotados.
- Los respaldos JSON exportan mundo, niveles, módulos y fichas de imágenes. **No incluyen los bytes de Storage ni el progreso familiar**. La restauración fusiona datos por etapas y no es una transacción global. Conserva también una copia de las imágenes para una recuperación completa.

## Despliegue

Necesitas acceso al proyecto Firebase (Auth, Firestore, Storage aprovisionado y Functions) y al Worker Cloudflare. No se crean cuentas ni se activa facturación desde estos scripts.

```sh
export FIREBASE_PROJECT_ID=tu-proyecto
export MATHS_APP_URL=https://tu-dominio
npm run deploy
npm run verify:deployment
```

Confirma primero los cambios en Git. `deploy` valida el código, construye ambos servicios y despliega **Functions, reglas, índices y Storage antes del frontend**. Por último compara las marcas de versión del Worker y Functions. Los índices nuevos deben haber terminado de construirse antes de usar la analítica.

`npm run deploy:frontend` existe para una publicación deliberada del Worker únicamente; no actualiza Firebase. En Workers Builds, configura las seis variables públicas en **Settings → Build → Build variables and secrets**, tanto para Production como Preview, y coordina el despliegue de Firebase desde la misma revisión. Las variables de runtime del Worker no sustituyen las del build.

El frontend usa Route Handlers para telemetría y estado de versión. La ruta `/api/dev/walkable-area` escribe fuentes exclusivamente con `NODE_ENV=development` y devuelve 404 en producción. No hay Server Actions. La caché incremental de OpenNext permanece desactivada hasta provisionar R2.

La operativa, el orden de migración, la telemetría y los límites restantes están descritos en [docs/operacion.md](docs/operacion.md). Los otros documentos de `docs/` conservan los planes y decisiones históricas del producto.
