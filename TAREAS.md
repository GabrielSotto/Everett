# Tareas de Everett

Estado de las iteraciones y correcciones pendientes. El detalle funcional permanece en [Alcance del prototipo](docs/alcance-prototipo.md).

| Iteración                     | Estado                        | Trabajo                                                                                                             |
| ----------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 0.7.5                         | Aprobada e integrada en `dev` | [Reconstrucción y arnés](docs/iteraciones/0.7.5.md). Merge `dc1b4f4`. Entrega local en `entregas/0.7.5/`.           |
| Mantenimiento del repositorio | Aprobado e integrado en `dev` | Salidas ordenadas, entrega conservada y reemplazo de ejecuciones comprobado. Rama `chore/orden-repositorio`.        |
| 0.8                           | En desarrollo                 | [Canvas: contratos confirmados y verificación](docs/iteraciones/0.8.md). Candidata actual: 0.8.7.                   |
| 0.9                           | Pendiente                     | Code y Docs; [editor integral por planificar](docs/alcance-prototipo.md#ampliación-por-planificar-editor-integral). |
| 0.10                          | Pendiente                     | Sessions y Agents.                                                                                                  |
| 0.11                          | Pendiente                     | Board y Shipping Mode.                                                                                              |
| 0.12                          | Pendiente                     | Vista de superficies del Mundo, barra global, perfil, configuración y sistema de diseño (Atomic Design).            |
| 1.0 RC                        | Pendiente                     | Integración, regresión y pulido; definir el inicio y los nombres de Mundos y superficies.                           |
| 1.0                           | Pendiente                     | Aprobación del prototipo.                                                                                           |

## Después de 1.0

- Por evaluar: [Canvas — comentarios anclados a un punto de una imagen](docs/alcance-prototipo.md#después-de-10).

## Correcciones pendientes

Canvas 0.8.7 es la última candidata construida en feat/canvas-0.8. Su gate histórico pasó con 118 casos de navegador; la ampliación actual descubre 121 y expone un fallo abierto en C08-B47. No hay certificación vigente del conjunto ampliado. Cierre e integración pendientes de aprobación explícita.

Canvas sigue en desarrollo. El usuario identifica una brecha de utilidad que requiere evaluar los recorridos completos, sus resultados y las capacidades que faltan, además de corregir y pulir la interfaz. El gate aprobado de una candidata no acredita esa utilidad ni la aprobación de la iteración.

- Búsqueda compartida, observada en 0.8.7 a 564 px de ancho: al abrir la lupa se ocultan Superficies y Estado, aparece una X redundante y el campo muestra un recuadro de foco que el usuario rechaza. Esperado: expansión coherente hacia la izquierda, cierre desde la misma lupa y orientación preservada, con foco de teclado perceptible. La brusquedad reportada requiere medir la transición; las capturas solo acreditan los estados finales. Regresión específica pendiente.
- Recuperación de materiales: la búsqueda actual consulta Mundos y documentos, pero no notas ni otros materiales de Canvas. C08-B48 registra una nota existente, «Decisión: guardado local», y cero resultados al buscar ese título. Definir el recorrido para encontrar y enfocar materiales conservando la cámara y el trabajo; la observación no cuenta como una prueba aprobada de búsqueda de notas.
- Utilidad agéntica: las propuestas de archivos visuales conservan y reorganizan materiales sin interpretarlos. La simulación sigue dentro del alcance autorizado y no demuestra el valor de un agente real. Definir por separado el trabajo y la integración necesarios antes de prometer procesamiento real.
- Estilo de dibujo y formas, 0.8.7: C08-B47 reproduce separación de 499–750 px durante el arrastre en dibujo y formas. A 704 × 668 px el mismo panel cambia de 366,8 × 50 a 364 × 81 px al moverlo al otro borde; Relleno cae a otra fila. El arrastre actual reposiciona el menú de incorporación, pero no el panel de estilo; este también permite flex-wrap y mide su tamaño antes de fijar la posición. Esperado: panel próximo a su disparador durante el gesto y al soltar, geometría estable a igual ventana y controles completos. La regresión falla mientras C08-B24/B39 pasan. Corrección pendiente; ampliar luego la combinación con zoom, chat y ventanas más estrechas, conservando la adaptación deliberada.

Criterio de utilidad confirmado por el usuario: [organización visual y espacial](docs/alcance-prototipo.md#organización-visual-y-espacial) de materiales de las distintas superficies, relaciones entre tareas, código, decisiones y referencias, comprensión del conjunto y diagramación. Debe servir para trabajo manual sin agentes; Everett es un ejemplo de proyecto complejo, no el límite del caso de uso.

La evaluación del 15 de octubre ejercita ese recorrido en C08-B48/B49 y conserva capturas y mediciones en la [revisión existente](output/revision/0.8.7/revision.md). Se comprueban incorporación desde controles visibles, tres relaciones etiquetadas, movimiento conjunto, Undo/Redo, edición de los mismos registros en Docs/Code/Board, regreso con cámara conservada y recuperación tras recargar. Un escenario adicional de 20 materiales y 16 relaciones permite observar las siguientes brechas:

- **Organización duradera por definir:** la selección conjunta es temporal; una zona sin agente no conserva pertenencia de los materiales superpuestos. Definir cómo conservar, identificar y retomar conjuntos de trabajo manual. Las zonas de procesamiento mantienen su exclusividad y devolución aprobadas; no se convierten automáticamente en grupos.
- **Referencias precisas por definir:** la relación apunta al archivo o documento completo. El modelo actual no identifica un rango, función o sección; falta concretar la referencia al contenido pertinente y su continuidad después de editarlo, sin adelantar el rediseño de editores de 0.9.
- **Lectura del panorama por resolver:** en la distribución controlada de 20 materiales, 8 de 16 etiquetas de conexión intersectan tarjetas y quedan parcialmente ocultas. Revisar legibilidad y orientación al pasar del detalle al panorama. El nombre de una forma solo aparece en su identificación contextual; mostrar texto en el esquema es una posibilidad a evaluar, no una prioridad ni solución ya acordada.

Orden propuesto para el siguiente trabajo: corregir controles y recuperación de materiales; concretar la organización manual duradera y las referencias precisas; resolver la lectura del panorama con ese recorrido como criterio. Son propuestas derivadas de la evaluación, no ampliaciones implementadas ni aprobación de diseños nuevos. Galería, wireframes y editor integral siguen fuera de 0.8.

Galería y bocetos rápidos están en [Mejoras de Canvas por evaluar](docs/alcance-prototipo.md#mejoras-de-canvas-por-evaluar), con prioridad baja y sin versión comprometida.

Para 0.12: observaciones de búsqueda global, estructura del perfil y acceso a Superficies. El usuario confirmó conservarlas en esa etapa y trabajar exclusivamente en 0.8.

En la revisión del 15 de octubre, el usuario cuestiona ese límite cuando impide mejorar el uso de Canvas: plantea retirar el acceso redundante a Superficies, revisar la utilidad de Estado y corregir la búsqueda compartida. Concretar esos ajustes transversales y su alcance sin iniciar el rediseño interno de las otras superficies. Las propuestas de retirada y de integración agéntica no están implementadas.

Sin fallos abiertos dentro del alcance cerrado de 0.7.5. Los ajustes de cada superficie permanecen en su etapa del alcance.

Registrar aquí cada nuevo fallo abierto con su versión, forma de reproducirlo, resultado esperado y caso de prueba asociado. Al corregirlo, conservar la regresión en `tests/` y retirar el pendiente; Git conserva el cambio. Los resultados de ejecución viven en `output/pruebas/` hasta la siguiente ejecución de su grupo.

## Candidata 0.8.7

Incorporar materiales prioriza abrir al costado del dock, cerca del disparador: derecha junto a + e izquierda disponible en el dock compacto. Arriba o abajo quedan como alternativa cuando no haya espacio lateral cercano. Se conservan dimensiones, scroll, teclado, cierre, foco, importación local y los demás recorridos de Canvas.

C08-B46 amplía la regresión: exige apertura lateral en el escenario ancho y después de mover el dock a lugares con espacio, posición estable con zoom y ningún solapamiento con las herramientas. La variante anterior encima del dock falla. Se conservan cercanía, límites, adaptación a 801/800/799/390/300 px, lista extensa, teclado e incorporación exacta de una referencia. El verificador exige las entradas reales de references y reference-add, junto con la cobertura existente y los controles negativos del arnés.

El gate de preparación de esta candidata pasó con 72 unitarias y 118 casos de navegador el 13 de octubre, sin omisiones ni reintentos. Esa evidencia histórica se conserva en el paquete candidato; las ejecuciones de trabajo fueron sustituidas por los diagnósticos posteriores. No acredita las fuentes actuales del arnés ampliado.

Evaluación del 15 de octubre: 72 unitarias aprobadas y verificadas, ejecución 2026-10-16_01-22-52-401Z; cinco casos dirigidos de navegador, ejecución 2026-10-16_01-33-21-485Z, con cuatro aprobados y C08-B47 fallido. C08-B24/B39 pasan sin detectar el fallo; B48/B49 comprueban el recorrido y registran sus límites. verify:browser rechaza correctamente la ejecución parcial. Esta evaluación no construye otra versión ni sustituye el paquete por una entrega certificada.

HTML: [dist/Everett-0.8.7.html](dist/Everett-0.8.7.html), build e0be768f4631d4b3, SHA-256 446ed522e8063eea65f3af7806d04f995fde56d431e76e008535d79860b6a6fe. [Revisión visual y de alcance](output/revision/0.8.7/revision.md), [informe](output/informe/informe.md) y paquete candidato en output/paquete. Preview único en 4173. Se conservan las fuentes y los HTML anteriores; dev y la entrega aprobada de 0.7.5 permanecen intactos.
