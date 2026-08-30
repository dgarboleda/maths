# Evaluación de la interfaz con Playwright

Esta es la vuelta práctica a la auditoría de código
(`auditoria-rendimiento-accesibilidad.md`): en vez de leer el código, se
**usa** la aplicación desde un navegador de verdad y se comprueba que hace lo
que se supone que hace.

## Cómo se evaluó

- **Playwright** conduce Chromium sobre la app real, en escritorio (1280×720)
  y en móvil (Pixel 7).
- **Emuladores de Firebase** (Auth y Firestore, proyecto `demo-numerario`):
  las pruebas registran un padre, crean un perfil de hijo, entran con su PIN,
  resuelven problemas y piden un canje. Nada está simulado en el cliente: se
  ejercitan también las reglas de `firestore.rules`.
- **axe-core** (WCAG 2.1 niveles A y AA) sobre todas las pantallas, cada
  pestaña de los dos juegos con pestañas y las quince pantallas de concepto de
  los cinco hilos.
- Todo se apoya en roles y nombres accesibles (`getByRole`, `getByLabel`), no
  en clases CSS: si un nombre accesible desaparece, la prueba falla.

Cómo ejecutarlas: `npm run e2e` (ver `e2e/README.md`). También corren en CI,
junto con lint, tipos y compilación.

## Hallazgos

Todo lo de esta lista lo encontraron las pruebas al ejecutarse — no la lectura
del código.

| # | Hallazgo | Gravedad | Estado |
|---|---|---|---|
| 1 | **Once deslizadores sin nombre accesible.** Los controles de rango de las pantallas de concepto (fracciones, balanza, patrones, recta numérica, matrices, multiplicación) tenían su etiqueta en un `<span>` suelto, sin asociar. Un lector de pantalla anunciaba "control deslizante" sin decir de qué. `axe`: regla `label`, impacto **crítico**. | Alta | Corregido: `<label htmlFor>` + `useId` en los once. |
| 2 | **El enlace "Saltar al contenido" no saltaba.** El `<main>` no era enfocable (le faltaba `tabIndex={-1}`), así que al activarlo el foco se quedaba donde estaba. Además, en `/perfiles` y `/panel` el `id="contenido"` ni siquiera había llegado a aplicarse. | Alta | Corregido en las nueve rutas. |
| 3 | **Barras de avance sin nombre.** `role="progressbar"` sin etiqueta en las dos rondas de práctica. `axe`: `aria-progressbar-name`, impacto **serio**. | Media | Corregido (`aria-label="Avance de la ronda"`). |
| 4 | **El título de la pantalla de tema perdía el sufijo.** Salía "Perímetro · Geometría" en vez de "Perímetro · Geometría · Numerario": un título de tipo cadena en un layout intermedio corta la plantilla del padre para sus hijos. | Media | Corregido: el layout del hilo define su propia plantilla. |
| 5 | **"A la decena" seguía activo con la decena llena.** Al repartir fichas, el botón admitía más de diez y solo respondía con un mensaje de error; el equivalente táctil (arrastrar) sí lo impedía. | Media | Corregido: el botón se deshabilita al llegar a diez. |
| 6 | **Mensaje de acceso equivocado.** Con un correo que no existe, Firebase devuelve `auth/user-not-found`, que no estaba contemplado: la pantalla decía "Ocurrió un error. Intenta de nuevo." en lugar de "Correo o contraseña incorrectos.". | Baja | Corregido. |
| 7 | **El enunciado de la balanza obligaba a arrastrar** ("Arrastra el peso que equilibra la balanza") cuando ya se puede elegir con un toque o con el teclado. | Baja | Corregido ("Elige el peso…"). |
| 8 | **`next dev` bloqueaba sus propios recursos** al abrir la app en `127.0.0.1` en lugar de `localhost`: la página se servía pero no se hidrataba, y ningún botón respondía. Es un fallo de configuración de desarrollo, no de producción, pero deja el entorno inservible sin decir por qué. | Media (solo desarrollo) | Corregido con `allowedDevOrigins`. |
| 9 | **Dos contrastes por debajo del mínimo**, que la lectura del código no había cazado: el valor de los deslizadores (rosa 600 sobre lila muy claro, 4,4:1) y las monedas de 10 del tema de dinero (blanco sobre ámbar 500, 2,1:1). `axe`: `color-contrast`, impacto **serio**. | Media | Corregido (rosa 700 y texto oscuro sobre la moneda). |
| 10 | **Título repetido en la pirámide.** La cabecera pinta `Pirámide numérica` como `h1` y el juego lo repite como `h2` justo debajo. | Cosmético | Anotado, sin cambiar: es decisión de diseño. |

## Qué queda verificado de forma automática

Cada `npm run e2e` comprueba, además de lo anterior:

- La raíz redirige según haya sesión; alta, entrada y salida del padre.
- El PIN correcto entra al perfil y el equivocado no, con aviso anunciado.
- Los **tres controles que antes solo respondían al arrastre** se completan sin
  ratón: recta numérica con flechas, balanza con Enter, reparto en decenas con
  botones.
- Las pestañas se recorren con flechas, Inicio y Fin, y el panel visible es
  siempre el de la pestaña activa.
- Al contestar, el foco pasa a "Siguiente" y la corrección se anuncia.
- La tabla 10×10 se activa con el teclado y publica el resultado.
- Acertar suma estrellas, y el canje llega al padre como pendiente.
- La preferencia de sonido sobrevive a navegar y a recargar.
- Con "reducir movimiento" activado no se dibuja confeti.
- Cada ruta tiene su propio título.
- Cero incumplimientos de axe (WCAG 2.1 A y AA) en todas las pantallas.

## Lo que estas pruebas no cubren

- **Lectores de pantalla reales.** axe encuentra errores de marcado, no si el
  orden de lectura o los anuncios resultan cómodos. Hace falta una pasada
  manual con NVDA o VoiceOver.
- **Contraste sobre degradados.** axe no puede calcularlo, y hay bastantes
  (cabecera, botones del cohete, tarjetas de hilo).
- **Safari y iOS.** Solo se ejecuta Chromium; el juego se usa mucho en tablet.
- **El límite de 30 segundos del Cohete** (WCAG 2.2.1) sigue sin resolverse:
  es una decisión de producto, no un fallo que una prueba pueda arreglar.
- **Rendimiento medido.** No hay Lighthouse ni presupuesto de bundle en CI.
