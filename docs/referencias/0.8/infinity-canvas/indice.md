# Referencias de Infinity Canvas para Everett 0.8

Imágenes aportadas por el usuario y recuperadas de
`C:\Proyectos\infinity-canvas\docs\design-references`. Se conservan sus nombres y bytes originales;
la copia de los once archivos se comprobó mediante SHA-256.

En el proyecto anterior, `docs/design-checklist.md` las identifica como referencias exploratorias
aprobadas, con el alcance todavía abierto. `docs/working-decisions.md` contiene decisiones
posteriores que corrigen partes de algunas imágenes. Su recuperación permite discutir la
adaptación a Everett; no aprueba nuevamente todas sus pantallas ni incorpora el alcance del
producto anterior.

Las decisiones actuales permanecen en [Canvas 0.8](../../../iteraciones/0.8.md) y en
[Alcance del prototipo](../../../alcance-prototipo.md). La reconstrucción oficial de 0.7.5 sigue
siendo la base de Everett.

## Imágenes recuperadas

| Referencia                                                                 | Contenido útil para la definición                                                                |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [02 — Asignación contextual](02-context-menu-assign-to-zone.png)           | Selección de un material y acceso contextual a zonas de destino.                                 |
| [03 — Inspector y propuesta](03-zone-inspector-pending-output.png)         | Agente, instrucción, contexto, actividad y acciones junto a la propuesta espacial.               |
| [06 — Quick Chat y anclaje](06-quick-chat-docking-feedback.png)            | Presentación flotante y feedback de acople.                                                      |
| [07 — Chat anclado y referencias](07-canvas-chat-global-toast.png)         | Referencias a materiales y transferencia explícita de contenido desde chat.                      |
| [12 — Creación de comentario](12-comment-creation.png)                     | Composer contextual asociado a un material.                                                      |
| [13 — Marcador de comentario](13-comment-marker-hover.png)                 | Marcador, contador y consulta contextual del hilo.                                               |
| [14 — Comentarios en chat anclado](14-canvas-chat-comments.png)            | Listado, respuesta y resolución desde el panel.                                                  |
| [29 — Acceso a herramientas](29-tool-access-architecture.png)              | Dock y menú de creación del producto anterior.                                                   |
| [30 — Dibujo](30-draw-color-thickness.png)                                 | Selector compacto de color y grosor.                                                             |
| [31 — Estilo de formas](31-shape-style-toolbar-rest.png)                   | Controles de relleno, borde, color y grosor.                                                     |
| [32 — Materiales y densidad de zonas](32-zone-material-density-states.png) | Previews de PDF, imagen, video, nota, enlace y documento; estados de 1–6, 7–15 y 16+ materiales. |

Se recuperaron las referencias pertinentes a Canvas. Las pantallas de proyectos, cuenta,
autenticación e invitaciones y el Full Chat permanecen en su fuente original.

## Zonas, propuestas y pedido de cambios

La asignación contextual está representada en la referencia 02. La referencia 03 muestra el
inspector con agente, instrucción, contexto, actividad y acciones, junto a la propuesta pendiente
compuesta por materiales y conexiones sobre el Canvas. Varias de las otras imágenes reutilizan
esa propuesta como contexto. Estas referencias son el punto de partida para adaptar y prototipar
zonas y propuestas en Everett, aplicando las reglas vigentes de 0.8.

Se revisaron visualmente las 32 imágenes originales el 3 de octubre de 2026. Ninguna muestra
abierto el campo de `Pedir cambios`. En el proyecto de origen, `docs/design-checklist.md`, sección
`2.3.2 Diseño Visual Derivado De La Consolidación`, mantiene pendiente el diseño de ese campo
y sus estados de envío y cancelación.

El comportamiento sí está descrito en `docs/working-decisions.md`, sección
`Controles De Decisión Del Preview`. Se conserva aquí ese antecedente para el prototipado:

- La propuesta ofrece `Aceptar`, `Pedir cambios` y `Rechazar`.
- `Pedir cambios` abre un campo compacto con texto libre, dos o tres sugerencias rápidas,
  `Enviar` y `Cancelar`. El campo tiene tamaño controlado y no se redimensiona manualmente.
- `Cancelar` cierra el campo y conserva la propuesta pendiente y sus acciones de decisión.
- `Enviar` solicita la revisión de la propuesta dentro del mismo trabajo.

El alcance de Everett ya exige aceptar, rechazar y pedir cambios, conservar la propuesta al
cancelar el pedido de cambios y aplicar contenido compartido únicamente después de aceptar.
Para Everett, el usuario confirmó una barra compacta de tres acciones agrupadas cuyo contenedor
se expande hacia abajo al pulsar `Pedir cambios`. El campo de texto permanece oculto hasta esa
acción. La definición confirmada y sus comprobaciones están en C08-PROP-01 de
[Canvas 0.8](../../../iteraciones/0.8.md).
La [referencia creada para Everett](../propuestas-pedir-cambios.png) muestra ambos estados e
incorpora las correcciones del usuario: `Pedir cambios` en el centro, cuatro chips de sugerencias,
campo sin tirador y botones inferiores con las mismas dimensiones y alineación. Esta imagen
complementa los antecedentes de Infinity Canvas.

## Aplicación al alcance vigente

