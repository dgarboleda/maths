# Foco de ayuda contextual

El espacio de aprendizaje (`LearningShell`) incluye un foco incandescente en la esquina inferior izquierda. En móvil queda por encima de la navegación y respeta el área segura del dispositivo. Su animación suave termina después de tres ciclos y se desactiva con movimiento reducido.

Al tocarlo se abre una ficha breve sobre la pantalla actual. En una clase utiliza exclusivamente la sección o el ejemplo actual; en una actividad, el enunciado y las opciones. Incluye definiciones de símbolos y vocabulario de esa lección. La primera definición está abierta; las demás se pueden desplegar. Los ejemplos del glosario son independientes del problema: nunca se leen sus respuestas, pistas ni soluciones para generar la ficha.

Cuando aparece un símbolo aún no consultado, el foco ofrece «Nuevo símbolo · ¿Qué significa …?». El aviso desaparece al consultar la explicación. Se recuerda por perfil en el navegador (`maths:help:v1:{childId}`), sin escribir datos nuevos en Firebase. Si el almacenamiento está bloqueado, la ayuda sigue funcionando.

Abrir la ficha pausa el minijuego; cerrarla recupera su estado anterior de pausa. El diálogo admite teclado, Escape y retorno del foco. En diagnósticos de clase, comprobaciones y repasos, consultar definiciones antes de responder registra una ayuda mediante la acción `hint` existente, como «Consultar la explicación sin salir». No se duplica al volver a abrir y, si el guardado falla, la ficha no se muestra. Las instrucciones generales sin definiciones no registran ayudas. La evaluación de ubicación solo ofrece instrucciones, sin explicaciones matemáticas.

Para ampliar las definiciones, editar `src/lib/learning/screenHelp.ts`. Cada símbolo necesita un identificador estable, un patrón que lo detecte en el texto actual, una explicación breve y un ejemplo propio. Evitar ambigüedades: las barras de `|−4|` y `P(A|B)` significan cosas distintas. El vocabulario editorial de cada clase se reutiliza cuando su término aparece en el contenido actual. Las instrucciones de Inicio, Aprender, Practicar, Aventura y repaso se definen en el mismo archivo.

No utiliza IA, servicios externos, dependencias nuevas ni cambios en Functions, secretos o datos de producción.
