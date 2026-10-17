# Tareas de Everett

Estado de las iteraciones y correcciones pendientes. El detalle funcional permanece en [Alcance del prototipo](docs/alcance-prototipo.md).

| Iteración                     | Estado                        | Trabajo                                                                                                                                 |
| ----------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 0.7.5                         | Aprobada e integrada en `dev` | [Reconstrucción y arnés](docs/iteraciones/0.7.5.md). Merge `dc1b4f4`. Entrega local en `entregas/0.7.5/`.                               |
| Mantenimiento del repositorio | Aprobado e integrado en `dev` | Salidas ordenadas, entrega conservada y reemplazo de ejecuciones comprobado. Rama `chore/orden-repositorio`.                            |
| 0.8                           | En desarrollo                 | [Canvas: contratos confirmados y verificación](docs/iteraciones/0.8.md). Candidata 0.8.9 verificada, pendiente de revisión del usuario. |
| 0.9                           | Pendiente                     | Code y Docs; [editor integral por planificar](docs/alcance-prototipo.md#ampliación-por-planificar-editor-integral).                     |
| 0.10                          | Pendiente                     | Sessions y Agents.                                                                                                                      |
| 0.11                          | Pendiente                     | Board y Shipping Mode.                                                                                                                  |
| 0.12                          | Pendiente                     | Vista de superficies del Mundo, barra global, perfil, configuración y sistema de diseño (Atomic Design).                                |
| 1.0 RC                        | Pendiente                     | Integración, regresión y pulido; definir el inicio y los nombres de Mundos y superficies.                                               |
| 1.0                           | Pendiente                     | Aprobación del prototipo.                                                                                                               |

## Después de 1.0

- Por evaluar: [Canvas — comentarios anclados a un punto de una imagen](docs/alcance-prototipo.md#después-de-10).

## Estado de Canvas 0.8.9

Implementación en `feat/canvas-0.8`. Conjuntos manuales duraderos, referencias a fragmentos, opacidad y correcciones de controles están implementados. Gate completo aprobado: 80 pruebas unitarias y 130 recorridos de navegador, incluidos controles del propio arnés y sesión sostenida. La candidata espera revisión del usuario; 0.8 sigue abierta y no se integra en `dev`.

Criterio de utilidad confirmado por el usuario: [organización visual y espacial](docs/alcance-prototipo.md#organización-visual-y-espacial) de materiales de distintas superficies, relaciones entre tareas, código, decisiones y referencias, comprensión del conjunto y diagramación. Debe servir para trabajo manual sin agentes; Everett es un ejemplo de proyecto complejo, no el límite del caso de uso.

La evaluación de 0.8.8 identificó pertenencia manual temporal, ausencia de referencias precisas y ocho etiquetas sobre tarjetas en el panorama de veinte materiales. La solución autorizada se concreta en C08-ORG-01 y C08-REF-01 y en la ampliación de C08-B49. El detalle funcional y la matriz están en [Canvas 0.8](docs/iteraciones/0.8.md).

- Conjuntos: crear desde selección múltiple, nombrar, mover, deshacer, recuperar y separar sin borrar materiales. Conservan miembros durante asignación/devolución y no sustituyen zonas ni propiedad de agentes.
- Fragmentos de Docs y Code: selección nativa del rango, preview y entrada al mismo origen, seguimiento de ediciones y estado no disponible. Copiar Docs conserva independencia. Las propuestas preservan contenido vecino y rechazan conflictos de origen.
- Controles: búsqueda siempre en la cabecera, Undo/Redo compactos, salida de Formas, etiqueta con Enter/Esc y papelera compacta, opacidad dentro del color. Superficies está oculto por defecto y tiene un switch persistente en Configuración.
- Panorama: comprobar etiquetas fuera de tarjetas, continuidad del cable, zoom, movimiento y nombres de conjuntos alcanzables. El nombre de una forma sigue en su identificación contextual; texto dentro de formas permanece como posibilidad a evaluar, sin prioridad ni diseño aprobado.

## Límites y trabajo posterior

Canvas sigue en desarrollo. El gate de una candidata no acredita por sí solo la utilidad completa ni aprueba la iteración. Evaluar sus recorridos y resultados con la revisión del usuario.

- Agentes: la simulación local conserva y reorganiza archivos visuales sin interpretarlos. El procesamiento real requiere definir un trabajo e integración aparte; no se implementa un proveedor en esta etapa.
- Referencias: rangos de texto, sin identidad semántica de AST. Una reescritura completa o recuperación ambigua requiere revisar el vínculo. Los conjuntos son planos; se puede separar y reagrupar para reorganizar sus miembros.
- Pulido del panorama: a 0,4×, la identificación contextual del documento seleccionado puede cubrir temporalmente una etiqueta de relación situada encima; deseleccionar recupera su lectura. C08-B49 comprueba los cuerpos de las tarjetas y los cables, no la ausencia universal de solapamientos con identificaciones transitorias.
- [Galería y bocetos rápidos](docs/alcance-prototipo.md#mejoras-de-canvas-por-evaluar): prioridad baja, sin versión comprometida. [Editor integral](docs/alcance-prototipo.md#ampliación-por-planificar-editor-integral): planificar y evaluar herramientas open source en 0.9.
- 0.12 conserva el rediseño general de perfil/configuración, barra global, Estado y vista de superficies. La corrección de búsqueda y el switch de navegación alternativa son los ajustes transversales autorizados para este trabajo de 0.8.

Sin fallos abiertos dentro del alcance cerrado de 0.7.5. Los ajustes de cada superficie permanecen en su etapa. Registrar aquí nuevos fallos con versión, reproducción, resultado esperado y regresión asociada. Al corregirlos, conservar el caso en tests y retirar el pendiente; Git conserva el cambio. Los resultados de ejecución viven en output/pruebas hasta la siguiente ejecución de su grupo.

## Verificación y entrega actual

Pasaron `build`, `typecheck`, `format:check`, `test:unit`, `verify:unit`, `verify:build`, `test:browser` y `verify:browser`. Evidencia vigente: [80 pruebas unitarias](output/pruebas/unitarias/2026-10-17_00-03-29-555Z/result.json) y [130 recorridos de navegador](output/pruebas/navegador/2026-10-17_00-33-09-755Z/results.json), sin fallos, omisiones ni reintentos. Las 130 trazas se abrieron y contienen eventos. La sesión sostenida completó 30 ciclos y 538.114 ms de mediciones, con cero recursos transitorios pendientes y 67 listeners estables. Se verificaron ocho capturas contra los adjuntos de esos resultados.

[Revisión visual, recorrido y límites](output/revision/0.8.9/revision.md), [informe generado](output/informe/informe.md) y [verificación del paquete candidato](output/paquete/verificacion.json). Los intentos parciales o fallidos se usaron para diagnosticar y no certifican esta candidata. La grabación sostenida se acotó para completar su archivo dentro del límite de cierre, conservando acciones, snapshots, duración, ciclos y aserciones.

HTML construido: dist/Everett-0.8.9.html, 13.645.040 bytes; build a59773bae5f5099c; SHA-256 34501eec4af1800af049bcd1d7f4d396d42e21001d761c6447953eace7784573. Preview único en 4173. Se conservan el original y la entrega aprobada de 0.7.5. dev permanece en 4fb8677d367a4f82678ccfe047389122e4260acd, sin integración.
