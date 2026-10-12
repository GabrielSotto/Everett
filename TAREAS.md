# Tareas de Everett

Estado de las iteraciones y correcciones pendientes. El detalle funcional permanece en [Alcance del prototipo](docs/alcance-prototipo.md).

| Iteración                     | Estado                        | Trabajo                                                                                                      |
| ----------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 0.7.5                         | Aprobada e integrada en `dev` | [Reconstrucción y arnés](docs/iteraciones/0.7.5.md). Merge `dc1b4f4`. Entrega local en `entregas/0.7.5/`.    |
| Mantenimiento del repositorio | Aprobado e integrado en `dev` | Salidas ordenadas, entrega conservada y reemplazo de ejecuciones comprobado. Rama `chore/orden-repositorio`. |
| 0.8                           | Correcciones de revisión      | [Canvas: contratos confirmados y verificación](docs/iteraciones/0.8.md).                                     |
| 0.9                           | Pendiente                     | Code y Docs.                                                                                                 |
| 0.10                          | Pendiente                     | Sessions y Agents.                                                                                           |
| 0.11                          | Pendiente                     | Board y Shipping Mode.                                                                                       |
| 0.12                          | Pendiente                     | Vista de superficies del Mundo, barra global, perfil, configuración y sistema de diseño (Atomic Design).     |
| 1.0 RC                        | Pendiente                     | Integración, regresión y pulido; definir el inicio y los nombres de Mundos y superficies.                    |
| 1.0                           | Pendiente                     | Aprobación del prototipo.                                                                                    |

## Después de 1.0

- Por evaluar: [Canvas — comentarios anclados a un punto de una imagen](docs/alcance-prototipo.md#después-de-10).

## Correcciones pendientes

Canvas 0.8.1 incorporó las correcciones del feedback sobre 0.8.0 en `feat/canvas-0.8`. Build, typecheck, format:check, test:unit, verify:unit, verify:build, test:browser y verify:browser pasaron sobre el artefacto actual: 65 pruebas unitarias y 100 de navegador, en 21,4 minutos. No hubo fallos, omisiones ni reintentos.

El [informe vigente](output/informe/informe.md) conserva hashes, resultados y capturas. La [revisión visual y de alcance](output/revision/0.8.1/revision.md) registra los cambios, referencias, transiciones y límites. El HTML original y la entrega aprobada de 0.7.5 se conservan.

Las regresiones C08-U06 y C08-B22–B29 cubren los nuevos fallos de cable, editor, propuesta, dock, herramientas, chat, zonas y atajos. Los controles de atajos comprueban también texto completo y scroll contenido a 300 × 500. Se conserva la regresión completa de Everett y los controles negativos del arnés.

La revisión manual posterior del usuario detectó las incidencias siguientes. El gate anterior conserva su resultado, pero no acredita la ausencia de estos fallos. El bloque de feedback terminó el 12 de octubre de 2026; las observaciones están pendientes de reproducción y corrección, no se consideran resueltas.

| Área           | Observación y resultado esperado                                                                                                                                                                                                                                                               | Regresión que ampliar                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Video          | Después de reproducirlo no permite arrastrarlo como los otros materiales. Distinguir reproducción, arrastre y entrada al visor, conservando navegación de regreso y contenido completo.                                                                                                        | B08/B29: arrastre desde controles y contenido del video, reproducción y regreso.                  |
| Cables         | Eliminar existe, pero su control aparece lejos de la conexión. No se encontró cómo cambiar un extremo a otro material. Revisar acceso contextual y reconexión sin crear otro cable, manteniendo anclajes, etiqueta y Undo/Redo; conservar recorrido automático.                                | B06/B22: eliminación alcanzable y modificación de extremos, con identidad y vínculos comprobados. |
| Propuesta      | Aparece demasiado lejos de la zona y su texto no permite entender qué propone. Ubicar el resultado pendiente cerca del trabajo y presentar una propuesta reconocible derivada del material y la instrucción, separada del contenido aceptado.                                                  | B04/B15/B23: proximidad, contenido propuesto y decisión explícita.                                |
| Pedir cambios  | Apertura brusca con dos acomodos: chips primero en 3+1 y luego en una fila. No se distingue el estado activo de Pedir cambios. Comprobar el recorrido completo, incluidos encuadre, distribución y estado activo, sin confundirlo con foco de teclado o jerarquía de Aceptar/Enviar.           | B18/B23: cuadros intermedios de posiciones y filas, además de altura, y estado visual activo.     |
| Identificación | Nombre invisible en una caja vacía aunque el hover devuelve un título existente. Mostrar el nombre completo consultable o Sin nombre, con clic para renombrar y la identidad compartida conservada. El editor ya resulta sencillo; evaluar tamaño de sus botones sin reducir su operabilidad.  | B01/B12/B22: texto realmente pintado, fallback visible y edición desde la etiqueta.               |
| Dibujo         | El lápiz aparece al activar la herramienta, pero vuelve el puntero después del trazo. Mantener cursor y modo coherentes durante y después del gesto mientras dibujo siga activo.                                                                                                               | B09/B24: cursor sobre fondo y material recién creado, durante gestos consecutivos.                |
| Tarea de Board | Estado, prioridad y responsable se perciben como tres palabras sueltas. Mejorar identificación y agrupación dentro de la tarjeta adoptada para 0.8, usando el mismo registro; no rediseñar Board.                                                                                              | B07: reconocimiento y significado accesible de los metadatos, junto con datos compartidos.        |
| Zona           | Placeholder vacío pequeño y ubicado hacia arriba a la izquierda; acciones de cerrar, quitar agente, ver agente y eliminar zona usan iconos ambiguos. Mejorar legibilidad, disposición y diferenciación. Revisar claridad entre nombre de zona y agente, conservando sus identidades distintas. | B28/UI-ZONE: vacío legible, acciones diferenciadas y conservación/devolución de materiales.       |

Ideas exploratorias del mismo feedback: galería al entrar sobre varias imágenes y uso para bocetos de wireframes. Se registran como ideas, sin incorporarlas automáticamente al alcance confirmado de esta corrección.

El usuario confirmó mejoras en edición de nombres, selección del cable, toggle de conectar y cursor inicial de dibujo; imagen, código y PDF permiten entrar a sus visores. Estas observaciones no resuelven las incidencias anteriores.

Permanecen pendientes la revisión y aprobación del usuario y la integración explícita en `dev`. Las siguientes iteraciones continúan pendientes.

Para 0.12: observaciones de búsqueda global, estructura del perfil y acceso a Superficies.
El usuario confirmó conservarlas en esa etapa y trabajar exclusivamente en 0.8.

Sin fallos abiertos dentro del alcance cerrado de 0.7.5. Los ajustes de cada superficie permanecen en su etapa del alcance.

Registrar aquí cada nuevo fallo abierto con su versión, forma de reproducirlo, resultado esperado y caso de prueba asociado. Al corregirlo, conservar la regresión en `tests/` y retirar el pendiente; Git conserva el cambio. Los resultados de ejecución viven en `output/pruebas/` hasta la siguiente ejecución de su grupo.