La referencia **32** recupera el adjunto de densidad que ya estaba adoptado en el alcance de 0.8:
materiales individuales con previews para 1–6, agrupación por tipo para 7–15 y resumen agregado
para 16+. Se conservan el tamaño máximo de preview y el acceso al detalle exigidos por Everett.
Esta recuperación no modifica los umbrales ni agrega nuevos tipos de material.

Al consultar las demás imágenes, aplicar estas diferencias conocidas:

- La barra del producto independiente, su `grayboard`, el menú `Create` y los accesos de cuenta y
  proyecto no sustituyen la navegación ni la dirección visual vigente de Everett. El alcance de
  0.8 exige consolidar selección, paneo, notas, dibujo, formas y zonas en un dock compacto, y probar
  comentarios en él sin sobrecargarlo. La referencia 29 muestra Select, Move, Connect, Zone, Draw
  y Shapes en la toolbar; no muestra un botón de comentar. La referencia 12 muestra el editor de
  comentario junto al material, sin establecer en esa imagen un acceso en la toolbar.
- La referencia 03 muestra handles de tamaño de zona. Tanto las decisiones posteriores del
  proyecto anterior como el alcance de Everett establecen zonas fijas después de crearlas.
- La referencia 02 muestra `Assign to zone`, con un submenú de zonas de destino, `Duplicate`,
  `Rename` y `Delete`. Es la base visual revisable del menú contextual de Everett. La acción de
  eliminar ya aparece en el diseño anterior; para Everett, quitar una referencia a Docs o Board
  conserva el documento o la tarea original. Ese menú está sobre un material, no sobre la zona.
  La gestión de la zona parte del inspector de la referencia 03. El usuario confirmó menú contextual
  para materiales e inspector para zonas. Para 0.8, asignar y quitar se mantienen separados de
  los controles que aparecen al seleccionar, según C08-MAT-05 de [Canvas 0.8](../../../iteraciones/0.8.md).
  El comportamiento de Duplicar y Eliminar se concreta en C08-MAT-08 del mismo documento.
- Las referencias 30 y 31 son el punto de partida acordado para los controles de dibujo y formas:
  color y grosor del trazo, y relleno y borde de las formas, respectivamente. Adaptarlos a Everett
  conservando ese trabajo previo. Esta adopción no incorpora la navegación del producto anterior
  ni una barra de estilo para notas, documentos, PDF, imágenes o videos.
- Las referencias 06, 07 y 14 sirven para discutir chat, anclaje, referencias y comentarios. El
  encabezado y el historial deben seguir la [dirección elegida para 0.8](../historial-dropdown.png):
  título con desplegable, una acción de nueva conversación y todos los hilos del Mundo. Room se
  retira y una conversación nueva empieza con su iniciador y el agente.
- Los accesos a ramas, tareas, personas, audio y documentos propios del Canvas anterior no amplían
  por sí mismos esta iteración. Las referencias a otras superficies deben conservar la identidad
  del contenido compartido del Mundo, según el alcance vigente.
- Para imágenes y videos libres, el usuario eligió una [presentación centrada en el contenido](../materiales-libres.png),
  sin marco ni encabezado permanentes, identificación en hover con una demora breve y nombre y
  tipo al seleccionar. Su redimensionado conserva proporciones y contenido completo. Los controles
  visibles dependen del tipo, sin una barra genérica de acciones. Estas decisiones están recogidas
  en [Canvas 0.8](../../../iteraciones/0.8.md);
  no cambian las tarjetas compactas de zonas.
- Notas, documentos y PDF siguen el [mismo patrón de identificación contextual](../notas-documentos-pdf.png),
  con contenido visible en reposo y sin pies permanentes de metadatos. Los controles concretos
  se rigen por [Canvas 0.8](../../../iteraciones/0.8.md): se descartan los botones de entrar y
  comentar de las barras de los materiales. La entrada y salida utilizan el zoom acoplado de
  Everett, con Alt como embrague cuando la rueda tiene otra acción local. Comentar utiliza C y se
  prueba en el dock, sujeto a evaluar su densidad. Los botones de los mockups no son una lista aprobada.
- El renombrado usa un clic sobre el nombre visible, según C08-MAT-06 de Canvas 0.8. En documentos
  referenciados se modifica el mismo título que aparece en Docs. También se ofrece desde el menú
  contextual del material; mostrar un atajo cuando el usuario le haya asignado uno. Los gestos o
  atajos de renombrado que figuren en las imágenes antiguas no sustituyen esta decisión.

## Puntos para revisar con el usuario

Estas observaciones son propuestas de evaluación, no decisiones confirmadas:

- Usar las previews de la referencia 32 como punto de partida y ajustar su composición a la
  interfaz de Everett. Las portadas, imágenes, fotogramas y texto permiten reconocer contenido
  sin abrir cada material.
- Concretar los tamaños y límites de los materiales libres manteniendo la dirección elegida para
  imágenes, videos, notas, documentos y PDF. Ajustar la demora del hover durante las pruebas y
  concretar enlaces y referencias a otras superficies; el tamaño uniforme definido para zonas
  no se traslada a todo el Canvas.
- Revisar la utilidad de los puntos de color repetidos en las tarjetas antiguas y la diferenciación
  de notas frente a documentos. Definir su significado antes de trasladarlos.
- Concretar los detalles de interacción de los controles pertinentes a cada tipo,
  el menú contextual, nombres largos y previews no disponibles. Comprobar entrada y regreso con
  la navegación acordada. Las imágenes no acreditan esos comportamientos ni una comprobación
  de teclado, foco o contraste de la futura implementación.
