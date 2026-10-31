# Maths: aprender, practicar y aplicar

## Propósito y alcance de esta entrega

El acceso principal ofrece un programa incluido de 49 lecciones en 7 unidades, con un repaso mixto y una aventura por unidad, sin evaluación obligatoria ni preparación de niveles por parte de la familia. Público de referencia: adolescentes de 12–17 años que necesitan consolidar fundamentos; la entrada se determina por conocimientos y necesidades, no por edad. El país de referencia es **Perú**: cada clase tiene una correspondencia orientativa con el Currículo Nacional de la Educación Básica (ver [Correspondencia con el CNEB](#correspondencia-con-el-cneb-perú)).

La entrega implementa el producto y los instrumentos del piloto. **No se ha realizado una revisión docente independiente ni un estudio con adolescentes.** El estado editorial de las lecciones es `pending-teacher-review`. Las comprobaciones automáticas verifican contratos, ejemplos de cálculo, accesibilidad, persistencia y reglas; no acreditan eficacia educativa ni una equivalencia oficial de grados o PISA.

## Recorrido del estudiante

1. Entra a `/jugar/{childId}` y encuentra Continuar, Aprender, Practicar y Aventura. Antes de su primera clase puede hacer la evaluación de ubicación (opcional) para saber qué clases saltar.
2. Abre una clase. Tres preguntas breves exploran sus bases; puede ir directamente a la explicación o demostrar lo que ya sabe en la comprobación.
3. Recorre tres ideas con representación, significado y notación; manipula un modelo visual y consulta vocabulario.
4. Sigue dos ejemplos cuyos pasos explican **por qué** se hace cada transformación.
5. Completa tres actividades guiadas y siete de práctica con reintentos, pistas graduales y desarrollo completo.
6. Resuelve cinco tareas de comprobación con primera respuesta registrada, incluidas comprensión conceptual y una transferencia con otra estructura (problema inverso, comparación o cambio de representación).
7. Aplica la idea a una situación de la ciudad con una tarea propia, de varios pasos y distinta de los bancos. Puede completar el recorrido con apoyo y recibe las mismas cinco estrellas.
8. Consulta lo que ha demostrado, las tareas por reforzar y el repaso programado. El avance se confirma al guardar y se puede retomar desde otro dispositivo.

Las ayudas durante una comprobación, incluida la consulta de la explicación, se registran como apoyo. La práctica guiada y la aplicación con solución disponible no acreditan autonomía. La primera respuesta incorrecta de una comprobación no se sustituye por un acierto posterior. Los minijuegos existentes siguen como actividades adicionales; sus métricas no se convierten en la nueva evidencia de aprendizaje.

## Programa

El currículo se organiza en siete unidades para estudiantes de 12 a 17 años que necesitan consolidar fundamentos, de los números enteros a la probabilidad. Cada clase declara sus bases (prerrequisitos), que siempre aparecen antes en el catálogo; se ofrecen como enlaces, sin candados.

| Unidad | Lecciones |
| --- | --- |
| Números enteros y operaciones | Enteros en la recta; sumar y restar enteros; multiplicar y dividir enteros; orden de las operaciones; potencias y raíces; notación científica |
| Fracciones y representaciones | Unidad y significado; equivalencia y comparación; fracción–decimal–porcentaje; fracción de una cantidad; sumar y restar fracciones; multiplicar y dividir fracciones; operaciones con decimales |
| Razones y proporcionalidad | Razones parte-parte y parte-total; tasa unitaria; proporcionalidad directa; cambios porcentuales; proporcionalidad inversa; interés simple y compuesto |
| Ecuaciones para resolver situaciones | Igualdad e incógnita; ecuaciones de un paso; ecuaciones de dos pasos; modelación y restricciones |
| Expresiones, ecuaciones y funciones | Expresiones algebraicas; propiedad distributiva; incógnita en ambos lados; inecuaciones lineales; funciones lineales; progresiones aritméticas y geométricas; ecuaciones cuadráticas; función cuadrática (vértice, máximos y mínimos); sistemas de dos ecuaciones; crecimiento exponencial |
| Geometría y medida | Ángulos y polígonos; perímetro y área; longitud y área del círculo; volumen de prismas y cilindros; teorema de Pitágoras; semejanza y escalas; transformaciones en el plano; distancia y punto medio en el plano; volumen de pirámides, conos y esferas; razones trigonométricas |
| Datos y probabilidad | Media, mediana y moda; probabilidad de un suceso; experimentos compuestos; dispersión y diagramas de caja; técnicas de conteo; probabilidad condicional y tablas de doble entrada |

Cada lección contiene objetivo observable, propósito, prerrequisitos, vocabulario, tres secciones de clase, dos o tres ejemplos razonados, errores habituales, un modelo visual manipulable y bancos de tareas. Hay 106 ejemplos desarrollados y 1568 instancias de actividades (32 por lección), organizadas en familias y formas paralelas; ese conteo no equivale a 1568 competencias ni a 1568 problemas de estructura distinta.

**Decisión sobre el catálogo anterior.** Sus módulos y generadores se conservan en el Archivo de actividades anteriores para abrir las creaciones existentes. El recorrido principal y la práctica integrada utilizan las clases y su evidencia actual; `legacyModuleIds` ofrece enlaces de compatibilidad, sin convertir el dominio anterior en nuevas acreditaciones. El mapa educativo se genera automáticamente y la familia puede priorizar clases en Plan de estudio. Véase [Un solo recorrido de aprendizaje](aprendizaje-unificado.md).

### Repaso mixto por unidad

Cuando el estudiante termina al menos dos clases de una unidad, se habilita su **repaso mixto** (`/jugar/{childId}/aprende/repaso-{unidad}`). Cada sesión plantea seis problemas que alternan las clases terminadas: dos seguidos nunca son de la misma clase, así que hay que reconocer qué idea usar antes de aplicarla (práctica intercalada). Cada lección aporta un banco propio de cuatro problemas que no aparece en ninguna otra etapa, y cada sesión rota los problemas.

- Se registra la primera respuesta; las pistas y la consulta de la explicación cuentan como apoyo; el desarrollo se muestra al terminar.
- Se supera con al menos 5 de 6 respuestas autónomas. La primera sesión superada otorga cinco estrellas una sola vez.
- El servidor comprueba qué clases están terminadas (no lo decide el navegador) y guarda la sesión en `learningProgress/repaso-{unidad}`. El informe familiar muestra las sesiones y el mejor resultado por unidad.

### Diseño de los bancos (contenido v2)

Cada lección define seis formas paralelas de siete tareas: concepto (q0), procedimiento (q1), paso intermedio (q2), variante (q3), concepto o análisis de errores (q4), transferencia cercana (q5) y transferencia con otra estructura (q6). Guiada usa la forma 0; práctica, la 1 completa; las comprobaciones A y B, las formas 2 y 3 con q0, q1, q2, q4 y q6; el repaso, la forma 4 con q0, q2, q3 y q5.

- **Parámetros independientes.** Cada forma toma sus datos de una tabla, no de fórmulas en `v`: ninguna respuesta se deduce de otra (antes, en dos pasos la solución coincidía con el coeficiente y en un paso siempre era −3). Una prueba verifica que ninguna tarea numérica repite respuesta entre las formas A y B.
- **Conceptos que cambian.** Las preguntas conceptuales rotan entre dos o tres formulaciones según la forma, para que superar la comprobación no dependa de recordar una pregunta ya vista.
- **Opciones en orden variable.** El orden de las alternativas se fija por pregunta con una semilla (`arrangeChoices`): es el mismo en servidor, navegador y al recargar, pero la respuesta correcta no ocupa siempre la misma posición.
- **Feedback por error.** Cada alternativa incorrecta explica su propio error, y las tareas numéricas reconocen los errores habituales de la lección (dividir entre el numerador, sumar en vez de multiplicar, dividir entre el valor final, redondear hacia arriba…) con un mensaje específico. Una prueba verifica que ningún error previsto coincide con la respuesta correcta.
- **Contenidos añadidos.** Problemas inversos (hallar el todo desde una fracción, la base de un descuento, el número de sensores en y = kx, la carga en x/m = q y x/m + b = c, la tarifa fija desde dos facturas), comparación de fracciones con numerador y denominador distintos, comparación de razones y de ofertas, fracción → porcentaje con denominadores distintos de 100, porcentajes menores que 10 y mayores que 100, e igualdades con operaciones en ambos lados. Fracción de una cantidad ya no usa solo cuartos.

**Migración.** Al cambiar los bancos, `CONTENT_VERSION` pasa a 2. Un avance guardado con la versión anterior conserva logros, fechas, comprobaciones y repasos; solo se reinicia la ronda en curso, cuyas respuestas pertenecían a preguntas que ya no existen (`migrateProgress`, aplicada igual en el navegador y en Functions).

Las representaciones interactivas incluyen barras de fracción y equivalencia, relación con porcentajes, fracción de un total, razones, tasas, cambios de base e igualdad. Las bases se ofrecen como enlaces a otras clases, sin candados nuevos.

**Gráficos dinámicos.** Cada clase cuyo concepto depende de una forma o de un gráfico tiene un modelo propio en SVG, sin librerías de gráficos (`GraphVisuals.tsx`, `ShapeVisuals.tsx`). Un componente `Plane` común dibuja ejes, cuadrícula y escalas para las funciones.

| Clase | Modelo | Qué se conserva al mover los controles |
| --- | --- | --- |
| Expresiones y funciones lineales | Recta en el plano con punto inicial y triángulo de pendiente | Cada +1 en x cambia y en m |
| Proporcionalidad directa / inversa | Recta por el origen frente a hipérbola, con conmutador | Cociente y ÷ x / producto x · y |
| Ecuaciones cuadráticas | Parábola y = (x − p)(x − q) con raíces y eje de simetría | Las raíces son los ceros de cada factor |
| Inecuaciones | Recta con punto abierto/cerrado, valor de prueba y multiplicación por −1 | El conjunto solución; el signo se invierte |
| Ángulos | Rectas que se cortan y triángulo deformable | Opuestos iguales, vecinos suman 180°, el triángulo suma 180° |
| Pitágoras | Cuadrados sobre los tres lados | a² + b² = c² |
| Círculo | Radio, cuadrado r² y borde desenrollado | Borde ≈ 3,14 diámetros |
| Semejanza | Triángulo 3-4-5 escalado por k | Ángulos; lados × k, área × k² |
| Volumen | Prisma por capas en perspectiva | Base × altura |
| Probabilidad compuesta | Árbol con y sin reemplazo | Producto por rama; las ramas suman 1 |
| Notación científica | Escala logarítmica de 10⁻⁶ a 10⁹ m | Cada paso multiplica por 10 |
| Operaciones con decimales | Cuadrícula 10 × 10 | Décima × décima = centésima |
| Sumar y restar fracciones | Barras recortadas a un denominador común | Solo se juntan partes del mismo tamaño |
| Multiplicar y dividir fracciones | Área (a/b de c/d) y «cuántas veces cabe» | El producto es parte de una parte; dividir es multiplicar por la inversa |
| Multiplicar y dividir enteros | Saltos repetidos en la recta | k grupos de n; con k negativo, el opuesto |
| Orden de las operaciones | Misma expresión con y sin paréntesis | El paréntesis cambia el resultado |
| Potencias y raíces | Cuadrados de casillas | √A es el lado; si no es exacto, queda entre dos enteros |
| Interés simple y compuesto | Recta (simple) frente a curva (compuesto) con capital, tasa y años | El simple suma lo mismo cada año; el compuesto multiplica por (1 + r/100) |
| Progresiones | Puntos aₙ con conmutador aritmética/geométrica | Diferencia constante / cociente constante |
| Distancia y punto medio | Dos puntos arrastrables con catetos, hipotenusa y punto medio | d = √(Δx² + Δy²); M promedia las coordenadas |
| Función cuadrática | Parábola y = a(x − h)² + k con vértice arrastrable | El vértice (h, k); el signo de a decide máximo o mínimo |
| Pirámides, conos y esferas | Cilindro, cono y esfera del mismo radio con barras de volumen | El cono es 1/3 del cilindro; r² frente a r³ al escalar |
| Probabilidad condicional | Tabla de doble entrada editable con totales resaltados | Mismo numerador, distinto grupo: P(A \| B) ≠ P(B \| A) |

Todos tienen etiqueta textual que se actualiza con cada cambio, controles nativos operables con teclado y pruebas con axe (componentes y navegador, también en móvil). Los puntos clave (valor inicial y pendiente, raíces, límite de la desigualdad, extremo del ángulo, catetos, radio, vértice de la copia, posición en la escala) se arrastran con ratón, lápiz o dedo, y la cuadrícula decimal se pinta arrastrando; el arrastre es un atajo visual y el control deslizante equivalente sigue siendo la vía accesible.

## Evidencias y criterios provisionales

- Recorrer la clase se registra por separado de resolver problemas.
- Completar una aplicación con apoyo permite avanzar, sin declarar autonomía.
- Una comprobación se supera con al menos 4/5 respuestas autónomas, al menos una conceptual y la de transferencia. Una respuesta con pistas, consulta, desarrollo o primer intento incorrecto no es autónoma.
- El primer repaso se habilita **tres días después** de superar una comprobación. Se determina con el reloj del servidor.
- El repaso contiene cuatro tareas y exige al menos el 80% (4/4 por redondeo hacia arriba), incluida comprensión y transferencia. Superarlo registra evidencia diferida y programa otro a siete días; necesitar apoyo programa otro a tres.
- Un fallo posterior conserva las fechas y logros históricos, y recomienda refuerzo. No bloquea una aventura ni borra progreso.
- Estos umbrales son hipótesis del piloto, no una prueba estandarizada. Deben calibrarse mediante revisión y observación.

## Evaluación de ubicación

`/jugar/{childId}/aprende/ubicacion` estima el punto de partida sobre las 49 clases. Recorre las unidades en orden y plantea el procedimiento central de la forma B de cada comprobación (tarea q1). En fracciones, si acierta esa pregunta, plantea también la conceptual (q0); ambas deben acertarse para sugerir que la clase sea opcional. No hay pistas, desarrollo ni corrección durante la prueba. En el primer fallo o «Todavía no lo sé», esa clase pasa a ser el inicio de la unidad y la prueba salta a la unidad siguiente. Dura entre 7 y 56 preguntas. Las sesiones iniciadas antes de este cambio conservan su criterio anterior de una pregunta por clase.

- El servidor evalúa cada respuesta y guarda el estado en `learningProgress/ubicacion`. La pregunta se muestra con un identificador propio (`u1`, `u2`…).
- El resultado sugiere clases **opcionales según la ubicación**: la recomendación de inicio las salta, pero siguen accesibles, no cuentan como terminadas, no dan estrellas ni habilitan el repaso mixto (que exige clases recorridas).
- Puede repetirse; el resultado anterior se conserva hasta terminar la nueva sesión. El informe familiar lo muestra con su fecha.
- Limitación: incluso dos preguntas son una estimación rápida, sensible a un descuido o acierto casual. La calibración con datos del piloto debe evaluar la duración y si estas preguntas identifican adecuadamente el punto de partida.

La evaluación curricular ampliada anterior sigue disponible por decisión explícita. Ya no condiciona el acceso ni otorga dominio de módulos inferiores basándose en una respuesta representativa. Sus resultados y logros históricos se conservan.

## Repaso espaciado

Una cola diaria que cruza unidades para combatir el olvido (efecto de espaciado e intercalado). Entrada en el inicio («Repasar hoy») y ruta `/jugar/{perfil}/aprende/diario`.

- **Qué entra:** clases terminadas y clases dominadas en la evaluación de ubicación. Lo decide el servidor con el avance guardado; el navegador no puede proponer clases.
- **Prioridad:** 0) clases con un error que se repite, 1) clases vencidas (caja más baja y vencimiento más antiguo primero), 2) clases con indicio de apoyo, 3) las vistas hace más tiempo. Hasta 6 problemas, como mucho 2 por clase, alternando unidades.
- **Preguntas:** del repaso, el mixto y la segunda comprobación de cada clase; rotan entre sesiones.
- **Agenda (Leitner):** cajas con intervalos de 1, 3, 7, 14 y 30 días. Acertar sin pistas sube una caja (como mucho una por clase y sesión); una pista o un error la devuelve a la primera. El desarrollo no se revela durante la sesión: aparece en el resumen.
- **Estrellas:** 2 por la primera sesión terminada de cada día (hora de Lima, UTC−5), y 3 más al alcanzar 7, 14 y 30 días seguidos. Repasar más el mismo día no da más estrellas.
- **Racha de repaso:** días seguidos con una sesión terminada (`streak` en `learningProgress/diario`). Saltarse un solo día se perdona una vez por semana (comodín, semana de lunes a domingo); dos días o más la reinician. El inicio muestra la racha y el reproductor avisa si hoy hay que repasar para mantenerla. Es independiente de la racha de juego (`recordStreak`).
- **Calibración por datos:** `functions/src/learning/calibrationData.ts` guarda la proporción de aciertos al primer intento (p) de cada pregunta con al menos 30 perfiles. Entre los tres siguientes problemas de la rotación de una clase se elige el de p más cercana al objetivo de su caja (80 % en las cajas 0–1, 70 % en la 2, 60 % desde la 3: más exigente cuando la idea está afianzada); una pregunta sin datos cuenta como a 0,1 del objetivo. Con el archivo vacío (estado actual) la rotación no cambia. Se regenera con el análisis de preguntas (ver [operación](operacion.md)) y se publica en un PR.
- **Errores que se repiten:** al empezar, el servidor lee las últimas 300 respuestas del perfil y busca errores previstos sin resolver con al menos 2 repeticiones (mismo criterio que el panel familiar: queda resuelto al acertar al primer intento la misma tarea después del último error). Esas clases entran primero aunque no estén vencidas, y su primer problema es una forma de la misma tarea (`focus` en el ítem, con un aviso al estudiante).
- **Datos:** `learningProgress/diario` (agenda por clase: caja, vencimiento, última vez, veces vista; sesiones y último resultado). Cada respuesta deja su diagnóstico en `learningEvidence` con `stage: "daily"` y la clase real, por lo que alimenta el panel de errores frecuentes y el análisis de preguntas.
- **Informe familiar:** bloque «Repaso espaciado» con sesiones, último resultado y clases afianzadas (caja ≥ 3), en progreso (1–2) y por reforzar (0).

