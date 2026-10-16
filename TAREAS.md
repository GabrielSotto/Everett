# Tareas de Everett

Estado de las iteraciones y correcciones pendientes. El detalle funcional permanece en [Alcance del prototipo](docs/alcance-prototipo.md).

| Iteración                     | Estado                        | Trabajo                                                                                                             |
| ----------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 0.7.5                         | Aprobada e integrada en `dev` | [Reconstrucción y arnés](docs/iteraciones/0.7.5.md). Merge `dc1b4f4`. Entrega local en `entregas/0.7.5/`.           |
| Mantenimiento del repositorio | Aprobado e integrado en `dev` | Salidas ordenadas, entrega conservada y reemplazo de ejecuciones comprobado. Rama `chore/orden-repositorio`.        |
| 0.8                           | En desarrollo                 | [Canvas: contratos confirmados y verificación](docs/iteraciones/0.8.md). Candidata 0.8.8 verificada, en revisión.   |
| 0.9                           | Pendiente                     | Code y Docs; [editor integral por planificar](docs/alcance-prototipo.md#ampliación-por-planificar-editor-integral). |
| 0.10                          | Pendiente                     | Sessions y Agents.                                                                                                  |
| 0.11                          | Pendiente                     | Board y Shipping Mode.                                                                                              |
| 0.12                          | Pendiente                     | Vista de superficies del Mundo, barra global, perfil, configuración y sistema de diseño (Atomic Design).            |
| 1.0 RC                        | Pendiente                     | Integración, regresión y pulido; definir el inicio y los nombres de Mundos y superficies.                           |
| 1.0                           | Pendiente                     | Aprobación del prototipo.                                                                                           |

## Después de 1.0

- Por evaluar: [Canvas — comentarios anclados a un punto de una imagen](docs/alcance-prototipo.md#después-de-10).

## Correcciones pendientes

Canvas 0.8.8 está verificada en `feat/canvas-0.8`: estilo unido al dock y recuperación de materiales desde la búsqueda compartida. El gate completo aprueba 73 pruebas unitarias y 126 de navegador sobre el HTML actual. La revisión del usuario y el cierre de la iteración siguen pendientes; la integración requiere aprobación explícita.

Canvas sigue en desarrollo. El usuario identifica una brecha de utilidad que requiere evaluar los recorridos completos, sus resultados y las capacidades que faltan, además de corregir y pulir la interfaz. El gate aprobado de una candidata no acredita esa utilidad ni la aprobación de la iteración.

- Utilidad agéntica: las propuestas de archivos visuales conservan y reorganizan materiales sin interpretarlos. La simulación sigue dentro del alcance autorizado y no demuestra el valor de un agente real. Definir por separado el trabajo y la integración necesarios antes de prometer procesamiento real.

Criterio de utilidad confirmado por el usuario: [organización visual y espacial](docs/alcance-prototipo.md#organización-visual-y-espacial) de materiales de las distintas superficies, relaciones entre tareas, código, decisiones y referencias, comprensión del conjunto y diagramación. Debe servir para trabajo manual sin agentes; Everett es un ejemplo de proyecto complejo, no el límite del caso de uso.

La evaluación del 15 de octubre ejercita ese recorrido en C08-B48/B49; la [revisión actual](output/revision/0.8.8/revision.md) conserva sus conclusiones y vuelve a comprobar el recorrido sobre 0.8.8. Se comprueban incorporación desde controles visibles, tres relaciones etiquetadas, movimiento conjunto, Undo/Redo, edición de los mismos registros en Docs/Code/Board, regreso con cámara conservada y recuperación tras recargar. Un escenario adicional de 20 materiales y 16 relaciones permite observar las siguientes brechas:

- **Organización duradera por definir:** la selección conjunta es temporal; una zona sin agente no conserva pertenencia de los materiales superpuestos. Definir cómo conservar, identificar y retomar conjuntos de trabajo manual. Las zonas de procesamiento mantienen su exclusividad y devolución aprobadas; no se convierten automáticamente en grupos.
- **Referencias precisas por definir:** la relación apunta al archivo o documento completo. El modelo actual no identifica un rango, función o sección; falta concretar la referencia al contenido pertinente y su continuidad después de editarlo, sin adelantar el rediseño de editores de 0.9.
- **Lectura del panorama por resolver:** en la distribución controlada de 20 materiales, 8 de 16 etiquetas de conexión intersectan tarjetas y quedan parcialmente ocultas. Revisar legibilidad y orientación al pasar del detalle al panorama. El nombre de una forma solo aparece en su identificación contextual; mostrar texto en el esquema es una posibilidad a evaluar, no una prioridad ni solución ya acordada.

El primer bloque, controles y recuperación de materiales, queda implementado y verificado en 0.8.8. Sigue por concretar la organización manual duradera y las referencias precisas, y resolver la lectura del panorama con ese recorrido como criterio. Son propuestas derivadas de la evaluación, no ampliaciones implementadas ni aprobación de diseños nuevos. Galería, wireframes y editor integral siguen fuera de 0.8.

Galería y bocetos rápidos están en [Mejoras de Canvas por evaluar](docs/alcance-prototipo.md#mejoras-de-canvas-por-evaluar), con prioridad baja y sin versión comprometida.

Para 0.12: observaciones de búsqueda global, estructura del perfil y acceso a Superficies. El usuario confirmó conservarlas en esa etapa y trabajar exclusivamente en 0.8.

En la revisión del 15 de octubre, el usuario cuestiona ese límite cuando impide mejorar el uso de Canvas: plantea retirar el acceso redundante a Superficies, revisar la utilidad de Estado y corregir la búsqueda compartida. Concretar esos ajustes transversales y su alcance sin iniciar el rediseño interno de las otras superficies. Las propuestas de retirada y de integración agéntica no están implementadas.

Sin fallos abiertos dentro del alcance cerrado de 0.7.5. Los ajustes de cada superficie permanecen en su etapa del alcance.

Registrar aquí cada nuevo fallo abierto con su versión, forma de reproducirlo, resultado esperado y caso de prueba asociado. Al corregirlo, conservar la regresión en `tests/` y retirar el pendiente; Git conserva el cambio. Los resultados de ejecución viven en `output/pruebas/` hasta la siguiente ejecución de su grupo.

## Candidata 0.8.8 verificada

Primer bloque de la evaluación de utilidad: corregir controles y recuperación de materiales, con el contrato C08-MAT-09 en la definición mantenida. El estilo de dibujo y formas sigue al dock durante el gesto y después del ajuste por chat o resize; conserva tamaño a igual ventana y usa dos columnas deliberadas para formas a 390 px o menos; dibujo conserva su ancho de contenido. La búsqueda incorpora los materiales de Canvas y usa el nombre y contenido vigentes de las referencias. Enfoca el material o su zona sin modificarlo, conserva borradores y permite volver a la vista anterior con Esc. La lupa abre y cierra; el campo persiste entre renders y, en ventanas estrechas, aparece debajo de la barra conservando sus controles.

C08-B47 reproduce y comprueba la corrección del panel. C08-U13 y B50–B54 amplían tipos, gestos sucesivos, zoom, chat, bordes, resize, cancelación, foco, teclado, escritura sin activar herramientas, búsqueda de contenido compartido, renombrado, borrado/Undo, cruce de Mundos, trabajos asignados y recuperación tras recarga. Incluyen contraejemplos de panel separado y de texto sin tinta, y mediciones de fotogramas de apertura/reversión. Los cambios en helpers sustituyen la X retirada por el cierre desde la misma lupa; conservan la intención de los recorridos anteriores.

La revisión amplió también dos secuencias que faltaban: cerrar con Esc un campo de perfil modificado sin provocar renders anidados, y seguir el aviso de un trabajo sin zona hasta recuperar su acceso y devolver el material desde controles reales. El segundo caso incluye una instancia de agente y conserva el trabajo hasta una decisión explícita.

Gate: build, typecheck, format:check, test:unit, verify:unit, verify:build, test:browser y verify:browser aprobados. Evidencia unitaria en `output/pruebas/unitarias/2026-10-16_03-24-56-829Z/result.json`; navegador en `output/pruebas/navegador/2026-10-16_03-25-14-668Z/results.json`, con 126 casos únicos, cero omitidos, fallidos o inestables. La sesión de estabilidad supera cinco minutos; pasan los controles negativos y las secuencias reproducibles. El [informe](output/informe/informe.md) y la [revisión visual y de alcance](output/revision/0.8.8/revision.md) conservan resultados, capturas y límites reales.

HTML: `dist/Everett-0.8.8.html`, 13.518.676 bytes; build `dc516e28dae1bf84`; SHA-256 `2170b4b5b65b233ae030e9768353132dee85d0c4194ab3542ae07a22a145761a`. Preview único en 4173. Se conservan el original y la entrega aprobada de 0.7.5. `dev` permanece en `4fb8677d367a4f82678ccfe047389122e4260acd`, sin integración.
