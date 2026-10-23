# Demo conectada — Resource Scout

Estado: propuesta de guion funcional para revisión. Se autorizó preparar este documento; la
implementación, el caso elegido y los controles nuevos se concretan después de revisarlo.

Base inspeccionada: candidata Canvas 0.8.14, commit `010aeaf`. Esta propuesta se prepara en una
rama documental desde `dev`, separada de la candidata. No inicia ni cierra una iteración, no
modifica su orden y no certifica funciones nuevas.

## Qué debe comunicar

Una intención se convierte en trabajo dentro de un Mundo. La conversación, la tarea, el archivo
y el documento conservan su identidad y su contexto al pasar por Sessions, Board, Code, Docs y
Canvas. El usuario puede continuar manualmente y recuperar el trabajo después de recargar.

La generación de respuestas y propuestas del agente se prepara de antemano. La aceptación,
creación, edición, navegación, relaciones y persistencia deben ejecutarse realmente. En la
presentación del video: **«Demo del prototipo · agentes simulados»**.

Decisiones de base acordadas: agentes simulados, acciones y objetos reales, reutilización para
la integración futura y conservación de las superficies actuales. Son propuestas de este guion
el caso Resource Scout, los textos, los materiales y las entradas nuevas de interfaz.

## Caso y estado inicial

Caso propuesto: **buscar referencias guardadas por su fuente o su nota**. Resource Scout ya
existe entre los Mundos de ejemplo; su modelo de captura contiene `id`, `source` y `note`
opcional. El escenario se prepararía como un Mundo independiente de demostración, conservando
los Mundos y guardados existentes.

| Elemento                      | Estado antes de grabar                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| Mundo «Resource Scout · demo» | Instancia exclusiva de la toma, con conversación inicial vacía.                      |
| `src/capture.ts`              | Tipo de captura existente, con identidad y contenido conservados.                    |
| `src/search.ts`               | Archivo inicial con la firma `searchCaptures(captures, query)` y cuerpo pendiente.   |
| Dos imágenes de referencia    | Ya importadas en Canvas, con nombre y bytes disponibles. Selección visual pendiente. |
| Board                         | Sin las dos tareas del recorrido.                                                    |
| Docs                          | Sin el documento «Búsqueda de referencias».                                          |
| Canvas                        | Dos imágenes organizadas; sin tarjetas de los resultados que aún no existen.         |

Las imágenes propuestas serían «Biblioteca de referencias» y «Detalle de captura». No se han
aportado ni seleccionado esos archivos. Las muestras multimedia existentes sirven para ensayar
importación y disposición; las imágenes definitivas se eligen antes del ensayo visual.

Comportamiento que describirán tarea, código y documento: buscar sin distinguir mayúsculas en
`source` y `note`; ignorar espacios exteriores de la consulta; devolver todas las capturas
ante una consulta vacía; devolver una lista vacía si no hay coincidencias; conservar las
identidades y el orden de las capturas. No incorpora todavía búsqueda semántica.

## Recorrido propuesto

Los nombres de acciones que siguen definen la intención de uso. Las entradas nuevas requieren
concretar su ubicación con los patrones visuales actuales antes de implementarlas.

| Paso                | Intervención del usuario                                                                                              | Respuesta preparada o acción                                                                          | Resultado observable real                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1. Mundo            | Entrar en «Resource Scout · demo».                                                                                    | Mostrar las superficies existentes.                                                                   | El proyecto y sus materiales iniciales están disponibles.                                                          |
| 2. Sessions         | «Quiero encontrar mis referencias por la fuente o por lo que anoté. Organizá las tareas para agregar esa búsqueda.»   | Proponer las dos tareas detalladas abajo.                                                             | Se guardan mensaje y propuesta. Board sigue sin esas tareas hasta aceptar.                                         |
| 3. Sessions → Board | Aceptar las tareas y abrir «Implementar búsqueda de referencias».                                                     | Crear los registros y devolver enlaces a sus identidades.                                             | Board muestra el mismo título, descripción y criterios, con acceso al mensaje de origen.                           |
| 4. Board → Code     | Usar «Trabajar en Code». Pedir: «Implementá esta búsqueda en searchCaptures, conservando las capturas originales.»    | Abrir `src/search.ts` con la tarea como contexto y proponer el cambio preparado.                      | El archivo original sigue intacto mientras se revisa la diferencia. La propuesta identifica la tarea y el archivo. |
| 5. Code             | Revisar, aceptar el cambio y guardar.                                                                                 | Aplicar la propuesta mediante los comandos compartidos.                                               | Cambia ese archivo y queda asociado a la tarea. El código generado aún no implica pruebas ejecutadas.              |
| 6. Code → Docs      | Usar «Documentar este trabajo». Pedir: «Explicá la búsqueda y sus casos límite.»                                      | Proponer el documento «Búsqueda de referencias», usando la tarea y el archivo aceptado como contexto. | Aceptar crea un documento real, relacionado con el trabajo y con enlaces a sus fuentes.                            |
| 7. Docs → Canvas    | Volver a las superficies, entrar en Canvas e incorporar tarea, archivo y documento.                                   | Elegirlos desde incorporación. Precisar un fragmento de código y organizar manualmente.               | Cada tarjeta abre el original. Crear el conjunto «Búsqueda» y conexiones con las imágenes conserva los objetos.    |
| 8. Regreso          | Abrir el documento desde su tarjeta, añadir una frase y volver. Cambiar el estado de la tarea desde Board y regresar. | Ediciones manuales comunes.                                                                           | Canvas muestra la frase y el nuevo estado. El contexto espacial se recupera.                                       |
| 9. Recuperación     | Recargar y retomar la conversación desde Quick Chat o Sessions.                                                       | Recuperar el estado guardado y consultar las referencias incorporadas al hilo.                        | Permanecen tareas, archivo, documento, relaciones y organización; la conversación permite abrirlos por identidad.  |

