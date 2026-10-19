# Tareas de Everett

Estado de las iteraciones y correcciones pendientes. El detalle funcional permanece en [Alcance del prototipo](docs/alcance-prototipo.md).

| Iteración                     | Estado                        | Trabajo                                                                                                                                  |
| ----------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 0.7.5                         | Aprobada e integrada en `dev` | [Reconstrucción y arnés](docs/iteraciones/0.7.5.md). Merge `dc1b4f4`. Entrega local en `entregas/0.7.5/`.                                |
| Mantenimiento del repositorio | Aprobado e integrado en `dev` | Salidas ordenadas, entrega conservada y reemplazo de ejecuciones comprobado. Rama `chore/orden-repositorio`.                             |
| 0.8                           | En desarrollo                 | [Canvas: contratos confirmados y verificación](docs/iteraciones/0.8.md). Candidata 0.8.10 verificada; pendiente de revisión del usuario. |
| 0.9                           | Pendiente                     | Code y Docs; [editor integral por planificar](docs/alcance-prototipo.md#ampliación-por-planificar-editor-integral).                      |
| 0.10                          | Pendiente                     | Sessions y Agents.                                                                                                                       |
| 0.11                          | Pendiente                     | Board y Shipping Mode.                                                                                                                   |
| 0.12                          | Pendiente                     | Vista de superficies del Mundo, barra global, perfil, configuración y sistema de diseño (Atomic Design).                                 |
| 1.0 RC                        | Pendiente                     | Integración, regresión y pulido; definir el inicio y los nombres de Mundos y superficies.                                                |
| 1.0                           | Pendiente                     | Aprobación del prototipo.                                                                                                                |

## Después de 1.0

- Por evaluar: [Canvas — comentarios anclados a un punto de una imagen](docs/alcance-prototipo.md#después-de-10).

## Estado de Canvas 0.8.10

Implementación en `feat/canvas-0.8`. La candidata 0.8.10 corrige el feedback de 0.8.9: extracción y nombre de conjuntos, comprensión de fragmentos, selector visual de color, arrastre de chat, edición de cables, búsqueda y zoom en cabecera. Gate y revisión técnica completados; pendiente de revisión del usuario. 0.8 sigue abierta y no se integra en `dev`.

Criterio de utilidad confirmado por el usuario: [organización visual y espacial](docs/alcance-prototipo.md#organización-visual-y-espacial) de materiales de distintas superficies, relaciones entre tareas, código, decisiones y referencias, comprensión del conjunto y diagramación. Debe servir para trabajo manual sin agentes; Everett es un ejemplo de proyecto complejo, no el límite del caso de uso.

La evaluación de 0.8.8 identificó pertenencia manual temporal, ausencia de referencias precisas y ocho etiquetas sobre tarjetas en el panorama de veinte materiales. La solución autorizada se concreta en C08-ORG-01 y C08-REF-01 y en la ampliación de C08-B49. El detalle funcional y la matriz están en [Canvas 0.8](docs/iteraciones/0.8.md).

- Conjuntos: crear desde selección múltiple, nombrar, mover, deshacer, recuperar y separar sin borrar materiales. Conservan miembros durante asignación/devolución y no sustituyen zonas ni propiedad de agentes.
- Fragmentos de Docs y Code: selección nativa del rango, preview y entrada al mismo origen, seguimiento de ediciones y estado no disponible. Copiar Docs conserva independencia. Las propuestas preservan contenido vecino y rechazan conflictos de origen.
- Controles: búsqueda siempre en la cabecera, Undo/Redo compactos, salida de Formas, etiqueta con Enter/Esc sin botones y eliminación por menú contextual o teclado, opacidad dentro del color. Superficies está oculto por defecto y tiene un switch persistente en Configuración.
- Panorama: comprobar etiquetas fuera de tarjetas, continuidad del cable, zoom, movimiento y nombres de conjuntos alcanzables. El nombre de una forma sigue en su identificación contextual; texto dentro de formas permanece como posibilidad a evaluar, sin prioridad ni diseño aprobado.

## Límites y trabajo posterior

Canvas sigue en desarrollo. El gate de una candidata no acredita por sí solo la utilidad completa ni aprueba la iteración. Evaluar sus recorridos y resultados con la revisión del usuario.

- Agentes: la simulación local conserva y reorganiza archivos visuales sin interpretarlos. El procesamiento real requiere definir un trabajo e integración aparte; no se implementa un proveedor en esta etapa.
- Referencias: rangos de texto, sin identidad semántica de AST. Una reescritura completa o recuperación ambigua requiere revisar el vínculo. Los conjuntos son planos; sus miembros se pueden sacar por arrastre o acción contextual.
- Pulido del panorama: a 0,4×, la identificación contextual del documento seleccionado puede cubrir temporalmente una etiqueta de relación situada encima; deseleccionar recupera su lectura. C08-B49 comprueba los cuerpos de las tarjetas y los cables, no la ausencia universal de solapamientos con identificaciones transitorias.
- [Galería y bocetos rápidos](docs/alcance-prototipo.md#mejoras-de-canvas-por-evaluar): prioridad baja, sin versión comprometida. [Editor integral](docs/alcance-prototipo.md#ampliación-por-planificar-editor-integral): planificar y evaluar herramientas open source en 0.9.
- 0.12 conserva el rediseño general de perfil/configuración, barra global, Estado y vista de superficies. Las correcciones de búsqueda, el switch de navegación alternativa y la agrupación de Preferencias/Herramientas dentro de Configuración son los ajustes transversales autorizados para este trabajo de 0.8.

Sin fallos abiertos dentro del alcance cerrado de 0.7.5. Los ajustes de cada superficie permanecen en su etapa. Registrar aquí nuevos fallos con versión, reproducción, resultado esperado y regresión asociada. Al corregirlos, conservar el caso en tests y retirar el pendiente; Git conserva el cambio. Los resultados de ejecución viven en output/pruebas hasta la siguiente ejecución de su grupo.

## Verificación y entrega actual

Gate de 0.8.10 completado el 19/10/2026: `build`, `typecheck`, `format:check`, `test:unit`, `verify:unit`, `verify:build`, `test:browser` y `verify:browser`. Las 82 unitarias y los 138 casos de navegador están aprobados, sin omisiones ni reintentos. El navegador se ejecutó con `--workers=1 --max-failures=1`; el verificador independiente contrastó casos, controles visibles, adjuntos, fuentes y HTML.

- [HTML autónomo](dist/Everett-0.8.10.html), 13.741.690 bytes; build `9819087f4b199cd5` y SHA-256 `471d5e63d888f3afd9cfa361d9562b8cb43cc69a0842a4875cbd03d4703f00e5`. Preview único en 4173.
- Evidencia vigente: [unitarias](output/pruebas/unitarias/2026-10-19_01-26-43-738Z/result.json) y [navegador](output/pruebas/navegador/2026-10-19_02-30-44-444Z/results.json). El arnés comprueba entradas obligatorias al terminar cada caso y el verificador las vuelve a exigir.
- [Revisión y recorrido para el usuario](output/revision/0.8.10/revision.md), diez capturas con hashes y 138 trazas abiertas. La búsqueda conserva su lupa fija en ocho aperturas de 35 fotogramas; el dock deja alcanzables tirador y composer en los veinte fotogramas observados de apertura del chat.
- Sesión sostenida: 30 ciclos y 547.910 ms, con cero temporizadores, intervalos y fotogramas pendientes en las muestras; listeners 71 → 71, nodos 451 → 456 y heap 19.668.376 → 21.018.008 bytes. Son mediciones de ese recorrido, con los límites de Desarrollo.
- [Informe derivado de los resultados](output/informe/informe.md), [paquete de la candidata](output/paquete/Everett-0.8.10.zip) y [verificación de integridad](output/paquete/verificacion.json).

Pendiente de revisión del usuario. La candidata no aprueba ni cierra 0.8; conserva los límites concretos indicados arriba y en su revisión. No se integró en `dev` ni se inició otra iteración.