## El apagón

Una ciudad sin energía presenta una central y tres edificios explorables. Al inspeccionar se conocen las condiciones: reserva original de 120, hospital 3/4, radio 1/6 y taller al menos 10 unidades. El estudiante visita los edificios, planifica suministros con controles accesibles y prueba la red.

Las decisiones tienen consecuencias: sobrecarga desconecta la red; energía insuficiente mantiene un edificio en emergencia; un reparto válido ilumina las conexiones y restablece servicios. El mensaje distingue usar la fracción de la reserva original de usarla sobre el resto. La clase de fracción de una cantidad está disponible desde la aventura.

Se guarda cada prueba, se puede volver a experimentar y el premio de diez estrellas se entrega una sola vez. La misión es evidencia de participación y aplicación asistible, separada de la comprobación autónoma.

## Aventuras por unidad

`/jugar/{childId}/aventura` reúne una misión por unidad. Todas comparten el mismo motor (`functions/src/learning/adventures.ts`): investigar la situación, decidir varios valores, probar el plan y recibir una pista específica para el primer requisito que falla. La cámara, el ascensor, el jardín y el huerto admiten más de un plan válido; la receta y el torneo exigen razonar hacia atrás desde las condiciones.

| Unidad | Aventura | Decisión | Error que la pista detecta |
| --- | --- | --- | --- |
| Números | La cámara del mercado | Temperaturas de helados, congelador y nevera | Creer que −15 es más frío que −18; restar un negativo |
| Fracciones | El apagón | Reparto de 120 unidades | Aplicar 1/6 al resto en vez de a la reserva original |
| Proporcionalidad | La receta del festival | Ingredientes para 10 y bolsas de harina | Escalar sumando en vez de multiplicar |
| Ecuaciones | El ascensor de carga | Cajas por viaje y viajes | Ignorar la carga fija en 105 + 45c ≤ 600 |
| Expresiones | El jardín de baldosas | Lado del jardín y baldosas | Contar 4n y olvidar las esquinas (4n + 4) |
| Geometría | El huerto escolar | Largo y ancho con 36 m de cerca | Confundir semiperímetro con perímetro |
| Datos | El torneo de lanzamientos | Tres puntuaciones con media y moda 8 | Calcular la media solo con los lanzamientos nuevos |