Propuesta de respuesta inicial del agente:

> Propongo implementar la búsqueda sobre las capturas y documentar sus reglas. La primera
> tarea conserva los criterios de búsqueda; la segunda deja los ejemplos y casos límite
> junto al archivo. Podés revisar ambas antes de crearlas.

Tareas propuestas:

- **Implementar búsqueda de referencias.** Incorporar `searchCaptures` en `src/search.ts`,
  siguiendo los cinco criterios del caso. Consultar el mensaje de origen y conservar el
  archivo pertinente como contexto. Estado inicial: Pendiente.
- **Documentar las reglas de búsqueda.** Explicar coincidencias en fuente o nota, consulta
  vacía, ausencia de coincidencias y conservación del orden. Relacionar el documento con la
  tarea principal y el archivo. Estado inicial: Pendiente.

Documento propuesto: propósito breve, reglas, ejemplos de entrada y resultado esperado,
casos límite y fuentes del trabajo. Su contenido debe corresponder al archivo aceptado.
Los ejemplos esperados se identifican como ejemplos; un resultado de prueba solo aparece si
se ejecutó y existe evidencia.

La última frase manual propuesta es «La búsqueda conserva el orden original de las capturas».
La tarea principal pasa a En revisión; completar la documentación puede registrarse manualmente
en su tarea. No presentar la implementación como verificada solo por haber aceptado código.

En Canvas: tarea → archivo, «Se implementa en»; documento → archivo, «Explica»; imagen →
tarea, «Referencia». Las conexiones manuales son relaciones visuales persistentes. Los vínculos
de origen y trabajo necesarios para navegar desde Board, Code y Docs viven en el modelo común;
no dependen de interpretar las etiquetas de los cables.

## Identidades y cambios que deben conservarse

Los símbolos siguientes sirven para comprobar el recorrido; la interfaz no necesita mostrarlos.

| Identidad    | Registro y consumidores                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------- |
| C1 / M1      | Conversación y mensaje que originan las tareas; accesibles desde sus detalles.                 |
| T1 / T2      | Tareas creadas al aceptar; los enlaces del mensaje y Board consultan los mismos registros.     |
| F1           | `src/search.ts`, existente desde el inicio; propuesta, Code y Canvas apuntan al mismo archivo. |
| D1           | Documento creado al aceptar; Docs, relaciones del trabajo y Canvas apuntan al mismo documento. |
| R1 / R2      | Imágenes importadas con bytes persistidos; la escena conserva sus materiales.                  |
| P1 / P2 / P3 | Propuestas de tareas, código y documento; conservan estado, contexto y resultados al recargar. |

Renombrar un original actualiza sus referencias. Editar D1 o F1 actualiza sus tarjetas.
Quitar una tarjeta conserva el registro de origen; duplicar un documento produce otra identidad.
Las conexiones y conjuntos conservan sus miembros. El trabajo de otras superficies no se
recrea al visitarlas.

## Construcción reutilizable

1. **Modelo común y acciones.** Conservar origen, relaciones y resultados por identidad.
   Reutilizar Store, comandos, validación y persistencia. Crear las tareas de una propuesta
   como una operación coherente y registrar qué identidades produjo.
2. **Propuestas y aceptación.** Separar respuesta textual de acciones aplicables. Mantener
   contexto, revisión de origen y decisión pendiente. Impedir una segunda aplicación del
   mismo resultado y rechazar cambios que sobrescribirían ediciones posteriores.
