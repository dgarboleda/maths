# Personajes del perfil

Al crear un hijo en `/perfiles`, la familia puede elegir entre Ánimo, Sonrisa y Saludo. La elección se guarda con el perfil en el campo `avatarId`, que ya existía. Los perfiles anteriores mantienen su avatar predeterminado. Se puede cambiar en Ajustes → Avatar.

Los retratos aparecen en el selector de perfiles, el diálogo de PIN, el inicio del alumno y las pantallas familiares. El retrato del inicio se añade únicamente para los personajes incluidos, sin sustituir una selección personalizada por un retrato genérico ni cargar el catálogo del Mundo. El catálogo incluido tiene prioridad cuando el perfil lo elige; los avatares personalizados del Mundo conservan sus reglas de desbloqueo. El personaje que camina por los niveles conserva su sprite: estas ilustraciones son retratos.

Las tres imágenes proporcionadas se sirven desde `public/avatars/`, sin modificarlas ni subirlas a Storage. El encuadre del retrato se hace con CSS en `Avatar.tsx`. No se usa un servicio de transformación de imágenes. El catálogo compartido está en `functions/src/profileAvatars.ts` y se reexporta al frontend.

El enlace de acceso infantil conserva su clave y PIN. `listChildrenPublic` solo añade `avatarId` si corresponde a uno de los tres personajes incluidos; no publica URLs ni identificadores de avatares personalizados, fechas de nacimiento o hashes. Este campo es opcional y compatible con perfiles anteriores. No hay migración, nuevo secreto ni cambio de protocolo.

## Acceso por PIN en móviles

Los accesos de `/perfiles` y `/entrar/{id}` comparten `ChildPinEntry`: un indicador con cuatro puntos y un solo teclado numérico en pantalla, con botones de al menos 44 píxeles. También admite números, retroceso, Supr y Enter desde un teclado físico. El foco inicial y el que vuelve tras un error recaen en el indicador, sin campos editables que abran el teclado virtual del teléfono.

El diálogo de acceso no contiene campos de contraseña ni un formulario de credenciales. El PIN solo se mantiene en memoria para verificarlo en Functions; no se ofrece al gestor del navegador como sustituto de la contraseña del padre. El lector de pantalla anuncia la cantidad de dígitos introducidos, sin leer los números. La verificación, los bloqueos y el secreto del PIN no cambian.
