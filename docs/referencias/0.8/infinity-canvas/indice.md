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

## Aplicación al alcance vigente

La referencia **32** recupera el adjunto de densidad que ya estaba adoptado en el alcance de 0.8:
materiales individuales con previews para 1–6, agrupación por tipo para 7–15 y resumen agregado
para 16+. Se conservan el tamaño máximo de preview y el acceso al detalle exigidos por Everett.
Esta recuperación no modifica los umbrales ni agrega nuevos tipos de material.

Al consultar las demás imágenes, aplicar estas diferencias conocidas:

- La barra del producto independiente, su `grayboard`, el menú `Create` y los accesos de cuenta y
  proyecto no sustituyen la navegación ni la dirección visual vigente de Everett. El alcance de
  0.8 exige consolidar selección, paneo, notas, dibujo, formas y zonas en un dock compacto.
- La referencia 03 muestra handles de tamaño de zona. Tanto las decisiones posteriores del
  proyecto anterior como el alcance de Everett establecen zonas fijas después de crearlas.
- Las referencias 06, 07 y 14 sirven para discutir chat, anclaje, referencias y comentarios. El
  encabezado y el historial deben seguir la [dirección elegida para 0.8](../historial-dropdown.png):
  título con desplegable, una acción de nueva conversación y todos los hilos del Mundo. Room se
  retira y una conversación nueva empieza con su iniciador y el agente.
- Los accesos a ramas, tareas, personas, audio y documentos propios del Canvas anterior no amplían
  por sí mismos esta iteración. Las referencias a otras superficies deben conservar la identidad
  del contenido compartido del Mundo, según el alcance vigente.

## Puntos para revisar con el usuario

Estas observaciones son propuestas de evaluación, no decisiones confirmadas:

- Usar las previews de la referencia 32 como punto de partida y ajustar su composición a la
  interfaz de Everett. Las portadas, imágenes, fotogramas y texto permiten reconocer contenido
  sin abrir cada material.
- Distinguir la tarjeta compacta de un material asignado de su presentación libre en Canvas. El
  tamaño uniforme está definido para la zona; falta acordar proporciones, tamaño y contenido
  visible fuera de ella, especialmente para imágenes y moodboards.
- Revisar la utilidad de los puntos de color repetidos en las tarjetas antiguas y la diferenciación
  de notas frente a documentos. Definir su significado antes de trasladarlos.
- Concretar selección, controles contextuales, apertura y regreso, nombres largos y previews no
  disponibles. Las imágenes no acreditan esos comportamientos ni una comprobación de teclado,
  foco o contraste de la futura implementación.