El servidor valida cada plan con el número de entradas y los rangos de su aventura y guarda el estado en `learningMissions/{aventura}`. El estado guardado de El apagón no cambia de forma. Tras la última clase relacionada, el resumen ofrece jugar la aventura; el informe familiar muestra planes probados y misiones completadas.

## Correspondencia con el CNEB (Perú)

`functions/src/learning/peru.ts` asigna a cada clase una de las cuatro competencias del área de Matemática del CNEB (MINEDU, 2016) y el grado de secundaria donde suele trabajarse según el Programa curricular de Educación Secundaria (ciclo VI: 1.° y 2.°; ciclo VII: 3.° a 5.°). Es una **propuesta orientativa pendiente de validación docente**: no certifica un grado.

| Competencia | Clases |
| --- | --- |
| Resuelve problemas de cantidad | Enteros, orden de operaciones, potencias, notación científica, fracciones, decimales, porcentajes aplicados e interés simple y compuesto |
| Resuelve problemas de regularidad, equivalencia y cambio | Razones, tasa, proporcionalidad directa e inversa, ecuaciones, expresiones, inecuaciones, progresiones, funciones lineales, ecuaciones y funciones cuadráticas |
| Resuelve problemas de forma, movimiento y localización | Ángulos, perímetro y área, círculo, volumen, Pitágoras, semejanza, transformaciones, distancia y punto medio, y volumen de pirámides, conos y esferas |
| Resuelve problemas de gestión de datos e incertidumbre | Media, mediana y moda; probabilidad simple, compuesta y condicional; dispersión; conteo |

