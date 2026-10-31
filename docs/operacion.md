# Operación, estabilización y verificación

## Acceso infantil

`verifyChildPin` confirma los fallos dentro de una transacción y devuelve el error después del commit. A los cinco fallos bloquea el perfil durante un minuto; los siguientes fallos tras expirar el bloqueo aumentan la espera hasta 30 minutos. Un PIN correcto fuera del bloqueo limpia el contador. El bloqueo es por perfil, no por navegador, y vale también en `/perfiles` (dispositivo de la familia): allí la comprobación pasa por el mismo callable y solo devuelve `{ ok: true }`, sin token infantil. La familia desbloquea restableciendo el PIN en Ajustes.

**Hash del PIN.** El navegador nunca calcula ni escribe el hash: `setChildPin` (solo sesión de la familia) guarda `HMAC-SHA256(PIN_PEPPER, [parentId, childId, pin])` con `pinHashVersion: 2`, y las reglas rechazan cualquier escritura de `pinHash`/`pinHashVersion` desde clientes. Los perfiles con el SHA-256 anterior (sin versión) siguen entrando y se migran al HMAC en el primer PIN correcto. Con 10⁴ PIN posibles, salar no protegería nada; lo que impide invertir un hash filtrado es que el secreto no sale de Functions.

Antes del primer despliegue con este cambio, crea el secreto (al menos 32 caracteres aleatorios) en el proyecto:

```sh
openssl rand -base64 48   # copia el valor
npx firebase functions:secrets:set PIN_PEPPER --project "$FIREBASE_PROJECT_ID"   # pégalo cuando lo pida
```

No lo rotes sin plan: los hashes v2 dejarían de coincidir y habría que restablecer todos los PIN. Los emuladores no usan Secret Manager y aplican un valor fijo de pruebas.

**Enlace para otro dispositivo.** Tiene la forma `/entrar/{parentId}#k={clave}`. La clave son 32 bytes aleatorios que Ajustes genera y guarda en `parents/{parentId}.deviceAccessKey` (solo legible por la familia); va en el fragmento, que el navegador no envía al servidor web ni en `Referer`. `listChildrenPublic` y `verifyChildPin` sin sesión de la familia la exigen y responden `failed-precondition` si falta o no coincide. Así, conocer el `parentId` ya no permite listar los nombres de los hijos ni gastar sus intentos de PIN para bloquearlos. "Generar un enlace nuevo" rota la clave e invalida los enlaces compartidos; no cierra las sesiones ya abiertas en otros dispositivos.

**Migración:** los enlaces anteriores (sin clave) dejan de funcionar y muestran que hay que pedir uno nuevo. Al publicar, avisa a las familias de que vuelvan a compartir el enlace desde Ajustes. El contrato de los callables cambió: Functions y Worker anuncian el **protocolo 4** y deben desplegarse desde la misma revisión.

**Tres clases más y calibración del repaso (protocolo 12):** Functions conoce `funcion-cuadratica`, `volumen-conos-esferas` y `probabilidad-condicional` (49 clases). El repaso diario elige problemas con `calibrationData.ts` (vacío hasta que haya datos: sin cambio de comportamiento). Sin migración. Despliega ambos con `npm run deploy` y comprueba que `verify:deployment` anuncia el protocolo 12.

**Rachas, errores en el repaso y tres clases nuevas (protocolo 11):** Functions conoce `interes-compuesto`, `progresiones` y `distancia-punto-medio` (46 clases), y el repaso diario lee las últimas 300 respuestas del perfil al empezar (consulta por `createdAt`, índice automático) para priorizar errores que se repiten; guarda la racha en `learningProgress/diario`. Sin migración. Despliega ambos con `npm run deploy` y comprueba que `verify:deployment` anuncia el protocolo 11.

**Repaso espaciado diario (protocolo 10):** Functions acepta `lessonId: "diario"` (acciones `begin`, `answer`, `hint` y `next`; `reveal` se rechaza), decide qué clases entran leyendo el avance y la ubicación del perfil, y guarda la agenda en `learningProgress/diario`. La primera sesión terminada de cada día de Lima da 2 estrellas. Despliega ambos con `npm run deploy` y comprueba que `verify:deployment` anuncia el protocolo 10.