3. **Agente de escenario.** Mantener respuestas y contenido preparados fuera de las vistas.
   Consultar el estado actual del Mundo y devolver propuestas por el mismo contrato que
   utilizará una integración real. Guardar la versión del escenario y su progreso.
4. **Conexión de las superficies.** Sessions muestra resultados navegables; Board abre el
   contexto de trabajo; Code y Docs conservan tarea y fuentes; Canvas usa las referencias
   existentes. Concretar solo las entradas visuales necesarias.
5. **Recuperación y compatibilidad.** Conservar propuestas y resultados al recargar.
   Normalizar los nuevos campos en guardados anteriores, conservando contenido y assets.
   Una nueva toma crea una instancia independiente, sin borrar trabajo previo.

El escenario reconoce las instrucciones de este recorrido y variantes acotadas, con sugerencias
visibles cuando ayuden a retomarlo. Avanza por condiciones del Mundo y decisiones confirmadas,
no por un contador de clics ni por el tiempo transcurrido. Fuera de su alcance explica qué puede
hacer y conserva la edición manual. Un rechazo, cancelación o conflicto no habilita el paso
siguiente como si el cambio ya se hubiera aplicado.

Las propuestas preparadas se emiten solo si los orígenes cumplen las condiciones del escenario.
Si una edición manual deja el archivo fuera de los casos reconocidos, se informa el límite y se
conserva el cambio. No generar documentación que describa una versión distinta de la aceptada.

La simulación produce propuestas, no modifica directamente el DOM ni llena otras superficies
por haber navegado a ellas. La futura inferencia sustituye la generación preparada; mantiene
objetos, relaciones, aplicación y pruebas. Requerirá además contexto, herramientas y tratamiento
de fallos propios del proveedor.

## Orden de implementación y aceptación

| Tramo               | Entregable comprobable                                                                  |
| ------------------- | --------------------------------------------------------------------------------------- |
| A. Sessions → Board | Tareas creadas con contenido, enlaces de origen, aceptación única y recuperación.       |
| B. Tarea → Code     | Contexto visible, propuesta real, aceptación y conflicto ante edición posterior.        |
| C. Trabajo → Docs   | Documento relacionado, aceptación y conservación de las fuentes.                        |
| D. Canvas y regreso | Referencias a los originales, fragmento, conjunto, conexiones y ediciones reflejadas.   |
| E. Ensayo y entrega | Recorrido desde una toma nueva, gate vigente, revisión visual y artefacto identificado. |

Aplicar [Arquitectura](arquitectura.md), [Desarrollo](desarrollo.md) y
[Validación del prototipo](validacion-prototipo.md). Ampliar las pruebas con el recorrido y sus
contraejemplos: rechazo sin cambios, doble aceptación, recarga antes y después de aceptar,
edición posterior al preparar propuesta, nombres modificados, retirada de una tarjeta,
guardado anterior y consulta fuera del escenario. Una nueva toma conserva las anteriores.

La entrega exige comprobar que los controles visibles producen los cambios, que los originales
mantienen sus identidades y que la recarga recupera el trabajo. No basta una captura final ni
un cambio interno de estado. Comprobar regresiones de navegación y Canvas sobre el HTML final.

Estimación de planificación: 5–8 jornadas para un escenario, con cambios visuales acotados,
pruebas y correcciones. Inferencia libre, ejecución de un repositorio, nuevas herramientas de
edición o más escenarios requieren concretar alcance y revisar esa estimación.

## Preparación de la grabación y revisión de este guion

Antes de implementar, revisar el caso, los dos materiales visuales, los textos y la ubicación
de las entradas nuevas. Mantener como base el diseño aprobado. Concretar cómo se incorpora
este hito transversal al [alcance vigente](alcance-prototipo.md), preservando la regla de
iteraciones y la revisión pendiente de Canvas; preparar el guion no aprueba su cierre.

Antes de grabar, conservar una copia identificada de la versión verificada y del escenario.
Preparar una instancia nueva, comprobar assets, cámaras y nombres legibles y ensayar el recorrido
completo. Propuesta de duración: 120–180 segundos, a ajustar con el ensayo. Los cortes pueden
abreviar esperas y navegación; cada cambio de contenido se realiza en Everett.

El video comunica la generación simulada y muestra acciones reales: aceptar trabajo, abrir
sus fuentes, editar un original y recuperar el proyecto. La exportación de diagnósticos y las
pruebas pertenecen a la comprobación del recorrido; no necesitan ocupar la escena del video.