Las tarjetas de clase muestran el grado orientativo. El resultado de la ubicación indica, por competencia, el último grado cuyas clases (y las de grados anteriores) están todas dominadas o terminadas. El ciclo VII (3.° a 5.°) incluye sistemas de dos ecuaciones, progresiones, transformaciones en el plano y dispersión y diagramas de caja (3.°); cuadráticas, función cuadrática, interés simple y compuesto, distancia y punto medio, trigonometría y probabilidad compuesta (4.°); crecimiento exponencial, técnicas de conteo, volumen de pirámides, conos y esferas, y probabilidad condicional (5.°). Siguen fuera del programa, entre otros: logaritmos, trigonometría en cualquier ángulo (ley de senos y cosenos), ecuación de la recta y pendiente como tema de geometría analítica, medidas de dispersión con desviación estándar. 

Las seis clases de 3.° a 5.° (`functions/src/learning/upperGrades.ts`) siguen el mismo contrato que el resto y tienen su modelo propio: dos rectas que se cortan o son paralelas (con el punto de corte arrastrable), exponencial frente a lineal desde el mismo inicio, triángulo rectángulo cuyo ángulo se arrastra y cuyo tamaño no cambia las razones, puntos con diagrama de caja y un dato extremo arrastrable, cuadrícula de combinaciones y parejas con y sin orden, y un triángulo en el plano que se traslada (arrastrando su imagen), se refleja o rota. Los contextos usan soles.

