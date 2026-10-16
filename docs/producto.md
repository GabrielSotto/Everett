# Everett — concepto de producto

Everett es el nombre de trabajo de un entorno para crear y desarrollar proyectos en un espacio unificado. Reúne código, documentos, planificación, materiales visuales, conocimiento, assets, agentes, conversaciones e historial. La continuidad del proyecto y su contexto debe conservarse al pasar de una actividad a otra.

Este documento recoge la descripción general aportada por el usuario. El detalle de funciones y etapas está en [Alcance del prototipo](alcance-prototipo.md).

## Mundo

Un Mundo representa un proyecto. Contiene sus materiales, información, estado y superficies de trabajo. Todas las superficies acceden al mismo proyecto; el Mundo conecta sus datos y actividades.

El Universo permite recorrer los Mundos. Dentro de cada Mundo, sus seis superficies se distribuyen espacialmente sin una jerarquía visual central.

## Superficies de trabajo

| Superficie | Actividad                                                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Code       | Desarrollo manual de código y asistencia agéntica contextual. El FAB despliega el composer lateralmente.                                                  |
| Canvas     | Trabajo espacial con materiales, ideas, referencias, diagramas y contenido visual. Las zonas de agentes permiten asignar materiales y revisar propuestas. |
| Docs       | Escritura y edición directa de documentos, con Markdown como base. Comparte el patrón de FAB y composer contextual de Code.                               |
| Board      | Planificación y seguimiento del estado del proyecto, sus tareas y evolución.                                                                              |
| Agents     | Gestión de los agentes del Mundo y su actividad en el proyecto.                                                                                           |
| Sessions   | Conversación con personas y agentes y coordinación de acciones sobre las demás superficies.                                                               |

Las distintas interfaces responden a actividades diferentes dentro del mismo Mundo. Una Session puede iniciar trabajo que aparezca en Board, Docs, Canvas o Code manteniendo el contexto del proyecto.

Canvas reúne visual y espacialmente materiales de las distintas superficies para organizar el
trabajo, relacionar sus elementos, comprender el conjunto y diagramar cómo funciona. Debe poder
vincular una tarea con el código al que corresponde, las decisiones que la explican y sus
referencias, conservando la identidad y el acceso al contenido de origen. Esta utilidad debe
existir también en el trabajo manual, sin agentes; la asistencia agéntica amplía ese trabajo.

## Navegación

La navegación utiliza zoom, paneo y foco. El usuario enfoca una superficie y entra en ella mediante zoom; el recorrido inverso recupera la escala superior y permite desplazarse hacia otra superficie. La continuidad entre escalas forma parte del funcionamiento aprobado.

Cuando una superficie no tiene zoom ni otra acción propia asignada a la rueda, el gesto de zoom
entra y sale directamente mediante la navegación de Everett. Si tiene zoom, desplazamiento u
otra acción propia de rueda, Alt actúa como **embrague**: mientras se mantiene, desacopla esa
acción local y acopla el gesto a la navegación espacial de Everett. Al soltar Alt se recupera la
acción local. Es el mismo sistema de entrada y salida, con un acoplamiento temporal según la superficie.

El nombre y la representación de la vista actualmente llamada `Vista atómica` están en revisión. Se conservan sus mecanismos de navegación y su distribución sin un centro jerárquico.

## Atajos

Los atajos de Everett deben ser configurables por cada usuario. Las combinaciones iniciales son
valores predeterminados que pueden cambiarse; las indicaciones de la interfaz deben reflejar la
configuración vigente. La definición de cada iteración concreta las acciones y ajustes de su alcance.

## Humanos y agentes

El usuario puede trabajar manualmente, delegar una tarea completa o combinar ambas formas. Las capacidades manuales permanecen disponibles. La asistencia aparece en el contexto de la actividad: composer en Code y Docs, zonas y propuestas en Canvas, conversación y coordinación en Sessions.

Las propuestas requieren aceptación antes de modificar el contenido compartido. Las asignaciones deben conservar la identidad y el contenido de los materiales y permitir recuperarlos al cancelar o retirar al agente.

## Continuidad del proyecto

Everett busca permitir que un proyecto se inicie, se desarrolle y madure dentro del mismo entorno. Los cambios deben reflejarse de forma coherente en las superficies que representan los mismos datos. Cambiar de área debe conservar los materiales, actores y contexto necesarios para continuar el trabajo.

Canvas 0.8 implementa continuidad local: cada Mundo tiene su historial común de conversaciones;
Quick Chat, chat anclado y Sessions representan el mismo hilo elegido. Los documentos referenciados
conservan la identidad de Docs, y la persistencia distingue contenido del Mundo de contexto personal.
Las respuestas de agentes siguen simuladas, con revisión explícita de propuestas. Los contratos
de esta implementación permanecen en [Canvas 0.8](iteraciones/0.8.md).

## Shipping Mode

Shipping orienta el Mundo entero a cerrar una entrega. Su activación debe cambiar las
prioridades de trabajo, la coordinación y el contexto de las acciones de personas y agentes.
Las superficies representan esa orientación desde su actividad y comparten el mismo estado
de lanzamiento, alcance y trabajo necesario, conservando la identidad de los elementos.

En Board, el modo debe ayudar a decidir qué impide entregar, qué trabajo hace falta y qué
queda por comprobar. El diseño concreto se define en el
[alcance de Board y Shipping](alcance-prototipo.md#011--board--shipping-mode); los mecanismos
de preparación y comprobación de una entrega siguen en propuesta. El efecto en las demás
superficies se define en sus áreas, manteniendo este fundamento transversal.

## Trazabilidad y diagnóstico

La trazabilidad es un criterio transversal del producto. Everett debe permitir reconstruir
el origen y el recorrido de materiales, archivos, tareas, propuestas y ejecuciones, conservando
su identidad y la relación entre las acciones de personas y agentes. En un traspaso de archivos,
debe poder consultarse qué archivo intervino, de dónde venía, hacia dónde iba, qué operación se
intentó y cuál fue su resultado.

Ante un bug o un error de ejecución, la información disponible debe ayudar a identificar qué
pasó, cómo ocurrió y qué secuencia y condiciones llevaron al fallo. Vincular el problema con
los elementos y operaciones afectados y con la evidencia necesaria para reproducirlo,
investigar su causa raíz, verificar la corrección y prevenir su reaparición. Distinguir los
hechos observados de las hipótesis sobre sus causas; conservar los límites de la evidencia
cuando no alcance para reconstruir el recorrido completo.

Board representa el seguimiento del problema y enlaza su contexto y evidencia. La trazabilidad
también debe poder consultarse desde el elemento o la ejecución afectados en las demás
superficies. El alcance y los mecanismos concretos se definen por iteración.

## Profundidad y simplicidad de uso

La interfaz debe ser sencilla de leer y permitir comprender y realizar las acciones habituales
desde el primer uso. Presentar las herramientas y el contexto pertinentes a la actividad,
desplegando detalles y opciones avanzadas a medida que el usuario los necesita o solicita.
Las configuraciones y la personalización adicionales deben poder habilitarse por elección del
usuario, manteniendo accesibles las acciones básicas.

Aplicar esta presentación progresiva también al diagnóstico: comunicar el fallo y su efecto
cuando ocurren, y permitir profundizar desde un resumen claro hacia la secuencia de sucesos,
los elementos involucrados y la evidencia. Mantener la orientación y el contexto al abrir o
cerrar ese detalle. La profundidad disponible debe facilitar el trabajo sin saturar la
superficie con controles permanentes.