**Clases de 3.° a 5.° de secundaria (protocolo 9):** seis clases nuevas (sistemas, crecimiento exponencial, trigonometría, dispersión, conteo y transformaciones; 43 en total). Functions debe conocer sus identificadores para registrar avance y la ubicación las incluye. Despliega frontend y Functions con `npm run deploy` desde la misma revisión y comprueba que `verify:deployment` anuncia el protocolo 9.

**Ubicación, diagnóstico de errores y CNEB (protocolo 8):** Functions acepta la evaluación de ubicación (`lessonId: "ubicacion"`, acciones `begin`, `answer` y `skip`) y guarda el diagnóstico de cada respuesta en `learningEvidence`. Despliega ambos con `npm run deploy` y comprueba que `verify:deployment` anuncia el protocolo 8. El análisis de preguntas se ejecuta aparte: `npm run functions:build && FIREBASE_PROJECT_ID=<proyecto> npm run analisis:items -- --desde AAAA-MM-DD` con credenciales de administración (`gcloud auth application-default login`); el informe queda en `informes/` (ignorado por Git) y solo contiene agregados.

**Análisis de preguntas en GitHub Actions (sin claves).** El flujo `Análisis de preguntas` (`.github/workflows/analisis-items.yml`) corre el día 1 de cada mes y a demanda (Actions → Análisis de preguntas → Run workflow, con `desde` y `minimo` opcionales). Publica el informe en el resumen de la ejecución y como artefacto durante 30 días. Se autentica con Workload Identity Federation, sin claves de cuenta de servicio, y se omite mientras falten estas **variables** del repositorio (Settings → Secrets and variables → Actions → Variables; no son secretos): `FIREBASE_PROJECT_ID`, `GCP_WORKLOAD_IDENTITY_PROVIDER` y `GCP_ANALYSIS_SERVICE_ACCOUNT`. Configuración única, desde una sesión con permisos de administración del proyecto:

```sh
PROJECT=<proyecto>; NUM=$(gcloud projects describe $PROJECT --format='value(projectNumber)')
gcloud iam service-accounts create maths-analisis --project $PROJECT --display-name "Análisis de preguntas (solo lectura)"
gcloud projects add-iam-policy-binding $PROJECT --member "serviceAccount:maths-analisis@$PROJECT.iam.gserviceaccount.com" --role roles/datastore.viewer
gcloud iam workload-identity-pools create github --project $PROJECT --location global
gcloud iam workload-identity-pools providers create-oidc maths --project $PROJECT --location global --workload-identity-pool github \
  --issuer-uri https://token.actions.githubusercontent.com \
  --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition "assertion.repository == 'dgarboleda/maths'"
gcloud iam service-accounts add-iam-policy-binding maths-analisis@$PROJECT.iam.gserviceaccount.com --project $PROJECT \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/$NUM/locations/global/workloadIdentityPools/github/attribute.repository/dgarboleda/maths"
```

**Calibrar con los datos.** El flujo genera además `informes/calibrationData.ts` (también en local con `--calibracion informes/calibrationData.ts [--minimo-calibracion 30]`). Para aplicarlo: revisa el informe (sección «Por clase» y alertas), copia el archivo a `functions/src/learning/calibrationData.ts`, abre un PR (las pruebas del catálogo y del repaso deben pasar) y despliega frontend y Functions desde la misma revisión. Las alertas «muy difícil», «errores no previstos» y «respuesta frecuente no prevista» se corrigen editando la pregunta (enunciado, opciones o `errors`), no con la calibración.

Valores de las variables: `GCP_WORKLOAD_IDENTITY_PROVIDER = projects/<NUM>/locations/global/workloadIdentityPools/github/providers/maths` y `GCP_ANALYSIS_SERVICE_ACCOUNT = maths-analisis@<proyecto>.iam.gserviceaccount.com`. La cuenta solo lee Firestore; la condición del proveedor limita el acceso a este repositorio. Los artefactos de un repositorio público son descargables por usuarios con acceso de lectura: el informe solo contiene agregados por pregunta y el número de perfiles.

