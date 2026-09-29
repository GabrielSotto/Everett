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

## Navegación

La navegación utiliza zoom, paneo y foco. El usuario enfoca una superficie y entra en ella mediante zoom; el recorrido inverso recupera la escala superior y permite desplazarse hacia otra superficie. La continuidad entre escalas forma parte del funcionamiento aprobado.

El nombre y la representación de la vista actualmente llamada `Vista atómica` están en revisión. Se conservan sus mecanismos de navegación y su distribución sin un centro jerárquico.

## Humanos y agentes

El usuario puede trabajar manualmente, delegar una tarea completa o combinar ambas formas. Las capacidades manuales permanecen disponibles. La asistencia aparece en el contexto de la actividad: composer en Code y Docs, zonas y propuestas en Canvas, conversación y coordinación en Sessions.

Las propuestas requieren aceptación antes de modificar el contenido compartido. Las asignaciones deben conservar la identidad y el contenido de los materiales y permitir recuperarlos al cancelar o retirar al agente.

## Continuidad del proyecto

Everett busca permitir que un proyecto se inicie, se desarrolle y madure dentro del mismo entorno. Los cambios deben reflejarse de forma coherente en las superficies que representan los mismos datos. Cambiar de área debe conservar los materiales, actores y contexto necesarios para continuar el trabajo.

## Hub

Everett Hub reúne descubrimiento, publicación, comunidad y comercio alrededor de creaciones y recursos del ecosistema. Su definición y las decisiones pendientes se mantienen en la [fundación del Hub](hub/foundation-v0.md).
