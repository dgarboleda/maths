# Un solo recorrido de aprendizaje

El programa incluido contiene 49 clases en 7 unidades. El alumno puede comenzar una clase, practicar con los nueve minijuegos o por escrito, comprobar su comprensión, repasar y aplicar lo aprendido en una aventura sin que su familia prepare mundos, módulos o niveles.

## Progreso y acompañamiento familiar

Resumen, Hijos, Progreso y el detalle individual utilizan `learningProgress`, `learningMissions` y la evidencia validada por Functions en `learningEvidence`. `learningSummary` comparte los criterios con `LearningReport`:

- Una clase terminada es un recorrido completado; no equivale a resolver sin apoyo.
- Una comprobación autónoma exige `checkPassedAt` y no necesitar apoyo.
- La retención exige un repaso diferido superado y no necesitar apoyo.
- La racha es la del repaso diario, calculada con `streakToday`, con el mismo calendario de Lima y comodín que el inicio del alumno.

El ritmo semanal cuenta respuestas de los últimos siete días de Lima, leídas de `learningEvidence`, sin convertir visitas, clics o puntuaciones de arcade en respuestas matemáticas. Los logros educativos del panel se derivan de las evidencias existentes; no se inventan nuevas acreditaciones ni se escriben insignias desde el navegador.

Los datos antiguos de `skillsProgress`, `attempts` y `placements` siguen disponibles en el historial del archivo. No se suman sus porcentajes al programa nuevo.

## Plan de estudio

`/panel/plan` permite a la familia priorizar clases y conocer sus objetivos. Se guarda únicamente una preferencia opcional en el documento del hijo:

```ts
learningPlan?: { lessonIds: string[] }
```

Se descartan IDs desconocidos y duplicados. La recomendación retoma una clase activa y después atiende las prioridades, comenzando por sus bases pendientes. Cuando las prioridades se completan, continúa el programa. La ubicación puede hacer opcional una base; no acredita una clase terminada. El alumno conserva acceso a todas las clases: no se crean candados, premios ni modificaciones de su evidencia al guardar el plan.

Las reglas existentes permiten a la familia administrar este campo y deniegan que lo cambie una sesión infantil. `listChildrenPublic` no publica el plan. No se modifica el PIN ni su secreto.

## Mapa de aprendizaje y premios

`/jugar/{childId}/mapa` muestra automáticamente las siete unidades, sus clases, el estado educativo real, las prioridades familiares y las aventuras incluidas. El progreso de cada parada se lee del mismo estado que usa la clase. También enlaza el repaso disponible.

Desde «Mis premios» se reutilizan los canjes y el saldo de estrellas existentes. Los premios no compran acceso al contenido ni acreditan conocimientos. El panel de canjes y su consulta se cargan solo al abrirlo. Las ilustraciones de perfil y el foco de ayuda se conservan.

## Compatibilidad y archivo

La navegación familiar habitual contiene Resumen, Hijos, Progreso, Recompensas, Plan de estudio y Ajustes. Las herramientas del recorrido anterior están agrupadas en Ajustes → Archivo de actividades anteriores:

| Ruta | Uso |
| --- | --- |
| `/panel/archivo` | Acceso explícito a creaciones, historial y respaldo anteriores. |
| `/panel/archivo/{childId}` | Historial de módulos, evaluaciones e insignias anteriores, claramente separado del informe actual. |
| `/jugar/{childId}/mapa-anterior` | Mapa anterior y acceso a niveles, misiones, tienda y avatares personalizados. Los enlaces internos del motor antiguo vuelven a este mapa. |
| `/panel/editor`, `/panel/editor/mundo`, `/panel/curriculum` | Herramientas de compatibilidad de las creaciones existentes; ya no forman parte del menú familiar habitual ni son requisitos del aprendizaje. |

La copia de creaciones incluye mundos, niveles, módulos y referencias a imágenes. La interfaz aclara que no es una copia de los perfiles ni del aprendizaje del alumno. No se han eliminado documentos, imágenes, historial de versiones ni el motor necesario para abrir las creaciones anteriores.

`LegacyCurriculumBoundary` carga el compilador y los módulos personalizados únicamente en las rutas anteriores. El inicio, las clases, la práctica, las aventuras, el mapa educativo y el panel actual ya no esperan ni consultan el currículum personalizado. Los lectores y motores compartidos se conservan por sus consumidores reales, no por formar parte del recorrido principal.

## Contenido y operación

Se corrigen los nombres de las siete unidades en la navegación y el conteo del catálogo en la documentación. El contenido y el motor educativo compartido no cambian en esta entrega: el protocolo sigue en 12. La revisión docente independiente sigue pendiente; las pruebas automáticas no la sustituyen.

No hay migración ni cambios de IAM, Secret Manager, servicios o planes de facturación. Functions y el Worker se publican desde la misma revisión, con las verificaciones existentes. `PIN_PEPPER` permanece en Secret Manager.

## Validación

Las pruebas cubren la selección y persistencia del plan, las bases recomendadas, la diferencia entre clase completada y autonomía, la caducidad de la racha, el mapa y los informes sin lecturas del sistema anterior, la carga de dicho sistema al abrir el archivo, accesibilidad y compatibilidad con mundos y avatares personalizados. La suite de integración comprueba que el hijo no puede cambiar el plan y que el enlace infantil no lo divulga.
