# Operación, estabilización y verificación

## Acceso infantil

`verifyChildPin` confirma los fallos dentro de una transacción y devuelve el error después del commit. A los cinco fallos bloquea el perfil durante un minuto; los siguientes fallos tras expirar el bloqueo aumentan la espera hasta 30 minutos. Un PIN correcto fuera del bloqueo limpia el contador. El bloqueo es por perfil, no por navegador.

Las pruebas llaman a los callables reales en el emulador y comprueban el contador, el rechazo durante el bloqueo, la expiración y los claims del token. El recorrido de navegador abre el enlace compartido en un contexto sin sesión del padre. Los tokens sintéticos usados por las pruebas de reglas siguen siendo útiles, pero no sustituyen estas comprobaciones.

## Estrellas y datos existentes

`updateStarBalance` autentica al padre o al hijo exacto, comprueba motivo/importe y escribe movimiento y saldo en una transacción. El hijo solo puede pedir premios positivos de hasta 30 estrellas por problema o 15 por boss; los descuentos corresponden al padre y no pueden dejar el saldo negativo. El id de operación permite repetir una petición sin sumar dos veces. Los canjes usan un id estable derivado de la solicitud.

Los agregados nuevos llevan `schemaVersion: 1`. Si el documento no existe o pertenece a la versión anterior, la primera operación/lectura inicializa el saldo desde **todo el libro mayor en la misma transacción**. Así también se reparan los agregados antiguos que habían perdido el histórico. Dos premios simultáneos o un premio durante la migración se serializan por el documento de saldo.

`ensureStarBalanceSeeded(firestore, db, parentId, childId, true)` fuerza una reconciliación, únicamente con sesión del padre. El saldo normal no descarga el historial en cada pantalla.

Las reglas prohíben al hijo escribir `starLedger`/`starBalance` directamente. El padre conserva sus permisos de administración. La resolución de las preguntas sigue ocurriendo en el dispositivo: estas medidas protegen el alcance de la sesión y la integridad del saldo, pero no prueban criptográficamente que un niño haya resuelto una pregunta. Una economía que necesite resistencia completa a trampas requiere emitir y corregir desafíos en el servidor.

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

`npm run perf` construye con estos valores, arranca `next start` y mide con Lighthouse login, nivel real y editor autenticados. No apunta al proyecto de producción. Los informes completos están en los adjuntos de `performance-reports/playwright`. Para volver a compilar una publicación real, usa `.env.local` y las variables de build reales con `npm run build`.

## Dependencias y respaldos

Se retiraron la dependencia no usada `claude` y Lighthouse CI antiguo. Las mediciones usan Lighthouse directamente. Next y su configuración ESLint se actualizan juntos; las versiones compatibles de las otras dependencias quedan fijadas en los dos lockfiles. Los overrides de gRPC, glob de node-minify y uuid de gaxios corrigen dependencias transitivas concretas sin bajar Firebase ni Next a versiones mayores anteriores.

`npm run audit:security` comprueba los paquetes del frontend y Functions. Los informes completos incluyen herramientas de desarrollo aunque el control bloqueante se centre en avisos altos/críticos de ejecución. No se fuerza un cambio incompatible ni se suprime un aviso sin parche. Revisa las cadenas de `braces`/herramientas de build y OpenTelemetry en `security-reports/`; actualiza cuando el proveedor publique una corrección compatible.

El respaldo JSON conserva el formato existente. No es una copia de los bytes de Storage ni de las cuentas, intentos o saldos. La importación puede haber escrito parte del paquete si falla una etapa: conserva el archivo original, revisa el resultado y reintenta. No presentes ese archivo como recuperación completa del proyecto Firebase.