## Errores frecuentes en el informe familiar

Cada respuesta registra en su evento (`learningEvidence/{op}.outcome`) la pregunta real de la clase (también en repasos mixtos y ubicación), la tarea de la plantilla, la etapa, si fue correcta, el número de intento, las pistas pedidas y el **error previsto** que coincide (`e:<valor>` para un valor de `errors`, `c:<opción>` para una alternativa incorrecta). Los eventos anteriores a este registro se diagnostican reconstruyendo la pregunta de la clase.

`/panel/progreso` analiza las últimas 400 acciones del perfil y agrupa el mismo error entre formas paralelas (las explicaciones solo cambian en los números). Cada tarjeta muestra el enunciado, la respuesta, la explicación que vio el estudiante, cuántas veces ocurrió y si después resolvió bien la misma tarea al primer intento sin pistas («superado») o persiste, con enlace a la práctica. Las respuestas incorrectas que no coinciden con un error previsto se cuentan aparte. Es diagnóstico formativo, no una nota.

## Análisis de preguntas

`npm run analisis:items` (requiere `npm run functions:build` y credenciales de administración del proyecto) lee los eventos de todas las familias y genera en `informes/` un Markdown y un CSV **solo con agregados**: por pregunta, primeras respuestas (una por perfil), proporción correcta al primer intento, uso de pistas, cobertura de los errores previstos, respuestas incorrectas no previstas más repetidas y mediana del tiempo de respuesta; y por etapa, la proporción de aciertos. Con al menos 10 primeras respuestas marca alertas: «muy fácil» (> 95 %), «muy difícil» (< 30 %), «mucha ayuda» (> 50 % con pistas), «errores no previstos» y la respuesta no prevista frecuente, candidata a nuevo error en `errors`. Sirve para calibrar los umbrales provisionales (4/5, 5/6) y la ubicación con datos del piloto. Para volúmenes grandes conviene exportar a BigQuery; la lectura actual recorre la colección completa.

