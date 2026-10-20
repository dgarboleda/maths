# Personajes del perfil

Al crear un hijo en `/perfiles`, la familia puede elegir entre Ánimo, Sonrisa y Saludo. La elección se guarda con el perfil en el campo `avatarId`, que ya existía. Los perfiles anteriores mantienen su avatar predeterminado. Se puede cambiar en Ajustes → Avatar.

Los retratos aparecen en el selector de perfiles, el diálogo de PIN, el inicio del alumno y las pantallas familiares. El catálogo incluido tiene prioridad cuando el perfil lo elige; los avatares personalizados del Mundo conservan sus reglas de desbloqueo. El personaje que camina por los niveles conserva su sprite: estas ilustraciones son retratos.

Las tres imágenes proporcionadas se sirven desde `public/avatars/`, sin modificarlas ni subirlas a Storage. El encuadre del retrato se hace con CSS en `Avatar.tsx`. No se usa un servicio de transformación de imágenes. El catálogo compartido está en `functions/src/profileAvatars.ts` y se reexporta al frontend.

El enlace de acceso infantil conserva su clave y PIN. `listChildrenPublic` solo añade `avatarId` si corresponde a uno de los tres personajes incluidos; no publica URLs ni identificadores de avatares personalizados, fechas de nacimiento o hashes. Este campo es opcional y compatible con perfiles anteriores. No hay migración, nuevo secreto ni cambio de protocolo.