**Aventuras por unidad y 37 lecciones (protocolo 7):** Functions acepta los identificadores de las siete aventuras y valida cada plan con las entradas de su definición; el frontend sin ese Functions no puede guardar las aventuras nuevas. Despliega ambos con `npm run deploy` y comprueba que `verify:deployment` anuncia el protocolo 7.

**Currículo de 32 lecciones y repaso mixto (protocolo 6):** Functions valida ahora los identificadores `repaso-{unidad}` y lee el avance de las clases de la unidad para decidir qué mezclar; el frontend sin ese Functions no puede abrir el repaso ni las clases nuevas. Despliega ambos con `npm run deploy` y comprueba que `verify:deployment` anuncia el protocolo 6.

**Contenido educativo v2 (protocolo 5):** el navegador y Functions comparten el catálogo de lecciones; al cambiar los bancos ambos deben desplegarse desde la misma revisión (`npm run deploy`) y anuncian el **protocolo 5**. El avance existente se migra automáticamente sin perder logros (ver [reorientación](reorientacion-aprendizaje.md#diseño-de-los-bancos-contenido-v2)).

Las pruebas llaman a los callables reales en el emulador y comprueban la clave del enlace, el formato v2 del hash, el contador, el rechazo durante el bloqueo, la expiración y los claims del token. El recorrido de navegador abre el enlace compartido en un contexto sin sesión del padre. Los tokens sintéticos usados por las pruebas de reglas siguen siendo útiles, pero no sustituyen estas comprobaciones.

## Estrellas y datos existentes

`updateStarBalance` autentica al padre o al hijo exacto, comprueba motivo/importe y escribe movimiento y saldo en una transacción. El hijo solo puede pedir premios positivos de hasta 30 estrellas por problema o 15 por boss, con un **tope diario de 1000** por sesión infantil (`starBalance/childDaily`, día UTC); al superarlo el callable responde `{ total, limited: true }` sin acreditar ni fallar, para que el juego continúe. El tope no se aplica a la sesión de la familia ni a los premios de las lecciones nuevas, que calcula el servidor. Los descuentos corresponden al padre y no pueden dejar el saldo negativo. El id de operación permite repetir una petición sin sumar dos veces. Los canjes usan un id estable derivado de la solicitud.

Los agregados nuevos llevan `schemaVersion: 1`. Si el documento no existe o pertenece a la versión anterior, la primera operación/lectura inicializa el saldo desde **todo el libro mayor en la misma transacción**. Así también se reparan los agregados antiguos que habían perdido el histórico. Dos premios simultáneos o un premio durante la migración se serializan por el documento de saldo.

`ensureStarBalanceSeeded(firestore, db, parentId, childId, true)` fuerza una reconciliación, únicamente con sesión del padre. El saldo normal no descarga el historial en cada pantalla.

Las reglas prohíben al hijo escribir `starLedger`/`starBalance` directamente. El padre conserva escritura directa (corrección manual, borrado y migraciones); si desalinea el agregado, la reconciliación lo recalcula. Los intentos (`attempts`) que crea la sesión infantil se validan en reglas: campos conocidos, tipos y `createdAt` igual a la hora del servidor. Las solicitudes de canje (`redemptionRequests`) de la sesión infantil también: solo `pendiente`, sin datos de resolución, `starsSpent` entero positivo que no supere `starBalance/total`, etiqueta de 1 a 120 caracteres y hora del servidor. Las reglas no pueden contar documentos, así que no limitan cuántas solicitudes pendientes acumula un perfil; la familia las rechaza desde Recompensas. La resolución de las preguntas sigue ocurriendo en el dispositivo: estas medidas protegen el alcance de la sesión y la integridad del saldo, pero no prueban criptográficamente que un niño haya resuelto una pregunta. Una economía que necesite resistencia completa a trampas requiere emitir y corregir desafíos en el servidor.

Los clientes anteriores a este cambio pueden fallar al intentar escribir estrellas directamente con sesión infantil tras actualizar las reglas. Publica backend/reglas/frontend en la misma ventana y pide recargar las pestañas antiguas; no mantengas deliberadamente esos clientes junto a las reglas nuevas.

## Eliminación y analítica

La eliminación marca primero el perfil con `deleting: true`. Reglas y Functions rechazan nuevas escrituras del hijo mientras se borran lotes de 450 documentos. Se incluyen `skillsProgress`, `attempts`, `starLedger`, `starBalance`, `redemptionRequests`, `placements`, `badges` y `records`. Si hay un fallo, reintenta el borrado como padre: el marcador conserva cerrado el acceso infantil.

La analítica del editor usa consultas indexadas por `skillId` y `createdAt`, limitadas a 201 documentos por módulo/hijo: muestra 200 y usa el adicional para señalar que hay más historial. Ya no descarta silenciosamente módulos más allá de los primeros 30. El resultado describe una muestra reciente, no el total de toda la vida. Despliega `firestore.indexes.json` y espera a que los índices estén listos.

## Telemetría y estado del despliegue

En producción los límites de error y las excepciones/rechazos globales envían a `/api/telemetry` contexto, nombre técnico, código y digest, junto con la versión del build añadida por el servidor. No se transmiten mensajes de error, stack traces, URL, ids, nombres, PIN ni el objeto `extra`. El navegador limita a diez envíos por carga y evita duplicar el mismo objeto de error.

El Route Handler exige mismo origen, JSON, campos permitidos y un cuerpo de hasta 2 KiB. Los eventos `client_error` quedan como JSON en Workers Logs, ya habilitado en `wrangler.jsonc`. Busca por `event` y `release`. Los datos recibidos siguen siendo telemetría del cliente, no una fuente de autenticación. Si se necesita limitar tráfico hostil desde clientes ajenos al navegador, configura una regla de rate limiting para esta ruta en la cuenta Cloudflare; el límite de pestaña no sustituye ese control.

`/api/health` y `deploymentStatus` exponen servicio, protocolo y commit, sin credenciales. `npm run verify:deployment` compara ambos contra Git (o `MATHS_RELEASE`). No certifica el contenido de las reglas ni de los índices: se publican juntos mediante `npm run deploy` y se verifican funcionalmente en las suites contra emuladores. La comprobación remota exige `MATHS_APP_URL`, `FIREBASE_PROJECT_ID` y, si cambia, `FIREBASE_FUNCTIONS_REGION`.

## Desarrollo y pruebas de producción

Para un entorno completamente local, añade a `.env.local`:

```dotenv
NEXT_PUBLIC_FIREBASE_EMULATORS=1
NEXT_PUBLIC_FIREBASE_API_KEY=demo-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-numerario.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-numerario
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-numerario.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000
NEXT_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:0000000000000000
```

`npm run perf` construye con estos valores, arranca `next start` y mide con Lighthouse login, nivel real y editor autenticados. No apunta al proyecto de producción. En CI las auditorías se reparten en dos runners con `PERF_GRUPO` (1: login, clase y aventura; 2: juego y editor), cada uno con su propia sesión; sin la variable se auditan todas. Las e2e se reparten por proyecto: escritorio en dos shards y móvil, que tarda casi el doble, en tres. Para depurar un solo grupo en local: `PERF_GRUPO=2 npm run perf`. Los informes completos están en los adjuntos de `performance-reports/playwright`. Para volver a compilar una publicación real, usa `.env.local` y las variables de build reales con `npm run build`.

## Dependencias y respaldos

Se retiraron la dependencia no usada `claude` y Lighthouse CI antiguo. Las mediciones usan Lighthouse directamente. Next y su configuración ESLint se actualizan juntos; las versiones compatibles de las otras dependencias quedan fijadas en los dos lockfiles. Los overrides de gRPC, glob de node-minify y uuid de gaxios corrigen dependencias transitivas concretas sin bajar Firebase ni Next a versiones mayores anteriores.

`npm run audit:security` comprueba los paquetes del frontend y Functions. Los informes completos incluyen herramientas de desarrollo aunque el control bloqueante se centre en avisos altos/críticos de ejecución. No se fuerza un cambio incompatible ni se suprime un aviso sin parche. Revisa las cadenas de `braces`/herramientas de build y OpenTelemetry en `security-reports/`; actualiza cuando el proveedor publique una corrección compatible.

El respaldo JSON conserva el formato existente. No es una copia de los bytes de Storage ni de las cuentas, intentos o saldos. La importación puede haber escrito parte del paquete si falla una etapa: conserva el archivo original, revisa el resultado y reintenta. No presentes ese archivo como recuperación completa del proyecto Firebase.