## Arquitectura y datos

- `functions/src/learning/`: catálogo, contratos, validación numérica y motor educativo puros, compartidos con Next mediante `src/lib/learning/domain.ts`. No importan Firebase, React ni APIs de Node.
- `functions/src/learning.ts`: callable `recordLearningAction`. Verifica sesión y perfil, evalúa respuestas, controla revisión y confirma evidencia, agregado y recompensa en una transacción.
- `src/components/learning/`: inicio, biblioteca, clase, modelos, aventura e informe familiar.
- `learningProgress/{lessonId}`: versión de contenido, posición, respuestas actuales, apoyos, comprobaciones y fechas de repaso.
- `learningEvidence/{operationId}`: acciones inmutables para el cliente, versión, premio y, en las respuestas, su diagnóstico (`outcome`). Conserva el historial aunque se reinicie una ronda.
- `learningProgress/ubicacion`: evaluación de ubicación (preguntas planteadas, resultado y sesiones).
- `learningMissions/apagon`: inspección, suministros probados, consecuencias y logro.

El navegador lee solo datos de su perfil. Ningún cliente, incluido el de la familia, puede escribir los nuevos agregados o fabricar eventos directamente por Firestore. Functions valida y actualiza. La familia puede borrar los documentos al eliminar el perfil; el borrado incluye las tres colecciones.

Cada acción lleva un identificador idempotente y la revisión esperada. Un reintento idéntico no duplica evidencia ni estrellas. Dos pestañas con revisiones distintas no se sobrescriben: la interfaz permite cargar el avance confirmado. El error de guardado se muestra y ofrece reintento de la misma operación. No se ofrece funcionamiento completamente desconectado: hace falta conexión para confirmar acciones.

La evaluación de respuestas en servidor impide aceptar un booleano de acierto fabricado por el navegador. No convierte el producto en un examen vigilado: el catálogo y sus soluciones son contenido de enseñanza accesible al estudiante.

Las métricas educativas nuevas se muestran primero en `/panel/progreso`; la actividad anterior permanece como histórico. No se mezclan las estrellas o la precisión de los minijuegos con las comprobaciones autónomas.

## Minijuegos dentro de las clases

En la etapa **Práctica** la aplicación sortea, en cada ejercicio numérico, uno
de los nueve minijuegos: **Estanque** (Frogger), **Cohete**, **Serpiente
numérica**, **Autopista de resultados**, **Laberinto de números**, **Invasión
numérica**, **Bloques numéricos**, **Topos numéricos** (se responde tocando el
topo, sin cruceta) o **Caja numérica** (Sokoban por turnos, sin reloj). El
estudiante no tiene que elegir. Todas las
clases ofrecen ejercicios numéricos para todos. Cada pregunta conserva su
enunciado, respuesta, pistas y desarrollo del catálogo educativo compartido.
Las preguntas de elección conceptual se responden en su formato habitual.
«Prefiero escribir la respuesta» ofrece siempre la vía escrita (accesibilidad o
preferencia) y conserva la evidencia de la pregunta; recargar conserva el
avance y vuelve a sortear el juego.

Los seis juegos de reflejos (estanque, serpiente, carrera, laberinto,
invasores y bloques) conservan su **mecánica real** dentro de las clases, pero solo una decisión
deliberada envía una respuesta: llegar a un nenúfar, comer un número, disparar a una columna,
cruzar una puerta después de pulsar una flecha o lanzar la pelota contra un bloque.
Los fallos de reflejos —chocar con el obstáculo o con el borde, que alcance el fantasma, que la oleada
aterrice, llegar a una puerta sin decidir— no se registran, no restan vidas y la partida sigue con
el mismo ejercicio (`src/lib/minigames/lessonArcade.tsx`). En los bloques de la
clase, las cinco opciones están en una sola fila y la pelota espera sobre la
paleta: el estudiante la coloca bajo un bloque y la lanza en línea recta (flecha
arriba, espacio o «Lanzar la pelota»); el bloque que rompe es su respuesta,
correcta o no, y la pelota vuelve a la paleta. Antes la pelota salía sola y un
rebote al azar podía registrar una respuesta sin intervención. Las vidas, estrellas y marcas solo existen en
niveles y mundos. Para que lo que se registra sea siempre una decisión, en la
clase la serpiente y el laberinto no avanzan solos hasta la primera flecha
(al empezar, tras un fallo de reflejos y tras cada respuesta), y en la carrera
cada puerta empieza fuera de los carriles: hay que elegir uno con las flechas.

El cohete empieza sin límite de tiempo y permite activar un reto de 30 segundos. Se puede
pausar; el reloj se detiene durante el guardado, al ocultar la pestaña y al
revisar un error. Cada error pausa la partida hasta que el estudiante decide
reanudar, para leer la orientación y pedir pistas antes de reintentar el mismo
ejercicio. Agotar el tiempo no envía una respuesta ni resta progreso matemático.

**Opciones de los juegos** (`lessonProblem`): la respuesta, los errores previstos de la pregunta y, si faltan, vecinos plausibles; solo valores que se leen bien (enteros, hasta 3 decimales o fracciones de denominador ≤ 100, mostradas como fracción si la respuesta no es un decimal exacto o el enunciado pide una fracción), con signo «−», en el dominio del problema (una probabilidad entre 0 y 1; sin negativos inventados si el enunciado no los tiene) y a una distancia proporcional al tamaño del número. El enunciado del juego reduce su tamaño cuando es largo para que el tablero y los controles quepan en un teléfono.

Los juegos envían la **respuesta concreta** a `recordLearningAction`, igual
que la práctica escrita. Functions valida y guarda los intentos y apoyos;
la interfaz celebra únicamente un acierto confirmado en el avance guardado.
Los reintentos de red conservan el identificador de operación. No se usa el
registro antiguo de intentos, marcas o premios y no se añaden estrellas por
partida. La comprobación conceptual y de transferencia sigue después de la
práctica: ganar un juego no acredita autonomía ni completa la clase.

Se reutilizan `FroggerGeneric` y `CoheteGeneric` mediante un contrato opcional
de ejercicio de clase; los modos arcade anteriores conservan su funcionamiento.
Los componentes de juego se cargan bajo demanda. Esta integración usa el
contrato educativo existente del protocolo 3 y no cambia funciones, reglas,
colecciones ni versiones del contenido. Las preguntas mantienen su estado de
revisión docente pendiente. Snake, Runner, Number Pac, Invaders y Breakout siguen
disponibles en los niveles anteriores; su incorporación a las clases queda fuera
de esta entrega.

## Auditoría de usabilidad en móvil

`e2e/auditoria-movil.spec.ts` y `e2e/auditoria-visuales.spec.ts` (solo con `AUDITORIA=1`, fuera de CI) recorren en un Pixel 7 cada clase pantalla por pantalla —diagnóstico, explicación, ejemplos, guiada, práctica con los nueve juegos y comprobación— y las pantallas generales del estudiante y de la familia. Anotan en `informes/auditoria/*/hallazgos.json` desbordes, texto recortado o menor de 12 px, objetivos táctiles menores de 44 px, violaciones de axe y juegos cuyo enunciado y controles no caben a la vez en la pantalla, con capturas. La prueba del catálogo además impide «:» entre números (en Perú también es división) y `defineLesson` aplica la tipografía común: miles con espacio fijo («45 000 000», no «45.000.000») y signo «−».

## Auditoría del catálogo anterior

El [inventario de los 67 módulos](auditoria-contenido.md) señala cobertura, cambios y trabajo editorial pendiente. Se corrigieron la representación de 10/10 como decimal y las soluciones reales de x² = c. También se explicitó la familia afín y = mx + b antes de extrapolar una tabla y la inversión de la desigualdad al multiplicar o dividir por un número negativo. Los ejemplos de los módulos vinculados usan los nuevos desarrollos autorales; el resto muestra pasos de sus pistas existentes y respeta las etiquetas de respuestas de opción múltiple.

Los casos de uso, grado y PISA de los módulos anteriores siguen siendo referencias históricas que necesitan revisión pedagógica. El inventario no equivale a declarar correctos todos sus enunciados o a reescribir cada módulo como una clase completa.

## Revisión docente y piloto: trabajo externo pendiente

Para cada lección, una persona docente distinta de su autor debe registrar nombre, fecha, versión revisada y observaciones, comprobando:

1. Exactitud de las definiciones, procedimientos, resultados y unidades, incluidos cero, signos y casos límite.
2. Que los prerrequisitos bastan y cada objetivo tiene una tarea que lo comprueba.
3. Que se explica el significado antes de abreviar los procedimientos.
4. Que las alternativas y respuestas a errores identifican ideas relevantes.
5. Que las formas de diagnóstico, comprobación y repaso permiten interpretar la evidencia sin atribuir habilidades no observadas.
6. Que el lenguaje, contexto y apoyos son adecuados para adolescentes con distintos puntos de partida.

El piloto propuesto comienza con sesiones observadas de 5–8 adolescentes para localizar problemas de comprensión y uso, con las autorizaciones familiares correspondientes. Después se ensaya el recorrido con una muestra más amplia para explorar aprendizaje. Las sesiones deben recoger punto de partida, resolución autónoma inmediata, explicación de estrategias, transferencia y desempeño diferido a 3–7 días mediante formas equivalentes. Un piloto pequeño orienta ajustes; no demuestra eficacia causal.

La edición posterior conservará las versiones de los eventos. Antes de incrementar `Lesson.version`, se deberá implementar una transición explícita del avance: el motor actual rechaza una versión incompatible para evitar mezclar evidencias de contenidos distintos.

## Publicación coordinada

Se requiere Functions, reglas de Firestore y frontend de la misma revisión, con **protocolo 3** (protocolo 4 desde el endurecimiento del acceso infantil, ver [operación](operacion.md#acceso-infantil)). Usar el despliegue completo existente, que publica Firebase antes del Worker. No se ha desplegado esta entrega a producción.

La validación técnica comprende tipos, lint, pruebas del motor y contenido, reglas y callables con sesiones reales en emuladores, recorridos de navegador de escritorio/móvil y presupuestos de producción para login, clase, aventura, nivel familiar y editor.
